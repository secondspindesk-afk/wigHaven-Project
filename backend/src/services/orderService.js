import crypto from 'crypto';
import * as orderRepository from '../db/repositories/orderRepository.js';
import { initiateMobileMoneyCharge } from './mobileMoneyService.js';
import { refundPayment } from './paystackService.js';
import { clearCart } from './cartService.js';
import * as discountService from './discountService.js';
import settingsService from './settingsService.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Create order from cart
 * @param {Object} cart - Cart object
 * @param {Object} orderData - Order details (address, email, etc.)
 * @returns {Promise<Object>} Created order and payment info
 */
export const createOrder = async (cart, orderData) => {
    const prisma = getPrisma();

    try {
        // 1. Validate cart
        if (!cart || cart.items.length === 0) {
            const error = new Error('Cart is empty');
            error.statusCode = 400;
            throw error;
        }

        // 1b. Validate order limits from settings
        const minOrderAmount = await settingsService.getSetting('minOrderAmount');
        const maxOrderAmount = await settingsService.getSetting('maxOrderAmount');

        if (minOrderAmount && Number(minOrderAmount) > 0 && cart.total < Number(minOrderAmount)) {
            const error = new Error(`Minimum order amount is ₵${Number(minOrderAmount).toFixed(2)}`);
            error.statusCode = 400;
            throw error;
        }

        if (maxOrderAmount && Number(maxOrderAmount) > 0 && cart.total > Number(maxOrderAmount)) {
            const error = new Error(`Maximum order amount is ₵${Number(maxOrderAmount).toFixed(2)}`);
            error.statusCode = 400;
            throw error;
        }

        // 2. Generate order number & reference (cryptographically secure)
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const orderNumber = `ORD-${dateStr}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
        const paystackReference = `ref_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`;

        // 3. Determine user context
        const cartContext = cart.userId ? { type: 'user', userId: cart.userId } : { type: 'guest', guestId: cart.guestId };

        // 4. Transaction: Validate Stock → Create Order → Create Items (NO DEDUCTION YET)
        const { order, orderItems } = await prisma.$transaction(async (tx) => {
            // A. Validate Stock Availability (NO DEDUCTION - happens in webhook)
            for (const item of cart.items) {
                const variant = await tx.variant.findUnique({
                    where: { id: item.variant_id }
                });

                if (!variant) {
                    throw new Error(`Product variant not found: ${item.product_name}`);
                }

                if (!variant.isActive) {
                    throw new Error(`Product is no longer available: ${item.product_name}`);
                }

                if (variant.stock < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.product_name}. Available: ${variant.stock}`);
                }

                // ✅ Stock validated but NOT deducted
                // Stock deduction happens ONLY in webhookWorker.js when payment is confirmed
                // This prevents double deduction and ensures payment comes before stock commitment
            }

            // B. Create Order
            const newOrder = await tx.order.create({
                data: {
                    userId: cartContext.type === 'user' ? cartContext.userId : null,
                    orderNumber,
                    status: 'pending',
                    paymentStatus: 'pending',
                    subtotal: cart.subtotal,
                    tax: cart.tax,
                    shipping: cart.shipping,
                    total: cart.total,
                    customerEmail: orderData.customer_email,
                    customerPhone: orderData.customer_phone,
                    shippingAddress: orderData.shipping_address,
                    billingAddress: orderData.billing_address || orderData.shipping_address,
                    notes: orderData.notes,
                    paystackReference,
                    couponCode: cart.discount?.code || null,
                    discount: cart.discount?.amount || 0
                }
            });

            // C. Create Order Items
            const itemsData = cart.items.map(item => ({
                orderId: newOrder.id,
                variantId: item.variant_id,
                productName: item.product_name,
                variantSku: item.sku,
                attributes: item.attributes || {},
                unitPrice: item.unit_price,
                quantity: item.quantity,
                subtotal: item.subtotal,
            }));

            await tx.orderItem.createMany({
                data: itemsData
            });

            // D. Increment Discount Usage (if applicable) - INSIDE TRANSACTION
            // This ensures if the transaction fails, usage is not incremented
            if (cart.discount?.code) {
                try {
                    const discountRecord = await tx.discountCode.findUnique({
                        where: { code: cart.discount.code }
                    });
                    if (discountRecord) {
                        await tx.discountCode.update({
                            where: { id: discountRecord.id },
                            data: { usedCount: { increment: 1 } }
                        });
                        logger.info(`Discount usage incremented for code: ${cart.discount.code}`);
                    }
                } catch (err) {
                    logger.error(`Failed to increment usage for discount ${cart.discount.code}:`, err);
                    // Throw to rollback the entire transaction
                    throw new Error(`Failed to apply discount code: ${err.message}`);
                }
            }

            return { order: newOrder, orderItems: itemsData };
        });

        // 5. Initialize Mobile Money Payment (Server-Side - Outside transaction)
        let payment = null;
        try {
            // Validate required mobile money fields
            if (!orderData.customer_phone) {
                throw new Error('Phone number is required for mobile money payment');
            }
            if (!orderData.payment_provider) {
                throw new Error('Payment provider is required (mtn, vod, or tgo)');
            }

            payment = await initiateMobileMoneyCharge({
                email: orderData.customer_email,
                amount: cart.total,
                phone: orderData.customer_phone,
                provider: orderData.payment_provider,
                reference: paystackReference,
                metadata: {
                    order_id: order.id,
                    order_number: orderNumber,
                    user_id: cartContext.type === 'user' ? cartContext.userId : 'guest',
                },
            });

            logger.info(`Mobile money charge initiated for order ${orderNumber}: ${payment.provider}`);

            // ✅ Clear cart ONLY if payment initiation succeeded
            await clearCart(cartContext);

        } catch (paymentError) {
            logger.error('Mobile money charge failed, order NOT cleared from cart:', paymentError);

            // ✅ CRITICAL: Decrement discount usage since payment failed
            // The order was created in DB but payment failed, so restore the discount
            if (cart.discount?.code) {
                try {
                    await discountService.decrementUsage(cart.discount.code);
                    logger.info(`Discount usage decremented for failed payment: ${cart.discount.code}`);
                } catch (err) {
                    logger.error(`Failed to decrement discount usage for ${cart.discount.code}:`, err);
                }
            }

            // ❌ Payment failed - throw error and keep cart
            // Frontend should show error and let user retry
            const error = new Error(paymentError.message || 'Payment initiation failed');
            error.statusCode = 400;
            throw error;
        }

        // 7. Track Abandoned Cart Recovery (Conversion)
        // Check if this user (or email) had any abandoned cart records that were emailed but not recovered
        try {
            const abandonedCartQuery = {
                where: {
                    recovered: false,
                    emailSent: true, // Only count as "recovery" if we actually nudged them
                    OR: []
                }
            };

            if (cartContext.userId) {
                abandonedCartQuery.where.OR.push({ userId: cartContext.userId });
            }
            if (orderData.customer_email) {
                abandonedCartQuery.where.OR.push({ email: orderData.customer_email });
            }

            if (abandonedCartQuery.where.OR.length > 0) {
                // Find most recent abandoned cart
                const abandonedCart = await prisma.abandonedCart.findFirst({
                    ...abandonedCartQuery,
                    orderBy: { createdAt: 'desc' }
                });

                if (abandonedCart) {
                    await prisma.abandonedCart.update({
                        where: { id: abandonedCart.id },
                        data: {
                            recovered: true,
                            recoveredAt: new Date()
                        }
                    });
                    logger.info(`Abandoned Cart Recovered! ID: ${abandonedCart.id} for Order: ${orderNumber}`);
                }
            }
        } catch (error) {
            // Don't fail the order if tracking fails
            logger.error('Error tracking abandoned cart recovery:', error);
        }

        logger.info(`Order created: ${orderNumber}`);

        // 7. Return order with payment info
        return {
            order: {
                id: order.id,
                order_number: orderNumber,
                status: order.status,
                payment_status: order.paymentStatus,
                subtotal: parseFloat(order.subtotal),
                tax: parseFloat(order.tax),
                shipping: parseFloat(order.shipping),
                total: parseFloat(order.total),
                items: orderItems,
                shipping_address: order.shippingAddress,
                created_at: order.createdAt,
                paystack_reference: paystackReference,
            },
            payment,
        };
    } catch (error) {
        logger.error('Error creating order:', error);
        throw error;
    }
};

