import * as emailLogRepository from '../db/repositories/emailLogRepository.js';
import { getQueue } from '../config/queue.js';
import logger from '../utils/logger.js';

/**
 * Email Controller (Admin)
 * Handles admin endpoints for email logs and statistics
 */

/**
 * Get email logs
 * GET /api/admin/emails/logs
 */
export const getEmailLogs = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 50,
            type,
            status,
            days,
        } = req.query;

        const result = await emailLogRepository.getEmailLogs({
            page: parseInt(page),
            limit: parseInt(limit),
            type,
            status,
            days: days ? parseInt(days) : null,
        });

        res.json({
            success: true,
            data: result.logs,
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get email statistics
 * GET /api/admin/emails/stats
 */
export const getEmailStats = async (req, res, next) => {
    try {
        const dbStats = await emailLogRepository.getEmailStats();

        // Get queue stats from pg-boss (may not be available)
        let queueWaiting = 0;
        try {
            const boss = getQueue();
            // pg-boss uses getJobCount or similar - wrap in try/catch in case API differs
            if (typeof boss.getQueueSize === 'function') {
                queueWaiting = await boss.getQueueSize('emails');
            } else if (typeof boss.getJobCount === 'function') {
                queueWaiting = await boss.getJobCount('emails', { state: 'created' });
            }
        } catch (queueError) {
            logger.warn('Could not get queue stats:', queueError.message);
        }

        const stats = {
            ...dbStats,
            queue: {
                waiting: queueWaiting || 0,
                active: 0,
                completed: 0,
                failed: 0,
                delayed: 0,
            },
        };

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Retry failed emails
 * POST /api/admin/emails/retry-failed
 */
export const retryFailedEmails = async (req, res, next) => {
    try {
        const { email_log_id } = req.body;
        const boss = getQueue();

        let requeuedCount = 0;

        if (email_log_id) {
            // Retry single email
            const log = await emailLogRepository.getEmailLogById(email_log_id);

            if (!log) {
                return res.status(404).json({
                    success: false,
                    message: 'Email log not found',
                });
            }

            if (log.status !== 'failed') {
                return res.status(400).json({
                    success: false,
                    message: 'Email is not in failed status',
                });
            }

            // Re-queue the email via pg-boss
            if (log.templateData) {
                // FIXED: Use stored template data
                await boss.send('emails', {
                    type: log.type,
                    to_email: log.toEmail,
                    subject: log.subject,
                    template: log.templateData.template,
                    variables: log.templateData.variables
                });
            } else {
                // Fallback for old logs without templateData
                await boss.send('emails', {
                    type: log.type,
                    to_email: log.toEmail,
                    subject: log.subject,
                    body: log.body || ''
                });
            }

            requeuedCount = 1;
        } else {
            // Retry all failed emails from last 24h (max 100)
            const failedEmails = await emailLogRepository.getFailedEmails(24, 100);

            for (const log of failedEmails) {
                try {
                    if (log.templateData) {
                        // FIXED: Use stored template data
                        await boss.send('emails', {
                            type: log.type,
                            to_email: log.toEmail,
                            subject: log.subject,
                            template: log.templateData.template,
                            variables: log.templateData.variables
                        });
                    } else {
                        // Fallback for old logs
                        await boss.send('emails', {
                            type: log.type,
                            to_email: log.toEmail,
                            subject: log.subject,
                            body: log.body || ''
                        });
                    }
                    requeuedCount++;
                } catch (error) {
                    logger.error(`Failed to requeue email ${log.id}:`, error);
                }
            }
        }

        res.json({
            success: true,
            requeuedCount,
            message: `${requeuedCount} email(s) requeued for retry`,
        });
    } catch (error) {
        next(error);
    }
};

export default {
    getEmailLogs,
    getEmailStats,
    retryFailedEmails,
};
