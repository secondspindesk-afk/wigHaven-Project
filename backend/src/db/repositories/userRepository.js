import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * User repository for database operations
 * All user-related queries go through this repository
 */

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Created user
 */
export const createUser = async (userData) => {
    try {
        const prisma = getPrisma();

        const user = await prisma.user.create({
            data: {
                email: userData.email,
                password: userData.password, // Should be hashed before calling this
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone || null,
                role: userData.role || 'customer',
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                emailVerified: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return user;
    } catch (error) {
        logger.error('Failed to create user:', error);
        throw error;
    }
}


/**
 * Create a new user with verification token atomically
 * @param {Object} userData - User data
 * @param {Object} tokenData - Token data { token, expiresAt }
 * @returns {Promise<Object>} - Created user
 */
export const createUserWithVerification = async (userData, tokenData) => {
    try {
        const prisma = getPrisma();

        return await prisma.$transaction(async (tx) => {
            // 1. Create User
            const user = await tx.user.create({
                data: {
                    email: userData.email,
                    password: userData.password,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    phone: userData.phone || null,
                    role: userData.role || 'customer',
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    emailVerified: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                }
            });

            // 2. Create Verification Token
            await tx.emailVerificationToken.create({
                data: {
                    userId: user.id,
                    token: tokenData.token, // Hashed token
                    expiresAt: tokenData.expiresAt
                }
            });

            return user;
        });

    } catch (error) {
        // Handle specific unique constraint violations if needed, but usually bubbling up is fine for controller to handle
        logger.error('Failed to create user with verification:', error);
        throw error;
    }
};

/**
 * Find user by email
 * @param {string} email - User email
 * @param {boolean} includePassword - Include password in result
 * @returns {Promise<Object|null>} - User or null
 */
export const findUserByEmail = async (email, includePassword = false) => {
    try {
        const prisma = getPrisma();

        const select = {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            emailVerified: true,
            isActive: true,
            failedLoginAttempts: true,
            lockedUntil: true,
            createdAt: true,
            updatedAt: true,
        };

        if (includePassword) {
            select.password = true;
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select,
        });

        return user;
    } catch (error) {
        logger.error('Failed to find user by email:', error);
        throw error;
    }
};

/**
 * Find user by ID
 * @param {string} userId - User ID
 * @param {boolean} includePassword - Include password in result
 * @returns {Promise<Object|null>} - User or null
 */
export const findUserById = async (userId, includePassword = false) => {
    try {
        const prisma = getPrisma();

        const select = {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            emailVerified: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
        };

        if (includePassword) {
            select.password = true;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select
        });

        return user;
    } catch (error) {
        logger.error('Failed to find user by ID:', error);
        throw error;
    }
};

/**
 * Update user password
 * @param {string} userId - User ID
 * @param {string} hashedPassword - New hashed password
 * @returns {Promise<Object>} - Updated user
 */
export const updateUserPassword = async (userId, hashedPassword) => {
    try {
        const prisma = getPrisma();

        const user = await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                updatedAt: true,
            },
        });

        return user;
    } catch (error) {
        logger.error('Failed to update user password:', error);
        throw error;
    }
};

/**
 * Update user email verification status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated user
 */
export const markEmailAsVerified = async (userId) => {
    try {
        const prisma = getPrisma();

        const user = await prisma.user.update({
            where: { id: userId },
            data: { emailVerified: true },
            select: {
                id: true,
                email: true,
                emailVerified: true,
            },
        });

        return user;
    } catch (error) {
        logger.error('Failed to mark email as verified:', error);
        throw error;
    }
};

/**
 * Update user active status
 * @param {string} userId - User ID
 * @param {boolean} isActive - Active status
 * @returns {Promise<Object>} - Updated user
 */
export const updateUserActiveStatus = async (userId, isActive) => {
    try {
        const prisma = getPrisma();

        const user = await prisma.user.update({
            where: { id: userId },
            data: { isActive },
            select: {
                id: true,
                email: true,
                isActive: true,
            },
        });

        return user;
    } catch (error) {
        logger.error('Failed to update user active status:', error);
        throw error;
    }
};

/**
 * Check if user exists by email
 * @param {string} email - User email
 * @returns {Promise<boolean>} - True if exists
 */