/**
 * Get order by order number
 * @param {string} orderNumber - Order number
 * @param {Object} context - User context (userId or guest email) or { skipAuth: true }
 * @returns {Promise<Object>} Order details
 */
export const getOrder = async (orderNumber, context) => {
    try {
        const order = await orderRepository.findOrderByNumber(orderNumber);

        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        // Skip authorization check if skipAuth is true (for payment status polling)
        if (!context.skipAuth) {
            // Authorization check
            if (context.userId) {
                if (order.userId !== context.userId) {
                    const error = new Error('Unauthorized');
                    error.statusCode = 403;
                    throw error;
                }
            } else if (context.guestEmail) {
                if (order.customerEmail !== context.guestEmail) {
                    const error = new Error('Unauthorized');
                    error.statusCode = 403;
                    throw error;
                }
            } else {
                const error = new Error('Unauthorized');
                error.statusCode = 403;
                throw error;
            }
        }

        return formatOrder(order);
    } catch (error) {
        logger.error(`Error getting order ${orderNumber}:`, error);
        throw error;
    }
};

/**
 * Get order history for authenticated user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Orders and pagination
 */
export const getOrderHistory = async (userId, options) => {
    try {
        const result = await orderRepository.findOrdersByUser(userId, options);

        return {
            orders: result.orders.map(formatOrder),
            pagination: result.pagination,
        };
    } catch (error) {
        logger.error(`Error getting order history for user ${userId}:`, error);
        throw error;
    }
};

