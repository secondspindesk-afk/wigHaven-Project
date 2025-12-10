import { useMutation, useQueryClient } from '@tanstack/react-query';
import localCartService from '@/lib/services/localCartService';
import cartService from '@/lib/api/cart';
import { useToast } from '@/contexts/ToastContext';
import { useToken } from '@/lib/hooks/useToken';
import { CartItem } from '@/lib/types/cart';

interface AddToCartVariables {
    variantId: string;
    quantity: number;
    productInfo?: Partial<CartItem>;
}

/**
 * LocalStorage-First Add to Cart Hook
 * 
 * Operations happen INSTANTLY in LocalStorage.
 * Background sync to server for logged-in users.
 */
export function useAddToCart() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const token = useToken();
    const isLoggedIn = !!token;

    return useMutation({
        mutationFn: async ({ variantId, quantity, productInfo }: AddToCartVariables) => {
            // 1. INSTANT: Update LocalStorage
            const localCart = localCartService.addToLocalCart(variantId, quantity, productInfo || {});
            const fullCart = localCartService.localCartToFullCart(localCart);

            // 2. Update React Query cache immediately
            queryClient.setQueryData(['cart'], fullCart);

            // 3. BACKGROUND: Sync to server (non-blocking)
            if (isLoggedIn) {
                cartService.addToCart({ variantId, quantity }).catch(error => {
                    console.warn('[AddToCart] Background sync failed:', error);
                    // Don't show error - local cart is source of truth
                });
            }

            return fullCart;
        },

        onSuccess: () => {
            showToast('Added to cart', 'success');
        },

        onError: (error: any) => {
            const errorMessage = error.message || 'Failed to add to cart';
            showToast(errorMessage, 'error');
        },
    });
}
