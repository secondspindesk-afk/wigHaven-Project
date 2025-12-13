import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/lib/api/auth';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '@/lib/utils/tokenManager';
import { usePublicSettings } from '@/lib/hooks/useSettings';

/**
 * Hook for user login
 * Updates user cache and redirects on success
 */
export function useLogin() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { data: settings } = usePublicSettings();

    return useMutation({
        mutationFn: async (data: any) => {
            const response = await authService.login(data);
            return { ...response, rememberMe: data.rememberMe };
        },
        onSuccess: (data) => {
            // Update user cache immediately
            queryClient.setQueryData(['user'], data.data.user);

            // Force refetch to ensure all components update
            queryClient.invalidateQueries({ queryKey: ['user'] });

            // Store tokens
            tokenManager.setTokens(data.data.accessToken, data.data.refreshToken, data.rememberMe);

            // Invalidate cart to merge server cart
            queryClient.invalidateQueries({ queryKey: ['cart'] });

            showToast('Welcome back!', 'success');
            navigate('/shop');
        },
        onError: (error: any) => {
            const responseData = error.response?.data;

            // Check if user needs to verify email - redirect to resend page
            if (responseData?.needsVerification && responseData?.email) {
                showToast('Please verify your email to continue.', 'warning');
                navigate('/please-verify-email', { state: { email: responseData.email } });
                return;
            }

            let message = 'Login failed';

            // 1. Check for standardized error format: { error: { message: "..." } }
            if (error.response?.data?.error?.message) {
                message = error.response.data.error.message;
            }
            // 2. Check for flat format (fallback): { message: "..." }
            else if (error.response?.data?.message) {
                message = error.response.data.message;
            }

            // Add support contact info for account issues
            if (settings?.supportEmail && (
                message.toLowerCase().includes('deactivated') ||
                message.toLowerCase().includes('suspended') ||
                message.toLowerCase().includes('blocked')
            )) {
                message += `. Please contact support at ${settings.supportEmail}.`;
            }

            showToast(message, 'error');
        },
    });
}
