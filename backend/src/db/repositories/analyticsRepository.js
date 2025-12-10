import { getPrisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';

/**
 * Analytics Repository
 * Handles complex aggregation queries for the admin dashboard
 * "Developer God" Standard: Raw SQL for performance, strict typing, zero gaps.
 */

/**
 * Get daily metrics for a specific date
 * @param {Date} date - Date to calculate metrics for
 * @returns {Promise<Object>} Daily metrics
 */
export const calculateDailyMetrics = async (date) => {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const prisma = getPrisma();
    const [revenue, orders, newCustomers, pendingOrders] = await Promise.all([
        // Total Revenue (Paid orders only)
        prisma.order.aggregate({
            _sum: { total: true },
            where: {
                createdAt: { gte: startOfDay, lte: endOfDay },
                paymentStatus: 'paid',
                status: { not: 'cancelled' }
            }
        }),

        // Total Orders (All non-cancelled)
        prisma.order.count({
            where: {
                createdAt: { gte: startOfDay, lte: endOfDay },
                status: { not: 'cancelled' }
            }
        }),

        // New Customers
        prisma.user.count({
            where: {
                createdAt: { gte: startOfDay, lte: endOfDay },
                role: 'customer'
            }
        }),

        // Pending Orders (requiring action)
        prisma.order.count({
            where: {
                status: 'pending',
                createdAt: { gte: startOfDay, lte: endOfDay }
            }
        })
    ]);

    return {
        revenue: revenue._sum.total != null ? Number(revenue._sum.total) : 0,
        orders,
        newCustomers,
        pendingOrders
    };
};

/**
 * Get sales trends for a date range with GAP FILLING
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Promise<Array<{date: string, revenue: number, orders: number}>>}
 */
export const getSalesTrends = async (startDate, endDate) => {
    const prisma = getPrisma();

    // Use generate_series to create a continuous date range, then LEFT JOIN orders
    // This ensures days with 0 sales are included (Gap Filling)
    const trends = await prisma.$queryRaw`
        SELECT 
            TO_CHAR(d.day, 'YYYY-MM-DD') as date,
            COALESCE(SUM(o.total), 0) as revenue,
            COUNT(o.id) as orders
        FROM (
            SELECT generate_series(${startDate}::timestamp, ${endDate}::timestamp, '1 day'::interval) as day
        ) d
        LEFT JOIN orders o ON DATE(o.created_at) = DATE(d.day) 
            AND o.payment_status = 'paid' 
            AND o.status != 'cancelled'
        GROUP BY d.day
        ORDER BY d.day ASC
    `;

    return trends.map(t => ({
        date: t.date,
        revenue: Number(t.revenue),
        orders: Number(t.orders)
    }));
};

/**
 * Get top products by revenue or units sold
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {number} limit 
 * @param {string} sortBy - 'revenue' or 'units'
 */
export const getTopProducts = async (startDate, endDate, limit = 10, sortBy = 'revenue') => {
    const prisma = getPrisma();

    // Simplified query - order_items has product_name stored directly
    // Group by product_name since that's most reliable
    const products = await prisma.$queryRaw`
        SELECT 
            v.product_id as product_id,
            oi.product_name as product_name,
            CAST(COALESCE(SUM(oi.quantity), 0) AS DOUBLE PRECISION) as units_sold,
            CAST(COALESCE(SUM(oi.subtotal), 0) AS DOUBLE PRECISION) as revenue
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        INNER JOIN variants v ON oi.variant_id = v.id
        WHERE 
            o.created_at >= ${startDate}::timestamp
            AND o.created_at <= ${endDate}::timestamp
            AND o.status NOT IN ('cancelled', 'refunded')
        GROUP BY v.product_id, oi.product_name
        ORDER BY revenue DESC
        LIMIT ${limit}
    `;

    return products.map(p => ({
        product_id: p.product_id,
        product_name: p.product_name,
        category: null,
        units_sold: Number(p.units_sold),
        revenue: Number(p.revenue)
    }));
};

/**
 * Get order status breakdown
 */
export const getOrderStatusBreakdown = async () => {
    const prisma = getPrisma();
    const breakdown = await prisma.order.groupBy({
        by: ['status'],
        _count: { id: true }
    });

    const total = breakdown.reduce((acc, curr) => acc + curr._count.id, 0);

    return breakdown.reduce((acc, curr) => {
        acc[curr.status] = {
            count: curr._count.id,
            percent: total > 0 ? (curr._count.id / total) * 100 : 0
        };
        return acc;
    }, {});
};

/**
 * Get inventory status summary
 * Buckets: >10 (Good), 1-10 (Low), 0 (Out)
 */
export const getInventoryStatus = async () => {
    const prisma = getPrisma();
    const [totalVariants, totalUnits, lowStock, outOfStock] = await Promise.all([
        prisma.variant.count({ where: { isActive: true } }),
        prisma.variant.aggregate({
            _sum: { stock: true },
            where: { isActive: true }
        }),
        prisma.variant.count({
            where: {
                isActive: true,
                stock: { gt: 0, lte: 10 } // Low Stock Threshold: 1-10
            }
        }),
        prisma.variant.count({
            where: {
                isActive: true,
                stock: 0 // Out of Stock
            }
        })
    ]);

    const total = totalVariants;
    const inStock = total - (lowStock + outOfStock); // Strictly > 10

    return {
        total_variants: total,
        total_units: Number(totalUnits._sum.stock) || 0,
        in_stock: {
            count: inStock,
            percent: total > 0 ? (inStock / total) * 100 : 0
        },
        low_stock: {
            count: lowStock,
            percent: total > 0 ? (lowStock / total) * 100 : 0
        },
        out_of_stock: {
            count: outOfStock,
            percent: total > 0 ? (outOfStock / total) * 100 : 0
        }
    };
};

/**
 * Get revenue by category
 */
export const getRevenueByCategory = async (startDate, endDate) => {
    const prisma = getPrisma();
    const categories = await prisma.$queryRaw`
        SELECT 
            c.slug as category,
            c.name as category_name,
            COALESCE(SUM(oi.subtotal), 0) as revenue,
            COUNT(DISTINCT o.id) as orders
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN variants v ON oi.variant_id = v.id
        JOIN products p ON v.product_id = p.id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE 
            o.created_at >= ${startDate} 
            AND o.created_at <= ${endDate}
            AND o.payment_status = 'paid'
            AND o.status != 'cancelled'
        GROUP BY c.slug, c.name
        ORDER BY revenue DESC
    `;

    const totalRevenue = categories.reduce((acc, c) => acc + Number(c.revenue), 0);

    return categories.map(c => ({
        category: c.category,
        category_name: c.category_name,
        revenue: Number(c.revenue),
        orders: Number(c.orders),
        percent: totalRevenue > 0 ? (Number(c.revenue) / totalRevenue) * 100 : 0
    }));
};

/**
 * Get customer analytics (LTV, Retention)
 */
export const getCustomerAnalytics = async (startDate, endDate) => {
    const prisma = getPrisma();

    // 1. New Customers in range
    const newCustomers = await prisma.user.count({
        where: {
            createdAt: { gte: startDate, lte: endDate },
            role: 'customer'
        }
    });

    // 2. Total Customers
    const totalCustomers = await prisma.user.count({ where: { role: 'customer' } });

    // 3. Repeat Customers (customers with > 1 order total)
    const repeatCustomers = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM (
            SELECT user_id
            FROM orders
            WHERE user_id IS NOT NULL
            GROUP BY user_id
            HAVING COUNT(id) > 1
        ) subquery
    `;
    const repeatCount = Number(repeatCustomers[0]?.count) || 0;

    // 4. LTV (Average Total Spent per Customer)
    // Sum of all paid orders / Total unique customers with orders
    const ltvData = await prisma.$queryRaw`
        SELECT 
            SUM(total) as total_revenue,
            COUNT(DISTINCT user_id) as paying_customers
        FROM orders
        WHERE payment_status = 'paid'
    `;

    const totalRevenue = Number(ltvData[0]?.total_revenue) || 0;
    const payingCustomers = Number(ltvData[0]?.paying_customers) || 1; // Avoid div by 0
    const ltv = totalRevenue / payingCustomers;

    return {
        new_customers: newCustomers,
        total_customers: totalCustomers,
        repeat_customers: repeatCount,
        customer_retention_rate: totalCustomers > 0 ? (repeatCount / totalCustomers) * 100 : 0,
        average_ltv: ltv
    };
};

/**
 * Get cart abandonment stats
 * Abandoned = Updated > 24h ago
 */
export const getCartAbandonmentStats = async () => {
    const prisma = getPrisma();

    // Define "Abandoned" as not updated in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalCarts, abandonedCarts, recoveredCarts] = await Promise.all([
        prisma.cart.count(),
        prisma.cart.count({
            where: {
                updatedAt: { lt: twentyFourHoursAgo }
            }
        }),
        // "Recovered" logic usually requires tracking if an abandoned cart was later converted.
        // For now, we'll check AbandonedCart table if we have one, or stick to the Cart table.
        // The schema has an `AbandonedCart` model. Let's use that for recovery stats if populated.
        prisma.abandonedCart.count({ where: { recovered: true } })
    ]);

    return {
        total_carts: totalCarts,
        abandoned_carts: abandonedCarts,
        recovered_carts: recoveredCarts,
        abandonment_rate: totalCarts > 0 ? (abandonedCarts / totalCarts) * 100 : 0,
        recovery_rate: abandonedCarts > 0 ? (recoveredCarts / abandonedCarts) * 100 : 0
    };
};

/**
 * Get System Health (Database & Email Queue)
 * NOTE: PgBoss removed - now using in-memory email queue
 */
export const getSystemHealth = async () => {
    const prisma = getPrisma();
    const start = Date.now();
    let dbStatus = 'disconnected';
    let latency = 0;

    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
        latency = Date.now() - start;
    } catch (e) {
        dbStatus = 'error';
    }

    // Get email queue stats from simple in-memory queue
    // Import dynamically to avoid circular dependency
    let queueStats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    try {
        const { getQueueStats } = await import('../../config/simpleEmailQueue.js');
        queueStats = getQueueStats();
    } catch (e) {
        // If queue not available, use defaults
        queueStats = { error: 'Queue stats unavailable' };
    }

    return {
        database: { status: dbStatus, latency_ms: latency },
        queue: queueStats,
        uptime: process.uptime()
    };
};

export default {
    calculateDailyMetrics,
    getSalesTrends,
    getTopProducts,
    getOrderStatusBreakdown,
    getInventoryStatus,
    getRevenueByCategory,
    getCustomerAnalytics,
    getCartAbandonmentStats,
    getSystemHealth
};
