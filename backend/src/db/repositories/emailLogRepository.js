import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Email Log Repository
 * Handles email logging database operations
 */

/**
 * Create email log entry
 * @param {Object} logData - Log data
 * @returns {Promise<Object>} Created log
 */
export const createEmailLog = async (logData) => {
    try {
        const prisma = getPrisma();

        const log = await prisma.emailLog.create({
            data: {
                type: logData.type,
                toEmail: logData.toEmail,
                subject: logData.subject,
                status: logData.status,
                attemptCount: logData.attemptCount || 1,
                maxAttempts: logData.maxAttempts || 3,
                lastError: logData.lastError || null,
                messageId: logData.messageId || null,
                sentAt: logData.sentAt || null,
            },
        });

        return log;
    } catch (error) {
        logger.error('Failed to create email log:', error);
        throw error;
    }
};

/**
 * Get email logs with filters
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Logs and pagination
 */
export const getEmailLogs = async ({ page = 1, limit = 50, type = null, status = null, days = null }) => {
    try {
        const prisma = getPrisma();
        const skip = (page - 1) * limit;

        const where = {};

        if (type) {
            where.type = type;
        }

        if (status) {
            where.status = status;
        }

        if (days) {
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - days);
            where.createdAt = {
                gte: dateThreshold,
            };
        }

        const [logs, total] = await Promise.all([
            prisma.emailLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.emailLog.count({ where }),
        ]);

        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error('Failed to get email logs:', error);
        throw error;
    }
};

/**
 * Get email statistics
 * @returns {Promise<Object>} Email statistics
 */
export const getEmailStats = async () => {
    try {
        const prisma = getPrisma();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalSentToday, totalFailedToday, pendingCount] = await Promise.all([
            prisma.emailLog.count({
                where: {
                    status: 'sent',
                    createdAt: { gte: today },
                },
            }),
            prisma.emailLog.count({
                where: {
                    status: 'failed',
                    createdAt: { gte: today },
                },
            }),
            prisma.emailLog.count({
                where: {
                    status: 'queued',
                },
            }),
        ]);

        const totalToday = totalSentToday + totalFailedToday;
        const successRate = totalToday > 0 ? (totalSentToday / totalToday) * 100 : 100;

        // Queue health based on pending count
        let queueHealth = 'healthy';
        if (pendingCount > 100) {
            queueHealth = 'degraded';
        }
        if (pendingCount > 500) {
            queueHealth = 'unhealthy';
        }

        return {
            totalSentToday,
            totalFailedToday,
            successRate: parseFloat(successRate.toFixed(2)),
            pendingCount,
            queueHealth,
        };
    } catch (error) {
        logger.error('Failed to get email stats:', error);
        throw error;
    }
};

/**
 * Get failed emails for retry
 * @param {number} hours - Hours to look back (default 24)
 * @param {number} limit - Max emails to return
 * @returns {Promise<Array>} Failed email logs
 */
export const getFailedEmails = async (hours = 24, limit = 100) => {
    try {
        const prisma = getPrisma();

        const timeThreshold = new Date();
        timeThreshold.setHours(timeThreshold.getHours() - hours);

        const failedEmails = await prisma.emailLog.findMany({
            where: {
                status: 'failed',
                createdAt: { gte: timeThreshold },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return failedEmails;
    } catch (error) {
        logger.error('Failed to get failed emails:', error);
        throw error;
    }
};

/**
 * Get single email log by ID
 * @param {string} id - Email log ID
 * @returns {Promise<Object>} Email log
 */
export const getEmailLogById = async (id) => {
    try {
        const prisma = getPrisma();

        const log = await prisma.emailLog.findUnique({
            where: { id },
        });

        return log;
    } catch (error) {
        logger.error(`Failed to get email log ${id}:`, error);
        throw error;
    }
};

export default {
    createEmailLog,
    getEmailLogs,
    getEmailStats,
    getFailedEmails,
    getEmailLogById,
};
