import supportService from '../services/supportService.js';
import logger from '../utils/logger.js';
import { notifySupportChanged } from '../utils/adminBroadcast.js';

/**
 * Create a new ticket
 * POST /api/support
 */
export const createTicket = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { subject, message, priority } = req.body;

        const ticket = await supportService.createTicket(userId, { subject, message, priority });

        // 🔔 Real-time: Notify all admin dashboards
        notifySupportChanged({ action: 'created', ticketId: ticket.id });

        res.status(201).json({
            success: true,
            data: ticket,
            message: 'Support ticket created successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a guest ticket (Public - no auth required)
 * POST /api/support/guest
 */
export const createGuestTicket = async (req, res, next) => {
    try {
        const { name, email, subject, message, priority = 'medium' } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, subject and message are required'
            });
        }

        const ticket = await supportService.createGuestTicket({
            name,
            email,
            subject,
            message,
            priority
        });

        // 🔔 Real-time: Notify all admin dashboards
        notifySupportChanged({ action: 'guest_created', ticketId: ticket.id });

        res.status(201).json({
            success: true,
            data: { id: ticket.id },
            message: 'Your message has been submitted. We will respond to your email within 24 hours.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reply to a ticket (User)
 * POST /api/support/:id/reply
 */
export const replyTicket = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const ticketId = req.params.id;
        const { message } = req.body;

        const reply = await supportService.replyTicket(ticketId, userId, message, false);

        res.json({
            success: true,
            data: reply,
            message: 'Reply sent successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user tickets
 * GET /api/support
 */
export const getTickets = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const { tickets, total } = await supportService.getUserTickets(userId, page, limit);

        res.json({
            success: true,
            data: tickets,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single ticket (User)
 * GET /api/support/:id
 */
export const getTicket = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const ticketId = req.params.id;
        // Allow admins to view any ticket (including guest tickets)
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

        const ticket = await supportService.getTicketById(ticketId, userId, isAdmin);

        res.json({
            success: true,
            data: ticket
        });
    } catch (error) {
        next(error);
    }
};

// ==================== ADMIN FUNCTIONS ====================

/**
 * Get all tickets (Admin)
 * GET /api/support/admin/all
 */
export const getAllTicketsAdmin = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const priority = req.query.priority;

        const { tickets, total } = await supportService.getAllTickets({ page, limit, status, priority });

        res.json({
            success: true,
            data: tickets,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update ticket status (Admin)
 * PUT /api/support/admin/:id/status
 */
export const updateTicketStatus = async (req, res, next) => {
    try {
        const ticketId = req.params.id;
        const { status } = req.body;

        const ticket = await supportService.updateTicketStatus(ticketId, status);

        // 🔔 Real-time: Notify all admin dashboards
        notifySupportChanged({ action: 'status_updated', ticketId, status });

        res.json({
            success: true,
            data: ticket,
            message: `Ticket status updated to ${status}`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Admin reply to ticket (Admin)
 * POST /api/support/admin/:id/reply
 */
export const adminReplyTicket = async (req, res, next) => {
    try {
        const adminId = req.user.id;
        const ticketId = req.params.id;
        const { message } = req.body;

        const reply = await supportService.replyTicket(ticketId, adminId, message, true);

        res.json({
            success: true,
            data: reply,
            message: 'Admin reply sent successfully'
        });
    } catch (error) {
        next(error);
    }
};

export default {
    createTicket,
    createGuestTicket,
    replyTicket,
    getTickets,
    getTicket,
    getAllTicketsAdmin,
    updateTicketStatus,
    adminReplyTicket
};

