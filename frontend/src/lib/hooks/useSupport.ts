import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import supportApi from '@/lib/api/support';
import { CreateTicketData, ReplyTicketData } from '@/lib/types/support';
import { useToast } from '@/contexts/ToastContext';

export function useSupportTickets(page = 1) {
    return useQuery({
        queryKey: ['support-tickets', page],
        queryFn: () => supportApi.getTickets(page),
        staleTime: 0,
    });
}

export function useSupportTicket(id: string) {
    return useQuery({
        queryKey: ['support-ticket', id],
        queryFn: () => supportApi.getTicket(id),
        enabled: !!id,
        refetchInterval: 10000, // Poll every 10 seconds for new messages
        staleTime: 0,
    });
}

export function useCreateTicket() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (data: CreateTicketData) => supportApi.createTicket(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
            showToast('Ticket created successfully', 'success');
        },
        onError: (error: any) => {
            showToast(error.response?.data?.error || 'Failed to create ticket', 'error');
        },
    });
}

export function useReplyTicket(ticketId: string) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (data: ReplyTicketData) => supportApi.replyTicket(ticketId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
            showToast('Reply sent', 'success');
        },
        onError: (error: any) => {
            showToast(error.response?.data?.error || 'Failed to send reply', 'error');
        },
    });
}

// ==================== ADMIN HOOKS ====================

export function useAdminSupportTickets(params: { page?: number; status?: string; priority?: string } = {}) {
    return useQuery({
        queryKey: ['admin-support-tickets', params],
        queryFn: () => supportApi.getAllTicketsAdmin({ page: params.page || 1, limit: 20, status: params.status, priority: params.priority }),
        staleTime: 0,
    });
}

export function useUpdateTicketStatus() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'open' | 'pending' | 'closed' }) =>
            supportApi.updateTicketStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
            queryClient.invalidateQueries({ queryKey: ['support-ticket'] });
            showToast('Ticket status updated', 'success');
        },
        onError: (error: any) => {
            showToast(error.response?.data?.error || 'Failed to update status', 'error');
        },
    });
}

export function useAdminReplyTicket() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ id, message }: { id: string; message: string }) =>
            supportApi.adminReplyTicket(id, message),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
            queryClient.invalidateQueries({ queryKey: ['support-ticket'] });
            showToast('Reply sent', 'success');
        },
        onError: (error: any) => {
            showToast(error.response?.data?.error || 'Failed to send reply', 'error');
        },
    });
}
