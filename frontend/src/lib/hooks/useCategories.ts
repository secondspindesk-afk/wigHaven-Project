import { useQuery } from '@tanstack/react-query';
import productApi from '@/lib/api/product';

/**
 * Hook to fetch all categories (PUBLIC - for storefront)
 * Categories almost never change - very aggressive caching
 */
export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: productApi.getCategories,
        staleTime: 60 * 60 * 1000, // 1 hour - categories are nearly static
        gcTime: 2 * 60 * 60 * 1000, // 2 hours garbage collection
        refetchOnWindowFocus: false,
    });
}
