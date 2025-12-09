import cron from 'node-cron';
import { getPrisma } from '../config/database.js';
import { verifyPayment } from '../services/paymentService.js';
import { logJobStart, logJobComplete, logJobError, logRecordError } from '../utils/cronLogger.js';
import logger from '../utils/logger.js';

/**
 * Payment Verification Job
 * Runs every 10 minutes to check pending payments
 * Max 50 orders per run
 */
export const startPaymentVerificationJob = () => {
    // Every 10 minutes: */10 * * * *
    cron.schedule('*/10 * * * *', async () => {
        const context = logJobStart('payment_verification');

        try {
            const prisma = getPrisma();

            // Check orders created between 5 minutes and 30 minutes ago
            // (Give user 5 mins to pay, stop checking after 30 mins when cancellation job takes over)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

            const pendingOrders = await prisma.order.findMany({
                where: {
                    status: 'pending',
                    paymentStatus: 'pending',
                    createdAt: {
                        lt: fiveMinutesAgo,
                        gt: thirtyMinutesAgo,
                    },
                    // Only check orders with a paystack reference
                    paystackReference: {
                        not: null,
                    },
                },
                take: 50, // Max 50 per run
                orderBy: {
                    createdAt: 'asc', // Check oldest first
                },
            });

            context.recordsChecked = pendingOrders.length;
            let processed = 0;
            let failed = 0;
            let recovered = 0;

            for (const order of pendingOrders) {
                try {
                    // Verify with Paystack
                    const verificationResult = await verifyPayment(order.paystackReference);

                    if (verificationResult.status === 'success') {
                        // Payment successful! Update order
                        await prisma.order.update({
                            where: { id: order.id },
                            data: {
                                status: 'processing', // Move to processing
                                paymentStatus: 'paid',
                                paidAt: new Date(),
                                paymentMethod: verificationResult.channel || 'paystack',
                            },
                        });

                        // Log recovery
                        logger.info(`💰 Recovered payment for order ${order.orderNumber}`);
                        recovered++;
                    } else if (verificationResult.status === 'failed' || verificationResult.status === 'abandoned') {
                        // Explicit failure - cancel immediately
                        await prisma.order.update({
                            where: { id: order.id },
                            data: {
                                status: 'cancelled',
                                paymentStatus: 'failed',
                            },
                        });
                        logger.info(`❌ Cancelled failed order ${order.orderNumber}`);
                    }
                    // If 'ongoing' or 'pending', do nothing, wait for next check

                    processed++;
                } catch (error) {
                    // If verification fails (e.g. network error), log and skip
                    logRecordError('payment_verification', order.orderNumber, error);
                    failed++;
                }
            }

            logJobComplete(context, {
                recordsChecked: context.recordsChecked,
                recordsProcessed: processed,
                recordsFailed: failed,
                details: `Recovered ${recovered} paid orders`,
            });
        } catch (error) {
            logJobError(context, error);
        }
    });
};
