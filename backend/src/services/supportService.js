import supportRepository from '../db/repositories/supportRepository.js';
import * as emailService from './emailService.js';
import logger from '../utils/logger.js';

/**
 * Create a new support ticket
 */
export const createTicket = async (userId, data) => {
    const { subject, message, priority } = data;

    // Create ticket
    const ticket = await supportRepository.createTicket({
        userId,
        subject,
        priority: priority || 'medium',
        status: 'open'
    });

    // Add initial message
    await supportRepository.addMessage({
        ticketId: ticket.id,
        senderId: userId,
        message,
        isAdmin: false
    });

    // Send confirmation email
    if (ticket.user && ticket.user.email) {
        await emailService.sendSupportTicketCreated(ticket, ticket.user);
    }

    return ticket;
};

/**
 * Reply to a ticket
 */
export const replyTicket = async (ticketId, userId, message, isAdmin = false) => {
    // Verify ticket exists
    const ticket = await supportRepository.findTicketById(ticketId);
    if (!ticket) {
        throw new Error('Ticket not found');
    }

    // Add reply
    const reply = await supportRepository.addMessage({
        ticketId,
        senderId: userId,
        message,
        isAdmin
    });

    // Update ticket status if needed
    if (isAdmin) {
        // If admin replies, maybe mark as 'pending user response' or keep 'open'
        // For now, we just keep it open or whatever it was
    } else {
        // If user replies, ensure it's open
        if (ticket.status === 'closed') {
            await supportRepository.updateTicketStatus(ticketId, 'open');
        }
    }

    // Send email notification
    if (isAdmin && ticket.user && ticket.user.email) {
        // Admin replied -> Notify user
        await emailService.sendSupportTicketReply(ticket, message, ticket.user);
    } else if (!isAdmin) {
        // User replied -> Notify admin (Optional, maybe via internal notification system)
        // For now, we assume admins check the dashboard
    }

    return reply;
};

/**
 * Get user tickets
 */
export const getUserTickets = async (userId, page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    return await supportRepository.findUserTickets(userId, skip, limit);
};

/**
 * Get ticket details
 */
export const getTicketById = async (ticketId, userId) => {
    const ticket = await supportRepository.findTicketById(ticketId);

    if (!ticket) {
        throw new Error('Ticket not found');
    }

    // Security check: Ensure user owns the ticket (unless admin, but this service is mostly for user-facing)
    // We'll let the controller handle admin vs user checks, but here we enforce ownership if userId is provided
    if (userId && ticket.userId !== userId) {
        throw new Error('Unauthorized access to ticket');
    }

    return ticket;
};

/**
 * Get all tickets (Admin)
 */
export const getAllTickets = async ({ page = 1, limit = 20, status, priority }) => {
    const skip = (page - 1) * limit;
    return await supportRepository.findAllTickets({ skip, limit, status, priority });
};

/**
 * Update ticket status (Admin)
 */
export const updateTicketStatus = async (ticketId, status) => {
    return await supportRepository.updateTicketStatus(ticketId, status);
};

export default {
    createTicket,
    replyTicket,
    getUserTickets,
    getTicketById,
    getAllTickets,
    updateTicketStatus
};
