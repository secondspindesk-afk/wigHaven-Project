import { getQueue } from '../config/queue.js';
import logger from '../utils/logger.js';

/**
 * Queue email for processing by email worker
 * Uses pg-boss for PostgreSQL-based job queue
 */
export const queueEmail = async (emailData) => {
    try {
        const boss = getQueue();

        // Queue the email job
        const jobId = await boss.send('emails', emailData, {
            retryLimit: 3,
            retryDelay: 60, // 1 minute
            expireInSeconds: 3600 // 1 hour
        });

        logger.info(`Email queued: ${emailData.type} to ${emailData.to_email}, jobId: ${jobId}`);
        return { success: true, jobId };
    } catch (error) {
        logger.error('Failed to queue email:', error);
        return { success: false, error: error.message };
    }
};

export default {
    queueEmail
};
