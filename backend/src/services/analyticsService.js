import analyticsRepository from '../db/repositories/analyticsRepository.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Get Dashboard Summary
 * @returns {Object} Summary metrics
 */
export const getDashboardSummary = async () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const [todayMetrics, yesterdayMetrics, stats] = await Promise.all([
        analyticsRepository.calculateDailyMetrics(today),
        analyticsRepository.calculateDailyMetrics(yesterday),
        getOverallStats()
    ]);

    const summary = {
        today: todayMetrics,
        yesterday: yesterdayMetrics,
        change: {
            revenue_percent: calculateChange(todayMetrics.revenue, yesterdayMetrics.revenue),
            orders_percent: calculateChange(todayMetrics.orders, yesterdayMetrics.orders)
        },
        stats
    };

    return summary;
};

const getOverallStats = async () => {
    const prisma = getPrisma();
    const [totalCustomers, totalRevenue, pendingOrders] = await Promise.all([
        prisma.user.count({ where: { role: 'customer' } }),
        prisma.order.aggregate({
            _sum: { total: true },
            where: { paymentStatus: 'paid' }
        }),
        prisma.order.count({ where: { status: 'pending' } })
    ]);

    return {
        total_customers: totalCustomers,
        total_revenue_all_time: Number(totalRevenue._sum.total) || 0,
        pending_orders: pendingOrders
    };
};

const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
};

/**
 * Get Sales Trends
 * @param {number} days - Number of days (7, 30, 90)
 */
export const getSalesTrends = async (days = 7) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const daily = await analyticsRepository.getSalesTrends(startDate, endDate);

    const summary = daily.reduce((acc, day) => ({
        total_revenue: acc.total_revenue + day.revenue,
        total_orders: acc.total_orders + day.orders,
    }), { total_revenue: 0, total_orders: 0 });

    return {
        range: `${days} days`,
        daily,
        summary: {
            ...summary,
            avg_daily_revenue: daily.length > 0 ? summary.total_revenue / daily.length : 0
        }
    };
};

/**
 * Get Top Products
 * @param {number} days 
 * @param {number} limit 
 */
export const getTopProducts = async (days = 30, limit = 10) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const products = await analyticsRepository.getTopProducts(startDate, endDate, limit);
    return products;
};

/**
 * Get Order Status Breakdown
 */
export const getOrderStatusBreakdown = async () => {
    const breakdown = await analyticsRepository.getOrderStatusBreakdown();
    return breakdown;
};

/**
 * Get Inventory Status
 */
export const getInventoryStatus = async () => {
    const status = await analyticsRepository.getInventoryStatus();
    return status;
};

/**
 * Get Revenue By Category
 */
export const getRevenueByCategory = async (days = 30) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await analyticsRepository.getRevenueByCategory(startDate, endDate);
    return data;
};

/**
 * Get Customer Analytics
 */
export const getCustomerAnalytics = async (days = 30) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await analyticsRepository.getCustomerAnalytics(startDate, endDate);
    return data;
};

/**
 * Get Email Stats
 */
export const getEmailStats = async () => {
    const [todayStats, allTimeStats, byType] = await Promise.all([
        getEmailStatsForPeriod(new Date().setHours(0, 0, 0, 0)),
        getEmailStatsForPeriod(new Date(0)),
        getEmailStatsByType()
    ]);

    return {
        today: todayStats,
        all_time: allTimeStats,
        by_type: byType
    };
};

const getEmailStatsForPeriod = async (startDate) => {
    const prisma = getPrisma();
    const [sent, failed, queued] = await Promise.all([
        prisma.emailLog.count({ where: { createdAt: { gte: new Date(startDate) }, status: 'sent' } }),
        prisma.emailLog.count({ where: { createdAt: { gte: new Date(startDate) }, status: 'failed' } }),
        prisma.emailLog.count({ where: { createdAt: { gte: new Date(startDate) }, status: 'queued' } })
    ]);

    // NOTE: Success rate is calculated only for completed attempts (sent + failed)
    // Queued emails are excluded as they haven't been processed yet
    const total = sent + failed;
    return {
        sent,
        failed,
        pending: queued,
        success_rate: total > 0 ? (sent / total) * 100 : 0
    };
};

const getEmailStatsByType = async () => {
    const prisma = getPrisma();
    const stats = await prisma.emailLog.groupBy({
        by: ['type', 'status'],
        _count: { id: true }
    });

    return stats.reduce((acc, curr) => {
        if (!acc[curr.type]) acc[curr.type] = { sent: 0, failed: 0 };
        if (curr.status === 'sent') acc[curr.type].sent = curr._count.id;
        if (curr.status === 'failed') acc[curr.type].failed = curr._count.id;
        return acc;
    }, {});
};

/**
 * Get System Health
 */
export const getSystemHealth = async () => {
    return await analyticsRepository.getSystemHealth();
};

/**
 * Get Cart Abandonment Stats
 */
export const getCartAbandonmentStats = async () => {
    const stats = await analyticsRepository.getCartAbandonmentStats();
    return stats;
};

/**
 * Get Payment Methods Stats
 */
export const getPaymentMethods = async () => {
    const prisma = getPrisma();
    const count = await prisma.order.count({ where: { paymentStatus: 'paid' } });
    const revenue = await prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: 'paid' }
    });

    return {
        paystack: {
            count,
            revenue: Number(revenue._sum.total) || 0,
            percent: 100
        }
    };
};

export default {
    getDashboardSummary,
    getSalesTrends,
    getTopProducts,
    getOrderStatusBreakdown,
    getInventoryStatus,
    getRevenueByCategory,
    getCustomerAnalytics,
    getEmailStats,
    getSystemHealth,
    getCartAbandonmentStats,
    getPaymentMethods
};
