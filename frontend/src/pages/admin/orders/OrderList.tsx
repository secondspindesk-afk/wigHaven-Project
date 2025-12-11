import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight,
    Eye, Package, Truck, CheckCircle, XCircle, Clock, AlertCircle,
    LayoutGrid, List as ListIcon, X, ChevronDown
} from 'lucide-react';
import { useAdminOrders, useUpdateOrderStatus, useBulkUpdateStatus, useExportOrders } from '@/lib/hooks/useOrders';
import { OrderStatus } from '@/lib/api/orders';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils/currency';
import OrderKanban from './OrderKanban';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

const STATUS_OPTIONS: { value: OrderStatus | ''; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
];

const STATUS_STYLES: Record<OrderStatus, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', icon: <Clock size={12} /> },
    processing: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: <Package size={12} /> },
    shipped: { bg: 'bg-purple-500/10', text: 'text-purple-500', icon: <Truck size={12} /> },
    delivered: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: <CheckCircle size={12} /> },
    cancelled: { bg: 'bg-red-500/10', text: 'text-red-500', icon: <XCircle size={12} /> },
    refunded: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', icon: <AlertCircle size={12} /> },
};

const PAYMENT_STYLES: Record<string, { bg: string; text: string }> = {
    paid: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
    failed: { bg: 'bg-red-500/10', text: 'text-red-500' },
    refunded: { bg: 'bg-zinc-500/10', text: 'text-zinc-500' },
};

// ==================== MOBILE ORDER CARD ====================
interface MobileOrderCardProps {
    order: any;
    onStatusChange: (orderNumber: string, status: OrderStatus) => void;
    isUpdating: boolean;
}

