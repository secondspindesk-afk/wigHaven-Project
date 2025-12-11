import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';
import { ServiceUnavailableError } from './errorHandler.js';

// Cache maintenance status to avoid DB query on every request
// Short TTL (10 seconds) balances responsiveness with performance
let maintenanceCache = {
    value: null,
    expiresAt: 0
};
const CACHE_TTL_MS = 10_000; // 10 seconds

/**
 * Get maintenance mode status with caching
 * @returns {Promise<boolean>} true if maintenance mode is enabled
 */
const getMaintenanceStatus = async () => {
    const now = Date.now();

    // Return cached value if still valid
    if (maintenanceCache.value !== null && now < maintenanceCache.expiresAt) {
        return maintenanceCache.value;
    }

    const prisma = getPrisma();

    const maintenanceSetting = await prisma.systemSetting.findFirst({
        where: {
            OR: [
                { key: 'maintenance_mode' },
                { key: 'maintenanceMode' }
            ]
        }
    });

    const isEnabled = maintenanceSetting?.value === 'true';

    // Cache the result
    maintenanceCache = {
        value: isEnabled,
        expiresAt: now + CACHE_TTL_MS
    };

    return isEnabled;
};

/**
 * Invalidate maintenance cache (call this when setting changes)
 */
export const invalidateMaintenanceCache = () => {
    maintenanceCache = { value: null, expiresAt: 0 };
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
