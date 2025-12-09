import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Unsubscribe from all emails (public endpoint)
 * POST /api/unsubscribe
 */
export const unsubscribe = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const prisma = getPrisma();

        await prisma.emailPreferences.upsert({
            where: { email },
            update: {
                unsubscribedFromAll: true,
                updatedAt: new Date()
            },
            create: {
                email,
                unsubscribedFromAll: true,
                marketingEmails: false,
                abandonedCartEmails: false,
                backInStockEmails: false
            }
        });

        logger.info(`User unsubscribed: ${email}`);

        res.json({
            success: true,
            message: 'Successfully unsubscribed from all emails'
        });
    } catch (error) {
        logger.error('Unsubscribe error:', error);
        next(error);
    }
};

/**
 * Get email preferences (authenticated)
 * GET /api/unsubscribe/preferences
 */
export const getPreferences = async (req, res, next) => {
    try {
        const { email } = req.user;
        const prisma = getPrisma();

        const prefs = await prisma.emailPreferences.findUnique({
            where: { email }
        });

        // Return defaults if no preferences exist
        const preferences = prefs || {
            unsubscribedFromAll: false,
            marketingEmails: true,
            abandonedCartEmails: true,
            backInStockEmails: true
        };

        res.json({
            success: true,
            data: preferences
        });
    } catch (error) {
        logger.error('Get preferences error:', error);
        next(error);
    }
};

/**
 * Update email preferences (authenticated)
 * PUT /api/unsubscribe/preferences
 */
export const updatePreferences = async (req, res, next) => {
    try {
        const { email, id: userId } = req.user;
        const { marketingEmails, abandonedCartEmails, backInStockEmails } = req.body;

        // Validate inputs
        if (typeof marketingEmails !== 'boolean' ||
            typeof abandonedCartEmails !== 'boolean' ||
            typeof backInStockEmails !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'All preference fields must be boolean'
            });
        }

        const prisma = getPrisma();

        // Check if user has unsubscribed from all
        const unsubscribedFromAll = !marketingEmails && !abandonedCartEmails && !backInStockEmails;

        const prefs = await prisma.emailPreferences.upsert({
            where: { email },
            update: {
                marketingEmails,
                abandonedCartEmails,
                backInStockEmails,
                unsubscribedFromAll,
                updatedAt: new Date()
            },
            create: {
                userId,
                email,
                marketingEmails,
                abandonedCartEmails,
                backInStockEmails,
                unsubscribedFromAll
            }
        });

        logger.info(`Email preferences updated for ${email}`);

        res.json({
            success: true,
            data: prefs,
            message: 'Email preferences updated successfully'
        });
    } catch (error) {
        logger.error('Update preferences error:', error);
        next(error);
    }
};

export default {
    unsubscribe,
    getPreferences,
    updatePreferences
};
