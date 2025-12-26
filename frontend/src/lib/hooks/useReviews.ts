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
        onMutate: async (_newReview) => {
            // Cancel outgoing refetches for orders
            await queryClient.cancelQueries({ queryKey: ['orders'] });

            // Snapshot previous orders
            const previousOrders = queryClient.getQueryData(['orders']);

            // Optimistically update orders to mark item as reviewed
            // This is complex because we don't know which order it is without searching
            // But we can at least invalidate or set a flag if we had the orderNumber

            return { previousOrders };
        },
        onError: (_err, _newReview, context) => {
            if (context?.previousOrders) {
                queryClient.setQueryData(['orders'], context.previousOrders);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
    });
}

// Admin Hooks
export function useAdminReviews(filters?: ReviewFilters) {
    return useQuery({
        queryKey: ['admin', 'reviews', filters],
        queryFn: () => reviewsApi.getReviews(filters),
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 10 * 60 * 1000,
    });
}

export function useApproveReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reviewsApi.approveReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
        },
    });
}

export function useRejectReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reviewsApi.rejectReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
        },
    });
}

export function useDeleteReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reviewsApi.deleteReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
        },
    });
}

export function useUpdateReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { title?: string; content?: string } }) =>
            reviewsApi.updateReview(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
        },
    });
}
