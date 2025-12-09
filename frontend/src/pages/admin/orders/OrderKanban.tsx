import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Package, Truck, CheckCircle, XCircle, AlertCircle, MoreVertical } from 'lucide-react';
import { AdminOrder, OrderStatus } from '@/lib/api/orders';
import { formatCurrency } from '@/lib/utils/currency';
import { useUpdateOrderStatus } from '@/lib/hooks/useOrders';
import { useToast } from '@/contexts/ToastContext';

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
    const updateStatusMutation = useUpdateOrderStatus();

    // Group orders by status
    const groupedOrders = useMemo(() => {
        const groups: Record<string, AdminOrder[]> = {};
        STATUS_COLUMNS.forEach(col => {
            groups[col.id] = [];
        });
        orders.forEach(order => {
            if (groups[order.status]) {
                groups[order.status].push(order);
            }
        });
        return groups;
    }, [orders]);

    const handleStatusUpdate = async (orderNumber: string, newStatus: OrderStatus) => {
        try {
            await updateStatusMutation.mutateAsync({ orderNumber, status: newStatus });
            showToast(`Order ${orderNumber} moved to ${newStatus}`, 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to update status', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="min-w-[280px] bg-[#0A0A0A] border border-[#27272a] h-[500px] animate-pulse rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
            {STATUS_COLUMNS.map(column => (
                <div key={column.id} className="min-w-[280px] w-[280px] flex flex-col bg-[#0A0A0A] border border-[#27272a] rounded-lg">
                    {/* Column Header */}
                    <div className="p-3 border-b border-[#27272a] flex items-center justify-between sticky top-0 bg-[#0A0A0A] z-10 rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <span className={column.color}>{column.icon}</span>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">{column.label}</h3>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">
                            {groupedOrders[column.id]?.length || 0}
                        </span>
                    </div>

                    {/* Orders List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {groupedOrders[column.id]?.map(order => (
                            <div key={order.id} className="bg-[#050505] border border-[#27272a] p-3 rounded hover:border-zinc-600 transition-colors group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <Link to={`/admin/orders/${order.order_number}`} className="text-xs font-mono text-white hover:text-emerald-400 font-bold">
                                        {order.order_number}
                                    </Link>
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="mb-2">
                                    <p className="text-xs text-zinc-300 truncate">{order.shipping_address?.name || 'Guest'}</p>
                                    <p className="text-[10px] text-zinc-500 truncate">{order.customer_email}</p>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#27272a]">
                                    <span className="text-xs font-bold text-white">{formatCurrency(order.total)}</span>

                                    {/* Quick Move Dropdown (visible on hover) */}
                                    <div className="relative group/actions">
                                        <button className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-800">
                                            <MoreVertical size={14} />
                                        </button>
                                        <div className="absolute right-0 top-full mt-1 w-32 bg-[#111] border border-[#27272a] rounded shadow-xl z-20 hidden group-hover/actions:block">
                                            <div className="p-1">
                                                <p className="px-2 py-1 text-[9px] text-zinc-500 uppercase font-bold">Move to...</p>
                                                {STATUS_COLUMNS.filter(c => c.id !== column.id).map(targetCol => (
                                                    <button
                                                        key={targetCol.id}
                                                        onClick={() => handleStatusUpdate(order.order_number, targetCol.id)}
                                                        className="w-full text-left px-2 py-1.5 text-[10px] text-zinc-300 hover:text-white hover:bg-zinc-800 rounded flex items-center gap-2"
                                                    >
                                                        <span className={targetCol.color}>{targetCol.icon}</span>
                                                        {targetCol.label}
                                                    </button>
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
