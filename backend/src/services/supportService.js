import supportRepository from '../db/repositories/supportRepository.js';
import * as emailService from './emailService.js';
import * as notificationService from './notificationService.js';
import adminBroadcast from '../utils/adminBroadcast.js';
import logger from '../utils/logger.js';
import { getPrisma } from '../config/database.js';

/**
 * Create a new support ticket (logged-in user)
 * TRANSACTIONAL: Ticket + Initial Message are created atomically
 */
export const createTicket = async (userId, data) => {
    const { subject, message, priority } = data;
    const prisma = getPrisma();

    // ============================================
    // ATOMIC TRANSACTION: Ticket + Initial Message
    // ============================================
    const ticket = await prisma.$transaction(async (tx) => {
        // Create ticket
        const newTicket = await tx.supportTicket.create({
            data: {
                userId,
                subject,
                priority: priority || 'medium',
                status: 'open'
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        // Add initial message
        await tx.supportMessage.create({
            data: {
                ticketId: newTicket.id,
                senderId: userId,
                message,
                isAdmin: false
            }
        });

        return newTicket;
    });

    // Send confirmation email to logged-in user (outside tx)
    if (ticket.user && ticket.user.email) {
        await emailService.sendSupportTicketCreated(ticket, ticket.user);
    }

    logger.info('[TX] Support ticket created atomically', { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, userId });

    // Notify admins about new ticket (non-blocking)
    const userName = ticket.user
        ? `${ticket.user.firstName || ''} ${ticket.user.lastName || ''}`.trim() || 'A user'
        : 'A customer';

    notificationService.notifyAdminNewTicket(ticket, userName).catch(err =>
        logger.error('Failed to notify admins about new ticket', { error: err.message, ticketId: ticket.id })
    );

    // Broadcast change
    await adminBroadcast.notifySupportChanged();

    return ticket;
};


/**
 * Create a guest support ticket (unauthenticated users)
 * Stores contact info in the ticket for admin follow-up
 * TRANSACTIONAL: Ticket + Initial Message are created atomically
 */
export const createGuestTicket = async (data) => {
    const { name, email, subject, message, priority } = data;
    const prisma = getPrisma();

    // ============================================
    // ATOMIC TRANSACTION: Ticket + Initial Message
    // ============================================
    const ticket = await prisma.$transaction(async (tx) => {
        // Create ticket without userId (guest)
        const newTicket = await tx.supportTicket.create({
            data: {
                userId: null,
                subject: `[GUEST] ${subject}`,
                priority: priority || 'medium',
                status: 'open',
                guestName: name,
                guestEmail: email
            }
        });

        // Add initial message with contact info
        await tx.supportMessage.create({
            data: {
                ticketId: newTicket.id,
                senderId: null,
                message: `**Guest Contact:**\nName: ${name}\nEmail: ${email}\n\n**Message:**\n${message}`,
                isAdmin: false
            }
        });

        return newTicket;
    });

    // Send confirmation email to guest (outside tx)
    await emailService.sendGuestTicketReply(ticket,
        `Thank you for contacting us. We've received your inquiry and will respond within 24 hours.\n\nYour ticket number is #${ticket.ticketNumber}`,
        { email, name }
    );

    logger.info('[TX] Guest support ticket created atomically', { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, guestEmail: email });

    // Notify admins about new guest ticket (non-blocking)
    notificationService.notifyAdminNewTicket(ticket, name || 'Guest').catch(err =>
        logger.error('Failed to notify admins about new guest ticket', { error: err.message, ticketId: ticket.id })
    );

    // Broadcast change
    await adminBroadcast.notifySupportChanged();

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

    const result = reply;
    await adminBroadcast.notifySupportChanged();
    return result;
};

import smartCache from '../utils/smartCache.js';

/**
 * Get user tickets
 */
export const getUserTickets = async (userId, page = 1, limit = 20) => {
    return smartCache.getOrFetch(
        smartCache.keys.supportUserTickets(userId, page),
        async () => {
            const skip = (page - 1) * limit;
            return await supportRepository.findUserTickets(userId, skip, limit);
        },
        { type: 'support', swr: true }
    );
};

/**
 * Get ticket details
 * @param {string} ticketId - Ticket ID
 * @param {string} userId - User ID making the request
 * @param {boolean} isAdmin - If true, skip ownership check (admins can view any ticket)
 */
export const getTicketById = async (ticketId, userId, isAdmin = false) => {
    const ticket = await smartCache.getOrFetch(
        smartCache.keys.supportTicket(ticketId),
        () => supportRepository.findTicketById(ticketId),
        { type: 'support', swr: true }
    );

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
export const getAllTickets = async (options) => {
    const { page = 1, limit = 20 } = options;
    return smartCache.getOrFetch(
        smartCache.keys.supportAllTickets(options),
        async () => {
            const skip = (page - 1) * limit;
            return await supportRepository.findAllTickets({ ...options, skip, limit });
        },
        { type: 'support', swr: true }
    );
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

    const result = updatedTicket;
    await adminBroadcast.notifySupportChanged();
    return result;
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

