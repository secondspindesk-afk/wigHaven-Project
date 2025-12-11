/**
 * Cache Control Middleware
 * 
 * Provides reusable Cache-Control headers for Cloudflare CDN optimization.
 * Use these middlewares on public, read-only endpoints to enable edge caching.
 * 
 * Cloudflare Cache Rules:
 * - s-maxage: How long Cloudflare caches (edge)
 * - max-age: How long browser caches (client)
 * - stale-while-revalidate: Serve stale while fetching fresh content
 */
import logger from '../utils/logger.js';

/**
 * Short cache: 1 minute edge, 30 seconds browser
 * Use for frequently changing data (product list, search results)
 */
export const shortCache = (req, res, next) => {
    res.set('Cache-Control', 'public, s-maxage=60, max-age=30, stale-while-revalidate=120');
    res.set('Vary', 'Accept-Encoding, Accept-Language');
    next();
};

/**
 * Medium cache: 5 minutes edge, 2 minutes browser
 * Use for semi-static data (categories, individual products)
 */
export const mediumCache = (req, res, next) => {
    res.set('Cache-Control', 'public, s-maxage=300, max-age=120, stale-while-revalidate=600');
    res.set('Vary', 'Accept-Encoding');
    next();
};

/**
 * Long cache: 1 hour edge, 30 minutes browser
 * Use for rarely changing data (banners, public settings)
 */
export const longCache = (req, res, next) => {
    res.set('Cache-Control', 'public, s-maxage=3600, max-age=1800, stale-while-revalidate=7200');
    res.set('Vary', 'Accept-Encoding');
    next();
};

/**
 * Currency cache: 6 hours edge, 1 hour browser
 * Use for currency exchange rates (already refreshed every 6h on backend)
 */
export const currencyCache = (req, res, next) => {
    res.set('Cache-Control', 'public, s-maxage=21600, max-age=3600, stale-while-revalidate=43200');
    res.set('Vary', 'Accept-Encoding');
    next();
};

/**
 * No-cache for user-specific or dynamic content
 * Prevents any caching
 */
export const noCache = (req, res, next) => {
    res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    next();
};

export default {
    shortCache,
    mediumCache,
    longCache,
    currencyCache,
    noCache
};
