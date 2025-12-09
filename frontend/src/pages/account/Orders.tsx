import { useState } from 'react';
import { useOrders } from '@/lib/hooks/useOrders';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';
import { Link } from 'react-router-dom';
import { Loader2, Package, ChevronRight, ChevronLeft } from 'lucide-react';

export default function Orders() {
    const [page, setPage] = useState(1);
    const { data, isLoading } = useOrders({ page });
    const { formatPrice } = useCurrencyContext();
    const orders = data?.data?.orders || [];
    const pagination = data?.data?.pagination;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (orders.length === 0 && page === 1) {
        return (
            <div className="text-center py-24 border border-[#27272a] bg-[#0A0A0A] rounded-lg">
                <Package className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-3">No Orders Yet</h2>
                <p className="text-zinc-500 text-sm font-mono mb-8">
                    You haven't placed any orders yet. Start shopping to find your perfect look.
                </p>
                <Link
                    to="/shop"
                    className="inline-block bg-white text-black px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                >
                    Browse Shop
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold text-white uppercase tracking-wider mb-8">Order History</h1>

            <div className="space-y-4">
                {orders.map((order) => (
                    <div
                        key={order.id}
                        className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6 hover:border-zinc-600 transition-colors"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-white font-bold text-sm">#{order.order_number}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${order.status === 'delivered' ? 'bg-green-500/10 text-green-400' :
                                        order.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                                            order.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                                'bg-zinc-800 text-zinc-400'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>
                                <p className="text-zinc-500 text-xs font-mono">
                                    Placed on {new Date(order.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex items-center gap-8">
                                <div>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total</p>
                                    <p className="text-white font-mono font-bold">{formatPrice(order.total)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Items</p>
                                    <p className="text-white font-mono">{order.items.length} items</p>
                                </div>
                                <Link
                                    to={`/account/orders/${order.order_number}`}
                                    className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center gap-1"
                                >
                                    Details <ChevronRight size={14} />
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* CRITICAL FIX: Pagination Controls */}
            {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-[#27272a]">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} />
                        Previous
                    </button>

                    <span className="text-xs text-zinc-500 font-mono">
                        Page {page} of {pagination.pages} ({pagination.total} total orders)
                    </span>

                    <button
                        onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                        disabled={page === pagination.pages}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
