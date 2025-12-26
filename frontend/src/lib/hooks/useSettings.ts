import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import settingsApi from '../api/settings';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils/errorUtils';

// Get Admin Settings Hook (Protected)
export function useAdminSettings() {
    const { showToast } = useToast();
    return useQuery({
        queryKey: ['admin', 'settings'],
        queryFn: async () => {
            try {
                return await settingsApi.getSettings();
            } catch (error: any) {
                // Only show toast for permission errors or server errors, not just loading states
                if (error.response?.status === 403 || error.response?.status === 500) {
                    showToast(getErrorMessage(error, 'Failed to fetch settings'), 'error');
                }
                throw error;
            }
        },
        staleTime: 2 * 60 * 1000, // 2 minutes - admin settings don't change often
        gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
        refetchOnWindowFocus: false, // WebSocket handles updates
        retry: false // Don't retry on permission errors
    });
}

// Get Public Settings Hook (Public)
// Cache FOREVER - WebSocket DATA_UPDATE is the ONLY trigger for refetch
export function usePublicSettings() {
    return useQuery({
        queryKey: ['public', 'settings'],
        queryFn: settingsApi.getPublicSettings,
        staleTime: Infinity, // FOREVER - only WebSocket invalidation triggers refetch
        gcTime: 1000 * 60 * 60, // 1 hour garbage collection
        refetchOnWindowFocus: false,
        refetchOnMount: true, // Refetch if invalidated
    });
}

// Deprecated: Alias for Admin Settings (to be removed)
export const useSettings = useAdminSettings;

// Update Settings Mutation
export function useUpdateSettings() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: settingsApi.updateSettings,
        onSuccess: (newData) => {
            queryClient.setQueryData(['admin', 'settings'], newData);
            queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
            queryClient.invalidateQueries({ queryKey: ['public', 'settings'] }); // Also invalidate public settings
            showToast('Settings updated successfully', 'success');
        },
        onError: (error: any) => {
            showToast(getErrorMessage(error, 'Failed to update settings'), 'error');
        }
    });
}
