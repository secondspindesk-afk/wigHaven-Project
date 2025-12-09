import cron from 'node-cron';
import { getPrisma } from '../config/database.js';
import { logJobStart, logJobComplete, logJobError } from '../utils/cronLogger.js';
import logger from '../utils/logger.js';

/**
 * Notification Cleanup Job
 * Runs daily at 3 AM to delete expired and old notifications
 * - Deletes notifications past their expiresAt date
 * - Deletes notifications older than 30 days (default retention)
 */
export const startNotificationCleanupJob = () => {
    // Daily at 3 AM: 0 3 * * *
    cron.schedule('0 3 * * *', async () => {
        const context = logJobStart('notification_cleanup');

        try {
            const prisma = getPrisma();
            const now = new Date();

            // Calculate 30 days ago for default retention
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Delete expired or old notifications
            const result = await prisma.notification.deleteMany({
                where: {
                    OR: [
                        // Notifications past their expiry date
                        {
                            expiresAt: {
                                not: null,
                                lte: now
                            }
                        },
                        // Notifications older than 30 days (regardless of expiresAt)
                        {
                            createdAt: {
                                lte: thirtyDaysAgo
                            }
                        }
                    ]
                }
            });

            logJobComplete(context, {
                recordsChecked: 0, // We delete in bulk, no individual check
                recordsProcessed: result.count,
                recordsFailed: 0,
                details: `Deleted ${result.count} expired/old notifications`
            });

            logger.info(`Notification cleanup complete: ${result.count} notifications deleted`);
        } catch (error) {
            logJobError(context, error);
            logger.error('Notification cleanup job failed:', error);
        }
    });

    logger.info('📬 Notification Cleanup Job scheduled (daily at 3 AM)');
};

export default {
    startNotificationCleanupJob
};
