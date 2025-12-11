import cartRepository from '../db/repositories/cartRepository.js';
import variantRepository from '../db/repositories/variantRepository.js';
import { calculateCartTotals, enrichCartItems } from '../utils/cartUtils.js';
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

import discountService from './discountService.js';
import settingsService from './settingsService.js';

/**
 * Get cart (Guest or User)
 */
export const getCart = async (cartContext) => {
    try {
        let items = [];
        let cartId = null;
        let couponCode = null;

        if (cartContext.type === 'guest') {
            // Guest: Get from DB (GuestCart)
            const cart = await cartRepository.findGuestCartBySessionId(cartContext.sessionId);
            if (cart) {
                items = cart.items.map(item => ({
                    variantId: item.variantId,
                    quantity: item.quantity,
                }));
                cartId = cart.id;
                couponCode = cart.couponCode;
            }
        } else {
            // User: Get from DB (Cart)
            logger.info(`[GET_CART] Fetching cart for User ID: ${cartContext.userId}`);
            const cart = await cartRepository.findCartByUserId(cartContext.userId);
            if (cart) {
                items = cart.items.map(item => ({
                    variantId: item.variantId,
                    quantity: item.quantity,
                }));
                cartId = cart.id;
                couponCode = cart.couponCode;
            }
        }

        // Enrich items (fetch details, check stock/prices)
        logger.info(`[GET_CART] Found ${items.length} items for cart ${cartId}`);
        const enrichedItems = await enrichCartItems(items);

        // Fetch system settings for dynamic shipping calculation
        const settings = await settingsService.getAllSettings();
        const totals = calculateCartTotals(enrichedItems, settings);

        // Apply Discount if coupon exists
        let discount = { amount: 0, code: null };
        let couponError = null;

        if (couponCode) {
            try {
                const validation = await discountService.validateDiscount(couponCode, totals.subtotal, cartContext.userId);
                if (validation.valid) {
                    // Apply discount to SUBTOTAL only, not total
                    const discountAmount = Math.min(validation.amount, totals.subtotal);

                    discount = {
                        amount: discountAmount,
                        code: validation.code,
                        type: validation.type,
                        value: validation.value
                    };

                    // Recalculate total: subtotal - discount + tax + shipping
                    totals.total = parseFloat((totals.subtotal - discountAmount + totals.tax + totals.shipping).toFixed(2));

                    // Ensure total never goes below tax + shipping
                    const minimumTotal = totals.tax + totals.shipping;
                    if (totals.total < minimumTotal) {
                        totals.total = minimumTotal;
                    }
                }
            } catch (error) {
                // Coupon invalid/expired - remove it and track error
                logger.warn(`Removing invalid coupon ${couponCode} from cart ${cartId}: ${error.message}`);

                // Track the error for user notification
                couponError = {
                    code: couponCode,
                    message: error.message
                };

                if (cartContext.type === 'guest') {
                    await cartRepository.updateGuestCart(cartId, { couponCode: null });
                } else {
                    await cartRepository.updateCart(cartId, { couponCode: null });
                }
            }
        }

        return {
            id: cartId,
            items: enrichedItems,
            ...totals,
            discount,
            couponError,  // User can see why coupon was removed
            userId: cartContext.userId,
            sessionId: cartContext.sessionId,
            type: cartContext.type,
        };
    } catch (error) {
        logger.error('Error in getCart service:', error);
        logger.error('Cart Context:', JSON.stringify(cartContext));
        logger.error('Error Stack:', error.stack);
        throw error;
    }
};

/**
 * Add item to cart
 */
