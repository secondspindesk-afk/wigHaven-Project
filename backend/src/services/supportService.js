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
 * Create a guest support ticket (unauthenticated users)
 * Stores contact info in the ticket/message for admin follow-up
 */
export const createGuestTicket = async (data) => {
    const { name, email, subject, message, priority } = data;

    // Create ticket without userId (guest)
    const ticket = await supportRepository.createTicket({
        userId: null, // Guest ticket - no user association
        subject: `[GUEST] ${subject}`,
        priority: priority || 'medium',
        status: 'open',
        guestName: name,
        guestEmail: email
    });

    // Add initial message with contact info
    await supportRepository.addMessage({
        ticketId: ticket.id,
        senderId: null, // Guest - no sender ID
        message: `**Guest Contact:**\nName: ${name}\nEmail: ${email}\n\n**Message:**\n${message}`,
        isAdmin: false
    });

    // Log guest ticket creation
    logger.info('Guest support ticket created', { ticketId: ticket.id, guestEmail: email });

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

    // Send email notification when admin replies
    if (isAdmin) {
        if (ticket.userId && ticket.user?.email) {
            // Registered user - send to their account email
            await emailService.sendSupportTicketReply(ticket, message, ticket.user);
        } else if (ticket.guestEmail) {
            // Guest user - send to their guest email
            await emailService.sendGuestTicketReply(ticket, message, {
                email: ticket.guestEmail,
                name: ticket.guestName || 'Guest'
            });
        }
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
 * @param {string} ticketId - Ticket ID
 * @param {string} userId - User ID making the request
 * @param {boolean} isAdmin - If true, skip ownership check (admins can view any ticket)
 */
export const getTicketById = async (ticketId, userId, isAdmin = false) => {
    const ticket = await supportRepository.findTicketById(ticketId);

    if (!ticket) {
        throw new Error('Ticket not found');
    }

    // Security check: If not admin, user must own the ticket
    // Admins can view any ticket (including guest tickets with null userId)
    if (!isAdmin && userId && ticket.userId !== userId) {
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
    createGuestTicket,
    replyTicket,
    getUserTickets,
    getTicketById,
    getAllTickets,
    updateTicketStatus
};
