import { getPrisma } from '../config/database.js';
import { queueEmail } from '../jobs/emailQueue.js';
import logger from '../utils/logger.js';
import { notifyOrdersChanged, notifyStockChanged } from '../utils/adminBroadcast.js';

/**
 * Webhook Processor
 * 
 * SIMPLIFIED: No longer uses PgBoss queue
 * - Called directly from paymentService.js via setImmediate
 * - Emails queued via simple EventEmitter queue
 * - Zero database connections for queue management
 */

/**
 * Process a webhook payload directly
 * Exported for use by paymentService.js
 */
export async function processWebhookPayload(webhookData) {
    const prisma = getPrisma();

    const reference = webhookData.data?.reference;
    const event = webhookData.event;

    if (!reference || !event) {
        logger.error(`Invalid webhook payload: missing reference or event`);
        throw new Error('Invalid webhook payload');
    }

    try {
        logger.info(`Processing webhook ${reference} (${event})`);

        // 1. Check idempotency - webhook already processed?
        const webhookLog = await prisma.webhookLog.findUnique({
            where: { reference }
        });

        if (webhookLog?.isProcessed) {
            logger.info(`Webhook ${reference} already processed. Skipping.`);
            return;
        }

        if (event === 'charge.success') {
            // 2. Process Payment & Stock Deduction Atomically
            let stockCheckFailed = false;
            let insufficientStockItems = [];

            await prisma.$transaction(async (tx) => {
                // Find the order
                const order = await tx.order.findUnique({
                    where: { paystackReference: reference },
                    include: { items: true }
                });

                if (!order) {
                    throw new Error(`Order not found for reference: ${reference}`);
                }

                if (order.paymentStatus === 'paid') {
                    logger.info(`Order ${order.orderNumber} already paid.`);
                    return;
                }

                // ✅ CRITICAL: STRICT STOCK CHECK BEFORE DEDUCTION
                for (const item of order.items) {
                    const variant = await tx.variant.findUnique({
                        where: { id: item.variantId }
                    });

                    if (!variant) {
                        throw new Error(`Variant ${item.variantId} not found for order ${order.orderNumber}`);
                    }

                    if (variant.stock < item.quantity) {
                        insufficientStockItems.push({
                            variantId: variant.id,
                            sku: variant.sku,
                            available: variant.stock,
                            requested: item.quantity
                        });
                    }
                }

                // If ANY item has insufficient stock, trigger refund flow
                if (insufficientStockItems.length > 0) {
                    stockCheckFailed = true;

                    await tx.order.update({
                        where: { id: order.id },
                        data: {
                            status: 'cancelled',
                            paymentStatus: 'refund_pending',
                            notes: `Auto-cancelled: Insufficient stock. ` +
                                insufficientStockItems.map(i => `${i.sku}: needed ${i.requested}, had ${i.available}`).join('; ')
                        }
                    });

                    if (order.couponCode) {
                        await tx.discountCode.updateMany({
                            where: { code: order.couponCode, usedCount: { gt: 0 } },
                            data: { usedCount: { decrement: 1 } }
                        });
                    }

                    logger.error(`❌ OVERSELLING PREVENTED for Order ${order.orderNumber}. Triggering refund.`);
                    return;
                }

                // ✅ All stock checks passed - proceed with deduction
                for (const item of order.items) {
                    const variant = await tx.variant.findUnique({
                        where: { id: item.variantId }
                    });

                    await tx.variant.update({
                        where: { id: item.variantId },
                        data: { stock: { decrement: item.quantity } }
                    });

                    await tx.stockMovement.create({
                        data: {
                            variantId: item.variantId,
                            orderId: order.id,
                            type: 'sale',
                            quantity: -item.quantity,
                            previousStock: variant.stock,
                            newStock: variant.stock - item.quantity,
                            reason: `Order ${order.orderNumber} payment confirmed`
                        }
                    });
                }

                // Update Order Status
                await tx.order.update({
                    where: { id: order.id },
                    data: {
                        status: 'processing',
                        paymentStatus: 'paid',
                        paidAt: new Date()
                    }
                });

                // Update Webhook Log
                await tx.webhookLog.update({
                    where: { reference },
                    data: {
                        status: 'processed',
                        isProcessed: true,
                        orderId: order.id
                    }
                });

                logger.info(`✅ Order ${order.orderNumber} paid and stock deducted.`);

                // 🔔 Real-time: Notify all admin dashboards of payment
                notifyOrdersChanged({ action: 'payment_confirmed', orderNumber: order.orderNumber });
                notifyStockChanged({ action: 'deducted', orderNumber: order.orderNumber });
            });

            // Handle refund OUTSIDE transaction (Paystack API call)
            if (stockCheckFailed) {
                try {
                    const { refundPayment } = await import('../services/paystackService.js');
                    await refundPayment(reference);

                    const order = await prisma.order.findUnique({
                        where: { paystackReference: reference }
                    });

                    if (order) {
                        await prisma.order.update({
                            where: { id: order.id },
                            data: { paymentStatus: 'refunded' }
                        });

                        if (order.userId) {
                            const notificationService = (await import('../services/notificationService.js')).default;
                            await notificationService.create({
                                userId: order.userId,
                                type: 'order_cancelled',
                                title: 'Order Cancelled - Item Out of Stock',
                                message: `We're sorry, Order #${order.orderNumber} has been cancelled and refunded because one or more items sold out while you were checking out.`,
                                link: `/account/orders/${order.orderNumber}`
                            });
                        }

                        // Queue email via simple queue (no PgBoss)
                        queueEmail({
                            type: 'order_cancelled_stock',
                            toEmail: order.customerEmail,
                            subject: `Order #${order.orderNumber} Cancelled - Item Out of Stock`,
                            template: 'orderCancelledStock',
                            variables: {
                                order_number: order.orderNumber,
                                customer_name: order.customerEmail.split('@')[0],
                                items: insufficientStockItems.map(i => ({
                                    sku: i.sku,
                                    available: i.available,
                                    requested: i.requested
                                }))
                            }
                        });
                    }

                    logger.info(`💸 Refund initiated for oversold order ${reference}`);
                } catch (refundError) {
                    logger.error(`Failed to process refund for ${reference}:`, refundError);

                    // ⚠️ CRITICAL: Notify admins about failed refund
                    try {
                        const notificationService = (await import('../services/notificationService.js')).default;
                        await notificationService.notifyAllAdmins(
                            'refund_failed',
                            '⚠️ URGENT: Refund Failed',
                            `Automatic refund failed for reference ${reference}. Amount needs manual refund via Paystack dashboard. Error: ${refundError.message}`,
                            '/admin/orders'
                        );
                        logger.info(`📢 Admin notification sent for failed refund ${reference}`);
                    } catch (notifyError) {
                        logger.error(`Failed to notify admins about refund failure:`, notifyError);
                    }

                    const existingOrder = await prisma.order.findUnique({
                        where: { paystackReference: reference },
                        select: { notes: true }
                    });
                    const updatedNotes = (existingOrder?.notes || '') + ` | Refund failed: ${refundError.message}`;

                    await prisma.order.update({
                        where: { paystackReference: reference },
                        data: {
                            paymentStatus: 'refund_failed',
                            notes: updatedNotes
                        }
                    });
                }

                await prisma.webhookLog.update({
                    where: { reference },
                    data: { status: 'processed_refunded', isProcessed: true }
                });
                return;
            }

            // 3. Broadcast WebSocket Notification
            try {
                const { broadcastNotification } = await import('../config/websocket.js');
                const order = await prisma.order.findUnique({
                    where: { paystackReference: reference }
                });

                if (order && order.userId) {
                    broadcastNotification(order.userId, {
                        type: 'order_payment_confirmed',
                        message: `Payment received for Order #${order.orderNumber}`,
                        data: {
                            orderNumber: order.orderNumber,
                            status: order.status,
                            paymentStatus: order.paymentStatus
                        }
                    });
                    logger.info(`📡 WebSocket notification sent to user ${order.userId}`);
                }
            } catch (wsError) {
                logger.error(`Failed to send WebSocket notification for ${reference}:`, wsError);
            }

            // 4. Send Confirmation Email
            try {
                const settingsService = (await import('../services/settingsService.js')).default;
                const orderConfirmationEmailEnabled = await settingsService.getSetting('orderConfirmationEmail');

                if (orderConfirmationEmailEnabled === 'false' || orderConfirmationEmailEnabled === false) {
                    logger.info(`📧 Order confirmation emails disabled - skipping for ref ${reference}`);
                } else {
                    const order = await prisma.order.findUnique({
                        where: { paystackReference: reference },
                        include: {
                            items: {
                                include: {
                                    variant: { include: { product: true } }
                                }
                            }
                        }
                    });

                    if (order) {
                        // Queue email via simple queue (no PgBoss)
                        queueEmail({
                            type: 'order_confirmation',
                            toEmail: order.customerEmail,
                            subject: `Order Confirmed #${order.orderNumber}`,
                            template: 'orderConfirmation',
                            variables: {
                                order_number: order.orderNumber,
                                customer_name: order.customerEmail.split('@')[0],
                                total: order.total,
                                items: order.items.map(item => ({
                                    name: item.variant.product.name,
                                    quantity: item.quantity,
                                    price: item.unitPrice,
                                    image: item.variant.product.images[0] || ''
                                })),
                                date: new Date().toLocaleDateString()
                            }
                        });
                        logger.info(`📧 Queued confirmation email for order ${order.orderNumber}`);
                    }
                }
            } catch (emailError) {
                logger.error(`Failed to queue email for webhook ${reference}:`, emailError);
            }

        } else {
            // Handle other events (e.g., failed)
            await prisma.webhookLog.update({
                where: { reference },
                data: { status: 'ignored', isProcessed: true }
            });
        }

    } catch (error) {
        logger.error(`Failed to process webhook ${reference}:`, error);

        try {
            await prisma.webhookLog.update({
                where: { reference },
                data: {
                    status: 'failed',
                    errorMessage: error.message
                }
            });
        } catch (e) { /* Ignore update error */ }

        throw error;
    }
}

/**
 * Start the Webhook Worker (DEPRECATED - kept for compatibility)
 * Webhooks are now processed directly via paymentService.js
 */
export async function startWorker() {
    logger.info('👷 Webhook processing enabled (direct mode, no queue)');
    // No longer uses PgBoss - webhooks processed directly
}
