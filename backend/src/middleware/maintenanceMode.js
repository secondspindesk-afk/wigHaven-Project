import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';
import { ServiceUnavailableError } from './errorHandler.js';

import smartCache from '../utils/smartCache.js';

/**
 * Get maintenance mode status with caching
 * @returns {Promise<boolean>} true if maintenance mode is enabled
 */
const getMaintenanceStatus = async () => {
    return smartCache.getOrFetch(
        'maintenance:status',
        async () => {
            const prisma = getPrisma();
            const maintenanceSetting = await prisma.systemSetting.findFirst({
                where: {
                    OR: [
                        { key: 'maintenance_mode' },
                        { key: 'maintenanceMode' }
                    ]
                }
            });
            return maintenanceSetting?.value === 'true';
        },
        { type: 'maintenance', swr: true }
    );
};

/**
 * Invalidate maintenance cache (call this when setting changes)
 */
export const invalidateMaintenanceCache = () => {
    smartCache.del('maintenance:status');
};

/**
 * Maintenance Mode Middleware
 * Blocks access to API if maintenance mode is enabled
 * Allows access for:
 * - Super Admins / Admins
 * - Auth routes (login)
 * - Health check
 * - Admin routes
 */
export const maintenanceMode = async (req, res, next) => {
    try {
        // FIRST PRIORITY: Let admins through immediately (no DB check needed)
        // This prevents the issue where admin sessions still get blocked on shared endpoints
        if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
            return next();
        }

        // Skip for specific routes that are always allowed (needed for login page to work)
        if (req.path === '/api/auth/login' ||
            req.path === '/api/auth/refresh' ||
            req.path === '/api/auth/logout' ||
            req.path === '/api/auth/me' ||
            req.path === '/api/settings/public' ||
            req.path === '/api/cart' ||
            req.path.startsWith('/api/currency') ||
            req.path === '/api/products/categories' ||
            req.path.startsWith('/api/health') ||
            req.path.startsWith('/api/super-admin') ||
            req.path.startsWith('/api/admin')) {
            return next();
        }

        // Check maintenance mode status (cached for 10 seconds)
        const isMaintenanceMode = await getMaintenanceStatus();

        if (isMaintenanceMode) {
            // For non-admins during maintenance: return 503 with Retry-After header
            // This tells the client to STOP retrying and wait
            logger.warn(`[MAINTENANCE] Blocked request to ${req.path} from ${req.ip}`);

            // Set Retry-After header (1 hour = 3600 seconds)
            res.set('Retry-After', '3600');

            return res.status(503).json({
                success: false,
                error: 'MAINTENANCE_MODE',
                message: 'System is currently under maintenance. Please try again later.',
                retryAfter: 3600
            });
        }

        next();
    } catch (error) {
        logger.error('Maintenance middleware error:', error);
        next(); // Fail open to avoid blocking site on error
    }
};

export default maintenanceMode;