/**
 * Cancel order
 * @param {string} orderNumber - Order number
 * @param {Object} context - User context
 * @returns {Promise<Object>} Cancelled order
 */
export const cancelOrder = async (orderNumber, context) => {
    try {
        const order = await orderRepository.findOrderByNumber(orderNumber);

        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        // Authorization check
        if (context.userId && order.userId !== context.userId) {
            const error = new Error('Unauthorized');
            error.statusCode = 403;
            throw error;
        } else if (context.guestEmail && order.customerEmail !== context.guestEmail) {
            const error = new Error('Unauthorized');
            error.statusCode = 403;
            throw error;
        }

        // Check if order can be cancelled
        if (order.status !== 'pending') {
            const error = new Error('Order cannot be cancelled');
            error.statusCode = 400;
            throw error;
        }

        if (order.paymentStatus === 'paid') {
            const error = new Error('Paid orders cannot be cancelled');
            error.statusCode = 400;
            throw error;
        }

        // Cancel order
        const updatedOrder = await orderRepository.updateOrderStatus(order.id, {
            status: 'cancelled',
            paymentStatus: order.paymentStatus === 'pending' ? 'failed' : order.paymentStatus,
        });

        logger.info(`Order ${orderNumber} cancelled`);

        return formatOrder(updatedOrder);
    } catch (error) {
        logger.error(`Error cancelling order ${orderNumber}:`, error);
        throw error;
    }
};

/**
 * Refund order
 * @param {string} orderId - Order ID
 */
