import { User } from './index';

export interface SupportTicket {
    id: string;
    userId: string | null; // Null for guest tickets
    subject: string;
    status: 'open' | 'pending' | 'closed';
    priority: 'low' | 'medium' | 'high';
    guestName?: string | null; // For guest tickets
    guestEmail?: string | null; // For guest tickets
    createdAt: string;
    updatedAt: string;
    messages: SupportMessage[];
    user?: User;
    _count?: { messages: number }; // Message count from Prisma
}

export interface SupportMessage {
    id: string;
    ticketId: string;
    senderId: string;
    message: string;
    isAdmin: boolean;
    createdAt: string;
    sender?: User;
}

export interface CreateTicketData {
    subject: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
}

export interface ReplyTicketData {
    message: string;
}
