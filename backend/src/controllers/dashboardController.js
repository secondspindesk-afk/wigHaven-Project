import analyticsService from '../services/analyticsService.js';
import dashboardService from '../services/dashboardService.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Dashboard Controller
 * Handles all admin dashboard endpoints
 * "Developer God" Standard: Strict validation, error handling, no crashes.
 */

export const getSummary = async (req, res) => {
    try {
        const data = await analyticsService.getDashboardSummary();
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Dashboard Summary Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch summary' });
    }
};

export const getSalesTrends = async (req, res) => {
    try {
        const days = parseInt(req.query.range) || 7;
        if (![7, 30, 90].includes(days)) {
            return res.status(400).json({ success: false, error: 'Invalid range. Use 7, 30, or 90.' });
        }
        const data = await analyticsService.getSalesTrends(days);
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Sales Trends Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch sales trends' });
    }
};

export const getTopProducts = async (req, res) => {
    try {
        const days = parseInt(req.query.range) || 30;
        const limit = parseInt(req.query.limit) || 10;
        const data = await analyticsService.getTopProducts(days, Math.min(limit, 50));
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Top Products Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch top products' });
    }
};

export const getRecentOrders = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 20;

        const data = await dashboardService.getRecentOrders(page, limit);

        res.json({
            success: true,
            data: data.orders,
            pagination: data.pagination
        });
    } catch (error) {
        logger.error('Recent Orders Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch recent orders' });
    }
};

export const getOrderStatusBreakdown = async (req, res) => {
    try {
        const data = await analyticsService.getOrderStatusBreakdown();
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Order Status Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch order status' });
    }
};

export const getInventoryStatus = async (req, res) => {
    try {
        const data = await analyticsService.getInventoryStatus();
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Inventory Status Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch inventory status' });
    }
};

export const getRevenueByCategory = async (req, res) => {
    try {
        const days = parseInt(req.query.range) || 30;
        const data = await analyticsService.getRevenueByCategory(days);
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Revenue Category Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch revenue by category' });
    }
};

export const getEmailStats = async (req, res) => {
    try {
        const data = await analyticsService.getEmailStats();
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Email Stats Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch email stats' });
    }
};

export const getCustomerAnalytics = async (req, res) => {
    try {
        const days = parseInt(req.query.range) || 30;
        const data = await analyticsService.getCustomerAnalytics(days);
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Customer Analytics Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch customer analytics' });
    }
};

export const getSystemHealth = async (req, res) => {
    try {
        const data = await analyticsService.getSystemHealth();
        res.json({ success: true, data });
    } catch (error) {
        logger.error('System Health Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch system health' });
    }
};

export const getAdminActivity = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;

        const data = await dashboardService.getAdminActivity(page, limit);

        res.json({
            success: true,
            data: data.activities,
            pagination: data.pagination
        });
    } catch (error) {
        logger.error('Admin Activity Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch admin activity' });
    }
};

export const getLowStockAlerts = async (req, res) => {
    try {
        const data = await dashboardService.getLowStockAlerts();
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Low Stock Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch low stock alerts' });
    }
};

export const getPaymentMethods = async (req, res) => {
    try {
        const data = await analyticsService.getPaymentMethods();
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Payment Methods Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch payment methods' });
    }
};

export const getCartAbandonment = async (req, res) => {
    try {
        const data = await analyticsService.getCartAbandonmentStats();
        res.json({ success: true, data });
    } catch (error) {
        logger.error('Cart Abandonment Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch cart abandonment' });
    }
};

/**
 * Export Reports - STREAMING CSV
 * 
 * Memory-optimized: Uses cursor pagination to stream data in batches
 * Never holds more than 100 records in memory at once
 */
