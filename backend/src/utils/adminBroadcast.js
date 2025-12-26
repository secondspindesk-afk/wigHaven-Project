/**
 * Admin Real-Time Update Service
 * 
 * Broadcasts data changes to all connected admin/super_admin users
 * via WebSocket for instant dashboard updates without polling.
 * 
 * Also invalidates server-side analytics cache AND smartCache to ensure
 * fresh data is fetched on next request.
 * 
 * For PUBLIC data (products, categories, banners), broadcasts to ALL users
 * so storefront customers also receive real-time updates.
 */

import { broadcastToAdmins, broadcastToAllUsers } from '../config/websocket.js';
import { invalidateForEntity } from '../config/analyticsCache.js';
import { getPrisma } from '../config/database.js';
import smartCache from './smartCache.js';
import logger from './logger.js';

// Query key constants for React Query invalidation
const QUERY_KEYS = {
    // Dashboard
    DASHBOARD_SUMMARY: ['admin', 'dashboard', 'summary'],
    RECENT_ORDERS: ['admin', 'dashboard', 'recent-orders'],
    ORDER_STATUS: ['admin', 'dashboard', 'order-status-breakdown'],
    INVENTORY_STATUS: ['admin', 'dashboard', 'inventory-status'],
    LOW_STOCK: ['admin', 'dashboard', 'low-stock'],
    TOP_PRODUCTS: ['admin', 'dashboard', 'top-products'],
    SALES_TRENDS: ['admin', 'dashboard', 'sales-trends'],
    CUSTOMER_ANALYTICS: ['admin', 'dashboard', 'customer-analytics'],
    DASHBOARD_SNAPSHOT: ['admin', 'dashboard', 'snapshot'],
    ANALYTICS_SNAPSHOT: ['admin', 'dashboard', 'analytics-snapshot'],

    // Admin Lists
    ADMIN_ORDERS: ['admin', 'orders'],
    ADMIN_PRODUCTS: ['admin', 'products'],
    ADMIN_USERS: ['admin', 'users'],
    ADMIN_REVIEWS: ['admin', 'reviews'],
    ADMIN_CATEGORIES: ['admin', 'categories'],
    ADMIN_BANNERS: ['admin', 'banners'],
    ADMIN_DISCOUNTS: ['admin', 'discounts'],
    ADMIN_SUPPORT: ['admin', 'support'],
    ADMIN_SETTINGS: ['admin', 'settings'],
    ADMIN_NOTIFICATIONS: ['admin', 'notifications'],

    // Sidebar
    SIDEBAR_STATS: ['admin', 'sidebar-stats'],

    // PUBLIC STOREFRONT KEYS (for instant storefront updates)
    PUBLIC_PRODUCTS: ['products'],           // Product list pages
    PUBLIC_PRODUCT: ['product'],             // Individual product detail pages
    PUBLIC_CATEGORIES: ['categories'],
    PUBLIC_BANNERS: ['public', 'banners'],
    PUBLIC_SETTINGS: ['public', 'settings'],
    PUBLIC_NOTIFICATIONS: ['notifications'], // Personal notifications
    PUBLIC_CURRENCY: ['currency', 'rates'],
};

/**
 * Notify admins when orders change (new order, status update, payment)
 */
export const notifyOrdersChanged = async (metadata = {}) => {
    try {
        const prisma = getPrisma();

        // 1. Invalidate server-side cache
        invalidateForEntity('orders');
        smartCache.invalidateByPrefix('orders:list:');
        smartCache.invalidateByPrefix('search:');
        smartCache.invalidateByPrefix('dashboard:orders:');
        smartCache.invalidateByPrefix('analytics:');

        // 2. Determine targeted keys for invalidation
        const adminKeys = [
            QUERY_KEYS.DASHBOARD_SUMMARY,
            QUERY_KEYS.RECENT_ORDERS,
            QUERY_KEYS.ORDER_STATUS,
            QUERY_KEYS.SALES_TRENDS,
            QUERY_KEYS.ADMIN_ORDERS,
            QUERY_KEYS.SIDEBAR_STATS,
            QUERY_KEYS.DASHBOARD_SNAPSHOT,
            QUERY_KEYS.ANALYTICS_SNAPSHOT,
        ];

        // If specific order metadata is provided, add targeted keys
        if (metadata.orderNumber) {
            adminKeys.push(['order', metadata.orderNumber]);
        }

        // 3. Notify frontend clients to invalidate React Query cache
        broadcastToAdmins('orders', adminKeys, metadata);

        logger.info(`[BROADCAST] Order change notified: ${metadata.action || 'unknown'} ${metadata.orderNumber || ''}`);
    } catch (error) {
        logger.warn('Failed to broadcast order update:', error.message);
    }
};

