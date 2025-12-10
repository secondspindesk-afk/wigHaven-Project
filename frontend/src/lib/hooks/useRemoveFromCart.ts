import { useMutation, useQueryClient } from '@tanstack/react-query';
import localCartService from '@/lib/services/localCartService';
import cartService from '@/lib/api/cart';
import { useToast } from '@/contexts/ToastContext';
import { useToken } from '@/lib/hooks/useToken';

/**
 * LocalStorage-First Remove from Cart Hook
 * 
 * - INSTANT: Removes from LocalStorage immediately
 * - BACKGROUND: Syncs removal to server for logged-in users
 */
export function useRemoveFromCart() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const token = useToken();
    const isLoggedIn = !!token;

    return useMutation({
        mutationFn: async (variantId: string) => {
            // 1. INSTANT: Remove from LocalStorage
            const localCart = localCartService.removeFromLocalCart(variantId);
            const fullCart = localCartService.localCartToFullCart(localCart);

            // 2. Update React Query cache immediately
            queryClient.setQueryData(['cart'], fullCart);

            // 3. BACKGROUND: Sync to server (non-blocking)
            if (isLoggedIn) {
                cartService.removeCartItem(variantId).catch(error => {
                    console.warn('[RemoveFromCart] Background sync failed:', error);
                });
            }

            return fullCart;
        },

        onSuccess: () => {
            showToast('Item removed', 'success');
        },

        onError: (error: any) => {
            const errorMessage = error.message || 'Failed to remove item';
            showToast(errorMessage, 'error');
        },
    });
}
