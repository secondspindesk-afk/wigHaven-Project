import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import bannerApi, { BannerFormData } from '../api/banners';

// Get All Banners Hook
export function useBanners() {
    return useQuery({
        queryKey: ['admin', 'banners'],
        queryFn: bannerApi.getAllBanners,
        staleTime: 0
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