export const addToCart = async (cartContext, variantId, quantity) => {
    try {
        const prisma = getPrisma();

        // Use transaction for atomic operation (prevents race conditions)
        return await prisma.$transaction(async (tx) => {
            // 1. Validate Variant & Stock
            const variant = await tx.variant.findUnique({
                where: { id: variantId }
            });

            if (!variant) {
                const error = new Error('Product variant not found');
                error.statusCode = 404;
                throw error;
            }

            if (!variant.isActive) {
                const error = new Error('Product is no longer available');
                error.statusCode = 400;
                throw error;
            }

            // 2. Get or create cart
            let cart;
            if (cartContext.type === 'guest') {
                cart = await tx.guestCart.findUnique({
                    where: { sessionId: cartContext.sessionId },
                    include: { items: true }
                });
                if (!cart) {
                    cart = await tx.guestCart.create({
                        data: { sessionId: cartContext.sessionId },
                        include: { items: true }
                    });
                }
            } else {
                cart = await tx.cart.findUnique({
                    where: { userId: cartContext.userId },
                    include: { items: true }
                });
                if (!cart) {
                    cart = await tx.cart.create({
                        data: { userId: cartContext.userId },
                        include: { items: true }
                    });
                }
            }

            // 3. VALIDATION: Maximum 100 different items in cart (DoS prevention)
            const existingItem = cart.items.find(item => item.variantId === variantId);
            if (!existingItem && cart.items.length >= 100) {
                const error = new Error('Maximum 100 different items allowed in cart');
                error.statusCode = 400;
                throw error;
            }

            // 4. Calculate new quantity
            const currentQty = existingItem ? existingItem.quantity : 0;
            const newTotalQty = currentQty + quantity;

            // 5. Validate stock
            if (newTotalQty > variant.stock) {
                const error = new Error(`Insufficient stock. Available: ${variant.stock}`);
                error.statusCode = 409;
                throw error;
            }

            if (newTotalQty > 999) {
                const error = new Error('Maximum quantity per item is 999');
                error.statusCode = 400;
                throw error;
            }

            // 6. Atomic upsert
            if (cartContext.type === 'guest') {
                await tx.guestCartItem.upsert({
                    where: {
                        cartId_variantId: {
                            cartId: cart.id,
                            variantId: variantId
                        }
                    },
                    update: { quantity: newTotalQty },
                    create: {
                        cartId: cart.id,
                        variantId: variantId,
                        quantity: newTotalQty
                    }
                });
            } else {
                await tx.cartItem.upsert({
                    where: {
                        cartId_variantId: {
                            cartId: cart.id,
                            variantId: variantId
                        }
                    },
                    update: { quantity: newTotalQty },
                    create: {
                        cartId: cart.id,
                        variantId: variantId,
                        quantity: newTotalQty
                    }
                });
            }

            // Transaction complete - return updated cart
            return await getCart(cartContext);
        });
    } catch (error) {
        logger.error('Error in addToCart service:', error);
        throw error;
    }
};

/**
 * Update item quantity
 * Note: quantity=0 will remove the item
 */
export const updateItem = async (cartContext, variantId, quantity) => {
    try {
        // Handle quantity=0 as remove
        if (quantity === 0) {
            return await removeItem(cartContext, variantId);
        }

        // 1. Validate Stock
        const variant = await variantRepository.findVariantById(variantId);
        if (!variant) {
            const error = new Error('Product variant not found');
            error.statusCode = 404;
            throw error;
        }

        if (quantity > variant.stock) {
            const error = new Error(`Insufficient stock. Available: ${variant.stock}`);
            error.statusCode = 409;
            throw error;
        }

        // 2. Update
        if (cartContext.type === 'guest') {
            const cart = await cartRepository.findGuestCartBySessionId(cartContext.sessionId);
            if (!cart) {
                const error = new Error('Cart not found');
                error.statusCode = 404;
                throw error;
            }
            await cartRepository.upsertGuestCartItem(cart.id, variantId, quantity, true);
        } else {
            const cart = await cartRepository.findCartByUserId(cartContext.userId);
            if (!cart) {
                const error = new Error('Cart not found');
                error.statusCode = 404;
                throw error;
            }
            await cartRepository.upsertCartItem(cart.id, variantId, quantity, true);
        }

        return await getCart(cartContext);
    } catch (error) {
        logger.error('Error in updateItem service:', error);
        throw error;
    }
};

