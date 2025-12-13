import { getPrisma } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Create a new support ticket
 */
export const createTicket = async (data) => {
    try {
        const prisma = getPrisma();
        return await prisma.supportTicket.create({
            data,
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
    } catch (error) {
        logger.error('Error creating support ticket:', error);
        throw error;
    }
};

/**
 * Add a message to a ticket
 */
export const addMessage = async (data) => {
    try {
        const prisma = getPrisma();
        // Use transaction to add message AND update ticket's updatedAt
        const [message] = await prisma.$transaction([
            prisma.supportMessage.create({
                data,
                include: {
                    sender: {
                        select: {
                            firstName: true,
                            lastName: true,
                            role: true
                        }
                    }
                }
            }),
            // Touch the ticket to update its 'updatedAt' timestamp
            prisma.supportTicket.update({
                where: { id: data.ticketId },
                data: { updatedAt: new Date() }
            })
        ]);
        return message;
    } catch (error) {
        logger.error('Error adding support message:', error);
        throw error;
    }
};

/**
 * Find ticket by ID with messages
 */
export const findTicketById = async (id) => {
    try {
        const prisma = getPrisma();
        return await prisma.supportTicket.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        sender: {
                            select: {
                                firstName: true,
                                lastName: true,
                                role: true
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        logger.error('Error finding ticket:', error);
        throw error;
    }
};

/**
 * Find tickets for a user
 */
export const findUserTickets = async (userId, skip = 0, take = 20) => {
    try {
        const prisma = getPrisma();
        const [tickets, total] = await Promise.all([
            prisma.supportTicket.findMany({
                where: { userId },
                orderBy: { updatedAt: 'desc' },
                skip,
                take,
                include: {
                    _count: {
                        select: { messages: true }
                    }
                }
            }),
            prisma.supportTicket.count({ where: { userId } })
        ]);

        return { tickets, total };
    } catch (error) {
        logger.error('Error finding user tickets:', error);
        throw error;
    }
};

/**
 * Find all tickets (Admin)
 */
export const findAllTickets = async ({ skip = 0, limit = 20, status, priority }) => {
    try {
        const prisma = getPrisma();
        const where = {};
        if (status) where.status = status;
        if (priority) where.priority = priority;

        const [tickets, total] = await Promise.all([
            prisma.supportTicket.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    },
                    _count: {
                        select: { messages: true }
                    }
                }
            }),
            prisma.supportTicket.count({ where })
        ]);

        return { tickets, total };
    } catch (error) {
        logger.error('Error finding all tickets:', error);
        throw error;
    }
};

/**
 * Update ticket status
 */
export const updateTicketStatus = async (id, status) => {
    try {
        const prisma = getPrisma();
        return await prisma.supportTicket.update({
            where: { id },
            data: { status }
        });
    } catch (error) {
        logger.error('Error updating ticket status:', error);
        throw error;
    }
};

export default {
    createTicket,
    addMessage,
    findTicketById,
    findUserTickets,
    findAllTickets,
    updateTicketStatus
};
