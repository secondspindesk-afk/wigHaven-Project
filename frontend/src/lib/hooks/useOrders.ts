import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api/axios';
import { Order } from '@/lib/types';
import { ordersApi, OrderFilters, OrderStatus } from '@/lib/api/orders';

interface OrdersResponse {
    success: boolean;
    data: {
        orders: Order[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    };
}

// ==================== CUSTOMER HOOKS ====================

export function useOrders(params?: { page?: number; status?: string }) {
    return useQuery({
        queryKey: ['orders', params],
        queryFn: async () => {
            const queryParams = new URLSearchParams();
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.status) queryParams.append('status', params.status);

            const response = await api.get<OrdersResponse>(`/orders?${queryParams.toString()}`);
            return response.data;
        },
    });
}

export function useOrder(id: string, options?: { refetchInterval?: number | ((data: any) => number | false); email?: string; enabled?: boolean }) {
    return useQuery({
        queryKey: ['order', id, options?.email],
        queryFn: async () => {
            const queryParams = options?.email ? `?email=${encodeURIComponent(options.email)}` : '';
            const response = await api.get<{ data: { order: Order } }>(`/orders/${id}${queryParams}`);
            return response.data.data.order;
        },
        enabled: (options?.enabled ?? true) && !!id && id !== 'undefined' && id !== 'null',
        refetchInterval: options?.refetchInterval,
    });
}

export function useCancelOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderNumber }: { orderNumber: string }) => {
            const response = await api.post(`/orders/${orderNumber}/cancel`);
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['order', variables.orderNumber] });
        },
        onError: (error: any) => {
            console.error('Failed to cancel order:', error);
        }
    });
}

// ==================== ADMIN HOOKS ====================

/**
 * Get all orders with filters (Admin)
 */
export function useAdminOrders(filters?: OrderFilters) {
    return useQuery({
        queryKey: ['admin', 'orders', filters],
        queryFn: () => ordersApi.getOrders(filters),
        placeholderData: (previousData) => previousData,
        staleTime: 1 * 60 * 1000, // 1 minute - orders need fresher data
        gcTime: 5 * 60 * 1000,
    });
}

/**
 * Get single order by order number (Admin)
 */
export function useAdminOrder(orderNumber: string) {
    return useQuery({
        queryKey: ['admin', 'order', orderNumber],
        queryFn: () => ordersApi.getOrder(orderNumber),
        enabled: !!orderNumber,
    });
}

/**
 * Update single order status
 */
export function useUpdateOrderStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderNumber, status }: { orderNumber: string; status: OrderStatus }) =>
            ordersApi.updateStatus(orderNumber, status),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.orderNumber] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        },
    });
}

/**
 * Bulk update order statuses
 */
export function useBulkUpdateStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderNumbers, status }: { orderNumbers: string[]; status: OrderStatus }) =>
            ordersApi.bulkUpdateStatus(orderNumbers, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        },
    });
}

/**
 * Refund an order
 */
export function useRefundOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (orderNumber: string) => ordersApi.refundOrder(orderNumber),
        onSuccess: (_, orderNumber) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'order', orderNumber] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        },
    });
}

/**
 * Update tracking number
 */
export function useUpdateTracking() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderNumber, trackingNumber, carrier }: { orderNumber: string; trackingNumber: string; carrier: string }) =>
            ordersApi.updateTrackingNumber(orderNumber, trackingNumber, carrier),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.orderNumber] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        },
    });
}

/**
 * Export orders to CSV
 */
export function useExportOrders() {
    return useMutation({
        mutationFn: (filters?: { startDate?: string; endDate?: string; status?: OrderStatus }) =>
            ordersApi.exportOrders(filters),
        onSuccess: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        },
    });
}

/**
 * Manually verify payment (Admin)
 * Supports Paystack verification or force-pay for manual orders
 */
export function useVerifyPayment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orderNumber, force = false }: { orderNumber: string; force?: boolean }) =>
            ordersApi.verifyPayment(orderNumber, force),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'order', variables.orderNumber] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        },
    });
}

