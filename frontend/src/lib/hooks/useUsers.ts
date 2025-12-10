import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, UsersFilters } from '@/lib/api/users';

/**
 * Get all users with filters (Admin)
 */
export function useAdminUsers(filters?: UsersFilters) {
    return useQuery({
        queryKey: ['admin', 'users', filters],
        queryFn: () => usersApi.getUsers(filters),
        placeholderData: (previousData) => previousData,
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000,
    });
}

/**
 * Ban user
 */
export function useBanUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId: string) => usersApi.banUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        },
    });
}

/**
 * Unban user
 */
export function useUnbanUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId: string) => usersApi.unbanUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        },
    });
}
