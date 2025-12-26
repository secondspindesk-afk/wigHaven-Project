import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import bannerApi, { BannerFormData } from '../api/banners';

// Get All Banners Hook (Admin)
export function useBanners() {
    return useQuery({
        queryKey: ['admin', 'banners'],
        queryFn: bannerApi.getAllBanners,
        staleTime: 5 * 60 * 1000, // 5 minutes - WebSocket handles updates
        gcTime: 10 * 60 * 1000,
    });
}

// Get Active Banners Hook (Public - no auth required)
// Cache FOREVER - WebSocket DATA_UPDATE is the ONLY trigger for refetch
// This creates a real-time system without polling overhead
export function usePublicBanners() {
    return useQuery({
        queryKey: ['public', 'banners'],
        queryFn: bannerApi.getActiveBanners,
        staleTime: 10 * 60 * 1000, // 10 minute safety window
        gcTime: 1000 * 60 * 60, // 1 hour garbage collection
        refetchOnWindowFocus: false,
        refetchOnMount: true, // Refetch if invalidated
    });
}

// Get Single Banner Hook
export function useBanner(id: string | undefined) {
    return useQuery({
        queryKey: ['admin', 'banner', id],
        queryFn: () => bannerApi.getBanner(id!),
        enabled: !!id,
        staleTime: 1 * 60 * 1000, // 1 minute
    });
}

// Create Banner Mutation
export function useCreateBanner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bannerApi.createBanner,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
            queryClient.invalidateQueries({ queryKey: ['public', 'banners'] }); // Also invalidate public banners
        }
    });
}

// Update Banner Mutation
export function useUpdateBanner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<BannerFormData> }) =>
            bannerApi.updateBanner(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
            queryClient.invalidateQueries({ queryKey: ['public', 'banners'] }); // Also invalidate public banners
        }
    });
}

// Delete Banner Mutation
export function useDeleteBanner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bannerApi.deleteBanner,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
            queryClient.invalidateQueries({ queryKey: ['public', 'banners'] }); // Also invalidate public banners
        }
    });
}
