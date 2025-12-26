import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/lib/api/auth';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '@/lib/utils/tokenManager';
import { wsManager } from '@/lib/utils/websocketManager';
import { clearLocalCart } from '@/lib/services/localCartService';

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
            // 1. Clear ALL data from React Query cache
            queryClient.clear();

            // 2. Clear Auth Tokens
            tokenManager.clearTokens();

            // 3. Disconnect WebSocket (Leader will close connection)
            wsManager.disconnect();

            // 4. Clear Session ID to ensure fresh guest session
            localStorage.removeItem('session_id');

            // 5. Clear Local Cart (Optional, but safer for shared devices)
            clearLocalCart();

            showToast('Logged out successfully', 'success');
            navigate('/login');
        },
        onError: (_error: any) => {
            showToast('Logout failed', 'error');
        },
    });
}
