import express from 'express';
import cartController from '../controllers/cartController.js';
import { optionalAuth } from '../middleware/auth.js';
import cartSession from '../middleware/cartSession.js';
import { validateRequest } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

// Validation Schemas
const addToCartSchema = Joi.object({
    variantId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).max(999).required(),
});

const updateCartItemSchema = Joi.object({
    quantity: Joi.number().integer().min(0).max(999).required(),  // Allow 0 to remove
});

// Middleware Stack
// 1. optionalAuth: Checks for JWT, sets req.user if present
// 2. cartSession: Checks req.user or X-Session-ID, sets req.cart
const cartMiddleware = [optionalAuth, cartSession];

// Routes
router.get('/', ...cartMiddleware, cartController.getCart);

router.post(
    '/items',
    ...cartMiddleware,
    validateRequest(addToCartSchema),
    cartController.addToCart
);

router.patch(
    '/items/:variantId',
    ...cartMiddleware,
    validateRequest(updateCartItemSchema),
    cartController.updateCartItem
);

router.delete(
    '/items/:variantId',
    ...cartMiddleware,
    cartController.removeFromCart
);

router.delete('/', ...cartMiddleware, cartController.clearCart);

router.post('/validate', ...cartMiddleware, cartController.validateCart);

router.post('/validate-checkout', ...cartMiddleware, cartController.validateCheckout);

// Background sync for page unload (navigator.sendBeacon)
// sendBeacon sends data as text/plain, so we need express.text() to parse it
router.post('/sync', express.text({ type: '*/*' }), ...cartMiddleware, cartController.syncCart);

// Coupon Routes
const applyCouponSchema = Joi.object({
    code: Joi.string().required().trim().max(50)
});

router.post(
    '/apply-coupon',
    ...cartMiddleware,
    validateRequest(applyCouponSchema),
    cartController.applyCoupon
);

router.delete(
    '/remove-coupon',
    ...cartMiddleware,
    cartController.removeCoupon
);

export default router;
