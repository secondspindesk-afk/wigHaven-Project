import { useQuery } from '@tanstack/react-query';
import productApi from '@/lib/api/product';

/**
 * Hook to fetch all categories (PUBLIC - for storefront)
 * Cache FOREVER - WebSocket DATA_UPDATE is the ONLY trigger for refetch
 * This creates a real-time system without polling overhead
 */
export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: productApi.getCategories,
        staleTime: 10 * 60 * 1000, // 10 minute safety window
        gcTime: 2 * 60 * 60 * 1000, // 2 hours garbage collection
        refetchOnWindowFocus: false,
        refetchOnMount: true, // Refetch if invalidated
    });
}
