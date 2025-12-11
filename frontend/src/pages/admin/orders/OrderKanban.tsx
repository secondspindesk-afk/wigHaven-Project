import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Package, Truck, CheckCircle, XCircle, AlertCircle, MoreVertical, ChevronDown, X } from 'lucide-react';
import { AdminOrder, OrderStatus } from '@/lib/api/orders';
import { formatCurrency } from '@/lib/utils/currency';
import { useUpdateOrderStatus } from '@/lib/hooks/useOrders';
import { useToast } from '@/contexts/ToastContext';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

interface OrderKanbanProps {
    orders: AdminOrder[];
    isLoading: boolean;
}

const STATUS_COLUMNS: { id: OrderStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'pending', label: 'Pending', icon: <Clock size={14} />, color: 'text-amber-500' },
    { id: 'processing', label: 'Processing', icon: <Package size={14} />, color: 'text-blue-500' },
    { id: 'shipped', label: 'Shipped', icon: <Truck size={14} />, color: 'text-purple-500' },
    { id: 'delivered', label: 'Delivered', icon: <CheckCircle size={14} />, color: 'text-emerald-500' },
    { id: 'cancelled', label: 'Cancelled', icon: <XCircle size={14} />, color: 'text-red-500' },
    { id: 'refunded', label: 'Refunded', icon: <AlertCircle size={14} />, color: 'text-zinc-500' },
];

