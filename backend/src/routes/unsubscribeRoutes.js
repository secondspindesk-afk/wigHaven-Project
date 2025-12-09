import express from 'express';
import * as unsubscribeController from '../controllers/unsubscribeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../utils/validators.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const unsubscribeSchema = Joi.object({
    email: Joi.string().email().required()
});

const updatePreferencesSchema = Joi.object({
    marketingEmails: Joi.boolean().required(),
    abandonedCartEmails: Joi.boolean().required(),
    backInStockEmails: Joi.boolean().required()
});

/**
 * Public unsubscribe endpoint
 * POST /api/unsubscribe
 */
router.post(
    '/',
    validateRequest(unsubscribeSchema),
    unsubscribeController.unsubscribe
);

/**
 * Get email preferences (authenticated)
 * GET /api/unsubscribe/preferences
 */
router.get(
    '/preferences',
    authenticateToken,
    unsubscribeController.getPreferences
);

/**
 * Update email preferences (authenticated)
 * PUT /api/unsubscribe/preferences
 */
router.put(
    '/preferences',
    authenticateToken,
    validateRequest(updatePreferencesSchema),
    unsubscribeController.updatePreferences
);

export default router;