/**
 * Remove item from cart
 */
export const removeItem = async (cartContext, variantId) => {
    try {
        if (cartContext.type === 'guest') {
            const cart = await cartRepository.findGuestCartBySessionId(cartContext.sessionId);
            if (cart) {
                await cartRepository.removeGuestItem(cart.id, variantId);
            }
        } else {
            const cart = await cartRepository.findCartByUserId(cartContext.userId);
            if (cart) {
                await cartRepository.removeItem(cart.id, variantId);
            }
        }

        return await getCart(cartContext);
    } catch (error) {
        logger.error('Error in removeItem service:', error);
        throw error;
    }
};

/**
 * Clear cart
 */
export const clearCart = async (cartContext) => {
    try {
        if (cartContext.type === 'guest') {
            const cart = await cartRepository.findGuestCartBySessionId(cartContext.sessionId);
            if (cart) {
                await cartRepository.clearGuestCart(cart.id);
            }
        } else {
            const cart = await cartRepository.findCartByUserId(cartContext.userId);
            if (cart) {
                await cartRepository.clearCart(cart.id);
            }
        }
        return { success: true };
    } catch (error) {
        logger.error('Error in clearCart service:', error);
        throw error;
    }
};

/**
 * Merge Guest Cart into User Cart (Login)
 * FIXED: Now uses transaction to prevent data loss on partial failure
 */
export const mergeCarts = async (sessionId, userId) => {
    try {
        const prisma = getPrisma();

        // Use transaction to ensure atomicity - either all items merge or none
        await prisma.$transaction(async (tx) => {
            // 1. Get Guest Cart
            const guestCart = await tx.guestCart.findUnique({
                where: { sessionId },
                include: { items: true }
            });
            if (!guestCart || guestCart.items.length === 0) return;

            logger.info(`[MERGE] Merging guest cart ${guestCart.id} to user ${userId}`);

            // 2. Ensure User Cart exists
            let userCart = await tx.cart.findUnique({
                where: { userId },
                include: { items: true }
            });
            if (!userCart) {
                userCart = await tx.cart.create({
                    data: { userId },
                    include: { items: true }
                });
            }

            // 3. Merge Items with STOCK VALIDATION
            for (const guestItem of guestCart.items) {
                // CRITICAL: Check stock availability before merging
                const variant = await tx.variant.findUnique({
                    where: { id: guestItem.variantId }
                });
                if (!variant || !variant.isActive) {
                    logger.warn(`[MERGE] Skipping unavailable variant ${guestItem.variantId}`);
                    continue; // Skip unavailable items
                }

                // Check if item exists in user cart
                const existingUserItem = userCart.items.find(i => i.variantId === guestItem.variantId);

                let newQuantity = guestItem.quantity;
                if (existingUserItem) {
                    newQuantity += existingUserItem.quantity;
                }

                // VALIDATION: Cap at available stock AND 999
                if (newQuantity > variant.stock) {
                    logger.warn(`[MERGE] Capping quantity for variant ${guestItem.variantId} at stock: ${variant.stock}`);
                    newQuantity = variant.stock;
                }
                if (newQuantity > 999) {
                    newQuantity = 999;
                }

                // Skip if quantity is 0 (out of stock)
                if (newQuantity <= 0) continue;

                await tx.cartItem.upsert({
                    where: {
                        cartId_variantId: {
                            cartId: userCart.id,
                            variantId: guestItem.variantId
                        }
                    },
                    update: { quantity: newQuantity },
                    create: {
                        cartId: userCart.id,
                        variantId: guestItem.variantId,
                        quantity: newQuantity
                    }
                });
            }

            // 4. Merge Coupon (if user doesn't have one) - WITH VALIDATION
            if (guestCart.couponCode && !userCart.couponCode) {
                // Re-validate coupon is still active before transferring
                try {
                    const validation = await discountService.validateDiscount(guestCart.couponCode, 0, userId);
                    if (validation.valid) {
                        await tx.cart.update({
                            where: { id: userCart.id },
                            data: { couponCode: guestCart.couponCode }
                        });
                        logger.info(`[MERGE] Transferred valid coupon ${guestCart.couponCode} to user cart`);
                    } else {
                        logger.warn(`[MERGE] Coupon ${guestCart.couponCode} is no longer valid, not transferring`);
                    }
                } catch (couponError) {
                    logger.warn(`[MERGE] Coupon validation failed: ${couponError.message}`);
                    // Don't transfer invalid coupon - silently skip
                }
            }

            // 5. Delete Guest Cart (within transaction so it rolls back if merge failed)
            await tx.guestCartItem.deleteMany({ where: { cartId: guestCart.id } });
            await tx.guestCart.delete({ where: { id: guestCart.id } });

            logger.info(`[MERGE] Successfully merged ${guestCart.items.length} items from guest cart`);
        });

    } catch (error) {
        logger.error('Error merging carts:', error);
        // Don't throw, just log. Login should proceed even if merge fails.
    }
};

