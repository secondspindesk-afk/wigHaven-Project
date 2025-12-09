import { getPrisma } from '../config/database.js';
import logger from './logger.js';

/**
 * Log Admin Activity
 * @param {string} adminId - ID of the admin user
 * @param {string} action - Action performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} resource - Resource affected (e.g., 'PRODUCT', 'ORDER')
 * @param {Object|string} details - Details of the action
 * @param {Object} req - Express request object (optional, for IP)
 */
export const logAdminActivity = async (adminId, action, resource, details, req = null) => {
    try {
        const prisma = getPrisma();

        let ipAddress = null;
        if (req) {
            ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        }

        await prisma.adminActivity.create({
            data: {
                adminId,
                action,
                resource,
                details: typeof details === 'object' ? JSON.stringify(details) : details,
                ipAddress
            }
        });
    } catch (error) {
        // Don't throw error to prevent blocking main flow
        logger.error('Failed to log admin activity:', error);
    }
};

export default logAdminActivity;
