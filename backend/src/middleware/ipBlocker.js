import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';
import { ForbiddenError } from './errorHandler.js';

// Simple in-memory cache for blocked IPs to avoid DB hit on every request
// In a multi-server setup, use Redis
let blockedIPsCache = new Set();
let lastCacheUpdate = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

const updateCache = async () => {
    try {
        const prisma = getPrisma();
        const blocked = await prisma.blockedIP.findMany({
            select: { ip: true }
        });
        blockedIPsCache = new Set(blocked.map(b => b.ip));
        lastCacheUpdate = Date.now();
    } catch (error) {
        logger.error('Failed to update blocked IP cache:', error);
    }
};

export const checkBlockedIP = async (req, res, next) => {
    try {
        // Update cache if stale
        if (Date.now() - lastCacheUpdate > CACHE_TTL) {
            await updateCache();
        }

        const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        if (blockedIPsCache.has(clientIP)) {
            logger.warn(`Blocked request from IP: ${clientIP}`);
            return next(new ForbiddenError('Access Denied: Your IP has been blocked.'));
        }

        next();
    } catch (error) {
        // Fail open to avoid blocking legit users on error
        logger.error('IP Check Error:', error);
        next();
    }
};

export default checkBlockedIP;
