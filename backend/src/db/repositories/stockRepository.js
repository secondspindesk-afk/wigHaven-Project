import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Adjust stock for a variant (atomic operation)
 * @param {string} variantId - Variant ID
 * @param {number} adjustment - Adjustment amount (positive or negative)
 * @param {string} type - Movement type (adjustment, sale, return, restock)
 * @param {string} reason - Reason for adjustment
 * @param {string} createdBy - Admin user ID (for adjustments)
 * @param {string} orderId - Order ID (for sales/returns)
 * @returns {Promise<Object>} Updated variant and movement record
 */
export const adjustStock = async (variantId, adjustment, type, reason = null, createdBy = null, orderId = null) => {
    try {
        const prisma = getPrisma();

        // Use transaction to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get current state (for logging/validation)
            const variant = await tx.variant.findUnique({
                where: { id: variantId },
                include: { product: { select: { name: true } } }
            });

            if (!variant) throw new Error('Variant not found');

            // 2. Validate sufficient stock for deduction
            if (adjustment < 0 && variant.stock + adjustment < 0) {
                throw new Error(`Insufficient stock. Current: ${variant.stock}, Requested: ${Math.abs(adjustment)}`);
            }

            // 3. Atomic Update (The "Gospel Truth" way to handle concurrency)
            // Using increment handles the race condition at the DB level
            const updatedVariant = await tx.variant.update({
                where: { id: variantId },
                data: {
                    stock: { increment: adjustment }
                }
            });

            // 4. Create movement record
            const movement = await tx.stockMovement.create({
                data: {
                    variantId,
                    orderId,
                    type,
                    quantity: adjustment,
                    previousStock: variant.stock, // Snapshot at start of tx
                    newStock: updatedVariant.stock, // Actual new value from DB
                    reason,
                    createdBy,
                },
            });

            return {
                variant: updatedVariant,
                movement,
                previousStock: variant.stock,
                newStock: updatedVariant.stock,
                productName: variant.product.name,
            };
        });

        logger.info(`Stock adjusted: ${variantId} (${result.previousStock} → ${result.newStock})`);
        return result;
    } catch (error) {
        logger.error(`Error adjusting stock for variant ${variantId}:`, error);
        throw error;
    }
};

/**
 * Get stock movements with filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Movements and pagination
 */
export const getMovements = async ({ page = 1, limit = 50, variantId = null, type = null, days = null }) => {
    try {
        const prisma = getPrisma();
        const skip = (page - 1) * limit;

        const where = {};

        if (variantId) {
            where.variantId = variantId;
        }

        if (type) {
            where.type = type;
        }

        if (days) {
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - days);
            where.createdAt = {
                gte: dateThreshold,
            };
        }

        const [movements, total] = await Promise.all([
            prisma.stockMovement.findMany({
                where,
                include: {
                    variant: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    createdByUser: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.stockMovement.count({ where }),
        ]);

        return {
            movements,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error('Error getting stock movements:', error);
        throw error;
    }
};

/**
 * Get low stock variants
 * @param {number} threshold - Stock threshold
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Low stock variants and pagination
 */
export const getLowStockVariants = async (threshold = 5, page = 1, limit = 50) => {
    try {
        const prisma = getPrisma();
        const skip = (page - 1) * limit;

        const where = {
            stock: {
                lte: threshold,
            },
            isActive: true,
        };

        const [variants, total] = await Promise.all([
            prisma.variant.findMany({
                where,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { stock: 'asc' },
                skip,
                take: limit,
            }),
            prisma.variant.count({ where }),
        ]);

        // Calculate additional metrics
        const enrichedVariants = variants.map((variant) => ({
            ...variant,
            percentageOfThreshold: threshold > 0 ? (variant.stock / threshold) : 0,
            reorderQuantity: threshold * 2,
        }));

        return {
            variants: enrichedVariants,
            total,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error('Error getting low stock variants:', error);
        throw error;
    }
};

/**
 * Get stock summary statistics
 * @returns {Promise<Object>} Stock summary
 */
export const getStockSummary = async () => {
    try {
        const prisma = getPrisma();

        // Get variant counts
        const [totalVariants, inStock, lowStock, outOfStock] = await Promise.all([
            prisma.variant.count({ where: { isActive: true } }),
            prisma.variant.count({ where: { isActive: true, stock: { gt: 5 } } }),
            prisma.variant.count({ where: { isActive: true, stock: { gt: 0, lte: 5 } } }),
            prisma.variant.count({ where: { isActive: true, stock: 0 } }),
        ]);

        // Get total units
        const totalUnitsResult = await prisma.variant.aggregate({
            where: { isActive: true },
            _sum: {
                stock: true,
            },
        });

        // Get movements today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const movementsToday = await prisma.stockMovement.count({
            where: {
                createdAt: {
                    gte: today,
                },
            },
        });

        // Get movements this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const movementsThisWeek = await prisma.stockMovement.count({
            where: {
                createdAt: {
                    gte: weekAgo,
                },
            },
        });

        return {
            totalVariants,
            inStock,
            lowStock,
            outOfStock,
            totalUnits: totalUnitsResult._sum.stock || 0,
            movementsToday,
            movementsThisWeek,
        };
    } catch (error) {
        logger.error('Error getting stock summary:', error);
        throw error;
    }
};

export default {
    adjustStock,
    getMovements,
    getLowStockVariants,
    getStockSummary,
};
