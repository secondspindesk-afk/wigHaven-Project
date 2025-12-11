import cartService from '../services/cartService.js';
import logger from '../utils/logger.js';

/**
 * Get Cart
 */
export const getCart = async (req, res, next) => {
    try {
        const cart = await cartService.getCart(req.cart);
        res.json({
            success: true,
            data: { cart },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add Item to Cart
 */
export const addToCart = async (req, res, next) => {
    try {
        const { variantId, quantity } = req.body;

        const cart = await cartService.addToCart(req.cart, variantId, parseInt(quantity));

        res.json({
            success: true,
            data: { cart },
            message: 'Item added to cart',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update Cart Item Quantity
 */
export const updateCartItem = async (req, res, next) => {
    try {
        const { variantId } = req.params;
        const { quantity } = req.body;

        const cart = await cartService.updateItem(req.cart, variantId, parseInt(quantity));

        res.json({
            success: true,
            data: { cart },
            message: 'Cart updated',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove Item from Cart
 */
export const removeFromCart = async (req, res, next) => {
    try {
        const { variantId } = req.params;

        const cart = await cartService.removeItem(req.cart, variantId);

        res.json({
            success: true,
            data: { cart },
            message: 'Item removed from cart',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Clear Cart
 */
export const clearCart = async (req, res, next) => {
    try {
        await cartService.clearCart(req.cart);
        res.json({
            success: true,
            message: 'Cart cleared',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Validate Cart (Manual check)
 */
export const validateCart = async (req, res, next) => {
    try {
        const result = await cartService.validateCart(req.cart);
        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Validate Checkout (Pre-checkout check)
 */
export const validateCheckout = async (req, res, next) => {
    try {
        const result = await cartService.validateCart(req.cart);

        if (!result.valid) {
            return res.status(400).json({
                success: false,
                error: {
                    type: 'CartValidationError',
                    message: 'Some items in your cart are no longer available or have insufficient stock.',
                    issues: result.issues,
                },
                data: { cart: result.cart },
            });
        }

        if (result.cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Cart is empty',
                },
            });
        }

        res.json({
            success: true,
            data: { cart: result.cart },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Apply Coupon
 */
export const applyCoupon = async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code is required'
            });
        }

        const cart = await cartService.applyCoupon(req.cart, code);

        res.json({
            success: true,
            data: { cart },
            message: 'Coupon applied successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove Coupon
 */
export const removeCoupon = async (req, res, next) => {
    try {
        const cart = await cartService.removeCoupon(req.cart);

        res.json({
            success: true,
            data: { cart },
            message: 'Coupon removed',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Sync Cart (Background sync for page unload)
 * 
 * Called by navigator.sendBeacon when user closes the page.
 * Syncs LocalStorage cart items to the database for logged-in users.
 * 
 * Note: sendBeacon sends data as text/plain by default, so we handle both
 * JSON body and text body parsing.
 */
export const syncCart = async (req, res, next) => {
    try {
        // sendBeacon may send data as text/plain, try to parse it
        let items = [];

        if (req.body?.items) {
            items = req.body.items;
        } else if (typeof req.body === 'string') {
            try {
                const parsed = JSON.parse(req.body);
                items = parsed.items || [];
            } catch {
                // Invalid JSON, ignore
                logger.warn('[syncCart] Received invalid JSON body');
            }
        }

        // Only sync if user is logged in and has items
        if (!req.user || !Array.isArray(items) || items.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Nothing to sync'
            });
        }

        // Sync each item to the cart (best effort, don't fail on individual items)
        let synced = 0;
        for (const item of items) {
            if (!item.variant_id || !item.quantity) continue;

            try {
                await cartService.addToCart(
                    req.cart,
                    item.variant_id,
                    parseInt(item.quantity)
                );
                synced++;
            } catch (err) {
                // Log but don't fail - best effort sync
                logger.warn(`[syncCart] Failed to sync item ${item.variant_id}:`, err.message);
            }
        }

        logger.info(`[syncCart] Synced ${synced}/${items.length} items for user ${req.user.id}`);

        res.status(200).json({
            success: true,
            message: `Synced ${synced} items`,
            synced
        });
    } catch (error) {
        // For background sync, always return 200 to prevent retry spam
        logger.error('[syncCart] Error:', error);
        res.status(200).json({
            success: false,
            message: 'Sync failed'
        });
    }
};

export default {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    validateCart,
    validateCheckout,
    applyCoupon,
    removeCoupon,
    syncCart
};
