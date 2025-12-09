import api from './axios';

// ==================== TYPES (Matching Backend snake_case) ====================
export interface DashboardSummary {
    today: {
        revenue: number;
        orders: number;
        newCustomers: number;
        pendingOrders: number;
    };
    yesterday: {
        revenue: number;
        orders: number;
        newCustomers: number;
        pendingOrders: number;
    };
    change: {
        revenue_percent: number;
        orders_percent: number;
    };
    stats: {
        total_customers: number;
        total_revenue_all_time: number;
        pending_orders: number;
    };
}

export interface SalesTrend {
    date: string;
    revenue: number;
    orders: number;
}

export interface SalesTrendsResponse {
    range: string;
    daily: SalesTrend[];
    summary: {
        total_revenue: number;
        total_orders: number;
        avg_daily_revenue: number;
    };
}

export interface TopProduct {
    product_id: string;
    product_name: string;
    category: string | null;
    units_sold: number;
    revenue: number;
}

export interface RecentOrder {
    id: string;
    order_number: string;
    customer: string;
    total: number;
    status: string;
    payment_status: string;
    created_at: string;
}

export interface OrderStatusBreakdown {
    [status: string]: {
        count: number;
        percent: number;
    };
}

export interface InventoryStatus {
    total_variants: number;
    total_units: number;
    in_stock: {
        count: number;
        percent: number;
    };
    low_stock: {
        count: number;
        percent: number;
    };
    out_of_stock: {
        count: number;
        percent: number;
    };
}

export interface LowStockItem {
    id: string;
    product_name: string;
    sku: string;
    stock: number;
    threshold: number;
}

export interface RevenueByCategory {
    category: string;
    category_name: string;
    revenue: number;
    orders: number;
    percent: number;
}

export interface CustomerAnalytics {
    new_customers: number;
    total_customers: number;
    repeat_customers: number;
    customer_retention_rate: number;
    average_ltv: number;
}

export interface AdminActivity {
    id: string;
    adminName: string;
    action: string;
    target: string;
    details: string;
    timestamp: string;
}

// Helper to extract data from API response wrapper { success: true, data: ... }
function extractData<T>(response: { data: { success: boolean; data: T } | T }): T {
    const outerData = response.data;
    if (outerData && typeof outerData === 'object' && 'success' in outerData && 'data' in outerData) {
        return (outerData as { success: boolean; data: T }).data;
    }
    return outerData as T;
}

// ==================== API FUNCTIONS ====================
export const adminApi = {
    // Dashboard Summary
    getSummary: async (): Promise<DashboardSummary> => {
        const response = await api.get('/admin/dashboard/summary');
        return extractData(response);
    },

    // Sales Trends - returns { range, daily: [...], summary }
    getSalesTrends: async (days: number = 30): Promise<SalesTrendsResponse> => {
        const response = await api.get(`/admin/dashboard/sales-trends?range=${days}`);
        return extractData(response);
    },

    // Top Products
    getTopProducts: async (limit: number = 5): Promise<TopProduct[]> => {
        const response = await api.get(`/admin/dashboard/top-products?limit=${limit}`);
        console.log('[FRONTEND] Top Products raw response:', response);
        const data = extractData(response);
        console.log('[FRONTEND] Top Products extracted data:', data);
        return data;
    },

    // Recent Orders
    getRecentOrders: async (limit: number = 10): Promise<RecentOrder[]> => {
        const response = await api.get(`/admin/dashboard/recent-orders?limit=${limit}`);
        return extractData(response);
    },

    // Order Status Breakdown - returns { pending: { count, percent }, ... }
    getOrderStatusBreakdown: async (): Promise<OrderStatusBreakdown> => {
        const response = await api.get('/admin/dashboard/order-status-breakdown');
        return extractData(response);
    },

    // Inventory Status
    getInventoryStatus: async (): Promise<InventoryStatus> => {
        const response = await api.get('/admin/dashboard/inventory-status');
        return extractData(response);
    },

    // Low Stock Alerts
    getLowStockAlerts: async (): Promise<LowStockItem[]> => {
        const response = await api.get('/admin/dashboard/low-stock-alerts');
        return extractData(response);
    },

    // Revenue by Category
    getRevenueByCategory: async (): Promise<RevenueByCategory[]> => {
        const response = await api.get('/admin/dashboard/revenue-by-category');
        return extractData(response);
    },

    // Customer Analytics
    getCustomerAnalytics: async (): Promise<CustomerAnalytics> => {
        const response = await api.get('/admin/dashboard/customer-analytics');
        return extractData(response);
    },

    // Cart Abandonment
    getCartAbandonment: async (): Promise<{
        total_carts: number;
        abandoned_carts: number;
        recovered_carts: number;
        abandonment_rate: number;
        recovery_rate: number;
    }> => {
        const response = await api.get('/admin/dashboard/cart-abandonment');
        return extractData(response);
    },

    // Admin Activity
    getAdminActivity: async (page: number = 1): Promise<{ activities: AdminActivity[]; pagination: any }> => {
        const response = await api.get(`/admin/dashboard/admin-activity?page=${page}`);
        return extractData(response);
    },

    // Export Reports
    exportReport: async (type: 'orders' | 'products' | 'customers', range: number = 30): Promise<Blob> => {
        const response = await api.get(`/admin/dashboard/export?type=${type}&range=${range}`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Email Stats
    getEmailStats: async (): Promise<{
        today: { sent: number; failed: number; pending: number; success_rate: number };
        all_time: { sent: number; failed: number; pending: number; success_rate: number };
    }> => {
        const response = await api.get('/admin/dashboard/email-stats');
        return extractData(response);
    },

    // Payment Methods
    getPaymentMethods: async (): Promise<{
        paystack: {
            count: number;
            revenue: number;
            percent: number;
        }
    }> => {
        const response = await api.get('/admin/dashboard/payment-methods');
        return extractData(response);
    },

    // System Health
    getSystemHealth: async (): Promise<{
        database: { status: string; latency_ms: number };
        queue: { active?: number; completed?: number; failed?: number };
        uptime: number;
    }> => {
        const response = await api.get('/admin/dashboard/system-health');
        return extractData(response);
    },

    // Sidebar Stats
    getSidebarStats: async (): Promise<{
        products: number;
        orders: number;
        users: number;
        reviews: number;
        inventory: number;
    }> => {
        const response = await api.get('/admin/dashboard/sidebar-stats');
        return extractData(response);
    },

    // Unified Admin Search
    search: async (query: string, limit: number = 5): Promise<AdminSearchResponse> => {
        const response = await api.get(`/admin/dashboard/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        return extractData(response);
    }
};

// Search Result Types
export interface AdminSearchResult {
    id: string;
    type: 'product' | 'order' | 'user' | 'review' | 'category' | 'discount' | 'banner' | 'support';
    title: string;
    subtitle: string;
    meta?: string;
    image?: string | null;
    status?: string;
    role?: string;
    paymentStatus?: string;
    url: string;
}

export interface AdminSearchResponse {
    query: string;
    results: {
        products: AdminSearchResult[];
        orders: AdminSearchResult[];
        users: AdminSearchResult[];
        reviews: AdminSearchResult[];
        categories: AdminSearchResult[];
        discounts: AdminSearchResult[];
        banners: AdminSearchResult[];
        support: AdminSearchResult[];
    };
    total: number;
    limit: number;
}

export default adminApi;

