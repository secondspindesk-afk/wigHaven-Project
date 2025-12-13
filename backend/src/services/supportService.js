import supportRepository from '../db/repositories/supportRepository.js';
import * as emailService from './emailService.js';
import * as notificationService from './notificationService.js';
import logger from '../utils/logger.js';

/**
 * Create a new support ticket (logged-in user)
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

    // Send confirmation email to logged-in user
    if (ticket.user && ticket.user.email) {
        await emailService.sendSupportTicketCreated(ticket, ticket.user);
    }

    logger.info('Support ticket created', { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, userId });

    // Notify admins about new ticket
    const userName = ticket.user
        ? `${ticket.user.firstName || ''} ${ticket.user.lastName || ''}`.trim() || 'A user'
        : 'A customer';

    // We don't await this to avoid blocking the response
    notificationService.notifyAdminNewTicket(ticket, userName).catch(err =>
        logger.error('Failed to notify admins about new ticket', { error: err.message, ticketId: ticket.id })
    );

    return ticket;
};

/**
 * Create a guest support ticket (unauthenticated users)
 * Stores contact info in the ticket for admin follow-up
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

    // Send confirmation email to guest
    await emailService.sendGuestTicketReply(ticket,
        `Thank you for contacting us. We've received your inquiry and will respond within 24 hours.\n\nYour ticket number is #${ticket.ticketNumber}`,
        { email, name }
    );

    logger.info('Guest support ticket created', { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, guestEmail: email });

    // Notify admins about new guest ticket
    notificationService.notifyAdminNewTicket(ticket, name || 'Guest').catch(err =>
        logger.error('Failed to notify admins about new guest ticket', { error: err.message, ticketId: ticket.id })
    );

    return ticket;
};

/**
 * Reply to a ticket
 * 
 * NOTIFICATION FLOW:
 * - Guest ticket + Admin reply → Email with full message
 * - Logged-in user + Admin reply → In-app notification ONLY (no email)
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
    if (!isAdmin && ticket.status === 'closed') {
        // User replied to closed ticket - reopen it
        await supportRepository.updateTicketStatus(ticketId, 'open');
    }

    // Handle notifications when admin replies
    if (isAdmin) {
        if (ticket.userId && ticket.user?.email) {
            // LOGGED-IN USER: In-app notification ONLY (no email)
            await notificationService.notifySupportReply(ticket.userId, ticket);
            logger.info('Admin replied to logged-in user ticket - sent in-app notification', {
                ticketId, ticketNumber: ticket.ticketNumber, userId: ticket.userId
            });
        } else if (ticket.guestEmail) {
            // GUEST USER: Email with full message content
            await emailService.sendGuestTicketReply(ticket, message, {
                email: ticket.guestEmail,
                name: ticket.guestName || 'Guest'
            });
            logger.info('Admin replied to guest ticket - sent email', {
                ticketId, ticketNumber: ticket.ticketNumber, guestEmail: ticket.guestEmail
            });
        }
    } else {
        // USER replied - notify all admins
        const userName = ticket.user
            ? `${ticket.user.firstName || ''} ${ticket.user.lastName || ''}`.trim() || 'A user'
            : 'A customer';
        await notificationService.notifyAdminSupportReply(ticket, userName);
        logger.info('User replied to ticket - notified admins', {
            ticketId, ticketNumber: ticket.ticketNumber
        });
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
 * 
 * NOTIFICATION FLOW:
 * - Status → 'resolved': Send email to BOTH guests and logged-in users
 * - Logged-in users also get in-app notification
 */
export const updateTicketStatus = async (ticketId, status) => {
    // Get ticket first for notification purposes
    const ticket = await supportRepository.findTicketById(ticketId);
    if (!ticket) {
        throw new Error('Ticket not found');
    }

    // Skip if already at this status (idempotency)
    if (ticket.status === status) {
        logger.info('Ticket status already at requested status, skipping', { ticketId, status });
        return ticket;
    }

    // Update the status
    const updatedTicket = await supportRepository.updateTicketStatus(ticketId, status);

    // Send resolution notifications when ticket is resolved
    if (status === 'resolved') {
        if (ticket.userId && ticket.user?.email) {
            // LOGGED-IN USER: Email + In-app notification
            await emailService.sendTicketResolved(ticket, ticket.user);
            await notificationService.notifySupportResolved(ticket.userId, ticket);
            logger.info('Ticket resolved for logged-in user - sent email + in-app notification', {
                ticketId, ticketNumber: ticket.ticketNumber, userId: ticket.userId
            });
        } else if (ticket.guestEmail) {
            // GUEST USER: Email only
            await emailService.sendGuestTicketResolved(ticket);
            logger.info('Ticket resolved for guest - sent email', {
                ticketId, ticketNumber: ticket.ticketNumber, guestEmail: ticket.guestEmail
            });
        }
    }

    return updatedTicket;
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

