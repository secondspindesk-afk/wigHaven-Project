/**
 * Smart Server-Side Cache
 * 
 * Production-grade caching with:
 * - LRU eviction (max 500 items, ~50MB)
 * - TTL per cache type
 * - Request deduplication (concurrent requests share one Promise)
 * - Stale-while-revalidate (SWR) pattern
 * - Prefix-based invalidation
 * - Hit/miss stats tracking
 */

import { LRUCache } from 'lru-cache';
import logger from './logger.js';

// Cache configuration
const CACHE_CONFIG = {
    MAX_ITEMS: 500,              // Max cached items (LRU eviction)
    MAX_SIZE_BYTES: 50_000_000,  // 50MB max total size
    DEFAULT_TTL_MS: 5 * 60 * 1000, // 5 minutes default

    // TTL per cache type (in milliseconds)
    TTL: {
        settings: 10 * 60 * 1000,   // 10 minutes (rarely changes)
        banners: 5 * 60 * 1000,     // 5 minutes
        categories: 30 * 60 * 1000, // 30 minutes (rarely changes)
        productList: 2 * 60 * 1000, // 2 minutes (frequently changes)
        product: 5 * 60 * 1000,     // 5 minutes
        reviews: 3 * 60 * 1000,     // 3 minutes
    }
};

// Main LRU cache instance
const cache = new LRUCache({
    max: CACHE_CONFIG.MAX_ITEMS,
    maxSize: CACHE_CONFIG.MAX_SIZE_BYTES,
    sizeCalculation: (value) => {
        try {
            return JSON.stringify(value).length;
        } catch {
            return 1000; // Fallback size estimate
        }
    },
    ttl: CACHE_CONFIG.DEFAULT_TTL_MS,
    allowStale: true,        // Enable SWR pattern
    updateAgeOnGet: false,   // Don't reset TTL on read
    updateAgeOnHas: false,
});

// In-flight request deduplication map (Promise caching)
const inFlight = new Map();

