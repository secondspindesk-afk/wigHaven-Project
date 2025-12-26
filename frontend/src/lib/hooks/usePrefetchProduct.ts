import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import productApi from '@/lib/api/product';

/**
 * Hook that provides a function to prefetch a product's data
 * 
 * Use this on ProductCard hover to load product details
 * BEFORE the user clicks, making the detail page instant
 * 
 * Usage:
 * ```tsx
 * const prefetchProduct = usePrefetchProduct();
 * 
 * <div onMouseEnter={() => prefetchProduct(product.id)}>
 *   ...
 * </div>
 * ```
 */
export function usePrefetchProduct() {
    const queryClient = useQueryClient();

    const prefetch = useCallback((productId: string) => {
        // Only prefetch if not already in cache
        const cached = queryClient.getQueryData(['product', productId]);
        if (cached) return;

        // Prefetch in background
        queryClient.prefetchQuery({
            queryKey: ['product', productId],
            queryFn: () => productApi.getProduct(productId),
            staleTime: Infinity, // FOREVER - WebSocket handles invalidation
        });
    }, [queryClient]);

    return prefetch;
}

/**
 * Hook to get a single product (with prefetch-aware caching)
 * Cache FOREVER - WebSocket DATA_UPDATE is the ONLY trigger for refetch
 */
import { useQuery } from '@tanstack/react-query';
import type { Product } from '@/lib/types/product';

export function useProductDetail(id: string | undefined) {
    return useQuery<Product>({
        queryKey: ['product', id],
        queryFn: () => productApi.getProduct(id!),
        enabled: !!id,
        staleTime: Infinity, // FOREVER - only WebSocket invalidation triggers refetch
        gcTime: 1000 * 60 * 60, // 1 hour garbage collection
        refetchOnWindowFocus: false,
        refetchOnMount: true, // Refetch if invalidated
    });
}