export default function OrderKanban({ orders, isLoading }: OrderKanbanProps) {
    const { showToast } = useToast();
    const isMobile = useIsMobile();
    const updateStatusMutation = useUpdateOrderStatus();
    const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('pending');
    const [moveOrder, setMoveOrder] = useState<AdminOrder | null>(null);

    const groupedOrders = useMemo(() => {
        const groups: Record<string, AdminOrder[]> = {};
        STATUS_COLUMNS.forEach(col => groups[col.id] = []);
        orders.forEach(order => { if (groups[order.status]) groups[order.status].push(order); });
        return groups;
    }, [orders]);

    const handleStatusUpdate = async (orderNumber: string, newStatus: OrderStatus) => {
        try { await updateStatusMutation.mutateAsync({ orderNumber, status: newStatus }); showToast(`Order moved to ${newStatus}`, 'success'); setMoveOrder(null); } catch (e: any) { showToast(e.message || 'Failed', 'error'); }
    };

    if (isLoading) {
        return isMobile ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-zinc-800 rounded-xl animate-pulse" />)}</div>
        ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">{[...Array(4)].map((_, i) => <div key={i} className="min-w-[280px] bg-[#0A0A0A] border border-[#27272a] h-[500px] animate-pulse rounded-lg" />)}</div>
        );
    }

    // ==================== MOBILE ====================
    if (isMobile) {
        const currentColumn = STATUS_COLUMNS.find(c => c.id === selectedStatus);
        const currentOrders = groupedOrders[selectedStatus] || [];

        return (
            <div className="space-y-4">
                {/* Status Tabs */}
                <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
                    <div className="flex gap-2 min-w-max">
                        {STATUS_COLUMNS.map(col => (
                            <button key={col.id} onClick={() => setSelectedStatus(col.id)} className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-medium whitespace-nowrap ${selectedStatus === col.id ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                <span className={selectedStatus === col.id ? 'text-black' : col.color}>{col.icon}</span>{col.label}
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${selectedStatus === col.id ? 'bg-black/10' : 'bg-zinc-700'}`}>{groupedOrders[col.id]?.length || 0}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-zinc-800/50 -mx-4" />

                {/* Current Column Header */}
                <div className="flex items-center gap-2">
                    <span className={currentColumn?.color}>{currentColumn?.icon}</span>
                    <h3 className="text-sm font-bold text-white">{currentColumn?.label}</h3>
                    <span className="text-xs text-zinc-500">({currentOrders.length})</span>
                </div>

                {/* Orders */}
                <div className="space-y-3">
                    {currentOrders.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 text-sm">No orders</div>
                    ) : currentOrders.map(order => (
                        <div key={order.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-3">
                                <Link to={`/admin/orders/${order.order_number}`} className="text-sm font-mono text-white font-bold hover:text-emerald-400">{order.order_number}</Link>
                                <span className="text-[10px] text-zinc-500 font-mono">{new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="mb-3">
                                <p className="text-xs text-zinc-300 truncate">{order.shipping_address?.name || 'Guest'}</p>
                                <p className="text-[10px] text-zinc-500 truncate">{order.customer_email}</p>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                                <span className="text-sm font-bold text-white">{formatCurrency(order.total)}</span>
                                <button onClick={() => setMoveOrder(order)} className="px-3 py-2 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg flex items-center gap-1">Move<ChevronDown size={12} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Move Bottom Sheet */}
                {moveOrder && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setMoveOrder(null)}>
                        <div className="bg-zinc-900 border-t border-zinc-800 rounded-t-2xl w-full max-w-lg p-5 pb-8" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white">Move Order {moveOrder.order_number}</h3>
                                <button onClick={() => setMoveOrder(null)} className="p-2 text-zinc-500"><X size={18} /></button>
                            </div>
                            <div className="space-y-2">
                                {STATUS_COLUMNS.filter(c => c.id !== moveOrder.status).map(col => (
                                    <button key={col.id} onClick={() => handleStatusUpdate(moveOrder.order_number, col.id)} disabled={updateStatusMutation.isPending} className="w-full flex items-center gap-3 p-4 bg-zinc-800/50 rounded-xl text-left hover:bg-zinc-800">
                                        <span className={col.color}>{col.icon}</span>
                                        <span className="text-sm text-white font-medium">{col.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ==================== DESKTOP ====================
    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
            {STATUS_COLUMNS.map(column => (
                <div key={column.id} className="min-w-[280px] w-[280px] flex flex-col bg-[#0A0A0A] border border-[#27272a] rounded-lg">
                    <div className="p-3 border-b border-[#27272a] flex items-center justify-between sticky top-0 bg-[#0A0A0A] z-10 rounded-t-lg">
                        <div className="flex items-center gap-2"><span className={column.color}>{column.icon}</span><h3 className="text-xs font-bold text-white uppercase tracking-wider">{column.label}</h3></div>
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">{groupedOrders[column.id]?.length || 0}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {groupedOrders[column.id]?.map(order => (
                            <div key={order.id} className="bg-[#050505] border border-[#27272a] p-3 rounded hover:border-zinc-600 group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <Link to={`/admin/orders/${order.order_number}`} className="text-xs font-mono text-white hover:text-emerald-400 font-bold">{order.order_number}</Link>
                                    <span className="text-[10px] text-zinc-500 font-mono">{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="mb-2"><p className="text-xs text-zinc-300 truncate">{order.shipping_address?.name || 'Guest'}</p><p className="text-[10px] text-zinc-500 truncate">{order.customer_email}</p></div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#27272a]">
                                    <span className="text-xs font-bold text-white">{formatCurrency(order.total)}</span>
                                    <div className="relative group/actions">
                                        <button className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-800"><MoreVertical size={14} /></button>
                                        <div className="absolute right-0 top-full mt-1 w-32 bg-[#111] border border-[#27272a] rounded shadow-xl z-20 hidden group-hover/actions:block">
                                            <div className="p-1">
                                                <p className="px-2 py-1 text-[9px] text-zinc-500 uppercase font-bold">Move to...</p>
                                                {STATUS_COLUMNS.filter(c => c.id !== column.id).map(targetCol => (
                                                    <button key={targetCol.id} onClick={() => handleStatusUpdate(order.order_number, targetCol.id)} className="w-full text-left px-2 py-1.5 text-[10px] text-zinc-300 hover:text-white hover:bg-zinc-800 rounded flex items-center gap-2"><span className={targetCol.color}>{targetCol.icon}</span>{targetCol.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
