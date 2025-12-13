import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Get user wishlist with only active products
 */
export const getWishlistByUserId = async (userId) => {
    try {
        const prisma = getPrisma();
        const wishlist = await prisma.wishlist.findMany({
            where: {
                userId,
                product: { isActive: true } // FIXED BUG #16: Filter inactive products
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        basePrice: true,
                        images: true,
                        category: true,
                        isFeatured: true,
                        isActive: true, // Include status for frontend
                        // FIX: Include variants nested inside product
                        variants: {
                            where: { isActive: true },
                            orderBy: { createdAt: 'asc' }, // Ensure Main Variant is first
                            select: {
                                id: true,
                                price: true,
                                stock: true,
                                sku: true,
                                color: true,
                                length: true,
                                texture: true,
                                size: true,
                                images: true // Include images for frontend display
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Flatten category for frontend compatibility
        return wishlist.map(item => ({
            ...item,
            product: {
                ...item.product,
                category: item.product.category.slug
            }
        }));
    } catch (error) {
        logger.error('Error fetching wishlist:', error);
        throw error;
    }
};

export const findWishlistItem = async (userId, productId) => {
    try {
        const prisma = getPrisma();
        return await prisma.wishlist.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId
                }
            }
        });
    } catch (error) {
        logger.error('Error finding wishlist item:', error);
        throw error;
    }
};

export const addToWishlist = async (userId, productId) => {
    try {
        const prisma = getPrisma();
        return await prisma.wishlist.create({
            data: { userId, productId },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        basePrice: true,
                        images: true,
                        category: true,
                        isActive: true
                    }
                }
            }
        });
    } catch (error) {
        logger.error('Error adding to wishlist:', error);
        throw error;
    }
};

export const removeFromWishlist = async (userId, productId) => {
    try {
        const prisma = getPrisma();
        return await prisma.wishlist.delete({
            where: {
                userId_productId: {
                    userId,
                    productId
                }
            }
        });
    } catch (error) {
        logger.error('Error removing from wishlist:', error);
        throw error;
    }
};

export default {
    getWishlistByUserId,
    findWishlistItem,
    addToWishlist,
    removeFromWishlist
};
