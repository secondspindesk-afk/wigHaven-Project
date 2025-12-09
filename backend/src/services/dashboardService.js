import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Get Recent Orders
 * @param {number} page
 * @param {number} limit
 */
export const getRecentOrders = async (page = 1, limit = 20) => {
    try {
        const prisma = getPrisma();
        const skip = Math.max(0, (page - 1) * limit);

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                take: limit,
                skip,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { email: true, firstName: true, lastName: true } } }
            }),
            prisma.order.count()
        ]);

        return {
            orders: orders.map(o => ({
                id: o.id,
                order_number: o.orderNumber,
                customer: o.user
                    ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim() || o.customerEmail
                    : o.customerEmail,
                total: Number(o.total),
                status: o.status,
                payment_status: o.paymentStatus,
                created_at: o.createdAt
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        logger.error('Error in getRecentOrders service:', error);
        throw error;
    }
};

/**
 * Get Admin Activity
 * @param {number} page
 * @param {number} limit
 */
export const getAdminActivity = async (page = 1, limit = 50) => {
    try {
        const prisma = getPrisma();
        const skip = (page - 1) * limit;

        const [activities, total] = await Promise.all([
            prisma.adminActivity.findMany({
                take: limit,
                skip,
                orderBy: { createdAt: 'desc' },
                include: { admin: { select: { firstName: true, lastName: true, email: true } } }
            }),
            prisma.adminActivity.count()
        ]);

        return {
            activities,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        logger.error('Error in getAdminActivity service:', error);
        throw error;
    }
};

/**
 * Get Low Stock Alerts
 * @param {number} threshold
 */
export const getLowStockAlerts = async (threshold = 10) => {
    try {
        const prisma = getPrisma();
        const products = await prisma.variant.findMany({
            where: {
                isActive: true,
                stock: { gt: 0, lte: threshold }
            },
            include: { product: { select: { name: true } } },
            take: 50
        });

        return products.map(p => ({
            id: p.id,
            product_name: p.product.name,
            sku: p.sku,
            stock: p.stock,
            threshold
        }));
    } catch (error) {
        logger.error('Error in getLowStockAlerts service:', error);
        throw error;
    }
};

export default {
    getRecentOrders,
    getAdminActivity,
    getLowStockAlerts
};
