import cron from 'node-cron';
import { getPrisma } from '../config/database.js';
import { moveToTrash } from '../config/imagekit.js';
import { logJobStart, logJobComplete, logJobError } from '../utils/cronLogger.js';
import logger from '../utils/logger.js';

/**
 * Orphaned Media Cleanup Job
 * Runs weekly on Sunday at 4 AM to soft-delete media that has been unused for > 7 days
 */
export const startCleanupOrphanedMediaJob = () => {
    // Weekly on Sunday at 4 AM: 0 4 * * 0
    cron.schedule('0 4 * * 0', async () => {
        const context = logJobStart('orphaned_media_cleanup');

        try {
            const prisma = getPrisma();
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            // Find orphaned media (unused and active, created > 7 days ago)
            const orphanedMedia = await prisma.media.findMany({
                where: {
                    usedBy: null,
                    status: 'active',
                    createdAt: {
                        lt: sevenDaysAgo,
                    },
                },
            });

            if (orphanedMedia.length === 0) {
                logJobComplete(context, {
                    recordsChecked: 0,
                    recordsProcessed: 0,
                    recordsFailed: 0,
                    details: 'No orphaned media found',
                });
                return;
            }

            let processedCount = 0;
            let failedCount = 0;

            for (const media of orphanedMedia) {
                try {
                    // Move file in ImageKit
                    const moveResult = await moveToTrash(media.fileId, media.filePath);

                    // Update database
                    await prisma.media.update({
                        where: { id: media.id },
                        data: {
                            status: 'trashed',
                            trashedAt: new Date(),
                            trashedBy: 'system', // Special value for automated cleanup
                            filePath: moveResult.newPath
                        }
                    });

                    // Log activity (optional, but good for audit)
                    // We might skip AdminActivity for system jobs to avoid clutter, 
                    // or create a system user. For now, we'll skip AdminActivity.

                    processedCount++;
                } catch (error) {
                    logger.error(`Failed to cleanup orphaned media ${media.id}:`, error);
                    failedCount++;
                }
            }

            logJobComplete(context, {
                recordsChecked: orphanedMedia.length,
                recordsProcessed: processedCount,
                recordsFailed: failedCount,
                details: `Cleaned up ${processedCount} orphaned media files`,
            });
        } catch (error) {
            logJobError(context, error);
        }
    });
};
