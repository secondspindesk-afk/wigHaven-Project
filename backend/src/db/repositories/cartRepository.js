import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Find cart by User ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Cart with items
 */
export const findCartByUserId = async (userId) => {
    try {
        const prisma = getPrisma();
        return await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    } catch (error) {
        logger.error(`Error finding cart for user ${userId}:`, error);
        throw error;
    }
};

/**
 * Create cart for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created cart
 */
export const createCart = async (userId) => {
    try {
        const prisma = getPrisma();
        logger.info(`[REPO] Creating cart for userId: ${userId}`);

        // Verify user exists
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            logger.error(`[REPO] User ${userId} NOT FOUND when creating cart`);
        } else {
            logger.info(`[REPO] User ${userId} found, proceeding to create cart`);
        }

        return await prisma.cart.create({
            data: { userId },
            include: { items: true },
        });
    } catch (error) {
        logger.error(`Error creating cart for user ${userId}:`, error);
        throw error;
    }
};

/**
 * Add or update item in cart
 * ATOMIC: Uses Prisma upsert to prevent race conditions
 * @param {string} cartId - Cart ID
 * @param {string} variantId - Variant ID
 * @param {number} quantity - Quantity to add (or set)
 * @param {boolean} isUpdate - If true, set quantity. If false, add to existing.
 * @returns {Promise<Object>} Updated cart item
 */
export const upsertCartItem = async (cartId, variantId, quantity, isUpdate = false) => {
    try {
        const prisma = getPrisma();
        logger.info(`[REPO] Upserting item: Cart ${cartId}, Variant ${variantId}, Qty ${quantity}, Update ${isUpdate}`);

        // ATOMIC UPSERT: Prevents race conditions
        if (isUpdate) {
            // Set mode: just set the quantity directly
            return await prisma.cartItem.upsert({
                where: {
                    cartId_variantId: { cartId, variantId },
                },
                update: { quantity },
                create: { cartId, variantId, quantity },
            });
        } else {
            // Add mode: use $transaction with increment for atomicity
            return await prisma.$transaction(async (tx) => {
                const existing = await tx.cartItem.findUnique({
                    where: { cartId_variantId: { cartId, variantId } },
                });

                if (existing) {
                    return await tx.cartItem.update({
                        where: { id: existing.id },
                        data: { quantity: { increment: quantity } },
                    });
                } else {
                    return await tx.cartItem.create({
                        data: { cartId, variantId, quantity },
                    });
                }
            }, { isolationLevel: 'Serializable' }); // Serializable ensures no race conditions
        }
    } catch (error) {
        logger.error(`Error upserting cart item (Cart: ${cartId}, Variant: ${variantId}):`, error);
        throw error;
    }
};


/**
 * Remove item from cart
 * @param {string} cartId - Cart ID
 * @param {string} variantId - Variant ID
 */
export const removeItem = async (cartId, variantId) => {
    try {
        const prisma = getPrisma();
        await prisma.cartItem.delete({
            where: {
                cartId_variantId: {
                    cartId,
                    variantId,
                },
            },
        });
    } catch (error) {
        if (error.code === 'P2025') {
            // Item not found, ignore
            return;
        }
        logger.error(`Error removing item (Cart: ${cartId}, Variant: ${variantId}):`, error);
        throw error;
    }
};

/**
 * Clear all items from cart
 * @param {string} cartId - Cart ID
 */
export const clearCart = async (cartId) => {
    try {
        const prisma = getPrisma();
        await prisma.cartItem.deleteMany({
            where: { cartId },
        });
    } catch (error) {
        logger.error(`Error clearing cart ${cartId}:`, error);
        throw error;
    }
};

/**
 * Delete cart (e.g. after checkout)
 * @param {string} cartId - Cart ID
 */
export const deleteCart = async (cartId) => {
    try {
        const prisma = getPrisma();
        await prisma.cart.delete({
            where: { id: cartId },
        });
    } catch (error) {
        logger.error(`Error deleting cart ${cartId}:`, error);
        throw error;
    }
};

