import logger from '../utils/logger.js';
import { formatAmountForPaystack, formatAmountFromPaystack } from '../utils/paystackUtils.js';
import axios from 'axios';

const PAYSTACK_API_BASE = 'https://api.paystack.co';

/**
 * Mobile Money providers supported by Paystack in Ghana
 */
export const SUPPORTED_PROVIDERS = {
    mtn: 'mtn',      // MTN Mobile Money
    vod: 'vod',      // Vodafone Cash (now Telecel)
    tgo: 'tgo'       // AirtelTigo Money
};

/**
 * Validate mobile money provider
 * @param {string} provider - Provider code
 * @returns {boolean}
 */
export const isValidProvider = (provider) => {
    return Object.values(SUPPORTED_PROVIDERS).includes(provider);
};

/**
 * Validate Ghana phone number
 * @param {string} phone - Phone number
 * @returns {boolean}
 */
export const isValidGhanaPhone = (phone) => {
    // Ghana numbers: 10 digits starting with 0, or 12 digits with +233
    const ghanaPattern = /^(\+233|0)[2-5][0-9]{8}$/;
    return ghanaPattern.test(phone.replace(/\s/g, ''));
};

/**
 * Normalize phone number to Paystack format
 * @param {string} phone - Phone number
 * @returns {string} Normalized phone (0XXXXXXXXX format)
 */
export const normalizePhoneNumber = (phone) => {
    const cleaned = phone.replace(/\s/g, '');

    // If starts with +233, convert to 0
    if (cleaned.startsWith('+233')) {
        return '0' + cleaned.substring(4);
    }

    // If starts with 233, convert to 0
    if (cleaned.startsWith('233')) {
        return '0' + cleaned.substring(3);
    }

    return cleaned;
};

/**
 * Initiate Mobile Money charge (Server-Side)
 * Uses Paystack's /charge endpoint for direct mobile money payment
 * @param {Object} params - Charge parameters
 * @param {string} params.email - Customer email
 * @param {number} params.amount - Amount in GHS (major currency)
 * @param {string} params.phone - Customer phone number
 * @param {string} params.provider - Mobile money provider ('mtn', 'vod', 'tgo')
 * @param {string} params.reference - Unique payment reference
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Charge response
 */
export const initiateMobileMoneyCharge = async ({ email, amount, phone, provider, reference, metadata }) => {
    try {
        const secretKey = process.env.PAYSTACK_SECRET_KEY;

        if (!secretKey) {
            throw new Error('PAYSTACK_SECRET_KEY not configured');
        }

        // Validate provider
        if (!isValidProvider(provider)) {
            throw new Error(`Invalid provider. Must be one of: ${Object.keys(SUPPORTED_PROVIDERS).join(', ')}`);
        }

        // Validate and normalize phone number
        if (!isValidGhanaPhone(phone)) {
            throw new Error('Invalid Ghana phone number format. Use 0XXXXXXXXX or +233XXXXXXXXX');
        }
        const normalizedPhone = normalizePhoneNumber(phone);

        // Convert amount to pesewas
        const amountInPesewas = formatAmountForPaystack(amount);

        logger.info(`Initiating mobile money charge: ${provider} - ${normalizedPhone} - GHS ${amount}`);

        try {
            const response = await axios.post(`${PAYSTACK_API_BASE}/charge`, {
                email,
                amount: amountInPesewas,
                mobile_money: {
                    phone: normalizedPhone,
                    provider: provider
                },
                currency: 'GHS',
                reference,
                metadata
            }, {
                headers: {
                    'Authorization': `Bearer ${secretKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000 // 30 second timeout
            });

            const result = response.data;

            if (!result.status) {
                logger.error('Paystack mobile money charge failed:', result);
                throw new Error(result.message || 'Failed to initiate mobile money charge');
            }

            logger.info(`Mobile money charge initiated: ${reference} (${result.data.status})`);

            return {
                reference: result.data.reference,
                status: result.data.status, // 'pending', 'success', etc.
                display_text: result.data.display_text || 'Check your phone to approve payment',
                message: 'Payment request sent to your phone. Please approve to complete the transaction.',
                provider,
                phone: normalizedPhone
            };
        } catch (axiosError) {
            // Handle timeout
            if (axiosError.code === 'ECONNABORTED') {
                logger.error('Paystack mobile money charge timeout (30s)');
                throw new Error('Payment gateway timeout. Please try again.');
            }

            // Handle network errors (DNS, connection refused, etc.)
            if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED' || axiosError.code === 'EAI_AGAIN') {
                logger.error(`Paystack Network Error: ${axiosError.code} - ${axiosError.message}`);
                logger.error('Full error:', axiosError);
                throw new Error('Payment gateway unreachable. Please check your internet connection.');
            }

            // Handle Paystack API errors (4xx, 5xx responses)
            if (axiosError.response) {
                const errorData = axiosError.response.data;
                logger.error('Paystack API Error:', {
                    status: axiosError.response.status,
                    data: errorData
                });
                throw new Error(errorData.message || 'Payment gateway returned an error. Please try again.');
            }

            // Unknown error
            logger.error('Error initiating mobile money charge:', axiosError);
            throw axiosError;
        }
    } catch (error) {

        logger.error('Error initiating mobile money charge:', error);
        throw error;
    }
};

/**
 * Get mobile money provider name
 * @param {string} code - Provider code
 * @returns {string} Provider display name
 */
export const getProviderName = (code) => {
    const names = {
        mtn: 'MTN Mobile Money',
        vod: 'Telecel Cash',
        tgo: 'AirtelTigo Money'
    };
    return names[code] || code;
};

export default {
    initiateMobileMoneyCharge,
    isValidProvider,
    isValidGhanaPhone,
    normalizePhoneNumber,
    getProviderName,
    SUPPORTED_PROVIDERS
};