export const refundOrder = async (orderId) => {
    try {
        const order = await orderRepository.findOrderById(orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        if (order.paymentStatus !== 'paid') {
            throw new Error('Order is not paid, cannot refund');
        }

        if (order.status === 'refunded') {
            throw new Error('Order is already refunded');
        }

        // Process refund with Paystack
        await refundPayment(order.paystackReference);

        // Update order status
        const updatedOrder = await orderRepository.updateOrderStatus(orderId, {
            status: 'refunded',
            paymentStatus: 'refunded'
        });

        // Notify user about refund
        if (updatedOrder.userId) {
            const notificationService = (await import('./notificationService.js')).default;
            await notificationService.notifyOrderRefunded({
                userId: updatedOrder.userId,
                orderNumber: updatedOrder.orderNumber,
                total: updatedOrder.total
            });
        }

        // Send Refund Email
        const emailService = (await import('./emailService.js')).default;
        await emailService.sendOrderRefund({
            customerEmail: updatedOrder.customerEmail,
            orderNumber: updatedOrder.orderNumber,
            total: updatedOrder.total,
            shippingAddress: updatedOrder.shippingAddress,
            paymentStatus: updatedOrder.paymentStatus
        }, updatedOrder.total);

        logger.info(`Order ${order.orderNumber} refunded`);
        return formatOrder(updatedOrder);
    } catch (error) {
        logger.error(`Error refunding order ${orderId}:`, error);
        throw error;
    }
};

/**
 * Update order status (Admin)
 * @param {string} orderNumber - Order number
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated order
 */
export const updateStatus = async (orderNumber, status) => {
    try {
        const order = await orderRepository.findOrderByNumber(orderNumber);
        if (!order) {
            const error = new Error('Order not found');
            error.statusCode = 404;
            throw error;
        }

        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        if (!validStatuses.includes(status)) {
            const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            error.statusCode = 400;
            throw error;
        }

        const updatedOrder = await orderRepository.updateOrderStatus(order.id, { status });

        // Send Status Update Email
        const emailService = (await import('./emailService.js')).default;

        if (status === 'delivered') {
            await emailService.sendOrderDelivered({
                customerEmail: updatedOrder.customerEmail,
                orderNumber: updatedOrder.orderNumber,
                shippingAddress: updatedOrder.shippingAddress
            });
        } else {
            // Send generic status update for other statuses (shipped, processing, etc.)
            // Note: 'shipped' usually has its own specific trigger if tracking info is available, 
            // but here we just have status update. 
            // If tracking info is needed, it should be passed to updateStatus, but the signature is (orderNumber, status).
            // For now, we'll send the generic update.
            await emailService.sendOrderStatusUpdate({
                customerEmail: updatedOrder.customerEmail,
                orderNumber: updatedOrder.orderNumber,
                shippingAddress: updatedOrder.shippingAddress
            }, order.status, status);
        }

        return formatOrder(updatedOrder);
    } catch (error) {
        logger.error(`Error updating status for order ${orderNumber}:`, error);
        throw error;
    }
};

/**
 * Get all orders (Admin)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Orders and pagination
 */
export const getAllOrders = async (options) => {
    try {
        const result = await orderRepository.findAllOrders(options);
        return {
            orders: result.orders.map(formatOrder),
            pagination: result.pagination,
        };
    } catch (error) {
        logger.error('Error getting all orders:', error);
        throw error;
    }
};

/**
 * Bulk update order status (Admin)
 * @param {Array<string>} orderNumbers - Array of order numbers
 * @param {string} status - New status
 * @returns {Promise<Object>} Results object with success/failed arrays
 */
export const bulkUpdateStatus = async (orderNumbers, status) => {
    try {
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        if (!validStatuses.includes(status)) {
            const error = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            error.statusCode = 400;
            throw error;
        }

        const results = {
            success: [],
            failed: [],
        };

        for (const orderNumber of orderNumbers) {
            try {
                await updateStatus(orderNumber, status);
                results.success.push(orderNumber);
            } catch (error) {
                results.failed.push({
                    orderNumber,
                    error: error.message,
                });
            }
        }

        logger.info(`Bulk status update: ${results.success.length} succeeded, ${results.failed.length} failed`);
        return results;
    } catch (error) {
        logger.error('Error in bulk update:', error);
        throw error;
    }
};

/**
 * Format order for API response
 */
function formatOrder(order) {
    return {
        id: order.id,
        user_id: order.userId, // Needed for notifications
        order_number: order.orderNumber,
        status: order.status,
        payment_status: order.paymentStatus,
        payment_method: order.paymentMethod,
        subtotal: parseFloat(order.subtotal),
        tax: parseFloat(order.tax),
        shipping: parseFloat(order.shipping),
        discount_amount: parseFloat(order.discount),
        coupon_code: order.couponCode,
        total: parseFloat(order.total),
        items: order.items?.map(item => ({
            id: item.id,
            product_name: item.productName,
            variant_sku: item.variantSku,
            variant_details: item.attributes, // Map attributes to variantDetails
            product_image: item.productImage || null, // Add placeholder if not in schema yet, or map if available
            unit_price: parseFloat(item.unitPrice),
            quantity: item.quantity,
            subtotal: parseFloat(item.subtotal),
        })) || [],
        shipping_address: order.shippingAddress,
        billing_address: order.billingAddress,
        customer_email: order.customerEmail,
        customer_phone: order.customerPhone,
        notes: order.notes,
        paystack_reference: order.paystackReference,
        tracking_number: order.trackingNumber,
        carrier: order.carrier,
        created_at: order.createdAt,
        paid_at: order.paidAt,
        updated_at: order.updatedAt,
    };
}

export default {
    createOrder,
    getOrder,
    getOrderHistory,
    getAllOrders,
    cancelOrder,
    refundOrder,
    updateStatus,
    bulkUpdateStatus,
};
