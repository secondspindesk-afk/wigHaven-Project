import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import emailApi, { EmailFilter } from '../api/emails';

// Get Logs Hook
export function useEmailLogs(params?: EmailFilter) {
    return useQuery({
        queryKey: ['admin', 'emails', 'logs', params],
        queryFn: () => emailApi.getLogs(params),
        staleTime: 1 * 60 * 1000, // 1 minute - logs update frequently
        gcTime: 5 * 60 * 1000,
    });
}

// Get Stats Hook
export function useEmailStats() {
    return useQuery({
        queryKey: ['admin', 'emails', 'stats'],
        queryFn: emailApi.getStats,
        staleTime: 1 * 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000,
    });
}

// Retry Failed Mutation
export function useRetryEmail() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: emailApi.retryFailed,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'emails'] });
        }
    });
}
