import { useQuery } from '@tanstack/react-query';
import adminApi, {
    DashboardSummary,
    SalesTrendsResponse,
    TopProduct,
    RecentOrder,
    OrderStatusBreakdown,
    InventoryStatus,
    LowStockItem,
    CacheStats
} from '../api/admin';

// ============================================
// CACHE CONFIGURATION
// ============================================
// WebSocket DATA_UPDATE messages handle real-time invalidation,
// so we can use longer staleTime and disable refetch on mount
const ADMIN_CACHE_CONFIG = {
    staleTime: 5 * 60 * 1000,     // 5 minutes - data is fresh
    gcTime: 30 * 60 * 1000,       // 30 minutes - keep in memory
    refetchOnWindowFocus: true,   // Refresh on tab switch (admins expect this)
    refetchOnMount: false,        // Don't refetch on every mount - WebSocket handles updates
};

// Dashboard Summary Hook
export function useAdminSummary() {
    return useQuery<DashboardSummary>({
        queryKey: ['admin', 'dashboard', 'summary'],
        queryFn: adminApi.getSummary,
        ...ADMIN_CACHE_CONFIG,
    });
}

// Sales Trends Hook - returns full response with daily array
export function useSalesTrends(days: number = 30) {
    return useQuery<SalesTrendsResponse>({
        queryKey: ['admin', 'dashboard', 'sales-trends', days],
        queryFn: () => adminApi.getSalesTrends(days),
        ...ADMIN_CACHE_CONFIG,
    });
}

// Top Products Hook
export function useTopProducts(limit: number = 5) {
    return useQuery<TopProduct[]>({
        queryKey: ['admin', 'dashboard', 'top-products', limit],
        queryFn: () => adminApi.getTopProducts(limit),
        ...ADMIN_CACHE_CONFIG,
    });
}

// Recent Orders Hook
export function useRecentOrders(limit: number = 10) {
    return useQuery<RecentOrder[]>({
        queryKey: ['admin', 'dashboard', 'recent-orders', limit],
        queryFn: () => adminApi.getRecentOrders(limit),
        ...ADMIN_CACHE_CONFIG,
    });
}

// Order Status Breakdown Hook - returns object keyed by status
export function useOrderStatusBreakdown() {
    return useQuery<OrderStatusBreakdown>({
        queryKey: ['admin', 'dashboard', 'order-status-breakdown'],
        queryFn: adminApi.getOrderStatusBreakdown,
        ...ADMIN_CACHE_CONFIG,
    });
}

// Inventory Status Hook
export function useInventoryStatus() {
    return useQuery<InventoryStatus>({
        queryKey: ['admin', 'dashboard', 'inventory-status'],
        queryFn: adminApi.getInventoryStatus,
        ...ADMIN_CACHE_CONFIG,
    });
}

// Low Stock Alerts Hook
export function useLowStockAlerts() {
    return useQuery<LowStockItem[]>({
        queryKey: ['admin', 'dashboard', 'low-stock'],
        queryFn: adminApi.getLowStockAlerts,
        ...ADMIN_CACHE_CONFIG,
    });
}

// Revenue by Category Hook
export function useRevenueByCategory() {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'revenue-by-category'],
        queryFn: adminApi.getRevenueByCategory,
        ...ADMIN_CACHE_CONFIG,
    });
}

// Customer Analytics Hook
export function useCustomerAnalytics() {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'customer-analytics'],
        queryFn: adminApi.getCustomerAnalytics,
        ...ADMIN_CACHE_CONFIG,
    });
}

// Cart Abandonment Hook
export function useCartAbandonment() {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'cart-abandonment'],
        queryFn: adminApi.getCartAbandonment,
        ...ADMIN_CACHE_CONFIG,
    });
}

// Admin Activity Hook
export function useAdminActivity(page: number = 1) {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'activity', page],
        queryFn: () => adminApi.getAdminActivity(page),
        ...ADMIN_CACHE_CONFIG,
    });
}

// Email Stats Hook
export function useEmailStats() {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'email-stats'],
        queryFn: adminApi.getEmailStats,
        ...ADMIN_CACHE_CONFIG,
    });
}

// Payment Methods Hook
export function usePaymentMethods() {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'payment-methods'],
        queryFn: adminApi.getPaymentMethods,
        ...ADMIN_CACHE_CONFIG,
    });
}

// System Health Hook - NO POLLING, use manual refresh or WebSocket
// The keep-alive cron job handles database connection maintenance
export function useSystemHealth(enabled: boolean = true) {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'system-health'],
        queryFn: adminApi.getSystemHealth,
        staleTime: 5 * 60 * 1000,       // 5 minutes
        gcTime: 10 * 60 * 1000,          // 10 minutes
        refetchOnWindowFocus: true,     // Refresh on tab focus is enough
        refetchOnMount: false,          // Don't refetch on every mount
        enabled
    });
}

// Sidebar Stats Hook
export function useSidebarStats(enabled: boolean = true) {
    return useQuery({
        queryKey: ['admin', 'sidebar-stats'],
        queryFn: adminApi.getSidebarStats,
        ...ADMIN_CACHE_CONFIG,
        enabled
    });
}

// Cache Stats Hook (for monitoring server-side cache performance)
export function useCacheStats(enabled: boolean = true) {
    return useQuery<CacheStats>({
        queryKey: ['admin', 'dashboard', 'cache-stats'],
        queryFn: adminApi.getCacheStats,
        ...ADMIN_CACHE_CONFIG,
        enabled
    });
}
