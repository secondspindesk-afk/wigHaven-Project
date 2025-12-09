import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import emailApi from '@/lib/api/email';
import { UpdatePreferencesData } from '@/lib/types/email';
import { useToast } from '@/contexts/ToastContext';

export function useEmailPreferences() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const { data: preferences, isLoading } = useQuery({
        queryKey: ['email-preferences'],
        queryFn: emailApi.getPreferences,
    });

    const updatePreferences = useMutation({
        mutationFn: (data: UpdatePreferencesData) => emailApi.updatePreferences(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
            showToast('Email preferences updated', 'success');
        },
        onError: (error: any) => {
            showToast(error.response?.data?.error || 'Failed to update preferences', 'error');
        },
    });

    const unsubscribeAll = useMutation({
        mutationFn: (email: string) => emailApi.unsubscribeAll(email),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
            showToast('Unsubscribed from all emails', 'success');
        },
        onError: (error: any) => {
            showToast(error.response?.data?.error || 'Failed to unsubscribe', 'error');
        },
    });

    return {
        preferences,
        isLoading,
        updatePreferences,
        unsubscribeAll,
    };
}
