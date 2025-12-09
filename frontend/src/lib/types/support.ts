import { User } from './index';

export interface SupportTicket {
    id: string;
    userId: string;
    subject: string;
    status: 'open' | 'pending' | 'closed';
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
    updatedAt: string;
    messages: SupportMessage[];
    user?: User;
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
