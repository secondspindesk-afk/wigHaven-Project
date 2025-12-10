import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

// Import the webhook processor directly
import { processWebhookPayload } from '../workers/webhookWorker.js';

/**
 * Process payment webhook
 * 
 * SIMPLIFIED: Process webhook directly instead of queueing via PgBoss
 * - Paystack already calls us async via HTTP
 * - No need for a separate queue layer
 * - Reduces database connections
 */
export const processPaymentWebhook = async (webhookData) => {
    try {
        const prisma = getPrisma();
        const reference = webhookData.data?.reference;
        const event = webhookData.event;

        if (!reference || !event) {
            logger.warn('Invalid webhook payload');
            return { success: false, error: 'Invalid webhook payload' };
        }

        // Insert into WebhookLog first (for idempotency)
        const existingLog = await prisma.webhookLog.findUnique({
            where: { reference }
        });

        if (existingLog?.isProcessed) {
            logger.info(`Webhook ${reference} already processed. Skipping.`);
            return { success: true };
        }

        // Create or update webhook log
        await prisma.webhookLog.upsert({
            where: { reference },
            update: { status: 'processing' },
            create: {
                provider: 'paystack',
                reference,
                event,
                status: 'processing',
                payload: webhookData,
                isProcessed: false
            }
        });

        // Process webhook DIRECTLY (async, non-blocking to Paystack)
        // Using setImmediate so we return 200 to Paystack immediately
        setImmediate(async () => {
            const maxRetries = 3;
            let attempt = 0;
            let lastError;

            while (attempt < maxRetries) {
                try {
                    await processWebhookPayload(webhookData);
                    logger.info(`Webhook ${reference} processed successfully`);
                    return; // Success - exit retry loop
                } catch (error) {
                    attempt++;
                    lastError = error;

                    if (attempt < maxRetries) {
                        // Exponential backoff: 1s, 2s, 4s
                        const delay = Math.pow(2, attempt - 1) * 1000;
                        logger.warn(`Webhook ${reference} attempt ${attempt} failed, retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            // All retries failed
            logger.error(`Webhook ${reference} processing failed after ${maxRetries} attempts:`, lastError);

            // Update log with failure
            await prisma.webhookLog.update({
                where: { reference },
                data: {
                    status: 'failed',
                    errorMessage: `Failed after ${maxRetries} attempts: ${lastError.message}`
                }
            }).catch(() => { });

            // Notify admins about persistent webhook failure
            try {
                const notificationService = (await import('./notificationService.js')).default;
                await notificationService.notifyAllAdmins(
                    'webhook_failed',
                    '⚠️ Webhook Processing Failed',
                    `Payment webhook ${reference} failed after ${maxRetries} attempts. Check logs and verify order status. Error: ${lastError.message}`,
                    '/admin/orders'
                );
            } catch (notifyError) {
                logger.error(`Failed to notify admins about webhook failure:`, notifyError);
            }
        });

        logger.info(`Payment webhook received and processing: ${reference}`);
        return { success: true };
    } catch (error) {
        // If it's a duplicate reference error, consider it successful
        if (error.code === 'P2002') {
            logger.info(`Duplicate webhook ${webhookData.data?.reference} ignored`);
            return { success: true };
        }

        logger.error('Failed to process payment webhook:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verify payment with Paystack
 * @param {string} reference - Payment reference
 * @returns {Promise<Object>} Verification result
 */
export const verifyPayment = async (reference) => {
    try {
        const secretKey = process.env.PAYSTACK_SECRET_KEY;

        if (!secretKey) {
            throw new Error('PAYSTACK_SECRET_KEY not configured');
        }

        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            logger.error(`Paystack verification failed for ${reference}:`, data);
            return {
                success: false,
                status: 'failed',
                message: data.message || 'Verification failed'
            };
        }

        return {
            success: true,
            status: data.data.status, // success, failed, abandoned
            channel: data.data.channel,
            amount: data.data.amount,
            currency: data.data.currency,
            gateway_response: data.data.gateway_response,
            data: data.data
        };
    } catch (error) {
        logger.error(`Error verifying payment ${reference}:`, error);
        throw error;
    }
};

export default {
    processPaymentWebhook,
    verifyPayment
};
