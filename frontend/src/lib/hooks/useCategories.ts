import { useQuery } from '@tanstack/react-query';
import productApi from '@/lib/api/product';

/**
 * Hook to fetch all categories (PUBLIC - for storefront)
 * Categories are cached for 30 minutes (almost static)
 */
export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: productApi.getCategories,
        staleTime: 30 * 60 * 1000, // 30 minutes
        gcTime: 60 * 60 * 1000, // 1 hour
    });
}
