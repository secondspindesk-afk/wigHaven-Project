import express from 'express';
import orderController from '../controllers/orderController.js';
import { downloadInvoice } from '../controllers/invoiceController.js';
import { optionalAuth, authenticateToken, requireAdmin } from '../middleware/auth.js';
import cartSession from '../middleware/cartSession.js';
import { validateRequest } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

// Validation Schemas
const addressSchema = Joi.object({
    name: Joi.string().required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zip_code: Joi.string().allow('').optional(),
    country: Joi.string().required(),
    phone: Joi.string().pattern(/^\+?[\d\s-]{10,20}$/).required(), // Relaxed format
});

const createOrderSchema = Joi.object({
    shipping_address: addressSchema.required(),
    billing_address: addressSchema.optional(),
    customer_email: Joi.string().email().required(),
    customer_phone: Joi.string().pattern(/^\+?[\d\s-]{10,20}$/).required(),
    payment_provider: Joi.string().valid('mtn', 'vod', 'tgo').optional(), // Mobile money provider
    notes: Joi.string().max(500).allow('').optional(),
});

const cancelOrderSchema = Joi.object({
    email: Joi.string().email().optional(), // For guest cancellation
});

// FIXED: Add validation schemas for status updates
const updateStatusSchema = Joi.object({
    status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded').required()
});

const bulkUpdateStatusSchema = Joi.object({
    orderNumbers: Joi.array().items(Joi.string()).min(1).max(100).required(),
    status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded').required()
});

// PUBLIC ROUTES

// Webhook (public, no auth)
router.post('/webhooks/paystack', orderController.paystackWebhook);

// Webhook logs (Admin only)
router.get(
    '/webhooks/paystack/logs',
    authenticateToken,
    requireAdmin,
    orderController.getWebhookLogs
);

// ADMIN ORDER ROUTES

// Get all orders (Admin only)
router.get(
    '/admin/orders',
    authenticateToken,
    requireAdmin,
    orderController.getAllOrders
);

// Export orders to CSV (Admin only)
router.get(
    '/admin/orders/export',
    authenticateToken,
    requireAdmin,
    orderController.exportOrdersCSV
);

// Bulk update order status (Admin only)
router.patch(
    '/admin/orders/bulk-status',
    authenticateToken,
    requireAdmin,
    validateRequest(bulkUpdateStatusSchema),  // FIXED: Add validation
    orderController.bulkUpdateStatus
);

// Update order status (Admin only)
router.patch(
    '/admin/orders/:order_number/status',
    authenticateToken,
    requireAdmin,
    validateRequest(updateStatusSchema),  // FIXED: Add validation
    orderController.updateOrderStatus
);

// Refund order (Admin only)
router.post(
    '/admin/orders/:id/refund',
    authenticateToken,
    requireAdmin,
    orderController.refundOrder
);

// Update tracking number (Admin only)
router.patch(
    '/admin/orders/:order_number/tracking',
    authenticateToken,
    requireAdmin,
    orderController.updateTrackingNumber
);

// CUSTOMER ROUTES

// Create order (optional auth - guest or logged in)
router.post(
    '/orders',
    optionalAuth,
    cartSession,
    validateRequest(createOrderSchema),
    orderController.createOrder
);

// Get order (optional auth - guest with email or logged in)
router.get(
    '/orders/:order_number',
    optionalAuth,
    orderController.getOrder
);

// Payment status stream (SSE push notifications, no polling)
router.get(
    '/orders/:order_number/payment-stream',
    orderController.streamPaymentStatus
);

// Cancel order (optional auth)
router.post(
    '/orders/:order_number/cancel',
    optionalAuth,
    validateRequest(cancelOrderSchema),
    orderController.cancelOrder
);

// Manually verify payment (authenticated only) - for testing when webhooks aren't received
router.post(
    '/orders/:order_number/verify-payment',
    authenticateToken,
    orderController.manuallyVerifyPayment
);

// Get order history (authenticated only)
router.get(
    '/orders',
    authenticateToken,
    orderController.getOrderHistory
);

// CRITICAL FIX #8: Download invoice (authenticated only)
router.get(
    '/orders/:orderNumber/invoice/download',
    authenticateToken,
    downloadInvoice
);

export default router;
