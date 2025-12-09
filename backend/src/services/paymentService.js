import { getPrisma } from '../config/database.js';
import { getQueue } from '../config/queue.js';
import logger from '../utils/logger.js';

/**
 * Process payment webhook
 * Inserts webhook data into database which triggers automatic processing via DB trigger
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

        // Insert into WebhookLog
        await prisma.webhookLog.create({
            data: {
                provider: 'paystack',
                reference,
                event,
                status: 'pending',
                payload: webhookData,
                isProcessed: false
            }
        });

        // CRITICAL: Explicitly push to queue (don't rely on DB triggers)
        const boss = getQueue();
        await boss.send('webhooks', { payload: webhookData });

        logger.info(`Payment webhook processed and queued for reference: ${reference}`);
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
