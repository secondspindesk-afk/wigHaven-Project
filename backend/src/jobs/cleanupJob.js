import cron from 'node-cron';
import { getPrisma } from '../config/database.js';
import { logJobStart, logJobComplete, logJobError } from '../utils/cronLogger.js';

/**
 * Notification Cleanup Job
 * Runs weekly on Sunday at 3 AM to delete old read notifications (> 30 days)
 */
export const startNotificationCleanupJob = () => {
    // Weekly on Sunday at 3 AM: 0 3 * * 0
    cron.schedule('0 3 * * 0', async () => {
        const context = logJobStart('notification_cleanup');

        try {
            const prisma = getPrisma();

            // Delete notifications older than 30 days that are read
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            // FIXED: deleteMany doesn't support `take`, so we delete all matching records at once
            // Prisma will handle this efficiently
            const result = await prisma.notification.deleteMany({
                where: {
                    createdAt: {
                        lt: thirtyDaysAgo,
                    },
                    isRead: true,
                },
            });

            logJobComplete(context, {
                recordsChecked: result.count,
                recordsProcessed: result.count,
                recordsFailed: 0,
                details: `Deleted ${result.count} old notifications`,
            });
        } catch (error) {
            logJobError(context, error);
        }
    });
};

/**
 * Abandoned Cart Cleanup Job
 * Runs daily at 2:30 AM to delete abandoned carts older than 7 days
 * Optimized to use CASCADE DELETE
 */
export const startAbandonedCartCleanupJob = () => {
    // Daily at 2:30 AM: 30 2 * * *
    cron.schedule('30 2 * * *', async () => {
        const context = logJobStart('abandoned_cart_cleanup');

        try {
            const prisma = getPrisma();
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            // Delete old carts (cart_items are CASCADE deleted automatically)
            const userCartResult = await prisma.cart.deleteMany({
                where: {
                    updatedAt: {
                        lt: sevenDaysAgo,
                    },
                },
            });

            // Delete old guest carts (guest_cart_items are CASCADE deleted automatically)
            const guestCartResult = await prisma.guestCart.deleteMany({
                where: {
                    updatedAt: {
                        lt: sevenDaysAgo,
                    },
                },
            });

            const totalDeleted = userCartResult.count + guestCartResult.count;

            logJobComplete(context, {
                recordsChecked: totalDeleted,
                recordsProcessed: totalDeleted,
                recordsFailed: 0,
                details: `Deleted ${userCartResult.count} user carts and ${guestCartResult.count} guest carts`,
            });
        } catch (error) {
            logJobError(context, error);
        }
    });
};
