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
 * LocalStorage-First Add to Cart Hook with Stock Validation
 * 
 * Operations happen INSTANTLY in LocalStorage.
 * Stock is validated locally - only adds up to available quantity.
 * Background sync to server for logged-in users.
 */
export function useAddToCart() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const token = useToken();
    const isLoggedIn = !!token;

    return useMutation({
        mutationFn: async ({ variantId, quantity, productInfo }: AddToCartVariables) => {
            // 1. INSTANT: Update LocalStorage with stock validation
            const result = localCartService.addToLocalCart(variantId, quantity, productInfo || {});
            const fullCart = localCartService.localCartToFullCart(result.cart);

            // 2. Update React Query cache immediately
            queryClient.setQueryData(['cart'], fullCart);

            // 3. BACKGROUND: Sync to server (non-blocking)
            if (isLoggedIn && result.cappedQuantity > 0) {
                cartService.addToCart({ variantId, quantity: result.cappedQuantity }).catch(error => {
                    console.warn('[AddToCart] Background sync failed:', error);
                    // Don't show error - local cart is source of truth
                });
            }

            return {
                cart: fullCart,
                wasLimited: result.wasLimited,
                addedQuantity: result.cappedQuantity,
                requestedQuantity: quantity,
                stockAvailable: productInfo?.stock_available || 0
            };
        },

        onSuccess: (data) => {
            if (data.addedQuantity === 0) {
                // No items added - already at max stock
                showToast(`Maximum quantity already in cart (${data.stockAvailable} available)`, 'warning');
            } else if (data.wasLimited) {
                // Added less than requested
                showToast(`Added ${data.addedQuantity} to cart (only ${data.stockAvailable} available)`, 'warning');
            } else {
                showToast('Added to cart', 'success');
            }
        },

        onError: (error: any) => {
            const errorMessage = error.message || 'Failed to add to cart';
            showToast(errorMessage, 'error');
        },
    });
}
