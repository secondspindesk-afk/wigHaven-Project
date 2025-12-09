import { getPrisma } from '../config/database.js';
import { initializeQueue, getQueue } from '../config/queue.js';
import logger from '../utils/logger.js';

// Queue name for webhooks
const QUEUE_NAME = 'webhooks';

/**
 * Process a single webhook job
 */
async function processWebhookJob(jobOrJobs) {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];
    const prisma = getPrisma();

    for (const job of jobs) {
        const jobData = job.data || job;
        const { payload } = jobData;

        if (!payload || !payload.data || !payload.event) {
            logger.error(`Invalid webhook payload for job ${job.id}`);
            continue;
        }

        const reference = payload.data.reference;
        const event = payload.event;

        try {
            logger.info(`Processing webhook ${reference} (${event})`);

            // 1. Log the webhook first (idempotency check)
            // We use upsert to handle potential duplicate deliveries from Paystack
            const webhookLog = await prisma.webhookLog.upsert({
                where: { reference },
                update: {}, // No update if exists
                create: {
                    provider: 'paystack',
                    reference,
                    event,
                    status: 'processing',
                    payload,
                    isProcessed: false
                }
            });

            if (webhookLog.isProcessed) {
                logger.info(`Webhook ${reference} already processed. Skipping.`);
                continue;
            }

            if (event === 'charge.success') {
                // 2. Process Payment & Stock Deduction Atomically
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

                    // ✅ SINGLE STOCK DEDUCTION (ONLY happens here after payment confirmed)
                    // NOTE: Stock is NOT deducted in orderService.createOrder anymore
                    // This ensures stock is only committed when payment is successful
                    // Deduct Stock for each item
                    for (const item of order.items) {
                        // Check current stock
                        const variant = await tx.variant.findUnique({
                            where: { id: item.variantId }
                        });

                        if (!variant) {
                            throw new Error(`Variant ${item.variantId} not found for order ${order.orderNumber}`);
                        }

                        if (variant.stock < item.quantity) {
                            // CRITICAL: Overselling detected during payment
                            // In a real system, you might trigger a refund or partial fulfillment here.
                            // For now, we log a critical error but proceed to negative stock to honor the paid order,
                            // or throw to fail the webhook (which might retry).
                            // Decision: Allow negative stock but log CRITICAL alert.
                            logger.error(`CRITICAL: Overselling detected for Order ${order.orderNumber}, Variant ${variant.sku}. Stock: ${variant.stock}, Req: ${item.quantity}`);
                        }

                        // Decrement stock
                        await tx.variant.update({
                            where: { id: item.variantId },
                            data: { stock: { decrement: item.quantity } }
                        });

                        // Record Stock Movement
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
                            status: 'processing', // Move from pending to processing
                            paymentStatus: 'paid',
                            paidAt: new Date()
                        }
                    });

                    // Update Webhook Log
                    await tx.webhookLog.update({
                        where: { id: webhookLog.id },
                        data: {
                            status: 'processed',
                            isProcessed: true,
                            orderId: order.id
                        }
                    });

                    logger.info(`✅ Order ${order.orderNumber} paid and stock deducted.`);
                });

                // 3. Broadcast WebSocket Notification (Real-time UI update)
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

                // 4. Send Confirmation Email (Outside transaction to keep it fast)
                // Check if order confirmation emails are enabled
                try {
                    const settingsService = (await import('../services/settingsService.js')).default;
                    const orderConfirmationEmailEnabled = await settingsService.getSetting('orderConfirmationEmail');

                    // Skip email if setting is explicitly disabled (default: true)
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
                            const boss = getQueue();
                            await boss.send('emails', {
                                type: 'order_confirmation',
                                toEmail: order.customerEmail, // Fixed: was to_email
                                subject: `Order Confirmed #${order.orderNumber}`,
                                template: 'orderConfirmation',
                                variables: {
                                    order_number: order.orderNumber,
                                    customer_name: order.customerEmail.split('@')[0],
                                    total: order.total,
                                    items: order.items.map(item => ({
                                        name: item.variant.product.name,
                                        quantity: item.quantity,
                                        price: item.unitPrice, // Fixed: was item.price
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
                    where: { id: webhookLog.id },
                    data: { status: 'ignored', isProcessed: true }
                });
            }

        } catch (error) {
            logger.error(`Failed to process webhook job ${job.id}:`, error);

            // Update log with error if possible
            try {
                await prisma.webhookLog.update({
                    where: { reference },
                    data: {
                        status: 'failed',
                        errorMessage: error.message
                    }
                });
            } catch (e) { /* Ignore update error */ }

            throw error; // Retry
        }
    }
}

/**
 * Start the Webhook Worker
 */
export async function startWorker() {
    try {
        const boss = getQueue(); // Queue already initialized

        logger.info('👷 Webhook Worker started (pg-boss)');

        // Subscribe to the queue
        // FIXED: Added retry limits and backoff strategy
        await boss.work(QUEUE_NAME, {
            teamSize: 5,               // Process up to 5 webhooks concurrently
            newJobCheckInterval: 1000, // Check for new jobs every second
            retryLimit: 3,             // FIXED: Max 3 retries on failure
            retryDelay: 60,            // FIXED: 60 seconds between retries
            retryBackoff: true         // FIXED: Exponential backoff (60s, 120s, 240s)
        }, processWebhookJob);

        logger.info('✅ Webhook Worker subscribed to queue');
    } catch (error) {
        logger.error('Failed to start Webhook Worker:', error);
        throw error; // Re-throw so index.js knows it failed
    }
}

// Start if run directly
if (process.argv[1] === import.meta.url) {
    startWorker();
}
