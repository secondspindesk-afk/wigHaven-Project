import discountRepository from '../db/repositories/discountRepository.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Validate and apply a discount code
 * @param {string} code - The coupon code
 * @param {number} cartTotal - Current cart subtotal
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Object>} Discount details { valid: boolean, amount: number, code: string }
 */
export const validateDiscount = async (code, cartTotal, userId = null) => {
    try {
        const discount = await discountRepository.findDiscountByCode(code);

        if (!discount) {
            throw new Error('Invalid discount code');
        }

        if (!discount.isActive) {
            throw new Error('Discount code is inactive');
        }

        const now = new Date();
        if (now < discount.startsAt) {
            throw new Error('Discount code is not yet active');
        }
        if (now > discount.expiresAt) {
            throw new Error('Discount code has expired');
        }

        if (discount.maxUses && discount.usedCount >= discount.maxUses) {
            throw new Error('Discount code usage limit reached');
        }

        if (discount.minimumPurchase && cartTotal < parseFloat(discount.minimumPurchase)) {
            throw new Error(`Minimum purchase of $${discount.minimumPurchase} required`);
        }

        // Check per-customer usage limit
        if (userId && discount.usesPerCustomer) {
            const prisma = getPrisma();

            // Count how many times this user has used this specific coupon code
            // We check the 'Order' table where couponCode matches
            const userUsageCount = await prisma.order.count({
                where: {
                    userId: userId,
                    couponCode: code,
                    // Only count valid orders (not cancelled/failed) if you want strict limits
                    // For now, let's assume any order with the code counts
                    status: { notIn: ['cancelled', 'failed'] }
                }
            });

            if (userUsageCount >= discount.usesPerCustomer) {
                throw new Error(`You have already used this coupon the maximum number of times (${discount.usesPerCustomer})`);
            }
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (discount.type === 'percentage') {
            discountAmount = (cartTotal * parseFloat(discount.value)) / 100;
        } else if (discount.type === 'fixed') {
            discountAmount = parseFloat(discount.value);
        }

        // Ensure discount doesn't exceed total
        if (discountAmount > cartTotal) {
            discountAmount = cartTotal;
        }

        return {
            valid: true,
            code: discount.code,
            type: discount.type,
            value: parseFloat(discount.value),
            amount: parseFloat(discountAmount.toFixed(2))
        };

    } catch (error) {
        logger.warn(`Discount validation failed for code ${code}: ${error.message}`);
        error.statusCode = 400; // Ensure it's treated as a client error
        throw error;
    }
};

export const deleteDiscount = async (id) => {
    return await discountRepository.deleteDiscount(id);
};

/**
 * Create a new discount
 */
export const createDiscount = async (data) => {
    // Basic validation
    if (!data.code || !data.type || !data.value) {
        throw new Error('Missing required fields: code, type, and value are required');
    }

    // Validate discount type and value
    if (data.type === 'percentage') {
        if (data.value <= 0 || data.value > 100) {
            throw new Error('Percentage discount must be between 1 and 100');
        }
    } else if (data.type === 'fixed') {
        if (data.value <= 0) {
            throw new Error('Fixed discount amount must be greater than 0');
        }
    } else {
        throw new Error('Invalid discount type. Must be "percentage" or "fixed"');
    }

    // Check if code already exists
    const existing = await discountRepository.findDiscountByCode(data.code);
    if (existing) {
        throw new Error(`Discount code "${data.code}" already exists`);
    }

    return await discountRepository.createDiscount(data);
};

/**
 * Get all discounts
 */
export const getAllDiscounts = async () => {
    return await discountRepository.getAllDiscounts();
};

export const getDiscountById = async (id) => {
    return await discountRepository.findDiscountById(id);
};

export const updateDiscount = async (id, data) => {
    return await discountRepository.updateDiscount(id, data);
};

export const incrementUsage = async (code) => {
    const discount = await discountRepository.findDiscountByCode(code);
    if (discount) {
        return await discountRepository.incrementUsage(discount.id);
    }
};

/**
 * Decrement discount usage (for order cancellation/failure)
 * @param {string} code - The coupon code
 * @returns {Promise<void>}
 */
export const decrementUsage = async (code) => {
    const discount = await discountRepository.findDiscountByCode(code);
    if (discount) {
        return await discountRepository.decrementUsage(discount.id);
    }
};

export default {
    validateDiscount,
    createDiscount,
    getAllDiscounts,
    getDiscountById,
    updateDiscount,
    deleteDiscount,
    incrementUsage,
    decrementUsage
};
