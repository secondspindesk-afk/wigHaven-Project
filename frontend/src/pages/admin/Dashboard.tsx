import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Clock, Package, TrendingUp, TrendingDown, AlertTriangle, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import {
    useAdminSummary,
    useSalesTrends,
    useTopProducts,
    useRecentOrders,
    useOrderStatusBreakdown,
    useInventoryStatus,
    useLowStockAlerts,
    useCacheStats,
    useAdminActivity
} from '@/lib/hooks/useAdminDashboard';
import SalesChart from '@/components/admin/SalesChart';
import OrderStatusChart from '@/components/admin/OrderStatusChart';
import InventoryChart from '@/components/admin/InventoryChart';

// ==================== STATUS BADGE ====================
interface StatusBadgeProps {
    status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
    const statusLower = status.toLowerCase();

    const getStyles = () => {
        switch (statusLower) {
            case 'delivered':
            case 'completed':
            case 'paid':
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'processing':
            case 'pending':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'shipped':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'cancelled':
            case 'failed':
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            default:
                return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
        }
    };

    return (
        <span className={`inline-flex items-center px-2 py-1 text-[9px] font-bold uppercase tracking-wider border rounded ${getStyles()}`}>
            {status}
        </span>
    );
}

// ==================== ACTIVITY FEED ====================
function ActivityFeed({ isMobile }: { isMobile: boolean }) {
    const { data, isLoading } = useAdminActivity(1);
    const activities = data?.activities || [];

    if (isLoading) {
        return <div className="text-center py-8 text-zinc-500 text-xs font-mono">LOADING...</div>;
    }

    if (activities.length === 0) {
        return <div className="text-center py-8 text-zinc-500 text-xs font-mono">NO ACTIVITY</div>;
    }

    return (
        <div className="space-y-3">
            {activities.slice(0, isMobile ? 3 : 5).map((activity) => (
                <div key={activity.id} className={`flex items-start gap-3 ${isMobile ? 'p-2 bg-zinc-900/30 rounded-lg' : ''}`}>
                    <div className={`${isMobile ? 'w-8 h-8' : 'w-8 h-8'} bg-zinc-800 rounded-full flex items-center justify-center shrink-0`}>
                        <span className="text-[10px] font-bold text-zinc-400 font-mono">
                            {activity.adminName.charAt(0)}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-zinc-300 leading-relaxed`}>
                            <span className="text-white font-medium">{activity.adminName}</span>
                            {' '}{activity.action}{' '}
                            <span className="text-white font-medium">{activity.target}</span>
                        </p>
                        <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                            {new Date(activity.timestamp).toLocaleString()}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ==================== MOBILE ORDER CARD ====================
interface OrderCardProps {
    order: {
        order_number: string;
        customer: string;
        created_at: string;
        status: string;
        total: number;
    };
    formatCurrency: (amount: number) => string;
}

function MobileOrderCard({ order, formatCurrency }: OrderCardProps) {
    return (
        <Link
            to={`/admin/orders/${order.order_number}`}
            className="block p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 active:bg-zinc-800"
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <p className="text-sm font-mono text-white">#{order.order_number}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{order.customer}</p>
                </div>
                <StatusBadge status={order.status} />
            </div>
            <div className="flex justify-between items-center">
                <p className="text-[10px] text-zinc-500 font-mono">
                    {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                </p>
                <p className="text-sm font-mono text-white">{formatCurrency(order.total)}</p>
            </div>
        </Link>
    );
}

// ==================== MOBILE TOP PRODUCT CARD ====================
interface ProductCardProps {
    product: {
        product_id: string;
        product_name: string;
        units_sold: number;
        revenue: number;
    };
    rank: number;
    formatCurrency: (amount: number) => string;
}

function MobileProductCard({ product, rank, formatCurrency }: ProductCardProps) {
    return (
        <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
                <span className="text-xs font-mono text-zinc-400">{String(rank).padStart(2, '0')}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium truncate">{product.product_name}</p>
                <p className="text-[10px] text-zinc-500 font-mono">{product.units_sold} sold</p>
            </div>
            <p className="text-xs font-mono text-emerald-400">{formatCurrency(product.revenue)}</p>
        </div>
    );
}

// ==================== MAIN DASHBOARD ====================
export default function AdminDashboard() {
    const [trendDays, setTrendDays] = useState<7 | 30 | 90>(30);
    const isMobile = useIsMobile();

    const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useAdminSummary();
    const { data: salesTrends, isLoading: trendsLoading } = useSalesTrends(trendDays);
    const { data: topProducts, isLoading: productsLoading } = useTopProducts(5);
    const { data: recentOrders, isLoading: ordersLoading } = useRecentOrders(10);
    const { data: orderStatus, isLoading: statusLoading } = useOrderStatusBreakdown();
    const { data: inventoryStatus, isLoading: inventoryLoading } = useInventoryStatus();
    const { data: lowStock, isLoading: lowStockLoading } = useLowStockAlerts();
    const { data: cacheStats, isLoading: cacheLoading } = useCacheStats();

    const formatCurrency = (amount: number) => `GHS ${(amount || 0).toLocaleString()}`;
    const safeArray = <T,>(data: T[] | undefined | null): T[] => Array.isArray(data) ? data : [];

    // Transform data
    const orderStatusArray = orderStatus
        ? Object.entries(orderStatus).map(([status, data]) => ({
            status,
            count: data.count,
            percentage: data.percent
        }))
        : [];

    const inventoryChartData = inventoryStatus ? {
        inStock: inventoryStatus.in_stock?.count || 0,
        lowStock: inventoryStatus.low_stock?.count || 0,
        outOfStock: inventoryStatus.out_of_stock?.count || 0,
    } : undefined;

    const salesChartData = salesTrends?.daily || [];

    // ==================== MOBILE LAYOUT ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                {/* Mobile Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg text-white font-semibold">Dashboard</h1>
                        <p className="text-[10px] text-zinc-500 font-mono">Overview</p>
                    </div>
                    <button
                        onClick={() => refetchSummary()}
                        className="p-2.5 bg-zinc-800 rounded-lg text-zinc-400 active:bg-zinc-700"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                {/* Mobile Stats Grid - 2x2 */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Revenue */}
                    <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] text-zinc-500 uppercase font-medium">Revenue</span>
                            {summary?.change?.revenue_percent !== undefined && (
                                <span className={`text-[9px] font-mono flex items-center gap-0.5 ${summary.change.revenue_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {summary.change.revenue_percent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                    {Math.abs(summary.change.revenue_percent).toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <p className="text-xl text-white font-mono font-semibold">
                            {summaryLoading ? '---' : (summary?.today?.revenue || 0).toLocaleString()}
                        </p>
                        <p className="text-[9px] text-zinc-600 font-mono">GHS / TODAY</p>
                    </div>

                    {/* Orders */}
                    <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                        <div className="flex items-center gap-2 mb-2">
                            <Package size={14} className="text-zinc-500" />
                            <span className="text-[10px] text-zinc-500 uppercase font-medium">Orders</span>
                        </div>
                        <p className="text-xl text-white font-mono font-semibold">
                            {summaryLoading ? '--' : String(summary?.today?.orders || 0).padStart(2, '0')}
                        </p>
                        <p className="text-[9px] text-zinc-600 font-mono">TODAY</p>
                    </div>

                    {/* Pending */}
                    <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={14} className="text-yellow-500" />
                            <span className="text-[10px] text-zinc-500 uppercase font-medium">Pending</span>
                        </div>
                        <p className="text-xl text-yellow-500 font-mono font-semibold">
                            {summaryLoading ? '--' : String(summary?.stats?.pending_orders || 0).padStart(2, '0')}
                        </p>
                        <p className="text-[9px] text-zinc-600 font-mono">ACTION REQ</p>
                    </div>

                    {/* Low Stock */}
                    <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={14} className="text-red-500" />
                            <span className="text-[10px] text-zinc-500 uppercase font-medium">Low Stock</span>
                        </div>
                        <p className="text-xl text-red-500 font-mono font-semibold">
                            {lowStockLoading ? '--' : String(safeArray(lowStock).length).padStart(2, '0')}
                        </p>
                        <p className="text-[9px] text-zinc-600 font-mono">ITEMS</p>
                    </div>
                </div>

                {/* Sales Chart */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    <SalesChart
                        data={salesChartData}
                        isLoading={trendsLoading}
                        range={trendDays}
                        onRangeChange={setTrendDays}
                    />
                </div>

                {/* Pie Charts Row - Horizontal scroll */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                    <div className="flex-shrink-0 w-[70vw] bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                        <OrderStatusChart
                            data={orderStatusArray}
                            isLoading={statusLoading}
                        />
                    </div>
                    <div className="flex-shrink-0 w-[70vw] bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                        <InventoryChart
                            data={inventoryChartData}
                            isLoading={inventoryLoading}
                        />
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-zinc-800/50 -mx-4" />

                {/* Recent Orders - Cards */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-white">Recent Orders</h3>
                        <Link to="/admin/orders" className="text-[10px] text-zinc-400 flex items-center gap-1">
                            View All <ChevronRight size={12} />
                        </Link>
                    </div>
                    <div className="p-3 space-y-2">
                        {ordersLoading ? (
                            [...Array(3)].map((_, i) => (
                                <div key={i} className="h-20 bg-zinc-800/50 rounded-xl animate-pulse" />
                            ))
                        ) : safeArray(recentOrders).length === 0 ? (
                            <p className="text-center text-zinc-500 font-mono text-xs py-8">No orders yet</p>
                        ) : (
                            safeArray(recentOrders).slice(0, 5).map((order) => (
                                <MobileOrderCard key={order.order_number} order={order} formatCurrency={formatCurrency} />
                            ))
                        )}
                    </div>
                </div>

                {/* Top Products - Cards */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-white">Top Products</h3>
                        <Link to="/admin/products" className="text-[10px] text-zinc-400 flex items-center gap-1">
                            View All <ChevronRight size={12} />
                        </Link>
                    </div>
                    <div className="p-3 space-y-2">
                        {productsLoading ? (
                            [...Array(3)].map((_, i) => (
                                <div key={i} className="h-14 bg-zinc-800/50 rounded-xl animate-pulse" />
                            ))
                        ) : safeArray(topProducts).length === 0 ? (
                            <p className="text-center text-zinc-500 font-mono text-xs py-8">No products yet</p>
                        ) : (
                            safeArray(topProducts).slice(0, 5).map((product, idx) => (
                                <MobileProductCard key={product.product_id} product={product} rank={idx + 1} formatCurrency={formatCurrency} />
                            ))
                        )}
                    </div>
                </div>

                {/* Low Stock Alert */}
                {!lowStockLoading && safeArray(lowStock).length > 0 && (
                    <div className="bg-red-950/30 border border-red-900/30 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 animate-pulse rounded-full" />
                                <h3 className="text-sm font-semibold text-red-400">
                                    Low Stock ({safeArray(lowStock).length})
                                </h3>
                            </div>
                            <Link to="/admin/inventory" className="text-[10px] text-red-400 flex items-center gap-1">
                                Resolve <ChevronRight size={12} />
                            </Link>
                        </div>
                        <div className="space-y-2">
                            {safeArray(lowStock).slice(0, 3).map((item) => (
                                <div key={item.id} className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-zinc-300 truncate">{item.product_name}</p>
                                        <p className="text-[10px] text-zinc-600 font-mono">SKU: {item.sku}</p>
                                    </div>
                                    <span className="font-mono text-sm text-red-500 ml-3">
                                        {item.stock} left
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Activity Feed */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-white">Activity</h3>
                        <Link to="/admin/settings" className="text-[10px] text-zinc-400 flex items-center gap-1">
                            View All <ChevronRight size={12} />
                        </Link>
                    </div>
                    <div className="p-4">
                        <ActivityFeed isMobile={true} />
                    </div>
                </div>
            </div>
        );
    }

    // ==================== DESKTOP LAYOUT ====================
    const now = new Date();
    const syncTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Overview</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">LAST SYNC: {syncTime}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => refetchSummary()}
                        className="px-4 py-2 border border-[#27272a] bg-[#0A0A0A] text-zinc-400 hover:text-white hover:border-zinc-500 text-[10px] font-mono uppercase transition-all flex items-center gap-2"
                    >
                        <RefreshCw size={12} />
                        Refresh
                    </button>
                    <button className="px-4 py-2 bg-white text-black border border-white hover:bg-zinc-200 text-[10px] font-bold font-mono uppercase transition-all">
                        Export_Data
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Revenue */}
                <div className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Revenue</span>
                        {summary?.change?.revenue_percent !== undefined && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 border ${summary.change.revenue_percent >= 0
                                ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                                : 'text-red-500 bg-red-500/10 border-red-500/20'
                                }`}>
                                {summary.change.revenue_percent >= 0 ? '+' : ''}{summary.change.revenue_percent.toFixed(1)}%
                            </span>
                        )}
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm text-zinc-500 font-mono">GHS</span>
                        <span className="text-2xl text-white font-mono font-medium">
                            {summaryLoading ? '---' : (summary?.today?.revenue || 0).toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Daily Orders */}
                <div className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Daily Orders</span>
                        <Package size={16} className="text-zinc-600 group-hover:text-white transition-colors" strokeWidth={1.5} />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl text-white font-mono font-medium">
                            {summaryLoading ? '--' : String(summary?.today?.orders || 0).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono">/ TODAY</span>
                    </div>
                </div>

                {/* Pending */}
                <div className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Pending</span>
                        <Clock size={16} className="text-zinc-600 group-hover:text-white transition-colors" strokeWidth={1.5} />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl text-white font-mono font-medium">
                            {summaryLoading ? '--' : String(summary?.stats?.pending_orders || 0).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono">REQ_ACTION</span>
                    </div>
                </div>

                {/* Low Stock */}
                <div className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Low Stock</span>
                        {safeArray(lowStock).length > 0 && (
                            <span className="text-[10px] font-mono text-red-500 bg-red-500/10 px-1.5 py-0.5 border border-red-500/20">ALERT</span>
                        )}
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl text-white font-mono font-medium">
                            {lowStockLoading ? '--' : String(safeArray(lowStock).length).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] text-zinc-600 font-mono">ITEMS</span>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <SalesChart
                        data={salesChartData}
                        isLoading={trendsLoading}
                        range={trendDays}
                        onRangeChange={setTrendDays}
                    />
                </div>
                <OrderStatusChart
                    data={orderStatusArray}
                    isLoading={statusLoading}
                />
            </div>

            {/* Second Row - Inventory + Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <InventoryChart
                    data={inventoryChartData}
                    isLoading={inventoryLoading}
                />

                {/* Top Products */}
                <div className="lg:col-span-2 border border-[#27272a] bg-[#0A0A0A]">
                    <div className="px-6 py-4 border-b border-[#27272a] flex justify-between items-center">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Top Products</h3>
                        <Link to="/admin/products" className="text-[10px] font-mono text-zinc-500 hover:text-white transition-colors">
                            VIEW_ALL -&gt;
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#0f0f0f] border-b border-[#27272a]">
                                    <th className="px-6 py-3 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">#</th>
                                    <th className="px-6 py-3 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Product</th>
                                    <th className="px-6 py-3 text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-right">Units</th>
                                    <th className="px-6 py-3 text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#27272a]">
                                {productsLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-3 w-4 bg-zinc-800" /></td>
                                            <td className="px-6 py-4"><div className="h-3 w-32 bg-zinc-800" /></td>
                                            <td className="px-6 py-4 text-right"><div className="h-3 w-8 bg-zinc-800 ml-auto" /></td>
                                            <td className="px-6 py-4 text-right"><div className="h-3 w-16 bg-zinc-800 ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : safeArray(topProducts).length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-zinc-600 font-mono text-xs uppercase">No product data</td>
                                    </tr>
                                ) : (
                                    safeArray(topProducts).slice(0, 5).map((product, idx) => (
                                        <tr key={product.product_id} className="group hover:bg-zinc-900/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-zinc-500">{String(idx + 1).padStart(2, '0')}</td>
                                            <td className="px-6 py-4 text-xs text-zinc-300">{product.product_name}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-white text-right">{product.units_sold}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-white text-right">{formatCurrency(product.revenue)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Recent Orders Table */}
            <div className="border border-[#27272a] bg-[#0A0A0A]">
                <div className="px-6 py-4 border-b border-[#27272a] flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Incoming Transmission (Orders)</h3>
                    <Link to="/admin/orders" className="text-[10px] font-mono text-zinc-500 hover:text-white transition-colors">
                        VIEW_ALL_LOGS -&gt;
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0f0f0f] border-b border-[#27272a]">
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Order ID</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Customer</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Timestamp</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272a]">
                            {ordersLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-3 w-32 bg-zinc-800" /></td>
                                        <td className="px-6 py-4"><div className="h-3 w-24 bg-zinc-800" /></td>
                                        <td className="px-6 py-4"><div className="h-3 w-20 bg-zinc-800" /></td>
                                        <td className="px-6 py-4"><div className="h-5 w-20 bg-zinc-800" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-3 w-20 bg-zinc-800 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : safeArray(recentOrders).length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-600 font-mono text-xs uppercase">No orders yet</td>
                                </tr>
                            ) : (
                                safeArray(recentOrders).slice(0, 5).map((order) => (
                                    <tr key={order.order_number} className="group hover:bg-zinc-900/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-white">#{order.order_number}</td>
                                        <td className="px-6 py-4 text-xs text-zinc-300">{order.customer}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                                            {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()} {new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                                        <td className="px-6 py-4 font-mono text-xs text-white text-right">{formatCurrency(order.total)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Low Stock Alert */}
            {!lowStockLoading && safeArray(lowStock).length > 0 && (
                <div className="border border-red-900/30 bg-red-900/5 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 animate-pulse rounded-full" />
                            <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest">
                                Inventory Critical ({safeArray(lowStock).length} Items)
                            </h3>
                        </div>
                        <Link
                            to="/admin/inventory"
                            className="text-[9px] font-bold uppercase text-red-400 hover:text-white border border-red-900 hover:border-red-500 px-3 py-1 transition-colors"
                        >
                            Resolve All
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {safeArray(lowStock).slice(0, 3).map((item) => (
                            <div key={item.id} className="bg-[#050505] border border-red-900/20 p-3 flex justify-between items-center">
                                <div className="min-w-0 flex-1 mr-4">
                                    <p className="text-[10px] text-zinc-300 font-medium truncate">{item.product_name}</p>
                                    <p className="text-[9px] text-zinc-600 font-mono truncate">SKU: {item.sku}</p>
                                </div>
                                <span className="font-mono text-xs text-red-500 flex-shrink-0">
                                    {String(item.stock).padStart(2, '0')} LEFT
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Admin Activity Feed */}
            <div className="border border-[#27272a] bg-[#0A0A0A]">
                <div className="px-6 py-4 border-b border-[#27272a] flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">System Logs (Admin Activity)</h3>
                    <Link to="/admin/settings" className="text-[10px] font-mono text-zinc-500 hover:text-white transition-colors">
                        VIEW_ALL -&gt;
                    </Link>
                </div>
                <div className="p-6">
                    <ActivityFeed isMobile={false} />
                </div>
            </div>

            {/* Cache Stats */}
            <div className="border border-[#27272a] bg-[#0A0A0A]">
                <div className="px-6 py-4 border-b border-[#27272a] flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Server Cache Statistics</h3>
                    <span className="text-[9px] font-mono text-zinc-600 uppercase">Analytics Cache</span>
                </div>
                <div className="p-6">
                    {cacheLoading ? (
                        <div className="animate-pulse flex gap-4">
                            <div className="h-12 w-24 bg-zinc-800" />
                            <div className="h-12 w-24 bg-zinc-800" />
                            <div className="h-12 w-24 bg-zinc-800" />
                        </div>
                    ) : cacheStats ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Cache Hits</p>
                                <p className="text-xl text-emerald-400 font-mono font-medium">{(cacheStats.hits || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Cache Misses</p>
                                <p className="text-xl text-amber-400 font-mono font-medium">{(cacheStats.misses || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Cached Keys</p>
                                <p className="text-xl text-white font-mono font-medium">{(cacheStats.keys || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Hit Rate</p>
                                <p className="text-xl text-white font-mono font-medium">
                                    {cacheStats.hits + cacheStats.misses > 0
                                        ? Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100)
                                        : 0}%
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-500 font-mono">No cache data available</p>
                    )}
                    {cacheStats?.description && (
                        <p className="text-[10px] text-zinc-600 font-mono mt-4">{cacheStats.description}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
