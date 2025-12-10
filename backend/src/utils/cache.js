import NodeCache from 'node-cache';
import logger from './logger.js';

// Standard TTL: 10 minutes (600s)
// Check period: 2 minutes (120s)
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const cacheUtil = {
    /**
     * Get value from cache
     * @param {string} key 
     */
    get: (key) => {
        const value = cache.get(key);
        if (value) {
            logger.debug(`[CACHE] Hit: ${key}`);
            return value;
        }
        return null;
    },

    /**
     * Set value in cache
     * @param {string} key 
     * @param {any} value 
     * @param {number} ttl - Time to live in seconds (optional)
     */
    set: (key, value, ttl) => {
        if (ttl) {
            cache.set(key, value, ttl);
        } else {
            cache.set(key, value);
        }
        // distinct log for setting
        // logger.debug(`[CACHE] Set: ${key}`); 
    },

    /**
     * Delete value from cache
     * @param {string} key 
     */
    del: (key) => {
        cache.del(key);
        logger.debug(`[CACHE] Deleted: ${key}`);
    },

    /**
     * Flush all keys
     */
    flush: () => {
        cache.flushAll();
        logger.info('[CACHE] Flushed all keys');
    },

    /**
     * Get cache statistics
     */
    getStats: () => {
        return cache.getStats();
    },

    // --- Key Generators ---

    /**
     * Generate product cache key
     * @param {string} id 
     */
    productKey: (id) => `product:${id}`,

    /**
     * Generate product list cache key (simplified)
     * CAUTION: Lists are hard to cache perfectly without complex invalidation.
     * For now, we might usually flush all lists on any product update.
     */
    productListKey: (params) => `products:list:${JSON.stringify(params)}`
};

export default cacheUtil;
