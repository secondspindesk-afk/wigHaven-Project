import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Subscribe to back-in-stock alerts
 * POST /api/stock/notify
 */
export const subscribeToRestock = async (req, res) => {
    try {
        const { variantId, email } = req.body;
        const userId = req.user ? req.user.id : null;

        if (!variantId || !email) {
            return res.status(400).json({
                success: false,
                error: 'Variant ID and email are required'
            });
        }

        const prisma = getPrisma();

        // Check if variant exists
        const variant = await prisma.variant.findUnique({
            where: { id: variantId },
            include: { product: true }
        });

        if (!variant) {
            return res.status(404).json({
                success: false,
                error: 'Product variant not found'
            });
        }

        // Check if already subscribed
        const existingAlert = await prisma.backInStockAlert.findFirst({
            where: {
                variantId,
                email,
                notified: false
            }
        });

        if (existingAlert) {
            return res.status(409).json({
                success: false,
                error: 'You are already subscribed to alerts for this item'
            });
        }

        // Create alert
        await prisma.backInStockAlert.create({
            data: {
                userId,
                email,
                variantId,
                notified: false
            }
        });

        res.status(201).json({
            success: true,
            message: 'You will be notified when this item is back in stock'
        });

    } catch (error) {
        logger.error('Subscribe Restock Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to subscribe to alerts'
        });
    }
};

/**
 * Unsubscribe from back-in-stock alerts
 * DELETE /api/stock/notify/:variantId
 */
export const unsubscribeFromRestock = async (req, res) => {
    try {
        const { variantId } = req.params;
        const { email } = req.body; // Or from query/user context

        if (!variantId || !email) {
            return res.status(400).json({
                success: false,
                error: 'Variant ID and email are required'
            });
        }

        const prisma = getPrisma();

        // Delete pending alerts
        const result = await prisma.backInStockAlert.deleteMany({
            where: {
                variantId,
                email,
                notified: false
            }
        });

        if (result.count === 0) {
            return res.status(404).json({
                success: false,
                error: 'Subscription not found'
            });
        }

        res.json({
            success: true,
            message: 'Unsubscribed from alerts'
        });

    } catch (error) {
        logger.error('Unsubscribe Restock Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unsubscribe'
        });
    }
};

export default {
    subscribeToRestock,
    unsubscribeFromRestock
};
