/**
 * Admin Real-Time Update Service
 * 
 * Broadcasts data changes to all connected admin/super_admin users
 * via WebSocket for instant dashboard updates without polling.
 */

import { broadcastToAdmins } from '../config/websocket.js';
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

    // Lists
    ADMIN_ORDERS: ['admin', 'orders'],
    ADMIN_PRODUCTS: ['admin', 'products'],
    ADMIN_USERS: ['admin', 'users'],
    ADMIN_REVIEWS: ['admin', 'reviews'],
    ADMIN_CATEGORIES: ['admin', 'categories'],
    ADMIN_BANNERS: ['admin', 'banners'],
    ADMIN_DISCOUNTS: ['admin', 'discounts'],
    ADMIN_SUPPORT: ['admin', 'support'],
    ADMIN_SETTINGS: ['admin', 'settings'],

    // Sidebar
    SIDEBAR_STATS: ['admin', 'sidebar-stats'],
};

/**
 * Notify admins when orders change (new order, status update, payment)
 */
export const notifyOrdersChanged = (metadata = {}) => {
    try {
        broadcastToAdmins('orders', [
            QUERY_KEYS.DASHBOARD_SUMMARY,
            QUERY_KEYS.RECENT_ORDERS,
            QUERY_KEYS.ORDER_STATUS,
            QUERY_KEYS.SALES_TRENDS,
            QUERY_KEYS.ADMIN_ORDERS,
            QUERY_KEYS.SIDEBAR_STATS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast order update:', error.message);
    }
};

/**
 * Notify admins when products change (created, updated, deleted)
 */
export const notifyProductsChanged = (metadata = {}) => {
    try {
        broadcastToAdmins('products', [
            QUERY_KEYS.DASHBOARD_SUMMARY,
            QUERY_KEYS.TOP_PRODUCTS,
            QUERY_KEYS.ADMIN_PRODUCTS,
            QUERY_KEYS.SIDEBAR_STATS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast product update:', error.message);
    }
};

/**
 * Notify admins when stock changes
 */
export const notifyStockChanged = (metadata = {}) => {
    try {
        broadcastToAdmins('stock', [
            QUERY_KEYS.INVENTORY_STATUS,
            QUERY_KEYS.LOW_STOCK,
            QUERY_KEYS.ADMIN_PRODUCTS,
            QUERY_KEYS.SIDEBAR_STATS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast stock update:', error.message);
    }
};

/**
 * Notify admins when users change (new signup, status change)
 */
export const notifyUsersChanged = (metadata = {}) => {
    try {
        broadcastToAdmins('users', [
            QUERY_KEYS.DASHBOARD_SUMMARY,
            QUERY_KEYS.CUSTOMER_ANALYTICS,
            QUERY_KEYS.ADMIN_USERS,
            QUERY_KEYS.SIDEBAR_STATS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast user update:', error.message);
    }
};

/**
 * Notify admins when reviews change (new, approved, rejected)
 */
export const notifyReviewsChanged = (metadata = {}) => {
    try {
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
 */
export const notifyCategoriesChanged = (metadata = {}) => {
    try {
        broadcastToAdmins('categories', [
            QUERY_KEYS.ADMIN_CATEGORIES,
            QUERY_KEYS.ADMIN_PRODUCTS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast category update:', error.message);
    }
};

/**
 * Notify admins when settings change
 */
export const notifySettingsChanged = (metadata = {}) => {
    try {
        broadcastToAdmins('settings', [
            QUERY_KEYS.ADMIN_SETTINGS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast settings update:', error.message);
    }
};

/**
 * Notify admins when banners change
 */
export const notifyBannersChanged = (metadata = {}) => {
    try {
        broadcastToAdmins('banners', [
            QUERY_KEYS.ADMIN_BANNERS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast banner update:', error.message);
    }
};

/**
 * Notify admins when discounts change
 */
export const notifyDiscountsChanged = (metadata = {}) => {
    try {
        broadcastToAdmins('discounts', [
            QUERY_KEYS.ADMIN_DISCOUNTS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast discount update:', error.message);
    }
};

/**
 * Notify admins when support tickets change
 */
export const notifySupportChanged = (metadata = {}) => {
    try {
        broadcastToAdmins('support', [
            QUERY_KEYS.ADMIN_SUPPORT,
            QUERY_KEYS.SIDEBAR_STATS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast support update:', error.message);
    }
};

/**
 * Notify admins of dashboard data change (generic)
 */
export const notifyDashboardChanged = (metadata = {}) => {
    try {
        broadcastToAdmins('dashboard', [
            QUERY_KEYS.DASHBOARD_SUMMARY,
            QUERY_KEYS.SIDEBAR_STATS,
        ], metadata);
    } catch (error) {
        logger.warn('Failed to broadcast dashboard update:', error.message);
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
    notifyDashboardChanged,
    QUERY_KEYS,
};