/**
 * Apply Coupon
 */
export const applyCoupon = async (cartContext, code) => {
    try {
        const cart = await getCart(cartContext);

        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty');
        }

        // Validate
        await discountService.validateDiscount(code, cart.subtotal, cartContext.userId);

        // Save to DB
        if (cartContext.type === 'guest') {
            await cartRepository.updateGuestCart(cart.id, { couponCode: code });
        } else {
            await cartRepository.updateCart(cart.id, { couponCode: code });
        }

        return await getCart(cartContext);
    } catch (error) {
        logger.error('Error applying coupon:', error);
        throw error;
    }
};

/**
 * Remove Coupon
 */
export const removeCoupon = async (cartContext) => {
    try {
        const cart = await getCart(cartContext);

        if (cart) {
            if (cartContext.type === 'guest') {
                await cartRepository.updateGuestCart(cart.id, { couponCode: null });
            } else {
                await cartRepository.updateCart(cart.id, { couponCode: null });
            }
        }

        return await getCart(cartContext);
    } catch (error) {
        logger.error('Error removing coupon:', error);
        throw error;
    }
};

/**
 * Validate Cart (Stock & Availability)
 * Reports issues WITHOUT auto-fixing - user must manually resolve
 */
export const validateCart = async (cartContext) => {
    try {
        const cart = await getCart(cartContext);
        const issues = [];
        let isValid = true;

        for (const item of cart.items) {
            // Check availability
            if (item.stock_status === 'out_of_stock') {
                issues.push({
                    type: 'out_of_stock',
                    variant_id: item.variant_id,
                    product_name: item.product_name,
                    message: 'Item is out of stock',
                    action: 'remove_required',
                });
                isValid = false;
                // Do NOT auto-remove - user must remove manually
            } else if (item.quantity > item.stock_available) {
                issues.push({
                    type: 'insufficient_stock',
                    variant_id: item.variant_id,
                    product_name: item.product_name,
                    message: `Only ${item.stock_available} left in stock`,
                    available_quantity: item.stock_available,
                    requested_quantity: item.quantity,
                    action: 'reduce_quantity_required',
                });
                isValid = false;
                // Do NOT auto-adjust - user must adjust manually
            } else if (!item.is_active) {
                issues.push({
                    type: 'no_longer_available',
                    variant_id: item.variant_id,
                    product_name: item.product_name,
                    message: 'Item is no longer available',
                    action: 'remove_required',
                });
                isValid = false;
                // Do NOT auto-remove - user must remove manually
            }
        }

        return {
            valid: isValid,
            issues,
            cart,  // Return current cart unchanged
        };
    } catch (error) {
        logger.error('Error validating cart:', error);
        throw error;
    }
};

export default {
    getCart,
    addToCart,
    updateItem,
    removeItem,
    clearCart,
    mergeCarts,
    validateCart,
    applyCoupon,
    removeCoupon
};
