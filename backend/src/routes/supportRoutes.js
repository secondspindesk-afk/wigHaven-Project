import express from 'express';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateRequest } from '../utils/validators.js';
import supportController from '../controllers/supportController.js';

const router = express.Router();

// Validation schemas
const createTicketSchema = Joi.object({
    subject: Joi.string().min(5).max(255).required(),
    message: Joi.string().min(10).max(5000).required(),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium')
});

const replyTicketSchema = Joi.object({
    message: Joi.string().min(1).max(5000).required()
});

const updateTicketStatusSchema = Joi.object({
    status: Joi.string().valid('open', 'pending', 'closed').required()
});

// Rate limiter for ticket creation (prevent spam)
const createTicketLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 tickets per hour per user
    message: { success: false, error: 'Too many tickets created. Please try again later.' }
});

// All user routes require authentication
router.use(authenticateToken);

// User routes
router.post('/', createTicketLimiter, validateRequest(createTicketSchema), supportController.createTicket);
router.post('/:id/reply', validateRequest(replyTicketSchema), supportController.replyTicket);
router.get('/', supportController.getTickets);
router.get('/:id', supportController.getTicket);

// Admin routes
router.get('/admin/all', requireAdmin, supportController.getAllTicketsAdmin);
router.put('/admin/:id/status', requireAdmin, validateRequest(updateTicketStatusSchema), supportController.updateTicketStatus);
router.post('/admin/:id/reply', requireAdmin, validateRequest(replyTicketSchema), supportController.adminReplyTicket);

export default router;

