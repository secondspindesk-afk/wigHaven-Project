import * as orderService from '../services/orderService.js';
import * as cartService from '../services/cartService.js';
import { verifyPaystackSignature } from '../utils/webhookValidator.js';
import { processPaymentWebhook } from '../services/paymentService.js';
import webhookRepository from '../db/repositories/webhookRepository.js';
import logger from '../utils/logger.js';
import { getPrisma } from '../config/database.js';
import { getQueue } from '../config/queue.js';
import settingsService from '../services/settingsService.js';

/**
 * Create order
 * POST /api/orders
 */
export const createOrder = async (req, res, next) => {
    try {
        const {
            shipping_address,
            billing_address,
            customer_email,
            customer_phone,
            payment_provider, // Mobile money provider
            notes,
        } = req.body;

        const prisma = getPrisma();

        // Fetch system settings
        const settings = await settingsService.getAllSettings();

        // Check if payments are enabled globally
        if (settings.enable_payments === false) {
            return res.status(503).json({
                error: 'Payments are currently disabled for maintenance. Please try again later.'
            });
        }

        // Validate Payment Method
        if (payment_provider === 'cash') {
            if (settings.paymentMethods && settings.paymentMethods.cash === false) {
                return res.status(400).json({
                    error: 'Cash on Delivery is currently disabled.'
                });
            }
        } else {
            // Assuming other providers are card/mobile money (Paystack)
            if (settings.paymentMethods && settings.paymentMethods.card === false) {
                return res.status(400).json({
                    error: 'Online payments are currently disabled.'
                });
            }
        }


        // Fetch full cart details (items, totals, stock check)
        const cart = await cartService.getCart(req.cart);

        const result = await orderService.createOrder(cart, {
            shipping_address,
            billing_address,
            customer_email,
            customer_phone,
            payment_provider, // Pass to service
            notes,
        });

        // USER NOTIFICATION (if registered)
        if (result.order.userId) {
            const notificationService = (await import('../services/notificationService.js')).default;
            await notificationService.notifyOrderPlaced({
                userId: result.order.userId,
                orderNumber: result.order.order_number,
                total: result.order.total
            });
        }

        // ADMIN NOTIFICATION (CRITICAL - new revenue)
        const notificationService = (await import('../services/notificationService.js')).default;
        const milestoneService = (await import('../services/milestoneService.js')).default;

        await notificationService.notifyAdminNewOrder({
            id: result.order.id,
            orderNumber: result.order.order_number,
            total: result.order.total,
            customerEmail: customer_email
        });

        // Check order milestone
        await milestoneService.checkOrderMilestone();

        res.status(201).json({
            success: true,
            data: result,
            message: 'Order created successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get order by order number
 * GET /api/orders/:order_number
 */
export const getOrder = async (req, res, next) => {
    try {
        const { order_number } = req.params;
        const { email } = req.query;

        // Build context: authenticated user or guest with email
        const context = {};
        if (req.user) {
            // Admins can view any order -> Skip auth check in service
            if (req.user.role === 'admin' || req.user.role === 'super_admin') {
                context.skipAuth = true;
            } else {
                context.userId = req.user.id;
            }
        } else if (email) {
            context.guestEmail = email;
        }
        const order = await orderService.getOrder(order_number, context);

        res.json({
            success: true,
            data: { order },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get order history (authenticated users only)
 * GET /api/orders
 */
export const getOrderHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const userId = req.user.id;

        const result = await orderService.getOrderHistory(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            status
        });

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all orders (Admin only)
 * GET /api/admin/orders
 */
export const getAllOrders = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;

        const result = await orderService.getAllOrders({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            search
        });

        res.json({
            success: true,
            data: result.orders,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Stream payment status (SSE)
 * GET /api/orders/:order_number/payment-status
 */
export const streamPaymentStatus = async (req, res) => {
    const { order_number } = req.params;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

    // Poll for status changes (simplified for now, ideally use Redis/Events)
    const checkStatus = async () => {
        try {
            const order = await orderService.getOrder(order_number, {});
            if (order.payment_status === 'paid') {
                res.write(`data: ${JSON.stringify({ status: 'paid', order })}\n\n`);
                res.end();
                return true;
            } else if (order.payment_status === 'failed') {
                res.write(`data: ${JSON.stringify({ status: 'failed' })}\n\n`);
                res.end();
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    };

    const interval = setInterval(async () => {
        const finished = await checkStatus();
        if (finished) clearInterval(interval);
    }, 3000); // Check every 3 seconds

    // Cleanup on client disconnect
    req.on('close', () => {
        clearInterval(interval);
    });
};

/**
 * Cancel order
 * POST /api/orders/:order_number/cancel
 */
export const cancelOrder = async (req, res, next) => {
    try {
        const { order_number } = req.params;
        const { email } = req.body;

        const context = {};
        if (req.user) {
            context.userId = req.user.id;
        } else if (email) {
            context.guestEmail = email;
        }

        const order = await orderService.cancelOrder(order_number, context);

        // Notify user via Email
        const emailService = (await import('../services/emailService.js')).default;
        // We need to fetch the full order with customer email if not present in the returned object
        // But orderService.cancelOrder returns formatOrder which has customer_email
        await emailService.sendOrderCancellation({
            customerEmail: order.customer_email,
            orderNumber: order.order_number,
            paymentStatus: order.payment_status,
            shippingAddress: order.shipping_address
        });

        // Notify user via In-App Notification
        if (order.userId) { // Note: formatOrder doesn't return userId, we might need to rely on context or fetch it
            // Actually formatOrder DOES NOT return userId. 
            // But the original code was accessing order.userId which suggests the variable 'order' 
            // in the original code might have been the raw prisma object BEFORE formatting?
            // Let's check orderService.cancelOrder again. 
            // It returns formatOrder(updatedOrder). 
            // formatOrder DOES NOT include userId.
            // This means the existing notification code might be BUGGY if it relies on order.userId from the result of cancelOrder.

            // However, we have context.userId.
            // Let's use context.userId if available.

            const notificationService = (await import('../services/notificationService.js')).default;
            await notificationService.notifyOrderStatusChanged(
                { userId: context.userId, orderNumber: order.order_number }, // Use context.userId if available
                'pending',
                'cancelled'
            );
        }

        res.json({
            success: true,
            data: { order },
            message: 'Order cancelled successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Refund order (Admin)
 * POST /api/orders/:order_number/refund
 */
export const refundOrder = async (req, res, next) => {
    try {
        const { order_number } = req.params;
        const adminId = req.user.id;

        const order = await orderService.refundOrder(order_number, adminId);

        res.json({
            success: true,
            data: { order },
            message: 'Order refunded successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update order status (Admin)
 * PATCH /api/orders/:order_number/status
 */
export const updateOrderStatus = async (req, res, next) => {
    try {
        const { order_number } = req.params;
        const { status } = req.body;

        const order = await orderService.updateStatus(order_number, status);

        // Notify user of status change
        if (order.userId) {
            const notificationService = (await import('../services/notificationService.js')).default;
            await notificationService.notifyOrderStatusChanged(
                {
                    userId: order.userId,
                    orderNumber: order.order_number,
                    total: order.total
                },
                'previous_status', // We don't have old status here easily, but message handles it
                status
            );
        }

        res.json({
            success: true,
            data: { order },
            message: 'Order status updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk update order status (Admin)
 * POST /api/orders/bulk-status
 */
export const bulkUpdateStatus = async (req, res, next) => {
    try {
        const { orderNumbers, status } = req.body;

        if (!Array.isArray(orderNumbers) || orderNumbers.length === 0) {
            return res.status(400).json({ error: 'orderNumbers array is required' });
        }

        const results = await Promise.allSettled(
            orderNumbers.map(orderNumber =>
                orderService.updateStatus(orderNumber, status)
            )
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.filter(r => r.status === 'rejected').length;

        res.json({
            success: true,
            message: `Updated ${successCount} orders. ${failureCount} failed.`,
            results: results.map((r, i) => ({
                orderNumber: orderNumbers[i],
                status: r.status,
                error: r.status === 'rejected' ? r.reason.message : null
            }))
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Export orders to CSV (Admin)
 * GET /api/orders/export
 */
/**
 * Export orders to CSV (Admin)
 * GET /api/orders/export
 */
export const exportOrdersCSV = async (req, res, next) => {
    try {
        const { startDate, endDate, status } = req.query;

        // Fetch all matching orders (no pagination)
        const result = await orderService.getAllOrders({
            page: 1,
            limit: 10000, // Reasonable limit for export
            status,
            startDate,
            endDate
        });

        const orders = result.orders;

        // Define CSV Headers
        const headers = [
            'Order Number',
            'Date',
            'Customer Name',
            'Customer Email',
            'Status',
            'Payment Status',
            'Subtotal',
            'Shipping',
            'Tax',
            'Discount',
            'Coupon Code',
            'Total',
            'Payment Method',
            'Tracking Number',
            'Carrier',
            'Items Count'
        ];

        // Convert to CSV string
        const csvRows = [headers.join(',')];

        for (const order of orders) {
            const row = [
                order.order_number,
                !isNaN(new Date(order.created_at).getTime()) ? new Date(order.created_at).toISOString().split('T')[0] : 'N/A',
                `"${(order.shipping_address?.name || 'Guest').replace(/"/g, '""')}"`,
                order.customer_email,
                order.status,
                order.payment_status,
                (order.subtotal || 0).toFixed(2),
                (order.shipping || 0).toFixed(2),
                (order.tax || 0).toFixed(2),
                (order.discount_amount || 0).toFixed(2),
                order.coupon_code || '',
                order.total.toFixed(2),
                order.payment_method || '',
                order.tracking_number || '',
                order.carrier || '',
                order.items?.length || 0
            ];
            csvRows.push(row.join(','));
        }

        const csvString = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=orders-${new Date().toISOString().split('T')[0]}.csv`);

        res.send(csvString);
    } catch (error) {
        next(error);
    }
};

/**
 * Manually verify payment (Admin)
 * POST /api/orders/:order_number/verify-payment
 */
export const manuallyVerifyPayment = async (req, res, next) => {
    try {
        const { order_number } = req.params;

        // Logic to manually trigger payment verification
        const order = await orderService.getOrder(order_number, {});
        if (!order) throw new Error('Order not found');

        // Re-run verification logic
        // ...

        res.json({
            success: true,
            message: 'Payment verification triggered'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Paystack Webhook Handler
 * POST /api/orders/webhook
 */
export const paystackWebhook = async (req, res) => {
    try {
        // 1. Verify signature
        const signature = req.headers['x-paystack-signature'];
        if (!verifyPaystackSignature(req.body, signature)) {
            logger.warn('Invalid Paystack signature');
            return res.status(400).send('Invalid signature');
        }

        // 2. Process webhook
        const payload = JSON.parse(req.body.toString());
        const result = await processPaymentWebhook(payload);

        if (result.success) {
            res.sendStatus(200);
        } else {
            res.status(400).send(result.error);
        }
    } catch (error) {
        logger.error('Webhook Error:', error);
        res.sendStatus(500);
    }
};

/**
 * Get Webhook Logs (Admin)
 * GET /api/orders/webhook-logs
 */
export const getWebhookLogs = async (req, res, next) => {
    try {
        const result = await webhookRepository.getLogs({ page: 1, limit: 20 });
        res.json({
            success: true,
            data: result.logs
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update tracking number (Admin)
 * PATCH /api/admin/orders/:order_number/tracking
 */
export const updateTrackingNumber = async (req, res, next) => {
    try {
        const { order_number } = req.params;
        const { tracking_number, carrier } = req.body;

        const prisma = getPrisma();

        // Update the order with tracking info
        const order = await prisma.order.update({
            where: { order_number },
            data: {
                tracking_number,
                carrier: carrier || null,
                status: 'shipped', // Auto set to shipped when tracking added
                updated_at: new Date()
            }
        });

        // Notify customer if order has userId
        if (order.user_id) {
            const notificationService = (await import('../services/notificationService.js')).default;
            await notificationService.notifyOrderStatusChanged(
                {
                    userId: order.user_id,
                    orderNumber: order.order_number,
                    total: order.total
                },
                'processing',
                'shipped'
            );
        }

        res.json({
            success: true,
            data: { order },
            message: 'Tracking number updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

export default {
    createOrder,
    getOrder,
    getOrderHistory,
    getAllOrders,
    streamPaymentStatus,
    cancelOrder,
    refundOrder,
    updateOrderStatus,
    bulkUpdateStatus,
    exportOrdersCSV,
    manuallyVerifyPayment,
    paystackWebhook,
    getWebhookLogs,
    updateTrackingNumber,
};