export const exportReports = async (req, res) => {
    try {
        const { type, range } = req.query;
        const prisma = getPrisma();
        const BATCH_SIZE = 100;

        // Calculate date filter
        const days = parseInt(range) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Validate type
        if (!['orders', 'products', 'customers'].includes(type)) {
            return res.status(400).json({ success: false, error: 'Invalid report type. Use: orders, products, customers' });
        }

        // Set response headers for CSV streaming
        const filename = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // Define fields and headers for each type
        const config = {
            orders: {
                headers: ['Order Number', 'Date', 'Customer Name', 'Customer Email', 'Status', 'Payment Status', 'Total', 'Items Count'],
                model: prisma.order,
                where: { createdAt: { gte: startDate } },
                include: { user: { select: { firstName: true, lastName: true, email: true } }, items: { select: { id: true } } },
                mapRow: (o) => [
                    o.orderNumber,
                    o.createdAt.toISOString().split('T')[0],
                    o.user ? `${o.user.firstName} ${o.user.lastName}` : 'Guest',
                    o.user?.email || o.customerEmail || '',
                    o.status,
                    o.paymentStatus,
                    Number(o.total).toFixed(2),
                    o.items?.length || 0
                ]
            },
            products: {
                headers: ['Name', 'Category', 'Base Price', 'Total Stock', 'Status'],
                model: prisma.product,
                where: {},
                include: { variants: { select: { stock: true } }, category: { select: { name: true } } },
                mapRow: (p) => [
                    p.name,
                    p.category?.name || 'Uncategorized',
                    Number(p.basePrice).toFixed(2),
                    p.variants?.reduce((sum, v) => sum + v.stock, 0) || 0,
                    p.isActive ? 'Active' : 'Inactive'
                ]
            },
            customers: {
                headers: ['Name', 'Email', 'Orders', 'Joined'],
                model: prisma.user,
                where: { role: 'customer', createdAt: { gte: startDate } },
                include: { _count: { select: { orders: true } } },
                mapRow: (c) => [
                    `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'N/A',
                    c.email,
                    c._count?.orders || 0,
                    c.createdAt.toISOString().split('T')[0]
                ]
            }
        };

        const { headers, model, where, include, mapRow } = config[type];

        // Escape CSV field
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // Write headers
        res.write(headers.join(',') + '\n');

        // Stream data with cursor pagination
        let cursor = null;
        let totalRows = 0;

        while (true) {
            const query = {
                where,
                include,
                take: BATCH_SIZE,
                orderBy: { id: 'asc' }
            };

            if (cursor) {
                query.skip = 1;
                query.cursor = { id: cursor };
            }

            const batch = await model.findMany(query);

            if (batch.length === 0) break;

            // Write each row
            for (const record of batch) {
                const row = mapRow(record).map(escapeCSV).join(',');
                res.write(row + '\n');
                totalRows++;
            }

            // Update cursor for next batch
            cursor = batch[batch.length - 1].id;

            // If batch is smaller than requested, we're done
            if (batch.length < BATCH_SIZE) break;
        }

        logger.info(`[Export] ${type}: ${totalRows} rows exported`);
        res.end();

    } catch (error) {
        logger.error('Export Report Error:', error);
        // Check if headers already sent
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Failed to export report' });
        } else {
            res.end('\n\nError: Export failed. Check server logs.');
        }
    }
};

export const getSidebarStats = async (req, res) => {
    try {
        const prisma = getPrisma();

        // Run queries in parallel for performance
        const [
            productsCount,
            pendingOrdersCount,
            usersCount,
            pendingReviewsCount,
            lowStockCount
        ] = await Promise.all([
            // Total Products
            prisma.product.count({ where: { isActive: true } }),

            // Pending Orders
            prisma.order.count({ where: { status: 'pending' } }),

            // Total Users (excluding admins if needed, but usually total users is fine)
            prisma.user.count({ where: { role: 'customer' } }),

            // Pending Reviews (not approved yet)
            prisma.review.count({ where: { isApproved: false } }),

            // Low Stock Items (variants with stock <= 5)
            prisma.variant.count({ where: { stock: { lte: 5 } } })
        ]);

        res.json({
            success: true,
            data: {
                products: productsCount,
                orders: pendingOrdersCount,
                users: usersCount,
                reviews: pendingReviewsCount,
                inventory: lowStockCount
            }
        });
    } catch (error) {
        logger.error('Sidebar Stats Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch sidebar stats' });
    }
};

/**
 * Get Cache Statistics (for monitoring)
 * @super_admin only
 */
export const getCacheStats = async (req, res) => {
    try {
        const { getCacheStats: getStats } = await import('../config/analyticsCache.js');
        const stats = getStats();
        res.json({
            success: true,
            data: {
                ...stats,
                description: 'Server-side analytics cache for reducing DB load'
            }
        });
    } catch (error) {
        logger.error('Cache Stats Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch cache stats' });
    }
};

export default {
    getSummary,
    getSalesTrends,
    getTopProducts,
    getRecentOrders,
    getOrderStatusBreakdown,
    getInventoryStatus,
    getRevenueByCategory,
    getEmailStats,
    getCustomerAnalytics,
    getSystemHealth,
    getAdminActivity,
    getLowStockAlerts,
    getPaymentMethods,
    getCartAbandonment,
    exportReports,
    getSidebarStats,
    getCacheStats
};
