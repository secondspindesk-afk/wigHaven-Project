import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Create a new discount code
 * @param {Object} data - Discount data
 * @returns {Promise<Object>} Created discount
 */
export const createDiscount = async (data) => {
    try {
        const prisma = getPrisma();
        return await prisma.discountCode.create({
            data
        });
    } catch (error) {
        logger.error('Error creating discount:', error);
        throw error;
    }
};

/**
 * Find discount by code
 * @param {string} code - Discount code
 * @returns {Promise<Object|null>} Discount or null
 */
export const findDiscountByCode = async (code) => {
    try {
        const prisma = getPrisma();
        return await prisma.discountCode.findUnique({
            where: { code }
        });
    } catch (error) {
        logger.error(`Error finding discount ${code}:`, error);
        throw error;
    }
};

/**
 * Find discount by ID
 * @param {string} id - Discount ID
 * @returns {Promise<Object|null>} Discount or null
 */
export const findDiscountById = async (id) => {
    try {
        const prisma = getPrisma();
        return await prisma.discountCode.findUnique({
            where: { id }
        });
    } catch (error) {
        logger.error(`Error finding discount ${id}:`, error);
        throw error;
    }
};

/**
 * Update discount usage
 * @param {string} id - Discount ID
 * @returns {Promise<Object>} Updated discount
 */
export const incrementUsage = async (id) => {
    try {
        const prisma = getPrisma();
        return await prisma.discountCode.update({
            where: { id },
            data: { usedCount: { increment: 1 } }
        });
    } catch (error) {
        logger.error(`Error incrementing usage for discount ${id}:`, error);
        throw error;
    }
};

/**
 * Decrement discount usage count (for order cancellation/failure)
 * @param {string} id - Discount ID
 * @returns {Promise<Object>} Updated discount
 */
export const decrementUsage = async (id) => {
    try {
        const prisma = getPrisma();
        // First check current usage to prevent going negative
        const discount = await prisma.discountCode.findUnique({
            where: { id }
        });

        if (!discount || discount.usedCount <= 0) {
            logger.warn(`Cannot decrement usage for discount ${id}: already at 0 or not found`);
            return discount;
        }

        return await prisma.discountCode.update({
            where: { id },
            data: { usedCount: { decrement: 1 } }
        });
    } catch (error) {
        logger.error(`Error decrementing usage for discount ${id}:`, error);
        throw error;
    }
};

/**
 * Get all discounts (Admin)
 */
export const getAllDiscounts = async () => {
    try {
        const prisma = getPrisma();
        return await prisma.discountCode.findMany({
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        logger.error('Error getting all discounts:', error);
        throw error;
    }
};

/**
 * Delete discount
 */
export const deleteDiscount = async (id) => {
    try {
        const prisma = getPrisma();
        return await prisma.discountCode.delete({
            where: { id }
        });
    } catch (error) {
        logger.error(`Error deleting discount ${id}:`, error);
        throw error;
    }
};

export default {
    createDiscount,
    findDiscountByCode,
    findDiscountById,
    incrementUsage,
    decrementUsage,
    getAllDiscounts,
    deleteDiscount,
    updateDiscount: async (id, data) => {
        try {
            const prisma = getPrisma();
            return await prisma.discountCode.update({
                where: { id },
                data
            });
        } catch (error) {
            logger.error(`Error updating discount ${id}:`, error);
            throw error;
        }
    }
};
