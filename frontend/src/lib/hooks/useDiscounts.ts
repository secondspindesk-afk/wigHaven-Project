import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import discountApi from '../api/discounts';

// Get All Discounts Hook
export function useDiscounts() {
    return useQuery({
        queryKey: ['admin', 'discounts'],
        queryFn: discountApi.getAllDiscounts,
        staleTime: 5 * 60 * 1000, // 5 minutes - WebSocket handles updates
        gcTime: 10 * 60 * 1000,
    });
}

// Create Discount Mutation
export function useCreateDiscount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: discountApi.createDiscount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'discounts'] });
        }
    });
}

// Get Single Discount Hook
export function useDiscount(id: string | undefined) {
    return useQuery({
        queryKey: ['admin', 'discounts', id],
        queryFn: () => discountApi.getDiscount(id!),
        enabled: !!id,
        staleTime: 1 * 60 * 1000, // 1 minute
    });
}

// Update Discount Mutation
export function useUpdateDiscount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => discountApi.updateDiscount(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'discounts'] });
        }
    });
}

// Delete Discount Mutation
export function useDeleteDiscount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: discountApi.deleteDiscount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'discounts'] });
        }
    });
}
