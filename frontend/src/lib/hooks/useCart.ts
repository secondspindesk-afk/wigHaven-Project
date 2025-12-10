import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import cartService from '@/lib/api/cart';
import localCartService from '@/lib/services/localCartService';
import { Cart } from '@/lib/types/cart';
import { useToken } from '@/lib/hooks/useToken';

/**
 * LocalStorage-First Cart Hook
 * 
 * Architecture (Amazon/Shopify pattern):
 * 1. LocalStorage is the PRIMARY data source (instant reads)
 * 2. Database sync happens in BACKGROUND (non-blocking)
 * 3. Conflicts resolved at checkout, not on every operation
 * 
 * This provides instant cart operations regardless of network latency.
 */
export function useCart() {
    const queryClient = useQueryClient();
    const token = useToken();
    const isLoggedIn = !!token;
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Primary query - reads from LocalStorage FIRST, then syncs with server
    const query = useQuery<Cart>({
        queryKey: ['cart'],
        queryFn: async () => {
            // 1. Always start with LocalStorage (instant)
            const localCart = localCartService.getLocalCart();
            const localFullCart = localCartService.localCartToFullCart(localCart);

            // If not logged in, LocalStorage IS the cart
            if (!isLoggedIn) {
                return localFullCart;
            }

            // 2. For logged-in users, fetch server cart in background
            //    but return local data immediately
            try {
                const serverCart = await cartService.getCart();

                // Merge strategy: If local has items and server doesn't, push local to server
                if (localCart.items.length > 0 && (!serverCart.items || serverCart.items.length === 0)) {
                    // Local has items, server empty - use local and schedule sync
                    scheduleSync();
                    return localFullCart;
                }

                // If server has items and local is empty, use server data
                if (localCart.items.length === 0 && serverCart.items?.length > 0) {
                    // Populate LocalStorage with server data
                    localCartService.saveLocalCart({
                        items: serverCart.items,
                        couponCode: serverCart.discount?.code || null,
                        lastModified: Date.now()
                    });
                    return serverCart;
                }

                // If both have items, use local (it's more recent from user's perspective)
                // Server sync happens in background
                if (localCart.items.length > 0) {
                    scheduleSync();
                    return localFullCart;
                }

                // Default to server cart
                localCartService.markCartSynced();
                return serverCart;

            } catch (error) {
                // Network error - use local cart (offline-capable)
                console.warn('[useCart] Server fetch failed, using LocalStorage:', error);
                return localFullCart;
            }
        },
        staleTime: 10 * 60 * 1000, // 10 minutes - trust local data
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false, // Don't refetch on focus - local is source of truth
        refetchOnMount: false, // Don't refetch on mount
    });

    /**
     * Schedule background sync to server
     * Debounced to prevent rapid syncs
     */
    const scheduleSync = useCallback(() => {
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(async () => {
            if (!isLoggedIn) return;

            try {
                const localCart = localCartService.getLocalCart();

                // Sync each item to server
                // In production, you'd have a batch sync endpoint
                for (const item of localCart.items) {
                    await cartService.addToCart({
                        variantId: item.variant_id,
                        quantity: item.quantity
                    }).catch(() => {
                        // Ignore individual item failures
                    });
                }

                localCartService.markCartSynced();
                console.log('[useCart] Background sync complete');
            } catch (error) {
                console.warn('[useCart] Background sync failed:', error);
            }
        }, 5000); // 5 second debounce for sync
    }, [isLoggedIn]);

    // Cleanup sync timeout on unmount
    useEffect(() => {
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, []);

    // Sync on window close/unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isLoggedIn && localCartService.needsSync()) {
                // Attempt sync before page close
                const localCart = localCartService.getLocalCart();
                if (localCart.items.length > 0) {
                    // Use sendBeacon for reliable sync on page close
                    navigator.sendBeacon?.(
                        '/api/cart/sync',
                        JSON.stringify({ items: localCart.items })
                    );
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isLoggedIn]);

    /**
     * Update local cart and trigger React Query update
     * This is called by mutation hooks after local updates
     */
    const updateLocalCart = useCallback(() => {
        const localCart = localCartService.getLocalCart();
        const fullCart = localCartService.localCartToFullCart(localCart);
        queryClient.setQueryData(['cart'], fullCart);

        // Schedule background sync for logged-in users
        if (isLoggedIn) {
            scheduleSync();
        }
    }, [queryClient, isLoggedIn, scheduleSync]);

    return {
        ...query,
        updateLocalCart,
        isLocalFirst: true,
    };
}
