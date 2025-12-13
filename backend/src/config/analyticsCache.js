/**
 * Analytics Cache Service
 * 
 * Server-side caching for expensive analytics computations.
 * Uses smartCache (LRU) with analytics-specific configuration.
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

import smartCache from '../utils/smartCache.js';
import logger from '../utils/logger.js';

// Analytics-specific TTL (5 minutes)
const ANALYTICS_TTL = 5 * 60 * 1000;

// Cache key constants for consistency
export const CACHE_KEYS = {
    DASHBOARD_SUMMARY: 'analytics:dashboard:summary',
    SALES_TRENDS: (days) => `analytics:dashboard:sales:${days}`,
    INVENTORY_STATUS: 'analytics:dashboard:inventory',
    SYSTEM_HEALTH: 'analytics:dashboard:health',
    SIDEBAR_STATS: 'analytics:sidebar:stats',
    TOP_PRODUCTS: (days, limit) => `analytics:dashboard:top:${days}:${limit}`,
    CUSTOMER_ANALYTICS: (days) => `analytics:dashboard:customers:${days}`,
    ORDER_STATUS: 'analytics:dashboard:order-status',
    CART_ABANDONMENT: 'analytics:dashboard:cart-abandonment',
    EMAIL_STATS: 'analytics:dashboard:email-stats',
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
 * @param {number} ttl - Optional TTL override in milliseconds
 * @returns {Promise<any>} - Cached or freshly fetched data
 */
export const getCached = async (key, fetchFn, ttl = ANALYTICS_TTL) => {
    try {
        // Use smartCache's getOrFetch for deduplication + SWR
        return await smartCache.getOrFetch(key, fetchFn, {
            ttl,
            swr: true,
            type: 'analytics'
        });
    } catch (error) {
        logger.error(`[Analytics Cache Error] ${key}:`, error.message);
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
        // Handle pattern keys (e.g., "analytics:dashboard:sales:*")
        if (key.includes('*')) {
            const pattern = key.replace('*', '');
            smartCache.invalidateByPrefix(pattern);
            logger.debug(`[Analytics Cache Invalidate] Pattern ${key}`);
        } else {
            smartCache.del(key);
            logger.debug(`[Analytics Cache Invalidate] ${key}`);
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
        'analytics:dashboard:sales:*',  // All sales trends
    ],
    products: [
        CACHE_KEYS.DASHBOARD_SUMMARY,
        CACHE_KEYS.SIDEBAR_STATS,
        CACHE_KEYS.INVENTORY_STATUS,
        'analytics:dashboard:top:*',  // All top products
    ],
    stock: [
        CACHE_KEYS.INVENTORY_STATUS,
        CACHE_KEYS.SIDEBAR_STATS,
    ],
    users: [
        CACHE_KEYS.DASHBOARD_SUMMARY,
        CACHE_KEYS.SIDEBAR_STATS,
        'analytics:dashboard:customers:*',
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
        logger.info(`[Analytics Cache] Invalidated cache for entity: ${entityType}`);
    }
};

/**
 * Get cache statistics for monitoring
 * Delegates to smartCache stats
 */
export const getCacheStats = () => {
    return smartCache.getStats();
};

/**
 * Flush all analytics cache
 */
export const flushCache = () => {
    smartCache.invalidateByPrefix('analytics:');
    logger.info('[Analytics Cache] All analytics cache flushed');
};

export default {
    getCached,
    invalidateCache,
    invalidateForEntity,
    getCacheStats,
    flushCache,
    CACHE_KEYS,
    INVALIDATION_MAP,
};
