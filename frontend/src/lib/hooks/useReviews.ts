import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/axios';
import { reviewsApi, ReviewFilters } from '@/lib/api/reviews';

interface CreateReviewData {
    productId: string;
    rating: number;
    comment: string;
    orderItemId?: string;
}

export function useCreateReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateReviewData) => {
            const response = await api.post('/reviews', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            // Note: Toast is shown in the component using useToast hook
        },
        onError: (error: any) => {
            // Note: Error handling is done in the component
            console.error('Failed to submit review:', error);
        }
    });
}

// Admin Hooks
export function useAdminReviews(filters?: ReviewFilters) {
    return useQuery({
        queryKey: ['admin-reviews', filters],
        queryFn: () => reviewsApi.getReviews(filters),
        staleTime: 0,
    });
}

export function useApproveReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reviewsApi.approveReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
        },
    });
}

export function useRejectReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reviewsApi.rejectReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
        },
    });
}

export function useDeleteReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reviewsApi.deleteReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
        },
    });
}

export function useUpdateReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { title?: string; content?: string } }) =>
            reviewsApi.updateReview(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
        },
    });
}
