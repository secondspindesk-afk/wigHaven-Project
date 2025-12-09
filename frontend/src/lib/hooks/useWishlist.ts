import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/axios';
import { Product } from '@/lib/types/product';
import { useToast } from '@/contexts/ToastContext';

interface WishlistItem {
    id: string;
    userId: string;
    productId: string;
    createdAt: string;
    product: Product;
}

export function useWishlist() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const { data: wishlist = [], isLoading } = useQuery({
        queryKey: ['wishlist'],
        queryFn: async () => {
            const response = await api.get<{ data: WishlistItem[] }>('/wishlist');
            return response.data.data;
        },
    });

    const addToWishlist = useMutation({
        mutationFn: async (productId: string) => {
            await api.post('/wishlist', { productId });
        },
        onMutate: async (productId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['wishlist'] });

            // Snapshot previous value
            const previousWishlist = queryClient.getQueryData<WishlistItem[]>(['wishlist']);

            // Optimistically update (add placeholder item)
            queryClient.setQueryData<WishlistItem[]>(['wishlist'], (old = []) => [
                ...old,
                {
                    id: 'temp-' + Date.now(),
                    userId: 'temp',
                    productId,
                    createdAt: new Date().toISOString(),
                    product: {} as Product, // Placeholder
                },
            ]);

            return { previousWishlist };
        },
        onError: (error: any, _productId, context) => {
            // Rollback on error
            if (context?.previousWishlist) {
                queryClient.setQueryData(['wishlist'], context.previousWishlist);
            }
            showToast(error.response?.data?.error || 'Failed to add to wishlist', 'error');
        },
        onSuccess: () => {
            showToast('Added to wishlist', 'success');
        },
        onSettled: () => {
            // Refetch to get real data
            queryClient.invalidateQueries({ queryKey: ['wishlist'] });
        },
    });

    const removeFromWishlist = useMutation({
        mutationFn: async (productId: string) => {
            await api.delete(`/wishlist/${productId}`);
        },
        onMutate: async (productId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['wishlist'] });

            // Snapshot previous value
            const previousWishlist = queryClient.getQueryData<WishlistItem[]>(['wishlist']);

            // Optimistically update (remove item)
            queryClient.setQueryData<WishlistItem[]>(['wishlist'], (old = []) =>
                old.filter(item => item.productId !== productId)
            );

            return { previousWishlist };
        },
        onError: (error: any, _productId, context) => {
            // Rollback on error
            if (context?.previousWishlist) {
                queryClient.setQueryData(['wishlist'], context.previousWishlist);
            }
            showToast(error.response?.data?.error || 'Failed to remove from wishlist', 'error');
        },
        onSuccess: () => {
            showToast('Removed from wishlist', 'success');
        },
        onSettled: () => {
            // Refetch to get real data
            queryClient.invalidateQueries({ queryKey: ['wishlist'] });
        },
    });

    const isInWishlist = (productId: string) => {
        return wishlist.some(item => item.productId === productId);
    };

    return {
        wishlist,
        isLoading,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
    };
}
