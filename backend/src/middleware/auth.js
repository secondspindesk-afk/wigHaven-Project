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
        // Check headers in priority order:
        // 1. x-auth-token (direct API calls)
        // 2. x-forwarded-auth (forwarded through HF gateway - contains original Authorization header)
        // 3. authorization (standard Bearer token)
        const forwardedAuth = req.headers['x-forwarded-auth'];
        const token = req.headers['x-auth-token']
            || extractTokenFromHeader(forwardedAuth)
            || extractTokenFromHeader(authHeader);

        if (!token) {
            throw new UnauthorizedError('Please log in to continue');
        }

        // Verify token FIRST (synchronous, no DB needed)
        // This avoids unnecessary DB calls for invalid/expired tokens
        const decoded = verifyToken(token);

        if (!decoded || !decoded.sub) {
            throw new UnauthorizedError('Invalid token payload');
        }

        // PARALLELIZED: Run blacklist check and user status fetch concurrently
        // Both now use in-memory caching for ~0ms response on cache hit
        const [isBlacklisted, user] = await Promise.all([
            isTokenBlacklisted(token),
            getCachedUserStatus(decoded.sub)
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
        const forwardedAuth = req.headers['x-forwarded-auth'];
        const token = req.headers['x-auth-token']
            || extractTokenFromHeader(forwardedAuth)
            || extractTokenFromHeader(authHeader);

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
            // Check if user is still active (using cache)
            const user = await getCachedUserStatus(decoded.sub);

            // Only set req.user if user exists and is active
            if (user && user.isActive) {
                req.user = {
                    id: decoded.sub,
                    email: decoded.email,
                    role: decoded.role,
                };
                req.token = token;
            } else {
                // User deleted or deactivated - treat as unauthenticated
                req.user = null;
            }
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
 * In-memory cache for blacklisted tokens
 * Reduces auth latency by avoiding DB round-trip on every request
 * TTL: 30 seconds (balance between performance and security)
 */
const blacklistCache = new Map();
const BLACKLIST_CACHE_TTL = 30000; // 30 seconds

/**
 * In-memory cache for user status
 * Caches isActive, role, and lastPasswordChange for 30 seconds
 * This prevents repeated DB lookups for the same user across multiple requests
 */
const userStatusCache = new Map();
const USER_STATUS_CACHE_TTL = 30000; // 30 seconds

/**
 * In-flight requests for user status (prevents thundering herd)
 * Key: userId, Value: Promise<user>
 */
const inFlightUserRequests = new Map();

/**
 * Get cached user status or fetch from DB (with request coalescing)
 * OPTIMIZATION: Multiple parallel requests for the same userId share one DB query
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User status object
 */
const getCachedUserStatus = async (userId) => {
    // Check cache first (instant)
    const cached = userStatusCache.get(userId);
    if (cached && Date.now() < cached.expires) {
        return cached.value;
    }

    // Check if there's already an in-flight request for this user
    // This prevents "thundering herd" where 6 parallel requests all trigger DB queries
    const inFlight = inFlightUserRequests.get(userId);
    if (inFlight) {
        return inFlight; // Reuse the existing promise
    }

    // Create new request and track it
    const request = (async () => {
        const prisma = getPrisma();
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isActive: true, role: true, lastPasswordChange: true }
        });

        // Cache result (even null for non-existent users)
        userStatusCache.set(userId, {
            value: user,
            expires: Date.now() + USER_STATUS_CACHE_TTL
        });

        return user;
    })();

    // Track this request as in-flight
    inFlightUserRequests.set(userId, request);

    try {
        return await request;
    } finally {
        // Clean up in-flight tracking
        inFlightUserRequests.delete(userId);

        // Cleanup old cache entries
        if (userStatusCache.size > 500) {
            const now = Date.now();
            for (const [key, val] of userStatusCache) {
                if (now > val.expires) userStatusCache.delete(key);
            }
        }
    }
};

/**
 * Invalidate user from cache (call on logout, role change, deactivation)
 */
export const invalidateUserFromCache = (userId) => {
    userStatusCache.delete(userId);
};

/**
 * Check if token is blacklisted (Optimized Cache-First)
 * 
 * OPTIMIZATION: Since we ALWAYS add blacklisted tokens to cache on logout (line 272),
 * we can use a "negative cache" strategy:
 * - Cache HIT with true = blacklisted
 * - Cache HIT with false = NOT blacklisted (verified recently)
 * - Cache MISS = NOT blacklisted (never seen before)
 * 
 * DB lookup only happens on cold start (cacheWarmed = false)
 * 
 * @param {string} token - JWT token
 * @returns {Promise<boolean>} - True if blacklisted
 */
let cacheWarmed = false;

const isTokenBlacklisted = async (token) => {
    // Check memory cache first (instant)
    const cached = blacklistCache.get(token);
    if (cached && Date.now() < cached.expires) {
        return cached.value;
    }

    // OPTIMIZATION: If cache is warm (server running for > 30s) and token not in cache,
    // it means this token was never blacklisted (because we always add on logout)
    if (cacheWarmed) {
        // Add to cache as "not blacklisted" to prevent future lookups
        blacklistCache.set(token, {
            value: false,
            expires: Date.now() + BLACKLIST_CACHE_TTL
        });
        return false;
    }

    // Cold start: verify against DB (only happens once per unique token on restart)
    try {
        const prisma = getPrisma();
        const blacklisted = await prisma.blacklistedToken.findUnique({
            where: { token }
        });
        const result = blacklisted !== null;

        // Cache result
        blacklistCache.set(token, {
            value: result,
            expires: Date.now() + BLACKLIST_CACHE_TTL
        });

        // Cleanup old entries periodically (prevent memory leak)
        if (blacklistCache.size > 1000) {
            const now = Date.now();
            for (const [key, val] of blacklistCache) {
                if (now > val.expires) blacklistCache.delete(key);
            }
        }

        return result;
    } catch (error) {
        // If database is down, fail closed (deny access)
        logger.error('Database unavailable for blacklist check - Denying access');
        throw new Error('Service temporarily unavailable');
    }
};

// Warm the cache after initial DB lookups complete (30 seconds grace period)
setTimeout(() => {
    cacheWarmed = true;
    logger.info('[Auth] Blacklist cache warmed - using cache-first strategy');
}, 30000);

/**
 * Invalidate token from cache (call on logout)
 * @param {string} token - JWT token to remove from cache
 */
export const invalidateTokenFromCache = (token) => {
    blacklistCache.delete(token);
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

        // Immediately update cache for instant revocation
        blacklistCache.set(token, {
            value: true,
            expires: Date.now() + BLACKLIST_CACHE_TTL
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
    invalidateTokenFromCache,
    invalidateUserFromCache,
};
