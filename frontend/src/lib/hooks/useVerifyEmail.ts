import { useMutation } from '@tanstack/react-query';
import { authService } from '@/lib/api/auth';

export const useVerifyEmail = () => {
    return useMutation({
        mutationFn: (token: string) => authService.verifyEmail(token),
    });
};
