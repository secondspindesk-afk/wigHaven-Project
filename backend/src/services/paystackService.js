import logger from '../utils/logger.js';
import { formatAmountForPaystack, formatAmountFromPaystack } from '../utils/paystackUtils.js';

const PAYSTACK_API_BASE = 'https://api.paystack.co';

/**
 * Initialize Paystack payment
 * @param {Object} params - Payment parameters
 * @param {string} params.email - Customer email
 * @param {number} params.amount - Amount in major currency (GHS)
 * @param {string} params.reference - Unique payment reference
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Payment initialization response
 */
export const initializePayment = async ({ email, amount, reference, metadata }) => {
    try {
        const secretKey = process.env.PAYSTACK_SECRET_KEY;

        if (!secretKey) {
            throw new Error('PAYSTACK_SECRET_KEY not configured');
        }

        // Convert amount to pesewas (Ghana Cedis smallest unit: 100 pesewas = 1 GHS)
        const amountInPesewas = formatAmountForPaystack(amount);

        // FIXED: Add request timeout (30 seconds)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secretKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    amount: amountInPesewas,
                    reference,
                    currency: 'GHS', // Ghana Cedis
                    metadata,
                    callback_url: `${process.env.FRONTEND_URL}/payment-success-close`,
                }),
                signal: controller.signal
            });

            const result = await response.json();

            if (!response.ok || !result.status) {
                logger.error('Paystack initialization failed:', result);
                throw new Error(result.message || 'Failed to initialize payment');
            }

            logger.info(`Payment initialized for ${email}: ${reference} (GHS ${amount})`);

            return {
                authorization_url: result.data.authorization_url,
                access_code: result.data.access_code,
                reference: result.data.reference,
            };
        } finally {
            clearTimeout(timeout);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            logger.error('Paystack API timeout (30s)');
            throw new Error('Payment gateway timeout. Please try again.');
        }
        // Network errors (e.g. DNS, connection refused)
        if (error.cause && error.cause.code) {
            logger.error(`Paystack Network Error: ${error.cause.code}`, error);
            throw new Error('Payment gateway unreachable. Please check your internet connection or try again later.');
        }

        logger.error('Error initializing Paystack payment:', error);
        throw error;
    }
};

/**
 * Verify payment with Paystack API
 * @param {string} reference - Payment reference
 * @returns {Promise<Object>} Payment verification response
 */
export const verifyPayment = async (reference) => {
    try {
        const secretKey = process.env.PAYSTACK_SECRET_KEY;

        if (!secretKey) {
            throw new Error('PAYSTACK_SECRET_KEY not configured');
        }

        // FIXED: Add request timeout (30 seconds)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(`${PAYSTACK_API_BASE}/transaction/verify/${reference}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${secretKey}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal  // FIXED: Abort on timeout
            });

            const result = await response.json();

            if (!response.ok || !result.status) {
                logger.error('Paystack verification failed:', result);
                throw new Error(result.message || 'Failed to verify payment');
            }

            const data = result.data;

            return {
                status: data.status, // 'success', 'failed', 'abandoned'
                amount: formatAmountFromPaystack(data.amount),
                paid_at: data.paid_at,
                reference: data.reference,
                customer: data.customer,
                metadata: data.metadata,
                currency: data.currency, // Will be GHS
            };
        } finally {
            clearTimeout(timeout);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            logger.error('Paystack verification timeout (30s)');
            throw new Error('Payment verification timeout. Please try again.');
        }
        logger.error('Error verifying payment:', error);
        throw error;
    }
};

/**
 * Refund payment
 * @param {string} reference - Transaction reference
 * @param {number} amount - Amount to refund (optional, defaults to full amount)
 */
export const refundPayment = async (reference, amount = null) => {
    try {
        const secretKey = process.env.PAYSTACK_SECRET_KEY;

        if (!secretKey) {
            throw new Error('PAYSTACK_SECRET_KEY not configured');
        }

        // FIXED: Validate partial refund amount
        if (amount !== null) {
            if (amount <= 0) {
                throw new Error('Refund amount must be greater than 0');
            }

            // Verify against original transaction
            const transaction = await verifyPayment(reference);
            const originalAmount = transaction.amount;

            if (amount > originalAmount) {
                throw new Error(`Refund amount (GHS ${amount}) exceeds transaction amount (GHS ${originalAmount})`);
            }
        }

        const payload = { transaction: reference };
        if (amount) {
            payload.amount = formatAmountForPaystack(amount);
        }

        // FIXED: Add request timeout (30 seconds)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(`${PAYSTACK_API_BASE}/refund`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secretKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: controller.signal  // FIXED: Abort on timeout
            });

            const result = await response.json();

            if (!response.ok || !result.status) {
                logger.error('Paystack refund failed:', result);
                throw new Error(result.message || 'Failed to process refund');
            }

            logger.info(`Refund initiated for ${reference}: ${result.message}`);
            return result.data;
        } finally {
            clearTimeout(timeout);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            logger.error('Paystack refund timeout (30s)');
            throw new Error('Refund request timeout. Please try again.');
        }
        logger.error('Error processing refund:', error);
        throw error;
    }
};

export default {
    initializePayment,
    verifyPayment,
    refundPayment,
};
