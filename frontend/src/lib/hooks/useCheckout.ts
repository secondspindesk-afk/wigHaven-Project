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

    // Polling function to check payment status
    const waitForPayment = useMutation({
        mutationFn: async (orderNumber: string) => {
            const poll = async (): Promise<any> => {
                const response = await api.get<{ data: { order: any } }>(`/orders/${orderNumber}`);
                const order = response.data.data.order;

                if (order.paymentStatus === 'paid') {
                    return order;
                }

                if (order.paymentStatus === 'failed') {
                    throw new Error('Payment failed');
                }

                // Wait 2 seconds and try again
                await new Promise(resolve => setTimeout(resolve, 2000));
                return poll();
            };

            // Timeout after 60 seconds
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Payment verification timed out')), 60000)
            );

            return Promise.race([poll(), timeout]);
        },
        onSuccess: () => {
            showToast('Payment successful! Order placed.', 'success');
        },
        onError: (error: any) => {
            showToast(error.message || 'Payment verification failed', 'error');
        },
    });

    const validateCart = useQuery({
        queryKey: ['cart-validation'],
        queryFn: async () => {
            // Backend expects POST for validation
            const response = await api.post('/cart/validate-checkout');
            return response.data;
        },
        retry: false,
    });

    return {
        createOrder,
        waitForPayment,
        validateCart,
    };
}