function MobileOrderCard({ order, onStatusChange, isUpdating }: MobileOrderCardProps) {
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const statusStyle = STATUS_STYLES[order.status as OrderStatus] || STATUS_STYLES.pending;
    const paymentStyle = PAYMENT_STYLES[order.payment_status] || PAYMENT_STYLES.pending;

    const formatDateShort = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        } catch {
            return 'N/A';
        }
    };

    return (
        <Link
            to={`/admin/orders/${order.order_number}`}
            className="block p-4 bg-zinc-900 rounded-xl border border-zinc-800 relative"
        >
            {/* Header Row */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <p className="text-sm font-mono text-white">#{order.order_number}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {formatDateShort(order.created_at)}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    {/* Status Badge - Tappable */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowStatusPicker(true);
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1 ${statusStyle.bg} ${statusStyle.text} rounded text-[10px] font-bold uppercase`}
                    >
                        {statusStyle.icon}
                        {order.status}
                        <ChevronDown size={10} />
                    </button>
                    {/* Payment Badge */}
                    <span className={`px-2 py-0.5 ${paymentStyle.bg} ${paymentStyle.text} rounded text-[9px] font-bold uppercase`}>
                        {order.payment_status}
                    </span>
                </div>
            </div>

            {/* Customer & Total */}
            <div className="flex justify-between items-end">
                <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-300 truncate">
                        {order.shipping_address?.name || 'Guest'}
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono truncate">
                        {order.customer_email}
                    </p>
                </div>
                <div className="text-right ml-4">
                    <p className="text-base font-medium text-white">{formatCurrency(order.total)}</p>
                    {order.discount_amount > 0 && (
                        <p className="text-[9px] text-emerald-400 font-mono">
                            {order.coupon_code || 'Discounted'}
                        </p>
                    )}
                </div>
            </div>

            {/* Status Picker Bottom Sheet */}
            {showStatusPicker && (
                <>
                    <div
                        className="fixed inset-0 bg-black/80 z-50"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowStatusPicker(false);
                        }}
                    />
                    <div
                        className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-4 safe-area-pb"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                        <h3 className="text-sm font-semibold text-white mb-3">Update Status</h3>
                        <div className="space-y-2">
                            {STATUS_OPTIONS.filter(o => o.value).map(opt => {
                                const style = STATUS_STYLES[opt.value as OrderStatus];
                                return (
                                    <button
                                        key={opt.value}
                                        disabled={isUpdating}
                                        onClick={() => {
                                            onStatusChange(order.order_number, opt.value as OrderStatus);
                                            setShowStatusPicker(false);
                                        }}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl ${order.status === opt.value ? 'bg-zinc-800 border border-zinc-600' : 'bg-zinc-800/50 border border-transparent'} active:bg-zinc-700`}
                                    >
                                        <span className={style.text}>{style.icon}</span>
                                        <span className="text-sm text-white">{opt.label}</span>
                                        {order.status === opt.value && (
                                            <CheckCircle size={16} className="ml-auto text-emerald-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </Link>
    );
}

// ==================== MAIN COMPONENT ====================
export default function OrderList() {
    const { showToast } = useToast();
    const isMobile = useIsMobile();

    // Filters
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [showFilters, setShowFilters] = useState(false);
    const limit = 20;

    // Selection
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [bulkAction, setBulkAction] = useState<OrderStatus | ''>('');

    // Export Modal
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFilters, setExportFilters] = useState({
        startDate: '',
        endDate: '',
        status: '' as OrderStatus | ''
    });

    // API
    const { data, isLoading, refetch } = useAdminOrders({
        page,
        limit,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
    });

    const updateStatusMutation = useUpdateOrderStatus();
    const bulkUpdateMutation = useBulkUpdateStatus();
    const exportMutation = useExportOrders();

    const orders = data?.orders || [];
    const pagination = data?.pagination || { page: 1, pages: 1, total: 0, limit: 20 };

    // Selection handlers
    const toggleSelectAll = () => {
        if (selectedOrders.length === orders.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(orders.map(o => o.order_number));
        }
    };

    const toggleSelectOrder = (orderNumber: string) => {
        setSelectedOrders(prev =>
            prev.includes(orderNumber)
                ? prev.filter(n => n !== orderNumber)
                : [...prev, orderNumber]
        );
    };

    // Actions
    const handleStatusUpdate = async (orderNumber: string, status: OrderStatus) => {
        try {
            await updateStatusMutation.mutateAsync({ orderNumber, status });
            showToast(`Order updated to ${status}`, 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to update', 'error');
        }
    };

    const handleBulkUpdate = async () => {
        if (!bulkAction || selectedOrders.length === 0) return;

        try {
            const result = await bulkUpdateMutation.mutateAsync({
                orderNumbers: selectedOrders,
                status: bulkAction
            });
            showToast(result.message, 'success');
            setSelectedOrders([]);
            setBulkAction('');
        } catch (error: any) {
            showToast(error.message || 'Bulk update failed', 'error');
        }
    };

    const confirmExport = async () => {
        try {
            await exportMutation.mutateAsync({
                startDate: exportFilters.startDate || undefined,
                endDate: exportFilters.endDate || undefined,
                status: exportFilters.status || undefined
            });
            showToast('Orders exported', 'success');
            setShowExportModal(false);
        } catch (error: any) {
            showToast('Export failed', 'error');
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid';
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Error';
        }
    };

    // ==================== MOBILE LAYOUT ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                {/* Mobile Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-lg text-white font-semibold">Orders</h1>
                        <p className="text-[10px] text-zinc-500 font-mono">{pagination.total} total</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => refetch()}
                            className="p-2.5 bg-zinc-800 rounded-lg text-zinc-400 active:bg-zinc-700"
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="p-2.5 bg-zinc-800 rounded-lg text-zinc-400 active:bg-zinc-700"
                        >
                            <Download size={18} />
                        </button>
                    </div>
                </div>

                {/* Mobile Search */}
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full h-11 pl-10 pr-12 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                    />
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg ${showFilters || statusFilter ? 'bg-white text-black' : 'text-zinc-500'}`}
                    >
                        <Filter size={16} />
                    </button>
                </div>

                {/* Mobile Filter Pills */}
                {showFilters && (
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                        {STATUS_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => { setStatusFilter(opt.value as OrderStatus | ''); setPage(1); }}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${statusFilter === opt.value
                                    ? 'bg-white text-black'
                                    : 'bg-zinc-800 text-zinc-400'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Divider */}
                <div className="h-px bg-zinc-800/50 -mx-4" />

                {/* Order Cards */}
                <div className="space-y-3">
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="h-28 bg-zinc-900 rounded-xl animate-pulse" />
                        ))
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12">
                            <Package size={40} className="mx-auto text-zinc-700 mb-4" />
                            <p className="text-zinc-500 text-sm">No orders found</p>
                        </div>
                    ) : (
                        orders.map(order => (
                            <MobileOrderCard
                                key={order.id}
                                order={order}
                                onStatusChange={handleStatusUpdate}
                                isUpdating={updateStatusMutation.isPending}
                            />
                        ))
                    )}
                </div>

                {/* Mobile Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-3 bg-zinc-800 text-zinc-400 rounded-xl disabled:opacity-50"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm text-zinc-400">
                            {page} / {pagination.pages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                            className="p-3 bg-zinc-800 text-zinc-400 rounded-xl disabled:opacity-50"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {/* Mobile Export Modal */}
                {showExportModal && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center">
                        <div className="absolute inset-0 bg-black/80" onClick={() => setShowExportModal(false)} />
                        <div className="relative w-full bg-zinc-900 rounded-t-2xl p-5 safe-area-pb">
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                            <h3 className="text-base font-semibold text-white mb-4">Export Orders</h3>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={exportFilters.startDate}
                                        onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
                                        className="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={exportFilters.endDate}
                                        onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                                        className="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                                    />
                                </div>
                            </div>

                            {/* Quick Date Buttons */}
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                                {[
                                    { label: 'Today', days: 0 },
                                    { label: '7 Days', days: 7 },
                                    { label: '30 Days', days: 30 },
                                ].map(({ label, days }) => (
                                    <button
                                        key={label}
                                        onClick={() => {
                                            const end = new Date();
                                            const start = new Date();
                                            start.setDate(end.getDate() - days);
                                            setExportFilters({
                                                ...exportFilters,
                                                startDate: start.toISOString().split('T')[0],
                                                endDate: end.toISOString().split('T')[0]
                                            });
                                        }}
                                        className="flex-shrink-0 px-3 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-xs font-medium active:bg-zinc-700"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    className="flex-1 py-3 bg-zinc-800 text-white rounded-xl text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmExport}
                                    disabled={exportMutation.isPending}
                                    className="flex-1 py-3 bg-white text-black rounded-xl text-sm font-medium"
                                >
                                    {exportMutation.isPending ? 'Exporting...' : 'Download'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ==================== DESKTOP LAYOUT ====================
    return (
        <div className="min-h-screen bg-[#050505] p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Orders</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                        {pagination.total} TOTAL ORDERS
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => refetch()}
                        className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowExportModal(true)}
                        disabled={exportMutation.isPending}
                        className="px-4 py-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 text-[10px] font-bold font-mono uppercase transition-colors flex items-center gap-2"
                    >
                        <Download size={14} />
                        Export CSV
                    </button>
                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            title="List View"
                        >
                            <ListIcon size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-1.5 rounded ${viewMode === 'kanban' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            title="Kanban View"
                        >
                            <LayoutGrid size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[#0A0A0A] border border-[#27272a] p-4 mb-6">
                <div className="flex flex-wrap gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search by order # or email..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full h-9 pl-9 pr-4 bg-[#050505] border border-[#27272a] text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-zinc-600 transition-colors"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value as OrderStatus | ''); setPage(1); }}
                            className="h-9 pl-9 pr-8 bg-[#050505] border border-[#27272a] text-xs text-white font-mono focus:outline-none focus:border-zinc-600 transition-colors appearance-none cursor-pointer"
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedOrders.length > 0 && (
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#27272a]">
                        <span className="text-xs text-zinc-400 font-mono">
                            {selectedOrders.length} selected
                        </span>
                        <select
                            value={bulkAction}
                            onChange={(e) => setBulkAction(e.target.value as OrderStatus | '')}
                            className="h-8 px-3 bg-[#050505] border border-[#27272a] text-xs text-white font-mono focus:outline-none focus:border-zinc-600"
                        >
                            <option value="">Bulk Action...</option>
                            {STATUS_OPTIONS.filter(o => o.value).map(opt => (
                                <option key={opt.value} value={opt.value}>Set to {opt.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleBulkUpdate}
                            disabled={!bulkAction || bulkUpdateMutation.isPending}
                            className="px-4 py-1.5 bg-white text-black text-[10px] font-bold font-mono uppercase disabled:opacity-50 hover:bg-zinc-200 transition-colors"
                        >
                            Apply
                        </button>
                        <button
                            onClick={() => setSelectedOrders([])}
                            className="text-xs text-zinc-500 hover:text-white font-mono"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            {viewMode === 'kanban' ? (
                <OrderKanban orders={orders} isLoading={isLoading} />
            ) : (
                <div className="bg-[#0A0A0A] border border-[#27272a] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#27272a]">
                                    <th className="w-10 px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.length === orders.length && orders.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 bg-[#0A0A0A] border border-[#27272a] rounded-none"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Order</th>
                                    <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Customer</th>
                                    <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Total</th>
                                    <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Payment</th>
                                    <th className="px-4 py-3 text-right text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="border-b border-[#27272a]">
                                            {[...Array(8)].map((_, j) => (
                                                <td key={j} className="px-4 py-4">
                                                    <div className="h-4 bg-zinc-800 rounded animate-pulse" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-zinc-500 text-sm">
                                            No orders found
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => {
                                        const statusStyle = STATUS_STYLES[order.status as OrderStatus] || STATUS_STYLES.pending;
                                        const paymentStyle = PAYMENT_STYLES[order.payment_status] || PAYMENT_STYLES.pending;

                                        return (
                                            <tr
                                                key={order.id}
                                                className="border-b border-[#27272a] hover:bg-zinc-900/50 transition-colors"
                                            >
                                                <td className="px-4 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedOrders.includes(order.order_number)}
                                                        onChange={() => toggleSelectOrder(order.order_number)}
                                                        className="w-4 h-4 bg-[#0A0A0A] border border-[#27272a] rounded-none"
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    {order.order_number ? (
                                                        <Link
                                                            to={`/admin/orders/${order.order_number}`}
                                                            className="text-sm text-white font-mono hover:text-emerald-400 transition-colors"
                                                        >
                                                            {order.order_number}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-sm text-zinc-500 font-mono">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div>
                                                        <p className="text-sm text-white">
                                                            {order.shipping_address?.name || 'Guest'}
                                                        </p>
                                                        <p className="text-[10px] text-zinc-500 font-mono">
                                                            {order.customer_email}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-xs text-zinc-400 font-mono">
                                                    {formatDate(order.created_at)}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-white font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{formatCurrency(order.total)}</span>
                                                        {order.discount_amount > 0 && (
                                                            <span className="text-[9px] text-emerald-400 font-mono uppercase">
                                                                {order.coupon_code ? `Code: ${order.coupon_code}` : 'Discounted'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => handleStatusUpdate(order.order_number, e.target.value as OrderStatus)}
                                                        disabled={updateStatusMutation.isPending}
                                                        className={`px-2 py-1 ${statusStyle.bg} ${statusStyle.text} text-[10px] font-bold uppercase border-0 rounded-none cursor-pointer focus:outline-none`}
                                                    >
                                                        {STATUS_OPTIONS.filter(o => o.value).map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 ${paymentStyle.bg} ${paymentStyle.text} text-[10px] font-bold uppercase`}>
                                                        {order.payment_status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    {order.order_number && (
                                                        <Link
                                                            to={`/admin/orders/${order.order_number}`}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold uppercase transition-colors"
                                                        >
                                                            <Eye size={12} />
                                                            View
                                                        </Link>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-[#27272a]">
                            <span className="text-xs text-zinc-500 font-mono">
                                Page {pagination.page} of {pagination.pages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                    disabled={page === pagination.pages}
                                    className="p-2 bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg text-white font-bold">Export Orders</h2>
                            <button onClick={() => setShowExportModal(false)} className="text-zinc-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={exportFilters.startDate}
                                        onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
                                        className="w-full h-10 px-3 bg-[#050505] border border-[#27272a] text-white text-xs focus:outline-none focus:border-zinc-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={exportFilters.endDate}
                                        onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                                        className="w-full h-10 px-3 bg-[#050505] border border-[#27272a] text-white text-xs focus:outline-none focus:border-zinc-600"
                                    />
                                </div>
                            </div>

                            {/* Quick Select Buttons */}
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: 'Today', fn: () => { const t = new Date().toISOString().split('T')[0]; return { startDate: t, endDate: t }; } },
                                    { label: 'Last 7 Days', fn: () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - 7); return { startDate: s.toISOString().split('T')[0], endDate: e.toISOString().split('T')[0] }; } },
                                    { label: 'Last 30 Days', fn: () => { const e = new Date(); const s = new Date(); s.setDate(e.getDate() - 30); return { startDate: s.toISOString().split('T')[0], endDate: e.toISOString().split('T')[0] }; } },
                                    { label: 'This Month', fn: () => { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth(), 1); const e = new Date(d.getFullYear(), d.getMonth() + 1, 0); return { startDate: s.toISOString().split('T')[0], endDate: e.toISOString().split('T')[0] }; } },
                                ].map(({ label, fn }) => (
                                    <button
                                        key={label}
                                        onClick={() => setExportFilters({ ...exportFilters, ...fn() })}
                                        className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase hover:bg-zinc-700 hover:text-white transition-colors"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Status</label>
                                <select
                                    value={exportFilters.status}
                                    onChange={(e) => setExportFilters({ ...exportFilters, status: e.target.value as OrderStatus | '' })}
                                    className="w-full h-10 px-3 bg-[#050505] border border-[#27272a] text-white text-xs focus:outline-none focus:border-zinc-600"
                                >
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="flex-1 px-4 py-2 bg-zinc-800 text-white text-sm font-bold uppercase hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmExport}
                                disabled={exportMutation.isPending}
                                className="flex-1 px-4 py-2 bg-white text-black text-sm font-bold uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50"
                            >
                                {exportMutation.isPending ? 'Exporting...' : 'Download CSV'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