// Stats tracking
const stats = {
    hits: 0,
    misses: 0,
    deduped: 0,    // Requests that reused in-flight Promise
    staleHits: 0,  // SWR stale responses
    invalidations: 0,
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {any} Cached value or undefined
 */
const get = (key) => {
    const value = cache.get(key);

    if (value !== undefined) {
        const isStale = cache.getRemainingTTL(key) <= 0;
        if (isStale) {
            stats.staleHits++;
            logger.debug(`[CACHE] Stale hit: ${key}`);
        } else {
            stats.hits++;
            logger.debug(`[CACHE] Hit: ${key}`);
        }
        return value;
    }

    stats.misses++;
    logger.debug(`[CACHE] Miss: ${key}`);
    return undefined;
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in milliseconds (optional)
 */
const set = (key, value, ttl) => {
    if (value === undefined || value === null) return;

    cache.set(key, value, { ttl: ttl || CACHE_CONFIG.DEFAULT_TTL_MS });
    logger.debug(`[CACHE] Set: ${key} (TTL: ${(ttl || CACHE_CONFIG.DEFAULT_TTL_MS) / 1000}s)`);
};

/**
 * Get or fetch with request deduplication and SWR
 * 
 * - If cached (fresh): returns cached value immediately
 * - If cached (stale): returns stale value, refreshes in background (SWR)
 * - If not cached: fetches, deduplicates concurrent requests
 * 
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if not cached
 * @param {Object} options - { ttl, swr, type }
 * @returns {Promise<any>} Cached or fetched value
 */
const getOrFetch = async (key, fetchFn, options = {}) => {
    const {
        ttl = CACHE_CONFIG.DEFAULT_TTL_MS,
        swr = true,
        type = 'default'
    } = options;

    // Use type-specific TTL if available
    const actualTtl = CACHE_CONFIG.TTL[type] || ttl;

    // Check cache first
    const cached = cache.get(key);
    const remainingTtl = cache.getRemainingTTL(key);
    const isStale = remainingTtl <= 0 && cached !== undefined;
    const isFresh = remainingTtl > 0 && cached !== undefined;

    // Fresh cache hit - return immediately
    if (isFresh) {
        stats.hits++;
        logger.debug(`[CACHE] Hit: ${key}`);
        return cached;
    }

    // SWR: Return stale data immediately, refresh in background
    if (isStale && swr) {
        stats.staleHits++;
        logger.debug(`[CACHE] Stale hit (SWR refresh): ${key}`);

        // Background refresh (fire and forget)
        refreshInBackground(key, fetchFn, actualTtl);

        return cached;
    }

    // Cache miss - need to fetch
    stats.misses++;

    // Request deduplication: if already fetching this key, wait for that Promise
    if (inFlight.has(key)) {
        stats.deduped++;
        logger.debug(`[CACHE] Deduped: ${key}`);
        return inFlight.get(key);
    }

    // Create fetch Promise and store for deduplication
    const fetchPromise = (async () => {
        try {
            const data = await fetchFn();
            set(key, data, actualTtl);
            return data;
        } finally {
            // Clean up in-flight map
            inFlight.delete(key);
        }
    })();

    inFlight.set(key, fetchPromise);
    return fetchPromise;
};

/**
 * Background refresh for SWR pattern
 * Does not block the response
 */
const refreshInBackground = (key, fetchFn, ttl) => {
    // Don't duplicate background refreshes
    if (inFlight.has(key)) return;

    const refreshPromise = (async () => {
        try {
            const data = await fetchFn();
            set(key, data, ttl);
            logger.debug(`[CACHE] Background refresh complete: ${key}`);
        } catch (error) {
            logger.warn(`[CACHE] Background refresh failed: ${key} - ${error.message}`);
        } finally {
            inFlight.delete(key);
        }
    })();

    inFlight.set(key, refreshPromise);
};

/**
 * Delete a specific key
 * @param {string} key - Cache key to delete
 */
const del = (key) => {
    cache.delete(key);
    stats.invalidations++;
    logger.debug(`[CACHE] Deleted: ${key}`);
};

/**
 * Invalidate by prefix (e.g., 'products:*' clears all product caches)
 * @param {string} prefix - Key prefix to match (without *)
 */
const invalidateByPrefix = (prefix) => {
    const cleanPrefix = prefix.replace('*', '').replace(/:$/, '');
    let count = 0;

    for (const key of cache.keys()) {
        if (key.startsWith(cleanPrefix)) {
            cache.delete(key);
            count++;
        }
    }

    stats.invalidations += count;
    logger.info(`[CACHE] Invalidated ${count} keys with prefix: ${cleanPrefix}`);
    return count;
};

/**
 * Clear all cache
 */
const clear = () => {
    const size = cache.size;
    cache.clear();
    inFlight.clear();
    logger.info(`[CACHE] Cleared all ${size} items`);
};

/**
 * Get cache statistics
 */
const getStats = () => {
    const total = stats.hits + stats.misses;
    return {
        ...stats,
        size: cache.size,
        calculatedSize: cache.calculatedSize,
        hitRate: total > 0 ? ((stats.hits + stats.staleHits) / total * 100).toFixed(1) + '%' : '0%',
        max: CACHE_CONFIG.MAX_ITEMS,
        maxSize: CACHE_CONFIG.MAX_SIZE_BYTES,
    };
};

/**
 * Reset stats (for testing)
 */
const resetStats = () => {
    stats.hits = 0;
    stats.misses = 0;
    stats.deduped = 0;
    stats.staleHits = 0;
    stats.invalidations = 0;
};

// ============================================
// KEY GENERATORS (for consistent cache keys)
// ============================================

const keys = {
    settings: () => 'settings:all',
    settingsPublic: () => 'settings:public',
    banners: () => 'banners:active',
    categories: () => 'categories:all',

    // Product list with query hash
    productList: (query) => {
        const hash = JSON.stringify(query);
        return `products:list:${hash}`;
    },

    // Individual product
    product: (id) => `product:${id}`,

    // Reviews for a product
    reviews: (productId, page = 1) => `reviews:${productId}:${page}`,
};

// ============================================
// CACHE WARMING (pre-fetch on startup)
// ============================================

/**
 * Warm the cache by pre-fetching commonly accessed data
 * Call this on server startup to eliminate cold-start delays
 * 
 * @param {Object} services - Object containing service functions to call
 * @param {Function} services.getSettings - Settings fetch function
 * @param {Function} services.getBanners - Banners fetch function  
 * @param {Function} services.getCategories - Categories fetch function
 * @param {Function} services.getFeaturedProducts - Featured products fetch function
 */
const warmCache = async (services = {}) => {
    const startTime = Date.now();
    const results = [];

    logger.info('[CACHE] Starting cache warm-up...');

    try {
        // Warm settings cache
        if (services.getSettings) {
            try {
                await services.getSettings();
                results.push('settings ✓');
            } catch (e) {
                results.push('settings ✗');
                logger.warn('[CACHE] Failed to warm settings:', e.message);
            }
        }

        // Warm banners cache
        if (services.getBanners) {
            try {
                await services.getBanners();
                results.push('banners ✓');
            } catch (e) {
                results.push('banners ✗');
                logger.warn('[CACHE] Failed to warm banners:', e.message);
            }
        }

        // Warm categories cache
        if (services.getCategories) {
            try {
                await services.getCategories();
                results.push('categories ✓');
            } catch (e) {
                results.push('categories ✗');
                logger.warn('[CACHE] Failed to warm categories:', e.message);
            }
        }

        // Warm featured products cache
        if (services.getFeaturedProducts) {
            try {
                await services.getFeaturedProducts();
                results.push('featured ✓');
            } catch (e) {
                results.push('featured ✗');
                logger.warn('[CACHE] Failed to warm featured products:', e.message);
            }
        }

        const elapsed = Date.now() - startTime;
        logger.info(`[CACHE] Cache warm-up complete in ${elapsed}ms: ${results.join(', ')}`);

        return {
            success: true,
            warmed: results.filter(r => r.includes('✓')).length,
            failed: results.filter(r => r.includes('✗')).length,
            elapsed
        };
    } catch (error) {
        logger.error('[CACHE] Cache warm-up failed:', error.message);
        return { success: false, error: error.message };
    }
};

// ============================================
// EXPORTS
// ============================================

const smartCache = {
    // Core operations
    get,
    set,
    del,
    getOrFetch,

    // Invalidation
    invalidateByPrefix,
    clear,

    // Stats
    getStats,
    resetStats,

    // Key generators
    keys,

    // Cache warming
    warmCache,

    // Config (read-only access)
    TTL: CACHE_CONFIG.TTL,
};

export default smartCache;
