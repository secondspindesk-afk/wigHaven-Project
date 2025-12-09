import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Create order
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Created order
 */
export const createOrder = async (orderData) => {
    try {
        const prisma = getPrisma();
        return await prisma.order.create({
            data: orderData,
            include: {
                items: true,
            },
        });
    } catch (error) {
        logger.error('Error creating order:', error);
        throw error;
    }
};

/**
 * Create order items
 * @param {Array} items - Array of order items
 * @returns {Promise<Array>} Created order items
 */
export const createOrderItems = async (items) => {
    try {
        const prisma = getPrisma();
        return await prisma.orderItem.createMany({
            data: items,
        });
    } catch (error) {
        logger.error('Error creating order items:', error);
        throw error;
    }
}

/**
 * Find order by ID
 * @param {string} id - Order ID
 * @returns {Promise<Object|null>} Order or null
 */
export const findOrderById = async (id) => {
    try {
        const prisma = getPrisma();
        return await prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        variant: true
                    }
                },
                user: true
            }
        });
    } catch (error) {
        logger.error(`Error finding order by ID ${id}:`, error);
        throw error;
    }
};

/**
 * Find order by order number
 * @param {string} orderNumber - Order number
 * @returns {Promise<Object|null>} Order or null
 */
export const findOrderByNumber = async (orderNumber) => {
    try {
        const prisma = getPrisma();
        return await prisma.order.findUnique({
            where: { orderNumber },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: {
                                    select: {
                                        name: true,
                                        images: true,
                                    },
                                },
                            },
                        },
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    } catch (error) {
        logger.error(`Error finding order ${orderNumber}:`, error);
        throw error;
    }
};

/**
 * Find order by Paystack reference
 * @param {string} reference - Paystack payment reference
 * @returns {Promise<Object|null>} Order or null
 */
export const findOrderByReference = async (reference) => {
    try {
        const prisma = getPrisma();
        return await prisma.order.findFirst({
            where: { paystackReference: reference },
            include: {
                items: {
                    include: {
                        variant: true,
                    },
                },
            },
        });
    } catch (error) {
        logger.error(`Error finding order by reference ${reference}:`, error);
        throw error;
    }
};

/**
 * Find orders by user ID
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Orders and pagination info
 */
export const findOrdersByUser = async (userId, { page = 1, limit = 10, status = null }) => {
    try {
        const prisma = getPrisma();
        const skip = (page - 1) * limit;

        const where = { userId };
        if (status) {
            where.status = status;
        }

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    items: {
                        include: {
                            variant: {
                                include: {
                                    product: {
                                        select: {
                                            name: true,
                                            images: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.order.count({ where }),
        ]);

        return {
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error(`Error finding orders for user ${userId}:`, error);
        throw error;
    }
};

/**
 * Find all orders (Admin)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Orders and pagination info
 */
export const findAllOrders = async ({ page = 1, limit = 20, status, payment_status, search }) => {
    try {
        const prisma = getPrisma();
        const skip = (page - 1) * limit;

        const where = {};

        // Status filter
        if (status && status !== 'all') {
            where.status = status;
        }

        // Payment status filter
        if (payment_status && payment_status !== 'all') {
            where.paymentStatus = payment_status;
        }

        // Search filter (order number or customer email)
        if (search) {
            where.OR = [
                { orderNumber: { contains: search } },
                { customerEmail: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    items: {
                        include: {
                            variant: {
                                include: {
                                    product: {
                                        select: {
                                            name: true,
                                            images: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.order.count({ where }),
        ]);

        return {
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error('Error finding all orders:', error);
        throw error;
    }
};

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {Object} updates - Status updates
 * @returns {Promise<Object>} Updated order
 */
export const updateOrderStatus = async (orderId, updates) => {
    try {
        const prisma = getPrisma();
        return await prisma.order.update({
            where: { id: orderId },
            data: updates,
        });
    } catch (error) {
        logger.error(`Error updating order ${orderId}:`, error);
        throw error;
    }
};

export default {
    createOrder,
    createOrderItems,
    findOrderById,
    findOrderByNumber,
    findOrderByReference,
    findOrdersByUser,
    findAllOrders,
    updateOrderStatus,
};