export const userExistsByEmail = async (email) => {
    try {
        const prisma = getPrisma();

        const count = await prisma.user.count({
            where: { email },
        });

        return count > 0;
    } catch (error) {
        logger.error('Failed to check if user exists:', error);
        throw error;
    }
};

/**
 * Get user count by role
 * @param {string} role - User role
 * @returns {Promise<number>} - User count
 */
export const getUserCountByRole = async (role) => {
    try {
        const prisma = getPrisma();
        return await prisma.user.count({
            where: { role },
        });
    } catch (error) {
        logger.error('Failed to get user count by role:', error);
        throw error;
    }
};

/**
 * Get all users (Admin)
 * @param {Object} options - Search, pagination options
 * @returns {Promise<Object>} - Users with pagination
 */
export const getAllUsers = async ({ page = 1, limit = 20, search = '' } = {}) => {
    try {
        const prisma = getPrisma();
        const skip = (page - 1) * limit;

        const where = {
            role: { not: 'super_admin' }
        };
        if (search) {
            where.AND = {
                OR: [
                    { email: { contains: search, mode: 'insensitive' } },
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                ]
            };
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    emailVerified: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: { orders: true }
                    }
                }
            }),
            prisma.user.count({ where }),
        ]);

        // Get total spent for all users in a SINGLE query (fixes N+1)
        const userIds = users.map(u => u.id);
        const totalSpentByUser = await prisma.order.groupBy({
            by: ['userId'],
            where: {
                userId: { in: userIds },
                paymentStatus: 'paid'
            },
            _sum: { total: true }
        });

        // Create a lookup map for O(1) access
        const totalSpentMap = new Map(
            totalSpentByUser.map(row => [row.userId, row._sum.total || 0])
        );

        // Map users with their stats
        const usersWithStats = users.map(user => ({
            ...user,
            order_count: user._count.orders,
            total_spent: totalSpentMap.get(user.id) || 0,
        }));

        return {
            users: usersWithStats,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error('Failed to get all users:', error);
        throw error;
    }
};

/**
 * Get user details with orders and addresses
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User details
 */
export const getUserDetails = async (userId) => {
    try {
        const prisma = getPrisma();

        // Run both queries in parallel (was 3 sequential queries)
        const [user, totalSpent] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    emailVerified: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                    addresses: true,
                    orders: {
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                        select: {
                            id: true,
                            orderNumber: true,
                            status: true,
                            paymentStatus: true,
                            total: true,
                            createdAt: true,
                        }
                    },
                    _count: {
                        select: { orders: true }
                    }
                }
            }),
            prisma.order.aggregate({
                where: {
                    userId: userId,
                    paymentStatus: 'paid'
                },
                _sum: { total: true }
            })
        ]);

        if (!user) return null;

        return {
            ...user,
            total_spent: totalSpent._sum.total || 0,
            order_count: user._count.orders
        };
    } catch (error) {
        logger.error('Failed to get user details:', error);
        throw error;
    }
};

/**
 * Increment failed login attempts
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated user
 */
export const incrementFailedAttempts = async (userId) => {
    const prisma = getPrisma();
    return prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { id: true, failedLoginAttempts: true },
    });
};

/**
 * Lock user account for specified minutes
 * @param {string} userId - User ID
 * @param {number} minutes - Lock duration in minutes
 * @returns {Promise<Object>} - Updated user
 */
export const lockAccount = async (userId, minutes) => {
    const prisma = getPrisma();
    const lockUntil = new Date(Date.now() + minutes * 60 * 1000);
    return prisma.user.update({
        where: { id: userId },
        data: { lockedUntil: lockUntil },
        select: { id: true, lockedUntil: true },
    });
};

/**
 * Reset failed login attempts and unlock account
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated user
 */
export const resetFailedAttempts = async (userId) => {
    const prisma = getPrisma();
    return prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: 0, lockedUntil: null },
        select: { id: true, failedLoginAttempts: true, lockedUntil: true },
    });
};

export default {
    createUser,
    createUserWithVerification,
    findUserByEmail,
    findUserById,
    updateUserPassword,
    markEmailAsVerified,
    updateUserActiveStatus,
    userExistsByEmail,
    getUserCountByRole,
    getAllUsers,
    getUserDetails,
    incrementFailedAttempts,
    lockAccount,
    resetFailedAttempts,
};
