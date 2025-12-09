import { useQuery } from '@tanstack/react-query';
import { authService } from '@/lib/api/auth';
import { useToken } from './useToken';

/**
 * Hook to fetch current user
 * User data is cached for 1 minute (sensitive, keep fresh)
 * Does not retry on 401 (unauthorized)
 */
export function useUser() {
    const token = useToken();

    return useQuery({
        queryKey: ['user'],
        queryFn: authService.getCurrentUser,
        staleTime: 1 * 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: false, // Don't retry if unauthorized
        enabled: !!token, // Only fetch if we have a token
        select: (data) => data.data.user,
    });
}
