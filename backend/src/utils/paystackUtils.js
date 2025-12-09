import crypto from 'crypto';

/**
 * Generate unique order number
 * Format: ORD-YYYYMMDD-XXXXXX (6 random alphanumeric chars)
 * @returns {string} Order number
 */
export const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Generate 6 random uppercase alphanumeric characters
    const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase();

    return `ORD-${year}${month}${day}-${randomChars}`;
};

/**
 * Generate unique payment reference for Paystack
 * Format: ref_{timestamp}_{random}
 * @returns {string} Payment reference
 */
export const generatePaymentReference = () => {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `ref_${timestamp}_${random}`;
};

/**
 * Format amount for Paystack (convert to pesewas)
 * Paystack uses the smallest currency unit (pesewas for GHS, kobo for NGN, cents for USD)
 * For Ghana Cedis: 100 pesewas = 1 GHS
 * @param {number} amount - Amount in major currency unit (e.g., GHS)
 * @returns {number} Amount in minor currency unit (pesewas)
 */
export const formatAmountForPaystack = (amount) => {
    return Math.round(amount * 100);
};

/**
 * Format amount from Paystack (convert from pesewas)
 * @param {number} amount - Amount in minor currency unit (pesewas)
 * @returns {number} Amount in major currency unit (GHS)
 */
export const formatAmountFromPaystack = (amount) => {
    return amount / 100;
};

export default {
    generateOrderNumber,
    generatePaymentReference,
    formatAmountForPaystack,
    formatAmountFromPaystack,
};
