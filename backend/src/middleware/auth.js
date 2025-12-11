import { verifyToken, extractTokenFromHeader } from '../utils/tokenUtils.js';
import { UnauthorizedError, ForbiddenError } from './errorHandler.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Authentication middleware to verify JWT tokens
 * Checks Authorization: Bearer <token>
 * Validates JWT signature and expiry
 * Sets req.user = decoded token payload
 */
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        // Check custom header first (Hybrid Arch support) or standard header
        const token = req.headers['x-auth-token'] || extractTokenFromHeader(authHeader);

        if (!token) {
            throw new UnauthorizedError('Access token required');
        }

        // Verify token FIRST (synchronous, no DB needed)
        // This avoids unnecessary DB calls for invalid/expired tokens
        const decoded = verifyToken(token);

        if (!decoded || !decoded.sub) {
            throw new UnauthorizedError('Invalid token payload');
        }

        // PARALLELIZED: Run blacklist check and user status fetch concurrently
        // This reduces auth middleware latency by ~50% (2 sequential DB calls → 1 parallel call)
        const prisma = getPrisma();
        const [isBlacklisted, user] = await Promise.all([
            isTokenBlacklisted(token),
            prisma.user.findUnique({
                where: { id: decoded.sub },
                select: { isActive: true, role: true, lastPasswordChange: true }
            })
        ]);

        if (isBlacklisted) {
            throw new UnauthorizedError('Token has been revoked');
        }

        if (!user) {
            throw new UnauthorizedError('User no longer exists');
        }

        if (!user.isActive) {
            throw new UnauthorizedError('Account has been deactivated');
        }

        if (user.role !== decoded.role) {
            // Role changed since token issue - force re-login
            throw new UnauthorizedError('Role permissions changed. Please login again.');
        }

        // Check for session invalidation (Password Changed)
        if (user.lastPasswordChange) {
            const lastChangeTime = Math.floor(user.lastPasswordChange.getTime() / 1000);
            // jwt.iat is in seconds
            if (decoded.iat && lastChangeTime > decoded.iat) {
                throw new UnauthorizedError('Session expired due to password change. Please login again.');
            }
        }

        // Attach user info to request
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: user.role // Use DB role (most current)
        };

        // Attach token for potential blacklisting on logout
        req.token = token;

        next();
    } catch (error) {
        if (error.message === 'Token expired') {
            return next(new UnauthorizedError('Token has expired'));
        } else if (error.message === 'Invalid token') {
            return next(new UnauthorizedError('Invalid token'));
        }
        next(error);
    }
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work for both authenticated and non-authenticated users
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = req.headers['x-auth-token'] || extractTokenFromHeader(authHeader);

        if (!token) {
            // No token provided, continue without user
            req.user = null;
            return next();
        }

        // Check if token is blacklisted
        const isBlacklisted = await isTokenBlacklisted(token);
        if (isBlacklisted) {
            req.user = null;
            return next();
        }

        // Verify token
        const decoded = verifyToken(token);

        if (decoded && decoded.sub) {
            req.user = {
                id: decoded.sub,
                email: decoded.email,
                role: decoded.role,
            };
            req.token = token;
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        // If token is invalid, just continue without user
        req.user = null;
        next();
    }
};

/**
 * Check if token is blacklisted (Database)
 * @param {string} token - JWT token
 * @returns {Promise<boolean>} - True if blacklisted
 */
const isTokenBlacklisted = async (token) => {
    try {
        const prisma = getPrisma();
        const blacklisted = await prisma.blacklistedToken.findUnique({
            where: { token }
        });
        return blacklisted !== null;
    } catch (error) {
        // If database is down, fail closed (deny access)
        logger.error('Database unavailable for blacklist check - Denying access');
        throw new Error('Service temporarily unavailable');
    }
};

/**
 * Blacklist a token (on logout) - Store in database
 * @param {string} token - JWT token
 * @param {number} expirationSeconds - Token expiration in seconds
 */
export const blacklistToken = async (token, expirationSeconds = 86400) => {
    try {
        const prisma = getPrisma();
        const expiresAt = new Date(Date.now() + (expirationSeconds * 1000));

        await prisma.blacklistedToken.create({
            data: {
                token,
                expiresAt
            }
        });
        logger.info(`Token blacklisted until ${expiresAt.toISOString()}`);
    } catch (error) {
        logger.error('Failed to blacklist token:', error);
        // Don't throw - blacklisting failure shouldn't block logout
    }
};

/**
 * Require specific role(s)
 * Must be used after authenticateToken middleware
 * @param {string|string[]} allowedRoles - Role(s) allowed to access the route
 */
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new UnauthorizedError('Authentication required'));
        }

        const userRole = req.user.role;

        // Debug logging for permission issues
        if (!allowedRoles.includes(userRole)) {
            logger.warn(`[AUTH] Permission denied. User role: ${userRole}, Required: ${allowedRoles.join(' or ')}`);
            return next(new ForbiddenError('Insufficient permissions'));
        }

        next();
    };
};

/**
 * Require admin role (shorthand)
 */
export const requireAdmin = requireRole('admin', 'super_admin');

/**
 * Check if user is authenticated
 * @param {Object} req - Express request
 * @returns {boolean} - True if authenticated
 */
export const isAuthenticated = (req) => {
    return req.user && req.user.id;
};

/**
 * Check if user has specific role
 * @param {Object} req - Express request
 * @param {string} role - Required role
 * @returns {boolean} - True if user has role
 */
export const hasRole = (req, role) => {
    return req.user && req.user.role === role;
};

export default {
    authenticateToken,
    optionalAuth,
    blacklistToken,
    requireRole,
    requireAdmin,
    isAuthenticated,
    hasRole,
};
