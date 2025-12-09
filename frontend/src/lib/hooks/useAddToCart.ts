import { useMutation, useQueryClient } from '@tanstack/react-query';
import cartService from '@/lib/api/cart';
import { useToast } from '@/contexts/ToastContext';

interface AddToCartVariables {
    variantId: string;
    quantity: number;
}

/**
 * Hook to add item to cart with optimistic updates
 */
export function useAddToCart() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ variantId, quantity }: AddToCartVariables) =>
            cartService.addToCart({ variantId, quantity }),

        // Optimistic Update
        onMutate: async () => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['cart'] });

            // Snapshot the previous value
            const previousCart = queryClient.getQueryData(['cart']);

            // Optimistically update to the new value
            // Note: This is a best-guess update. Real data comes from server.
            // We can't easily guess the full item details without more data, 
            // so for add-to-cart we often just wait or do a partial update if we have product data.
            // For now, we'll rely on the fast server response, but we could pass product data here to fake it.

            return { previousCart };
        },

        onSuccess: () => {
            showToast('Added to cart', 'success');
        },

        onError: (error: any, _variables, context) => {
            // Extract error message from API response
            const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to add to cart';

            // Show specific error messages
            if (errorMessage.includes('Insufficient stock')) {
                showToast(errorMessage, 'error');
            } else if (errorMessage.includes('already in cart')) {
                showToast('Item is already in your cart. Update quantity from cart page.', 'info');
            } else {
                showToast(errorMessage, 'error');
            }

            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousCart) {
                queryClient.setQueryData(['cart'], context.previousCart);
            }
        },

        // Always refetch after error or success:
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
        },
    });
}
