import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { NotFoundError } from './errorHandler.js';

dotenv.config();

/**
 * Super Admin Authentication Middleware
 * Validates access via hidden credentials (email + secret)
 * Returns 404 Not Found if validation fails to hide the endpoint
 */
export const superAdminAuth = (req, res, next) => {
    try {
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
        const superAdminSecret = process.env.SUPER_ADMIN_SECRET;

        // If credentials are not set in env, disable the feature safely
        if (!superAdminEmail || !superAdminSecret) {
            logger.warn('Super Admin credentials not set in environment variables');
            // If secret not configured, pretend route doesn't exist
            return next(new NotFoundError('Not found'));
        }

        // Check if user is already authenticated as super_admin via JWT
        if (req.user && req.user.role === 'super_admin') {
            logger.info(`[SUPER_ADMIN] Access granted via JWT role to ${req.user.email}`);
            req.isSuperAdmin = true;
            return next();
        }

        // Check credentials
        // Prioritize authenticated user (req.user) to avoid conflict with request body (e.g., updating another user)
        const email = req.user?.email || req.headers['x-super-admin-email'] || req.query.email || req.body.email;
        const secret = req.headers['x-super-admin-secret'];

        // IP Whitelist Check (Optional)
        const whitelist = process.env.SUPER_ADMIN_WHITELIST; // Comma-separated IPs
        if (whitelist) {
            const allowedIPs = whitelist.split(',').map(ip => ip.trim());
            const requestIP = req.ip || req.headers['x-forwarded-for'] || 'unknown';

            // Handle localhost IPv6 mapping
            const normalizedIP = requestIP === '::1' ? '127.0.0.1' : requestIP;

            if (!allowedIPs.includes(normalizedIP)) {
                logger.warn(`[SUPER_ADMIN] Blocked access from non-whitelisted IP: ${normalizedIP}`);
                return next(new NotFoundError('Not found'));
            }
        }

        // Strict check
        if (email === superAdminEmail && secret === superAdminSecret) {
            logger.info(`[SUPER_ADMIN] Access granted to ${email}`);
            req.isSuperAdmin = true;
            next();
        } else {
            logger.warn(`[SUPER_ADMIN] Failed access attempt. Email: ${email || 'unknown'}, IP: ${req.ip}`);
            // Return 404 to hide existence
            next(new NotFoundError('Not found'));
        }
    } catch (error) {
        logger.error('Super Admin Auth Error:', error);
        // Fail closed - pretend not found
        next(new NotFoundError('Not found'));
    }
};

/**
 * Middleware to protect routes that require Super Admin session
 * Assumes a token or session mechanism is used after login, 
 * OR requires the secret header on every request.
 * For this implementation, we'll require the secret header on every request for simplicity and security.
 */
export const requireSuperAdminSecret = (req, res, next) => {
    const superAdminSecret = process.env.SUPER_ADMIN_SECRET;
    // Check secret header
    const requestSecret = req.headers['x-super-admin-secret'];
    if (!requestSecret || requestSecret !== superAdminSecret) {
        return next(new NotFoundError('Not found'));
    }
    next();
};
