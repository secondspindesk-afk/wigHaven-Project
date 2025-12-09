import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Create a new webhook log
 * @param {Object} data - Log data
 * @returns {Promise<Object>} Created log
 */
export const createLog = async (data) => {
    try {
        const prisma = getPrisma();
        return await prisma.webhookLog.create({
            data,
        });
    } catch (error) {
        logger.error('Error creating webhook log:', error);
        // Don't throw, we don't want logging to break the flow
        return null;
    }
};

/**
 * Get webhook logs with pagination
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Logs and pagination
 */
export const getLogs = async ({ page = 1, limit = 20, status, event }) => {
    try {
        const prisma = getPrisma();
        const skip = (page - 1) * limit;

        const where = {};
        if (status) where.status = status;
        if (event) where.event = event;

        const [logs, total] = await Promise.all([
            prisma.webhookLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.webhookLog.count({ where }),
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
        logger.error('Error getting webhook logs:', error);
        throw error;
    }
};

export default {
    createLog,
    getLogs,
};
