import wishlistService from '../services/wishlistService.js';
import logger from '../utils/logger.js';

/**
 * Get user's wishlist
 */
export const getWishlist = async (req, res) => {
    try {
        const userId = req.user.id; // FIXED BUG #11: was req.user.userId
        const wishlist = await wishlistService.getWishlist(userId);

        res.json({
            success: true,
            data: wishlist,
            count: wishlist.length
        });
    } catch (error) {
        logger.error('Get Wishlist Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch wishlist',
            message: error.message
        });
    }
};

/**
 * Add item to wishlist with validation
 */
export const addToWishlist = async (req, res) => {
    try {
        const userId = req.user.id; // FIXED BUG #11
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                error: 'Product ID is required'
            });
        }

        // Validate productId format (CUID)
        if (typeof productId !== 'string' || productId.length < 20 || productId.length > 30) {
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID format'
            });
        }

        const item = await wishlistService.addToWishlist(userId, productId);
        res.status(201).json({
            success: true,
            data: item,
            message: 'Added to wishlist'
        });
    } catch (error) {
        logger.error('Add to Wishlist Error:', error);

        // FIXED BUG #15: Better error messages
        if (error.message === 'Product not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        if (error.message === 'Item already in wishlist') {
            return res.status(409).json({ success: false, error: error.message });
        }
        if (error.message === 'This product is no longer available') {
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(400).json({
            success: false,
            error: error.message || 'Failed to add to wishlist'
        });
    }
};

/**
 * Remove item from wishlist
 */
export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user.id; // FIXED BUG #11
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({
                success: false,
                error: 'Product ID is required'
            });
        }

        await wishlistService.removeFromWishlist(userId, productId);
        res.json({
            success: true,
            message: 'Removed from wishlist'
        });
    } catch (error) {
        logger.error('Remove from Wishlist Error:', error);

        // FIXED BUG #15: Better error messages
        if (error.message === 'Item not in wishlist') {
            return res.status(404).json({ success: false, error: error.message });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to remove from wishlist',
            message: error.message
        });
    }
};

export default {
    getWishlist,
    addToWishlist,
    removeFromWishlist
};
