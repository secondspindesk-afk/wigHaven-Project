import * as stockRepository from '../db/repositories/stockRepository.js';
import logger from '../utils/logger.js';

/**
 * Adjust stock manually (admin only)
 * @param {string} variantId - Variant ID
 * @param {number} adjustment - Adjustment amount
 * @param {string} reason - Reason for adjustment
 * @param {string} adminId - Admin user ID
 * @returns {Promise<Object>} Adjustment result
 */
export const adjustStock = async (variantId, adjustment, reason, adminId) => {
    try {
        // Validate adjustment
        if (adjustment === 0) {
            const error = new Error('Adjustment cannot be zero');
            error.statusCode = 400;
            throw error;
        }

        // Perform adjustment
        const result = await stockRepository.adjustStock(
            variantId,
            adjustment,
            'adjustment',
            reason,
            adminId,
            null
        );

        // Check if stock went from 0 to > 0 (trigger back-in-stock alerts)
        if (result.previousStock === 0 && result.newStock > 0) {
            logger.info(`Back-in-stock alert triggered for variant ${variantId}`);

            // Import services dynamically to avoid circular dependencies
            const { getPrisma } = await import('../config/database.js');
            const emailService = await import('./emailService.js');
            const notificationService = (await import('./notificationService.js')).default;
            const sseService = (await import('./sseService.js')).default;

            const prisma = getPrisma();

            // Get all users waiting for this variant
            const alerts = await prisma.backInStockAlert.findMany({
                where: {
                    variantId,
                    notified: false
                },
                include: {
                    user: true,
                    variant: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            // Send notifications asynchronously (non-blocking)
            if (alerts.length > 0) {
                Promise.all(alerts.map(async (alert) => {
                    try {
                        // Send email
                        await emailService.sendBackInStockAlert(alert.user, alert.variant);

                        // Send in-app notification (DB + Real-time Push)
                        const notification = await notificationService.notifyBackInStock(alert.user, alert.variant);
                        if (notification) {
                            sseService.pushToUser(alert.user.id, notification);
                        }

                        // Mark as notified
                        await prisma.backInStockAlert.update({
                            where: { id: alert.id },
                            data: {
                                notified: true,
                                notifiedAt: new Date()
                            }
                        });

                        logger.info(`Back-in-stock alert (Email+App) sent to ${alert.user.email} for variant ${variantId}`);
                    } catch (error) {
                        logger.error(`Failed to send back-in-stock alert to ${alert.user.email}:`, error);
                    }
                })).catch((error) => {
                    logger.error('Error processing back-in-stock alerts:', error);
                });
            }
        }

        // Notify admins for low/out of stock (CRITICAL)
        const notificationService = (await import('./notificationService.js')).default;
        const settingsService = (await import('./settingsService.js')).default;
        const { getPrisma } = await import('../config/database.js');
        const prisma = getPrisma();

        // Get low stock threshold from settings (default to 5 if not set)
        const lowStockThreshold = Number(await settingsService.getSetting('lowStockThreshold')) || 5;

        const variant = await prisma.variant.findUnique({
            where: { id: variantId },
            include: { product: true }
        });

        if (variant) {
            if (result.newStock <= lowStockThreshold && result.newStock > 0 && result.previousStock > lowStockThreshold) {
                // Just dropped to low stock - notify admins
                await notificationService.notifyAdminLowStock(variant, variant.product);
            } else if (result.newStock === 0 && result.previousStock > 0) {
                // Just went out of stock - notify admins
                await notificationService.notifyAdminOutOfStock(variant, variant.product);
            }
        }

        return {
            variantId: result.variant.id,
            sku: result.variant.sku,
            productName: result.productName,
            previousStock: result.previousStock,
            newStock: result.newStock,
            adjustment,
            reason,
            createdAt: result.movement.createdAt,
        };
    } catch (error) {
        // Handle specific errors
        if (error.message.includes('Insufficient stock')) {
            error.statusCode = 409;
        } else if (error.message.includes('not found')) {
            error.statusCode = 404;
        }

        logger.error('Error adjusting stock:', error);
        throw error;
    }
};

/**
 * Get stock movements with filters
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Movements and pagination
 */
export const getMovements = async (options) => {
    try {
        const result = await stockRepository.getMovements(options);

        // Format movements for response
        const formattedMovements = result.movements.map((movement) => ({
            id: movement.id,
            variantId: movement.variantId,
            productName: movement.variant?.product?.name || 'Unknown',
            sku: movement.variant?.sku || 'Unknown',
            type: movement.type,
            quantity: movement.quantity,
            previousStock: movement.previousStock,
            newStock: movement.newStock,
            reason: movement.reason,
            orderId: movement.orderId,
            createdByAdmin: movement.createdByUser ? {
                id: movement.createdByUser.id,
                email: movement.createdByUser.email,
                name: `${movement.createdByUser.firstName || ''} ${movement.createdByUser.lastName || ''}`.trim(),
            } : null,
            createdAt: movement.createdAt,
        }));

        return {
            movements: formattedMovements,
            pagination: result.pagination,
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
 * @returns {Promise<Object>} Low stock variants
 */
export const getLowStock = async (threshold = 5, page = 1, limit = 50) => {
    try {
        const result = await stockRepository.getLowStockVariants(threshold, page, limit);

        // Format variants for response
        const formattedVariants = result.variants.map((variant) => ({
            productId: variant.product.id,
            productName: variant.product.name,
            variantId: variant.id,
            sku: variant.sku,
            color: variant.color,
            size: variant.size,
            length: variant.length,
            texture: variant.texture,
            stock: variant.stock,
            threshold,
            percentageOfThreshold: variant.percentageOfThreshold,
            reorderQuantity: variant.reorderQuantity,
        }));

        return {
            variants: formattedVariants,
            pagination: result.pagination,
        };
    } catch (error) {
        logger.error('Error getting low stock:', error);
        throw error;
    }
};

/**
 * Get stock summary
 * @returns {Promise<Object>} Stock summary
 */
export const getSummary = async () => {
    try {
        // Direct database query (fast enough without cache)
        const summary = await stockRepository.getStockSummary();
        return summary;
    } catch (error) {
        logger.error('Error getting stock summary:', error);
        throw error;
    }
};

export default {
    adjustStock,
    getMovements,
    getLowStock,
    getSummary,
};
