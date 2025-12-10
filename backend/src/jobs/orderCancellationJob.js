import cron from 'node-cron';
import { getPrisma } from '../config/database.js';
import { logJobStart, logJobComplete, logJobError, logRecordError } from '../utils/cronLogger.js';

/**
 * Order Cancellation Job
 * Runs every hour to cancel orders pending > 30 minutes
 * Max 100 orders per run (memory-safe)
 */
export const startOrderCancellationJob = () => {
    // Every hour: 0 * * * *
    cron.schedule('0 * * * *', async () => {
        const context = logJobStart('order_cancellation');

        try {
            const prisma = getPrisma();

            // Get orders pending > 30 minutes
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

            const expiredOrders = await prisma.order.findMany({
                where: {
                    status: 'pending',
                    paymentStatus: 'pending',
                    createdAt: {
                        lte: thirtyMinutesAgo,
                    },
                },
                take: 100, // Memory-safe limit
                orderBy: {
                    createdAt: 'asc',
                },
            });

            context.recordsChecked = expiredOrders.length;
            let processed = 0;
            let failed = 0;

            for (const order of expiredOrders) {
                try {
                    // Cancel the order
                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            status: 'cancelled',
                            paymentStatus: 'failed',
                        },
                    });

                    // ✅ CRITICAL: Decrement discount usage for cancelled orders
                    // This restores discount uses that were consumed by abandoned checkouts
                    if (order.couponCode) {
                        try {
                            const discountService = (await import('../services/discountService.js')).default;
                            await discountService.decrementUsage(order.couponCode);
                            console.log(`Discount usage decremented for cancelled order ${order.orderNumber}: ${order.couponCode}`);
                        } catch (discountError) {
                            console.error(`Failed to decrement discount for order ${order.orderNumber}:`, discountError);
                            // Don't fail the cancellation
                        }
                    }

                    // Send notification if order belongs to a user
                    if (order.userId) {
                        try {
                            const notificationService = await import('../services/notificationService.js');
                            await notificationService.default.notifyOrderCancelled(order);
                        } catch (notifError) {
                            // Log error but don't fail the job
                            console.error(`Failed to create notification for order ${order.orderNumber}:`, notifError);
                        }
                    }

                    processed++;
                } catch (error) {
                    logRecordError('order_cancellation', order.orderNumber, error);
                    failed++;
                }
            }

            logJobComplete(context, {
                recordsChecked: context.recordsChecked,
                recordsProcessed: processed,
                recordsFailed: failed,
                details: `Cancelled ${processed} expired orders`,
            });
        } catch (error) {
            logJobError(context, error);
        }
    });
};
