/**
 * Analytics Cache Service
 * 
 * Server-side caching for expensive analytics computations.
 * Uses Cache-Aside (Lazy Loading) pattern with memory-safe configuration.
 * 
 * Memory Target: Stay under 20MB even at peak (1000 concurrent users)
 * 
 * Cache Keys:
 * - dashboard:summary       → Dashboard overview stats
 * - dashboard:sales:7|30|90 → Sales trends by day range
 * - dashboard:inventory     → Inventory status
 * - dashboard:health        → System health
 * - sidebar:stats           → Sidebar counts
 */

import NodeCache from 'node-cache';
import logger from '../utils/logger.js';

// Memory-safe configuration for 512MB server limit
const analyticsCache = new NodeCache({
    stdTTL: 300,           // 5 minutes default TTL
    checkperiod: 120,      // Check for expired keys every 2 minutes
    maxKeys: 100,          // ⚠️ CRITICAL: Limit keys to prevent memory bloat
    useClones: false,      // ⚠️ Don't clone objects - saves 30% memory
    deleteOnExpire: true,  // Auto-delete expired keys
});

// Cache key constants for consistency
export const CACHE_KEYS = {
    DASHBOARD_SUMMARY: 'dashboard:summary',
    SALES_TRENDS: (days) => `dashboard:sales:${days}`,
    INVENTORY_STATUS: 'dashboard:inventory',
    SYSTEM_HEALTH: 'dashboard:health',
    SIDEBAR_STATS: 'sidebar:stats',
    TOP_PRODUCTS: (days, limit) => `dashboard:top:${days}:${limit}`,
    CUSTOMER_ANALYTICS: (days) => `dashboard:customers:${days}`,
    ORDER_STATUS: 'dashboard:order-status',
    CART_ABANDONMENT: 'dashboard:cart-abandonment',
    EMAIL_STATS: 'dashboard:email-stats',
};

/**
 * Cache-Aside Pattern Implementation
 * 
 * 1. Check cache for data
 * 2. If found (hit), return cached data
 * 3. If not found (miss), fetch from DB, cache it, return
 * 
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data on cache miss
 * @param {number} ttl - Optional TTL override in seconds
 * @returns {Promise<any>} - Cached or freshly fetched data
 */
export const getCached = async (key, fetchFn, ttl = undefined) => {
    try {
        // Step 1: Check cache
        let data = analyticsCache.get(key);

        if (data !== undefined) {
            // Cache HIT
            logger.debug(`[Cache HIT] ${key}`);
            return data;
        }

        // Step 2: Cache MISS - fetch from source
        logger.debug(`[Cache MISS] ${key} - fetching from DB`);
        data = await fetchFn();

        // Step 3: Store in cache
        if (data !== undefined && data !== null) {
            if (ttl !== undefined) {
                analyticsCache.set(key, data, ttl);
            } else {
                analyticsCache.set(key, data);
            }
        }

        return data;
    } catch (error) {
        logger.error(`[Cache Error] ${key}:`, error.message);
        // On error, attempt to fetch directly (fail gracefully)
        return await fetchFn();
    }
};

/**
 * Invalidate specific cache keys
 * Called when data changes (via WebSocket broadcast)
 * 
 * @param {string|string[]} keys - Key(s) to invalidate
 */
export const invalidateCache = (keys) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];

    keyArray.forEach(key => {
        // Handle pattern keys (e.g., "dashboard:sales:*")
        if (key.includes('*')) {
            const pattern = key.replace('*', '');
            const allKeys = analyticsCache.keys();
            const matchingKeys = allKeys.filter(k => k.startsWith(pattern));
            matchingKeys.forEach(k => analyticsCache.del(k));
            logger.debug(`[Cache Invalidate] Pattern ${key} - cleared ${matchingKeys.length} keys`);
        } else {
            analyticsCache.del(key);
            logger.debug(`[Cache Invalidate] ${key}`);
        }
    });
};

/**
 * Invalidate all cache keys for a specific entity type
 * Maps entity types to their cache keys for WebSocket integration
 */
export const INVALIDATION_MAP = {
    orders: [
        CACHE_KEYS.DASHBOARD_SUMMARY,
        CACHE_KEYS.SIDEBAR_STATS,
        CACHE_KEYS.ORDER_STATUS,
        'dashboard:sales:*',  // All sales trends
    ],
    products: [
        CACHE_KEYS.DASHBOARD_SUMMARY,
        CACHE_KEYS.SIDEBAR_STATS,
        CACHE_KEYS.INVENTORY_STATUS,
        'dashboard:top:*',  // All top products
    ],
    stock: [
        CACHE_KEYS.INVENTORY_STATUS,
        CACHE_KEYS.SIDEBAR_STATS,
    ],
    users: [
        CACHE_KEYS.DASHBOARD_SUMMARY,
        CACHE_KEYS.SIDEBAR_STATS,
        'dashboard:customers:*',
    ],
    reviews: [
        CACHE_KEYS.SIDEBAR_STATS,
    ],
    settings: [
        // Settings don't affect analytics cache
    ],
    dashboard: [
        CACHE_KEYS.DASHBOARD_SUMMARY,
        CACHE_KEYS.SIDEBAR_STATS,
    ],
};

/**
 * Invalidate cache for a specific entity type
 * Used by adminBroadcast when data changes
 * 
 * @param {string} entityType - Type of entity that changed
 */
export const invalidateForEntity = (entityType) => {
    const keys = INVALIDATION_MAP[entityType];
    if (keys && keys.length > 0) {
        invalidateCache(keys);
        logger.info(`[Cache] Invalidated cache for entity: ${entityType}`);
    }
};

/**
 * Get cache statistics for monitoring
 * Can be exposed via admin endpoint for debugging
 */
export const getCacheStats = () => {
    const stats = analyticsCache.getStats();
    return {
        hits: stats.hits,
        misses: stats.misses,
        keys: analyticsCache.keys().length,
        hitRate: stats.hits + stats.misses > 0
            ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%'
            : '0%',
        memoryKeys: analyticsCache.keys(),
    };
};

/**
 * Flush all cache (use sparingly - for debugging/admin)
 */
export const flushCache = () => {
    analyticsCache.flushAll();
    logger.info('[Cache] All cache flushed');
};

// Log cache stats periodically (every 10 minutes) for monitoring
setInterval(() => {
    const stats = getCacheStats();
    if (stats.hits > 0 || stats.misses > 0) {
        logger.info(`[Cache Stats] Hit Rate: ${stats.hitRate}, Keys: ${stats.keys}, Hits: ${stats.hits}, Misses: ${stats.misses}`);
    }
}, 10 * 60 * 1000);

export default analyticsCache;
