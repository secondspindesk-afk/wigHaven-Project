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
            staleTime: 1000 * 60 * 15, // 15 minutes
        });
    }, [queryClient]);

    return prefetch;
}

/**
 * Hook to get a single product (with prefetch-aware caching)
 */
import { useQuery } from '@tanstack/react-query';
import type { Product } from '@/lib/types/product';

export function useProductDetail(id: string | undefined) {
    return useQuery<Product>({
        queryKey: ['product', id],
        queryFn: () => productApi.getProduct(id!),
        enabled: !!id,
        staleTime: 1000 * 60 * 15, // 15 minutes - same as prefetch
        gcTime: 1000 * 60 * 30, // 30 minutes
        refetchOnWindowFocus: false,
    });
}
