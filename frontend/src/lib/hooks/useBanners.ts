import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import bannerApi, { BannerFormData } from '../api/banners';

// Get All Banners Hook (Admin)
export function useBanners() {
    return useQuery({
        queryKey: ['admin', 'banners'],
        queryFn: bannerApi.getAllBanners,
        staleTime: 0
    });
}

// Get Active Banners Hook (Public - no auth required)
// Banners rarely change - aggressive caching is safe
export function usePublicBanners() {
    return useQuery({
        queryKey: ['public', 'banners'],
        queryFn: bannerApi.getActiveBanners,
        staleTime: 1000 * 60 * 30, // 30 minutes - banners rarely change
        gcTime: 1000 * 60 * 60, // 1 hour garbage collection
        refetchOnWindowFocus: false,
    });
}

// Get Single Banner Hook
export function useBanner(id: string | undefined) {
    return useQuery({
        queryKey: ['admin', 'banner', id],
        queryFn: () => bannerApi.getBanner(id!),
        enabled: !!id,
        staleTime: 0
    });
}

// Create Banner Mutation
export function useCreateBanner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: bannerApi.createBanner,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
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
        }
    });
}
