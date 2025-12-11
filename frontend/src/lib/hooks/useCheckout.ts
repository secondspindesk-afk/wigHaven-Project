import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api/axios';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/utils/errorUtils';

interface CreateOrderData {
    shipping_address: {
        name: string;
        address: string;
        city: string;
        state: string;
        zip_code: string;
        country: string;
        phone: string;
    };
    customer_email: string;
    customer_phone: string;
    notes?: string;
}

interface OrderResponse {
    order_number: string;
    customer_email: string;
    total: number;
    paymentStatus: string;
    // Add other fields as needed
}

export function useCheckout() {
    const { showToast } = useToast();

    const createOrder = useMutation({
        mutationFn: async (data: CreateOrderData) => {
            const response = await api.post<{ data: { order: OrderResponse; payment: any } }>('/orders', data);
            return response.data.data;
        },
        onError: (error: any) => {
            showToast(getErrorMessage(error, 'Failed to create order'), 'error');
        },
    });

    // Polling function to check payment status with proper abort mechanism
    const waitForPayment = useMutation({
        mutationFn: async (orderNumber: string) => {
            const MAX_ATTEMPTS = 30; // 30 attempts × 2 seconds = 60 seconds max
            const POLL_INTERVAL_MS = 2000;
            let attempts = 0;

            while (attempts < MAX_ATTEMPTS) {
                attempts++;

                const response = await api.get<{ data: { order: any } }>(`/orders/${orderNumber}`);
                const order = response.data.data.order;

                if (order.paymentStatus === 'paid') {
                    return order;
                }

                if (order.paymentStatus === 'failed') {
                    throw new Error('Payment failed');
                }

                // Wait 2 seconds before next attempt (except on last attempt)
                if (attempts < MAX_ATTEMPTS) {
                    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
                }
            }

            // Max attempts reached
            throw new Error('Payment verification timed out. Please check your order history.');
        },
        onSuccess: () => {
            showToast('Payment successful! Order placed.', 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Payment verification failed', 'error');
        },
    });

    // Cart validation - disabled by default since we use LocalStorage-first pattern
    // The server cart may be empty, so we rely on order creation for validation
    const validateCart = useQuery({
        queryKey: ['cart-validation'],
        queryFn: async () => {
            // Backend expects POST for validation
            const response = await api.post('/cart/validate-checkout');
            return response.data;
        },
        enabled: false, // Don't auto-run - LocalStorage cart may not be synced
        retry: false,
    });

    return {
        createOrder,
        waitForPayment,
        validateCart,
    };
}
