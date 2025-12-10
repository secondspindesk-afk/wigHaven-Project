import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useCallback } from 'react';
import localCartService from '@/lib/services/localCartService';
import cartService from '@/lib/api/cart';
import { useToast } from '@/contexts/ToastContext';
import { useToken } from '@/lib/hooks/useToken';

interface UpdateCartVariables {
    variantId: string;
    quantity: number;
}

/**
 * LocalStorage-First Update Cart Hook
 * 
 * - INSTANT: Updates LocalStorage immediately
 * - DEBOUNCED: Syncs to server after 500ms of no changes
 * - NON-BLOCKING: Server errors don't affect local state
 */
export function useUpdateCart() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const token = useToken();
    const isLoggedIn = !!token;

    // Debounce tracking for server sync
    const syncTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const mutation = useMutation({
        mutationFn: async ({ variantId, quantity }: UpdateCartVariables) => {
            // 1. INSTANT: Update LocalStorage
            const localCart = localCartService.updateLocalCartItem(variantId, quantity);
            const fullCart = localCartService.localCartToFullCart(localCart);

            // 2. Update React Query cache immediately
            queryClient.setQueryData(['cart'], fullCart);

            return fullCart;
        },

        onError: (error: any) => {
            const errorMessage = error.message || 'Failed to update cart';
            showToast(errorMessage, 'error');
        },
    });

    /**
     * Debounced update - INSTANT local update, DELAYED server sync
     * This prevents API spam when user rapidly clicks +/-
     */
    const updateDebounced = useCallback((variantId: string, quantity: number) => {
        // 1. INSTANT: Update LocalStorage and UI
        const localCart = localCartService.updateLocalCartItem(variantId, quantity);
        const fullCart = localCartService.localCartToFullCart(localCart);
        queryClient.setQueryData(['cart'], fullCart);

        // 2. DEBOUNCED: Schedule server sync (500ms delay)
        if (isLoggedIn) {
            // Clear existing timeout for this variant
            const existingTimeout = syncTimeouts.current.get(variantId);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }

            // Schedule new sync
            const timeout = setTimeout(() => {
                cartService.updateCartItem(variantId, { quantity }).catch(error => {
                    console.warn('[UpdateCart] Background sync failed:', error);
                });
                syncTimeouts.current.delete(variantId);
            }, 500);

            syncTimeouts.current.set(variantId, timeout);
        }
    }, [isLoggedIn, queryClient]);

    return {
        ...mutation,
        updateDebounced,
    };
}
