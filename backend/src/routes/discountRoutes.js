import express from 'express';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { validateRequest } from '../utils/validators.js';
import discountController from '../controllers/discountController.js';

const router = express.Router();

// Rate limiter for discount validation (prevent brute-force code guessing)
const discountValidateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 attempts per minute
    message: { success: false, error: 'Too many discount validation attempts. Please try again later.' }
});

// Validation schemas
const createDiscountSchema = Joi.object({
    code: Joi.string().min(3).max(50).required(),
    type: Joi.string().valid('percentage', 'fixed').required(),
    value: Joi.number().positive().required(),
    minimumPurchase: Joi.number().min(0).optional(),
    maxUses: Joi.number().integer().min(1).optional().allow(null),
    usesPerCustomer: Joi.number().integer().min(1).default(1),
    startsAt: Joi.date().iso().required(),
    expiresAt: Joi.date().iso().required(),
    isActive: Joi.boolean().default(true)
});

const updateDiscountSchema = Joi.object({
    code: Joi.string().min(3).max(50),
    type: Joi.string().valid('percentage', 'fixed'),
    value: Joi.number().positive(),
    minimumPurchase: Joi.number().min(0).allow(null),
    maxUses: Joi.number().integer().min(1).allow(null),
    usesPerCustomer: Joi.number().integer().min(1),
    startsAt: Joi.date().iso(),
    expiresAt: Joi.date().iso(),
    isActive: Joi.boolean()
}).min(1);

const validateDiscountSchema = Joi.object({
    code: Joi.string().min(3).max(50).required(),
    cartTotal: Joi.number().min(0).required()
});

// Admin: Create discount
router.post('/', authenticateToken, requireAdmin, validateRequest(createDiscountSchema), discountController.createDiscount);

// Admin: Get all discounts
router.get('/', authenticateToken, requireAdmin, discountController.getAllDiscounts);

// Admin: Get discount by ID
router.get('/:id', authenticateToken, requireAdmin, discountController.getDiscountById);

// Admin: Update discount
router.put('/:id', authenticateToken, requireAdmin, validateRequest(updateDiscountSchema), discountController.updateDiscount);

// Admin: Delete discount
router.delete('/:id', authenticateToken, requireAdmin, discountController.deleteDiscount);

// Public/Protected: Validate discount (optional auth to check per-user limits)
router.post('/validate', discountValidateLimiter, optionalAuth, validateRequest(validateDiscountSchema), discountController.validateDiscount);

export default router;
