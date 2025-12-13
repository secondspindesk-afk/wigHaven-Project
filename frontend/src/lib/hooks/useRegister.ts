import { useMutation } from '@tanstack/react-query';
import { authService } from '@/lib/api/auth';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/lib/utils/errorUtils';

/**
 * Hook for user registration
 * Redirects to email verification screen after successful registration
 */
export function useRegister() {
    const { showToast } = useToast();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: authService.register,
        onSuccess: (data) => {
            // Don't auto-login - redirect to verify email screen
            showToast('Account created! Please verify your email.', 'success');
            navigate('/please-verify-email', {
                state: { email: data.data.user?.email }
            });
        },
        onError: (error: any) => {
            const responseData = error.response?.data;

            // Check if user should login instead (email already verified)
            if (responseData?.shouldLogin) {
                showToast('This email is already registered. Please login.', 'info');
                navigate('/login');
                return;
            }

            showToast(getErrorMessage(error, 'Registration failed'), 'error');
        },
    });
}
