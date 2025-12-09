import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import mediaApi, { MediaFilter } from '../api/media';

// List Media Hook
export function useMedia(params?: MediaFilter) {
    return useQuery({
        queryKey: ['admin', 'media', params],
        queryFn: () => mediaApi.listMedia(params),
        staleTime: 0
    });
}

// Delete Media Mutation
export function useDeleteMedia() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: mediaApi.softDelete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
        }
    });
}

// Batch Delete Mutation
export function useBatchDeleteMedia() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: mediaApi.batchDelete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
        }
    });
}

// Sync Media Mutation
export function useSyncMedia() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: mediaApi.syncMedia,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
        }
    });
}
