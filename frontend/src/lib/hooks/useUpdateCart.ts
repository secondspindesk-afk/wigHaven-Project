import { useMutation, useQueryClient } from '@tanstack/react-query';
import cartService from '@/lib/api/cart';
import { useToast } from '@/contexts/ToastContext';

interface UpdateCartVariables {
    itemId: string;
    quantity: number;
}

/**
 * Hook to update cart item quantity with optimistic updates
 */
export function useUpdateCart() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ itemId, quantity }: UpdateCartVariables) =>
            cartService.updateCartItem(itemId, { quantity }),

        onMutate: async ({ itemId, quantity }) => {
            await queryClient.cancelQueries({ queryKey: ['cart'] });
            const previousCart = queryClient.getQueryData(['cart']);

            // Optimistically update quantity
            queryClient.setQueryData(['cart'], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    items: old.items.map((item: any) =>
                        item.id === itemId ? { ...item, quantity } : item
                    ),
                };
            });

            return { previousCart };
        },

        onError: (_err, _variables, context) => {
            showToast('Failed to update cart', 'error');
            if (context?.previousCart) {
                queryClient.setQueryData(['cart'], context.previousCart);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
        },
    });
}
