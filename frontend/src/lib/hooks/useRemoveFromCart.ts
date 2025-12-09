import { useMutation, useQueryClient } from '@tanstack/react-query';
import cartService from '@/lib/api/cart';
import { useToast } from '@/contexts/ToastContext';

/**
 * Hook to remove item from cart with optimistic updates
 */
export function useRemoveFromCart() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (itemId: string) => cartService.removeCartItem(itemId),

        onMutate: async (itemId) => {
            await queryClient.cancelQueries({ queryKey: ['cart'] });
            const previousCart = queryClient.getQueryData(['cart']);

            // Optimistically remove item
            queryClient.setQueryData(['cart'], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    items: old.items.filter((item: any) => item.id !== itemId),
                    items_count: Math.max(0, old.items_count - 1),
                };
            });

            return { previousCart };
        },

        onSuccess: () => {
            showToast('Item removed', 'success');
        },

        onError: (_err, _itemId, context) => {
            showToast('Failed to remove item', 'error');
            if (context?.previousCart) {
                queryClient.setQueryData(['cart'], context.previousCart);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
        },
    });
}
