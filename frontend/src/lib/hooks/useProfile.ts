import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/axios';
import { User, ChangePasswordData } from '@/lib/types';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils/errorUtils';

export function useProfile() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const updateProfile = useMutation({
        mutationFn: async (data: Partial<User>) => {
            const response = await api.put<{ data: User }>('/profile', data);
            return response.data.data;
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(['user'], updatedUser);
            showToast('Profile updated successfully', 'success');
        },
        onError: (error: any) => {
            showToast(getErrorMessage(error, 'Failed to update profile'), 'error');
        },
    });

    const changePassword = useMutation({
        mutationFn: async (data: ChangePasswordData) => {
            await api.put('/profile/password', data);
        },
        onSuccess: () => {
            showToast('Password changed successfully', 'success');
        },
        onError: (error: any) => {
            showToast(getErrorMessage(error, 'Failed to change password'), 'error');
        },
    });

    const deactivateAccount = useMutation({
        mutationFn: async () => {
            await api.delete('/profile');
        },
        onSuccess: () => {
            // Logout will be handled by the component or global state
            showToast('Account deactivated', 'success');
        },
        onError: (error: any) => {
            showToast(getErrorMessage(error, 'Failed to deactivate account'), 'error');
        },
    });

    return {
        updateProfile,
        changePassword,
        deactivateAccount,
    };
}
