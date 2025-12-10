import api from './axios';

// ==================== TYPES ====================
export interface AdminOrder {
    id: string;
    order_number: string;
    customer_email: string;
    customer_phone: string;
    shipping_address: {
        name: string;
        address: string;
        city: string;
        state: string;
        zip_code: string;
        country: string;
        phone: string;
    };
    billing_address?: {
        name: string;
        address: string;
        city: string;
        state: string;
        zip_code: string;
        country: string;
        phone: string;
    };
    items: OrderItem[];
    subtotal: number;
    shipping: number;
    tax: number;
    discount_amount: number;
    coupon_code?: string;
    total: number;
    status: OrderStatus;
    payment_status: PaymentStatus;
    payment_reference?: string;
    tracking_number?: string;
    carrier?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

export interface OrderItem {
    id: string;
    variant_id: string;
    product_name: string;
    sku: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    attributes: {
        color?: string;
        length?: string;
        texture?: string;
        size?: string;
    };
    image?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderFilters {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    search?: string;
}

export interface OrdersResponse {
    orders: AdminOrder[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// Helper to extract data from API response wrapper
function extractData<T>(response: { data: { success: boolean; data: T } | T }): T {
    const outerData = response.data;
    if (outerData && typeof outerData === 'object' && 'success' in outerData && 'data' in outerData) {
        return (outerData as { success: boolean; data: T }).data;
    }
    return outerData as T;
}

// ==================== API FUNCTIONS ====================
export const ordersApi = {
    // Get all orders (Admin)
    getOrders: async (filters?: OrderFilters): Promise<{ orders: AdminOrder[]; pagination: any }> => {
        const params = new URLSearchParams();
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit) params.append('limit', String(filters.limit));
        if (filters?.status) params.append('status', filters.status);
        if (filters?.search) params.append('search', filters.search);

        const response = await api.get(`/admin/orders?${params.toString()}`);
        return {
            orders: response.data.data,
            pagination: response.data.pagination
        };
    },

    // Get single order by order number
    getOrder: async (orderNumber: string): Promise<AdminOrder> => {
        const response = await api.get(`/orders/${orderNumber}`);
        return extractData(response).order;
    },

    // Update order status
    updateStatus: async (orderNumber: string, status: OrderStatus): Promise<AdminOrder> => {
        const response = await api.patch(`/admin/orders/${orderNumber}/status`, { status });
        return extractData(response).order;
    },

    // Bulk update order status
    bulkUpdateStatus: async (orderNumbers: string[], status: OrderStatus): Promise<{
        message: string;
        results: { orderNumber: string; status: string; error: string | null }[];
    }> => {
        const response = await api.patch('/admin/orders/bulk-status', { orderNumbers, status });
        return response.data;
    },

    // Export orders to CSV
    exportOrders: async (filters?: { startDate?: string; endDate?: string; status?: OrderStatus }): Promise<Blob> => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.status) params.append('status', filters.status);

        const response = await api.get(`/admin/orders/export?${params.toString()}`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Refund order
    refundOrder: async (orderNumber: string): Promise<AdminOrder> => {
        const response = await api.post(`/admin/orders/${orderNumber}/refund`);
        return extractData(response).order;
    },

    // Update Tracking Number
    updateTrackingNumber: async (orderNumber: string, trackingNumber: string, carrier: string): Promise<AdminOrder> => {
        const response = await api.patch(`/admin/orders/${orderNumber}/tracking`, { tracking_number: trackingNumber, carrier });
        return extractData(response).order;
    },

    // Manually verify/force payment (Admin)
    verifyPayment: async (orderNumber: string, force: boolean = false): Promise<{
        success: boolean;
        message: string;
        warning?: string;
        error?: string;
    }> => {
        const response = await api.post(`/orders/${orderNumber}/verify-payment`, { force });
        return response.data;
    }
};

export default ordersApi;
