import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';
import { ForbiddenError } from './errorHandler.js';

// Simple in-memory cache for blocked IPs to avoid DB hit on every request
// In a multi-server setup, use Redis
let blockedIPsCache = new Set();
let lastCacheUpdate = 0;
let isRefreshing = false;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (increased from 1 min)

/**
 * Update the blocked IP cache from database
 * Called on startup and periodically in background
 */
const updateCache = async () => {
    if (isRefreshing) return; // Prevent concurrent refreshes
    isRefreshing = true;

    try {
        const prisma = getPrisma();
        const blocked = await prisma.blockedIP.findMany({
            select: { ip: true }
        });
        blockedIPsCache = new Set(blocked.map(b => b.ip));
        lastCacheUpdate = Date.now();
        logger.info(`[IPBlocker] Cache refreshed: ${blockedIPsCache.size} blocked IPs`);
    } catch (error) {
        // On error, keep using old cache - fail open
        logger.warn('[IPBlocker] Cache refresh failed, using stale cache:', error.message);
    } finally {
        isRefreshing = false;
    }
};

/**
 * Schedule background refresh (non-blocking)
 */
const scheduleRefresh = () => {
    // Use setImmediate to not block current request
    setImmediate(() => {
        updateCache().catch(err =>
            logger.warn('[IPBlocker] Background refresh failed:', err.message)
        );
    });
};

/**
 * IP Blocking Middleware
 * Uses in-memory cache with background refresh - never blocks on DB
 */
export const checkBlockedIP = async (req, res, next) => {
    try {
        // Schedule background refresh if cache is stale (but don't wait for it)
        if (Date.now() - lastCacheUpdate > CACHE_TTL) {
            scheduleRefresh();
        }

        const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        if (blockedIPsCache.has(clientIP)) {
            logger.warn(`[IPBlocker] Blocked request from IP: ${clientIP}`);
            return next(new ForbiddenError('Access Denied: Your IP has been blocked.'));
        }

        next();
    } catch (error) {
        // Fail open to avoid blocking legit users on error
        logger.error('[IPBlocker] Error:', error);
        next();
    }
};

/**
 * Force refresh cache (call after blocking/unblocking IP)
 */
export const refreshBlockedIPCache = () => {
    lastCacheUpdate = 0; // Force refresh on next request
    scheduleRefresh();
};

/**
 * Initialize cache on module load (eager loading)
 * This ensures cache is ready before first request
 */
setTimeout(() => {
    updateCache().catch(err =>
        logger.warn('[IPBlocker] Initial cache load failed:', err.message)
    );
}, 3000); // Wait 3s for DB to be ready

export default checkBlockedIP;

