import { queueEmail as addToQueue } from '../config/simpleEmailQueue.js';
import logger from '../utils/logger.js';

/**
 * Queue email for async processing
 * 
 * Uses simple in-memory EventEmitter queue (replaced pg-boss)
 * - No database connections required
 * - Retry with exponential backoff
 * - Error logging to EmailLog table
 */
export const queueEmail = (emailData) => {
    try {
        const jobId = addToQueue(emailData);

        if (jobId) {
            logger.info(`Email queued: ${emailData.type} to ${emailData.toEmail || emailData.to_email}, jobId: ${jobId}`);
            return { success: true, jobId };
        } else {
            logger.warn('Email queue rejected job (queue full or shutting down)');
            return { success: false, error: 'Queue unavailable' };
        }
    } catch (error) {
        logger.error('Failed to queue email:', error);
        return { success: false, error: error.message };
    }
};

export default {
    queueEmail
};
