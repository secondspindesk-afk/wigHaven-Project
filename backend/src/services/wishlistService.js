import wishlistRepository from '../db/repositories/wishlistRepository.js';
import { getPrisma } from '../config/database.js';
import adminBroadcast from '../utils/adminBroadcast.js';
import smartCache from '../utils/smartCache.js';
import logger from '../utils/logger.js';

/**
 * Get user's wishlist
 */
export const getWishlist = async (userId) => {
    return smartCache.getOrFetch(
        smartCache.keys.wishlist(userId),
        () => wishlistRepository.getWishlistByUserId(userId),
        { type: 'wishlist', swr: true }
    );
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
    const result = await wishlistRepository.addToWishlist(userId, productId);

    // 🔔 Real-time sync
    await adminBroadcast.notifyWishlistChanged(userId);

    return result;
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

    const result = await wishlistRepository.removeFromWishlist(userId, productId);

    // 🔔 Real-time sync
    await adminBroadcast.notifyWishlistChanged(userId);

    return result;
};

export default {
    getWishlist,
    addToWishlist,
    removeFromWishlist
};
