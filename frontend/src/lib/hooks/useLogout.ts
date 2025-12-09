import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/lib/api/auth';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '@/lib/utils/tokenManager';

/**
 * Hook for user logout
 * Clears all caches and redirects
 */
export function useLogout() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: authService.logout,
        onSuccess: () => {
            // Clear ALL data from cache
            queryClient.clear();
            tokenManager.clearTokens();
            showToast('Logged out successfully', 'success');
            navigate('/login');
        },
        onError: (_error: any) => {
            showToast('Logout failed', 'error');
        },
    });
}