/**
 * Notify admins when products change (created, updated, deleted)
 * Also invalidates ALL server-side caches (smartCache + analyticsCache)
 * AND broadcasts to ALL users for storefront updates
 */
export const notifyProductsChanged = async (metadata = {}) => {
    try {
        const prisma = getPrisma();

        // 1. Invalidate analytics cache
        invalidateForEntity('products');

        // 2. Invalidate smartCache
        smartCache.invalidateByPrefix('products:list');
        smartCache.invalidateByPrefix('product:');

        // Only invalidate categories if the count might have changed (create/delete/category change)
        if (metadata.action === 'create' || metadata.action === 'delete' || metadata.categoryIdChanged || metadata.isBulk) {
            smartCache.invalidateByPrefix('categories');
        }

        smartCache.invalidateByPrefix('search:');
        smartCache.invalidateByPrefix('cart:enrich:');
        smartCache.invalidateByPrefix('analytics:');

        // 3. Broadcast to Admins
        broadcastToAdmins('products', [
            QUERY_KEYS.DASHBOARD_SUMMARY,
            QUERY_KEYS.TOP_PRODUCTS,
            QUERY_KEYS.ADMIN_PRODUCTS,
            QUERY_KEYS.SIDEBAR_STATS,
            QUERY_KEYS.DASHBOARD_SNAPSHOT,
            QUERY_KEYS.ANALYTICS_SNAPSHOT,
        ], metadata);

        // 4. Broadcast to All Users
        broadcastToAllUsers('products', [
            QUERY_KEYS.PUBLIC_PRODUCTS,
            QUERY_KEYS.PUBLIC_PRODUCT,
            QUERY_KEYS.PUBLIC_CATEGORIES,
        ], metadata);

        logger.info(`[BROADCAST] Product change notified: ${metadata.productId || 'bulk'}`);
    } catch (error) {
        logger.warn('Failed to broadcast product update:', error.message);
    }
};

/**
 * Notify admins of bulk product changes (e.g., status update, bulk delete)
 * Prevents WebSocket flooding by sending a single "bulk" notification
 */
export const notifyBulkProductsChanged = async (metadata = {}) => {
    return notifyProductsChanged({ ...metadata, isBulk: true });
};

/**
 * Notify ALL users when stock changes
 * 
 * IMPORTANT: Stock changes affect storefront display (customers need to see when items
 * go out of stock or come back in stock), so we broadcast to ALL users, not just admins.
 * 
 * @param {Object} metadata - { productId?, variantId?, action? }
 */
export const notifyStockChanged = async (metadata = {}) => {
    try {
        const prisma = getPrisma();

        // 1. Invalidate analytics/stock caches
        invalidateForEntity('stock');

        // 2. Invalidate smartCache for products (stock affects product display)
        if (metadata.productId) {
            // Specific product invalidation - most efficient
            smartCache.del(smartCache.keys.product(metadata.productId));
        }
        // Always invalidate product lists since stock affects filtering/display
        smartCache.invalidateByPrefix('products:list');
        smartCache.invalidateByPrefix('stock:');
        smartCache.invalidateByPrefix('dashboard:low-stock:');
        smartCache.invalidateByPrefix('search:');
        smartCache.invalidateByPrefix('cart:enrich:');

        // 3. Broadcast ADMIN keys to admin clients
        broadcastToAdmins('stock', [
            QUERY_KEYS.INVENTORY_STATUS,
            QUERY_KEYS.LOW_STOCK,
            QUERY_KEYS.ADMIN_PRODUCTS,
            QUERY_KEYS.SIDEBAR_STATS,
            QUERY_KEYS.DASHBOARD_SNAPSHOT,
            QUERY_KEYS.ANALYTICS_SNAPSHOT,
        ], metadata);

        // 4. Broadcast PUBLIC keys to ALL users (customers need real-time stock info!)
        const publicQueryKeys = [QUERY_KEYS.PUBLIC_PRODUCTS];
        if (metadata.productId) {
            // Add specific product key for targeted invalidation
            publicQueryKeys.push(['product', metadata.productId]);
        }
        broadcastToAllUsers('stock', publicQueryKeys, metadata);

    } catch (error) {
        logger.warn('Failed to broadcast stock update:', error.message);
    }
};

