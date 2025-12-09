import crypto from 'crypto';
import logger from './logger.js';

/**
 * Verify Paystack webhook signature
 * @param {string} payload - Raw request body (JSON string)
 * @param {string} signature - x-paystack-signature header
 * @returns {boolean} True if signature is valid
 */
export const verifyPaystackSignature = (payload, signature) => {
    try {
        const secret = process.env.PAYSTACK_SECRET_KEY;

        if (!secret) {
            logger.error('PAYSTACK_SECRET_KEY not configured');
            return false;
        }

        if (!signature) {
            logger.warn('No signature provided in webhook');
            return false;
        }

        // Calculate HMAC-SHA512 hash
        const hash = crypto
            .createHmac('sha512', secret)
            .update(payload)
            .digest('hex');

        // Compare signatures (timing-safe comparison)
        const isValid = crypto.timingSafeEqual(
            Buffer.from(hash),
            Buffer.from(signature)
        );

        if (!isValid) {
            logger.warn('Webhook signature verification failed');
        }

        return isValid;
    } catch (error) {
        logger.error('Error verifying webhook signature:', error);
        return false;
    }
};

export default {
    verifyPaystackSignature,
};