export default {
    findCartByUserId,
    createCart,
    upsertCartItem,
    removeItem,
    clearCart,
    deleteCart,

    // Guest Cart Methods
    findGuestCartBySessionId: async (sessionId) => {
        try {
            const prisma = getPrisma();
            return await prisma.guestCart.findUnique({
                where: { sessionId },
                include: {
                    items: {
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });
        } catch (error) {
            logger.error(`Error finding guest cart for session ${sessionId}:`, error);
            throw error;
        }
    },

    createGuestCart: async (sessionId) => {
        try {
            const prisma = getPrisma();
            return await prisma.guestCart.create({
                data: { sessionId },
                include: { items: true },
            });
        } catch (error) {
            logger.error(`Error creating guest cart for session ${sessionId}:`, error);
            throw error;
        }
    },

    /**
     * Add or update item in guest cart
     * ATOMIC: Uses Prisma upsert to prevent race conditions
     */
    upsertGuestCartItem: async (cartId, variantId, quantity, isUpdate = false) => {
        try {
            const prisma = getPrisma();
            logger.info(`[REPO] Upserting guest item: Cart ${cartId}, Variant ${variantId}, Qty ${quantity}, Update ${isUpdate}`);

            // ATOMIC UPSERT: Prevents race conditions
            if (isUpdate) {
                // Set mode: just set the quantity directly
                return await prisma.guestCartItem.upsert({
                    where: {
                        cartId_variantId: { cartId, variantId },
                    },
                    update: { quantity },
                    create: { cartId, variantId, quantity },
                });
            } else {
                // Add mode: use $transaction with increment for atomicity
                return await prisma.$transaction(async (tx) => {
                    const existing = await tx.guestCartItem.findUnique({
                        where: { cartId_variantId: { cartId, variantId } },
                    });

                    if (existing) {
                        return await tx.guestCartItem.update({
                            where: { id: existing.id },
                            data: { quantity: { increment: quantity } },
                        });
                    } else {
                        return await tx.guestCartItem.create({
                            data: { cartId, variantId, quantity },
                        });
                    }
                }, { isolationLevel: 'Serializable' });
            }
        } catch (error) {
            logger.error(`Error upserting guest cart item:`, error);
            throw error;
        }
    },


    removeGuestItem: async (cartId, variantId) => {
        try {
            const prisma = getPrisma();
            await prisma.guestCartItem.delete({
                where: {
                    cartId_variantId: { cartId, variantId },
                },
            });
        } catch (error) {
            if (error.code === 'P2025') return;
            logger.error(`Error removing guest item:`, error);
            throw error;
        }
    },

    clearGuestCart: async (cartId) => {
        try {
            const prisma = getPrisma();
            await prisma.guestCartItem.deleteMany({
                where: { cartId },
            });
        } catch (error) {
            logger.error(`Error clearing guest cart:`, error);
            throw error;
        }
    },

    deleteGuestCart: async (cartId) => {
        try {
            const prisma = getPrisma();
            await prisma.guestCart.delete({
                where: { id: cartId },
            });
        } catch (error) {
            logger.error(`Error deleting guest cart:`, error);
            throw error;
        }
    },

    /**
     * Update Cart (e.g. for coupons)
     */
    updateCart: async (cartId, data) => {
        try {
            const prisma = getPrisma();
            return await prisma.cart.update({
                where: { id: cartId },
                data
            });
        } catch (error) {
            logger.error(`Error updating cart ${cartId}:`, error);
            throw error;
        }
    },

    /**
     * Update Guest Cart
     */
    updateGuestCart: async (cartId, data) => {
        try {
            const prisma = getPrisma();
            return await prisma.guestCart.update({
                where: { id: cartId },
                data
            });
        } catch (error) {
            logger.error(`Error updating guest cart ${cartId}:`, error);
            throw error;
        }
    }
};
