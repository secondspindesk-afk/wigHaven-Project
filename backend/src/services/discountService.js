import discountRepository from '../db/repositories/discountRepository.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';
import adminBroadcast from '../utils/adminBroadcast.js';
import smartCache from '../utils/smartCache.js';

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
    const result = await discountRepository.deleteDiscount(id);
    await adminBroadcast.notifyDiscountsChanged();
    return result;
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

    const result = await discountRepository.createDiscount(data);
    await adminBroadcast.notifyDiscountsChanged();
    return result;
};

/**
 * Get all discounts
 */
export const getAllDiscounts = async () => {
    return smartCache.getOrFetch(
        smartCache.keys.discountsAll(),
        () => discountRepository.getAllDiscounts(),
        { type: 'discounts', swr: true }
    );
};

export const getDiscountById = async (id) => {
    return await discountRepository.findDiscountById(id);
};

export const updateDiscount = async (id, data) => {
    // OPTIMIZATION: Handle _changedFields directive
    const frontendChangedFields = data._changedFields;
    delete data._changedFields;

    // Skip if no changes
    if (frontendChangedFields && frontendChangedFields.length === 0) {
        logger.info(`[PERF] No changes for discount ${id}, skipping update`);
        return await discountRepository.findDiscountById(id);
    }

    const result = await discountRepository.updateDiscount(id, data);

    // Conditional cache invalidation
    const publicFields = ['code', 'type', 'value', 'isActive', 'startsAt', 'expiresAt', 'minimumPurchase'];
    const hasPublicChanges = !frontendChangedFields || frontendChangedFields.some(f => publicFields.includes(f));

    if (hasPublicChanges) {
        await adminBroadcast.notifyDiscountsChanged();
    } else {
        logger.info(`[PERF] Skipping discount cache invalidation - no public changes`);
    }

    return result;
};

export const incrementUsage = async (code) => {
    const discount = await discountRepository.findDiscountByCode(code);
    if (discount) {
        const result = await discountRepository.incrementUsage(discount.id);
        await adminBroadcast.notifyDiscountsChanged();
        return result;
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
        const result = await discountRepository.decrementUsage(discount.id);
        await adminBroadcast.notifyDiscountsChanged();
        return result;
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