/**
 * Notify admins when users change (new signup, status change)
 */
export const notifyUsersChanged = async (metadata = {}) => {
    try {
        const prisma = getPrisma();


        invalidateForEntity('users');
        broadcastToAdmins('users', [
            QUERY_KEYS.DASHBOARD_SUMMARY,
            QUERY_KEYS.CUSTOMER_ANALYTICS,
            QUERY_KEYS.ADMIN_USERS,
            QUERY_KEYS.SIDEBAR_STATS,
            QUERY_KEYS.DASHBOARD_SNAPSHOT,
            QUERY_KEYS.ANALYTICS_SNAPSHOT,
        ], metadata);

        smartCache.invalidateByPrefix('profile:');
        smartCache.invalidateByPrefix('analytics:');
    } catch (error) {
        logger.warn('Failed to broadcast user update:', error.message);
    }
};

/**
 * Notify admins when reviews change (new, approved, rejected)
 */
export const notifyReviewsChanged = async (metadata = {}) => {
    try {
        const prisma = getPrisma();


        invalidateForEntity('reviews');

        // Invalidate smartCache for reviews
        if (metadata.productId) {
            smartCache.invalidateByPrefix(`reviews:${metadata.productId}`);
        } else {
            smartCache.invalidateByPrefix('reviews:');
        }

        broadcastToAdmins('reviews', [
            QUERY_KEYS.ADMIN_REVIEWS,
            QUERY_KEYS.SIDEBAR_STATS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast review update:', error.message);
    }
};

/**
 * Notify admins when categories change
 * Also invalidates ALL server-side caches (smartCache + analyticsCache)
 * AND broadcasts to ALL users for storefront updates
 */
export const notifyCategoriesChanged = async (metadata = {}) => {
    try {
        const prisma = getPrisma();


        // 2. Invalidate smartCache categories
        smartCache.invalidateByPrefix('categories');
        smartCache.invalidateByPrefix('products:list'); // Categories affect product counts
        smartCache.invalidateByPrefix('category:');
        smartCache.invalidateByPrefix('search:');

        // 3. Broadcast ADMIN keys to admin clients only
        broadcastToAdmins('categories', [
            QUERY_KEYS.ADMIN_CATEGORIES,
            QUERY_KEYS.ADMIN_PRODUCTS,
        ], metadata);

        // 4. Broadcast PUBLIC keys to ALL connected users
        broadcastToAllUsers('categories', [
            QUERY_KEYS.PUBLIC_CATEGORIES,
            QUERY_KEYS.PUBLIC_PRODUCTS, // Product counts change
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast category update:', error.message);
    }
};

/**
 * Notify admins when settings change
 * Also invalidates ALL server-side caches (smartCache + analyticsCache)
 * AND broadcasts to ALL users for storefront updates
 */
export const notifySettingsChanged = async (metadata = {}) => {
    try {
        const prisma = getPrisma();


        // 2. Invalidate smartCache settings
        smartCache.del(smartCache.keys.settings());
        smartCache.del(smartCache.keys.settingsPublic());
        smartCache.invalidateByPrefix('setting:');

        // Broadcast ADMIN keys to admin clients only
        broadcastToAdmins('settings', [
            QUERY_KEYS.ADMIN_SETTINGS,
        ], metadata);

        // Broadcast PUBLIC keys to ALL connected users
        broadcastToAllUsers('settings', [
            QUERY_KEYS.PUBLIC_SETTINGS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast settings update:', error.message);
    }
};

/**
 * Notify admins when banners change
 * Also invalidates ALL server-side caches (smartCache + analyticsCache)
 * AND broadcasts to ALL users for storefront updates
 */
export const notifyBannersChanged = async (metadata = {}) => {
    try {
        const prisma = getPrisma();


        // 2. Invalidate smartCache banners
        smartCache.del(smartCache.keys.banners());
        smartCache.del(smartCache.keys.bannersAll());
        smartCache.invalidateByPrefix('banner:');

        // 3. Broadcast ADMIN keys to admin clients only
        broadcastToAdmins('banners', [
            QUERY_KEYS.ADMIN_BANNERS,
        ], metadata);

        // 4. Broadcast PUBLIC keys to ALL connected users
        broadcastToAllUsers('banners', [
            QUERY_KEYS.PUBLIC_BANNERS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast banner update:', error.message);
    }
};

/**
 * Notify admins when discounts change
 */
export const notifyDiscountsChanged = async (metadata = {}) => {
    try {
        const prisma = getPrisma();


        broadcastToAdmins('discounts', [
            QUERY_KEYS.ADMIN_DISCOUNTS,
        ], metadata);

        smartCache.del(smartCache.keys.discountsAll());
    } catch (error) {
        logger.warn('Failed to broadcast discount update:', error.message);
    }
};

/**
 * Notify admins when support tickets change
 */
export const notifySupportChanged = async (metadata = {}) => {
    try {
        const prisma = getPrisma();


        broadcastToAdmins('support', [
            QUERY_KEYS.ADMIN_SUPPORT,
            QUERY_KEYS.SIDEBAR_STATS,
            ['support', 'ticket'], // Also invalidate individual ticket views
            ['support', 'tickets'], // User-side ticket list
        ], metadata);

        smartCache.invalidateByPrefix('support:');
    } catch (error) {
        logger.warn('Failed to broadcast support update:', error.message);
    }
};

/**
 * Notify ALL users when currency rates change
 */
export const notifyCurrencyChanged = async (metadata = {}) => {
    try {
        smartCache.del('currency:rates');

        broadcastToAllUsers('currency', [
            QUERY_KEYS.PUBLIC_CURRENCY,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast currency update:', error.message);
    }
};

export const notifyNotificationsChanged = async (userId, metadata = {}) => {
    try {
        const prisma = getPrisma();


        // 2. Broadcast to specific user (or use broad broadcast if admin)
        // We broadcast the 'notifications' query key so the frontend refetches
        broadcastToAllUsers('notifications', [
            QUERY_KEYS.PUBLIC_NOTIFICATIONS,
        ], { ...metadata, userId });

        // Invalidate smartCache for notifications
        if (userId) {
            smartCache.invalidateByPrefix(`notifications:${userId}`);
        }

        // If it's an admin notification (e.g. new review alert), also notify admins
        if (metadata.isAdminEvent) {
            broadcastToAdmins('notifications', [
                QUERY_KEYS.ADMIN_NOTIFICATIONS,
            ], metadata);
        }

        // Invalidate dashboard activity cache on admin events
        if (metadata.isAdminEvent || metadata.action?.includes('admin')) {
            smartCache.invalidateByPrefix('dashboard:activity:');
        }
    } catch (error) {
        logger.warn('Failed to broadcast notification update:', error.message);
    }
};

/**
 * Notify user when wishlist changes
 */
export const notifyWishlistChanged = async (userId, metadata = {}) => {
    try {
        if (userId) {
            smartCache.del(smartCache.keys.wishlist(userId));
        }

        broadcastToAllUsers('wishlist', [
            ['wishlist', userId],
        ], { ...metadata, userId });
    } catch (error) {
        logger.warn('Failed to broadcast wishlist update:', error.message);
    }
};

export default {
    notifyOrdersChanged,
    notifyProductsChanged,
    notifyStockChanged,
    notifyUsersChanged,
    notifyReviewsChanged,
    notifyCategoriesChanged,
    notifySettingsChanged,
    notifyBannersChanged,
    notifyDiscountsChanged,
    notifySupportChanged,
    notifyNotificationsChanged,
    notifyCurrencyChanged,
    notifyWishlistChanged,
    QUERY_KEYS,
};
