import { useQuery } from '@tanstack/react-query';
import cartService from '@/lib/api/cart';

/**
 * Hook to fetch current cart
 * Cart is cached for 2 minutes (frequently updated)
 */
export function useCart() {
    return useQuery({
        queryKey: ['cart'],
        queryFn: cartService.getCart,
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
    });
}
