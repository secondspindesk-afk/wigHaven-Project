import api from './axios';
import { SupportTicket, CreateTicketData, ReplyTicketData, SupportMessage } from '@/lib/types/support';

export const supportApi = {
    getTickets: async (page = 1, limit = 20) => {
        const response = await api.get<{ data: SupportTicket[]; pagination: any }>(`/support?page=${page}&limit=${limit}`);
        return response.data;
    },

    getTicket: async (id: string) => {
        const response = await api.get<{ data: SupportTicket }>(`/support/${id}`);
        return response.data.data;
    },

    createTicket: async (data: CreateTicketData) => {
        const response = await api.post<{ data: SupportTicket }>('/support', data);
        return response.data.data;
    },

    replyTicket: async (id: string, data: ReplyTicketData) => {
        const response = await api.post<{ data: SupportMessage }>(`/support/${id}/reply`, data);
        return response.data.data;
    },

    // Public - Guest ticket (no auth required)
    createGuestTicket: async (data: { name: string; email: string; subject: string; message: string; priority?: string }) => {
        const response = await api.post<{ data: { id: string }; message: string }>('/support/guest', data);
        return response.data;
    },

    // Admin functions
    getAllTicketsAdmin: async (params: { page?: number; limit?: number; status?: string; priority?: string }) => {
        const query = new URLSearchParams();
        if (params.page) query.set('page', String(params.page));
        if (params.limit) query.set('limit', String(params.limit));
        if (params.status) query.set('status', params.status);
        if (params.priority) query.set('priority', params.priority);
        const response = await api.get<{ data: SupportTicket[]; pagination: any }>(`/support/admin/all?${query}`);
        return response.data;
    },

    updateTicketStatus: async (id: string, status: 'open' | 'pending' | 'closed') => {
        const response = await api.put<{ data: SupportTicket }>(`/support/admin/${id}/status`, { status });
        return response.data.data;
    },

    adminReplyTicket: async (id: string, message: string) => {
        const response = await api.post<{ data: SupportMessage }>(`/support/admin/${id}/reply`, { message });
        return response.data.data;
    },
};

export default supportApi;
