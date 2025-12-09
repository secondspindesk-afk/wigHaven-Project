import express from 'express';
import Joi from 'joi';
import emailController from '../controllers/emailController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateRequest } from '../utils/validators.js';

const router = express.Router();

// Validation schemas
const retryFailedSchema = Joi.object({
    email_log_id: Joi.string().uuid().optional()
});

// All email routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Get email logs
 * Query params: page, limit, type, status, days
 */
router.get('/logs', emailController.getEmailLogs);

/**
 * Get email statistics
 */
router.get('/stats', emailController.getEmailStats);

/**
 * Retry failed emails
 * Body: { email_log_id } (optional - if not provided, retries all failed from last 24h)
 */
router.post('/retry-failed', validateRequest(retryFailedSchema), emailController.retryFailedEmails);

export default router;
