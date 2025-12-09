import { useQuery } from '@tanstack/react-query';
import adminApi, {
    DashboardSummary,
    SalesTrendsResponse,
    TopProduct,
    RecentOrder,
    OrderStatusBreakdown,
    InventoryStatus,
    LowStockItem
} from '../api/admin';

// Dashboard Summary Hook
export function useAdminSummary() {
    return useQuery<DashboardSummary>({
        queryKey: ['admin', 'dashboard', 'summary'],
        queryFn: adminApi.getSummary,
        staleTime: 0,
        refetchInterval: 1000 * 60 * 5 // 5 minutes
    });
}

// Sales Trends Hook - returns full response with daily array
export function useSalesTrends(days: number = 30) {
    return useQuery<SalesTrendsResponse>({
        queryKey: ['admin', 'dashboard', 'sales-trends', days],
        queryFn: () => adminApi.getSalesTrends(days),
        staleTime: 0
    });
}

// Top Products Hook
export function useTopProducts(limit: number = 5) {
    return useQuery<TopProduct[]>({
        queryKey: ['admin', 'dashboard', 'top-products', limit],
        queryFn: () => adminApi.getTopProducts(limit),
        staleTime: 0
    });
}

// Recent Orders Hook
export function useRecentOrders(limit: number = 10) {
    return useQuery<RecentOrder[]>({
        queryKey: ['admin', 'dashboard', 'recent-orders', limit],
        queryFn: () => adminApi.getRecentOrders(limit),
        staleTime: 0
    });
}

// Order Status Breakdown Hook - returns object keyed by status
export function useOrderStatusBreakdown() {
    return useQuery<OrderStatusBreakdown>({
        queryKey: ['admin', 'dashboard', 'order-status-breakdown'],
        queryFn: adminApi.getOrderStatusBreakdown,
        staleTime: 0
    });
}

// Inventory Status Hook
export function useInventoryStatus() {
    return useQuery<InventoryStatus>({
        queryKey: ['admin', 'dashboard', 'inventory-status'],
        queryFn: adminApi.getInventoryStatus,
        staleTime: 0
    });
}

// Low Stock Alerts Hook
export function useLowStockAlerts() {
    return useQuery<LowStockItem[]>({
        queryKey: ['admin', 'dashboard', 'low-stock'],
        queryFn: adminApi.getLowStockAlerts,
        staleTime: 0
    });
}

// Revenue by Category Hook
export function useRevenueByCategory() {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'revenue-by-category'],
        queryFn: adminApi.getRevenueByCategory,
        staleTime: 0
    });
}

// Customer Analytics Hook
export function useCustomerAnalytics() {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'customer-analytics'],
        queryFn: adminApi.getCustomerAnalytics,
        staleTime: 0
    });
}

// Cart Abandonment Hook
export function useCartAbandonment() {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'cart-abandonment'],
        queryFn: adminApi.getCartAbandonment,
        staleTime: 0
    });
}

// Admin Activity Hook
export function useAdminActivity(page: number = 1) {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'activity', page],
        queryFn: () => adminApi.getAdminActivity(page),
        staleTime: 0
    });
}

// Email Stats Hook
export function useEmailStats() {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'email-stats'],
        queryFn: adminApi.getEmailStats,
        staleTime: 0
    });
}

// Payment Methods Hook
export function usePaymentMethods() {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'payment-methods'],
        queryFn: adminApi.getPaymentMethods,
        staleTime: 0
    });
}

// System Health Hook
export function useSystemHealth(enabled: boolean = true) {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'system-health'],
        queryFn: adminApi.getSystemHealth,
        staleTime: 0,
        refetchInterval: 30000, // Check every 30s
        enabled
    });
}

// Sidebar Stats Hook
export function useSidebarStats(enabled: boolean = true) {
    return useQuery({
        queryKey: ['admin', 'sidebar-stats'],
        queryFn: adminApi.getSidebarStats,
        staleTime: 0,
        refetchInterval: 1000 * 60, // Refresh every minute
        enabled
    });
}
