import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToCartChanges } from '@/lib/services/localCartService';

/**
 * CartSyncListener
 * 
 * Listens for cart changes (including from other tabs) and invalidates
 * the React Query cart cache to keep the UI in sync.
 */
export default function CartSyncListener() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const unsubscribe = subscribeToCartChanges(() => {
            console.log('🛒 [CartSync] Cart changed in another tab, invalidating query');
            queryClient.invalidateQueries({ queryKey: ['cart'] });
        });

        return () => unsubscribe();
    }, [queryClient]);

    return null;
}
