import wishlistRepository from '../db/repositories/wishlistRepository.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Get user's wishlist
 */
export const getWishlist = async (userId) => {
    return await wishlistRepository.getWishlistByUserId(userId);
};

/**
 * Add product to wishlist with comprehensive validation
 */
export const addToWishlist = async (userId, productId) => {
    const prisma = getPrisma();

    // FIXED BUG #2: Validate product exists and is active
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
            id: true,
            isActive: true,
            name: true
        }
    });

    if (!product) {
        throw new Error('Product not found');
    }

    if (!product.isActive) {
        throw new Error('This product is no longer available');
    }

    // Check if already in wishlist
    const existing = await wishlistRepository.findWishlistItem(userId, productId);
    if (existing) {
        throw new Error('Item already in wishlist');
    }

    // Add to wishlist
    logger.info(`User ${userId} added product ${product.name} to wishlist`);
    return await wishlistRepository.addToWishlist(userId, productId);
};

/**
 * Remove product from wishlist
 */
export const removeFromWishlist = async (userId, productId) => {
    // Verify item exists before attempting delete
    const existing = await wishlistRepository.findWishlistItem(userId, productId);
    if (!existing) {
        throw new Error('Item not in wishlist');
    }

    return await wishlistRepository.removeFromWishlist(userId, productId);
};

export default {
    getWishlist,
    addToWishlist,
    removeFromWishlist
};
