import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrder, useCancelOrder } from '@/lib/hooks/useOrders';
import { useCreateReview } from '@/lib/hooks/useReviews';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, MapPin, CreditCard, Package, AlertTriangle, X, Star, Download, ChevronRight } from 'lucide-react';
import api from '@/lib/api/axios';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function OrderDetails() {
    const { orderNumber } = useParams<{ orderNumber: string }>();
    const { data: order, isLoading } = useOrder(orderNumber || '', { enabled: !!orderNumber });
    const { formatPrice } = useCurrencyContext();
    const { showConfirm, showToast } = useToast();
    const navigate = useNavigate();
    const cancelOrder = useCancelOrder();
    const createReview = useCreateReview();
    const isMobile = useIsMobile();

    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);

    const handleDownloadInvoice = async () => {
        try {
            setDownloadingInvoice(true);
            const response = await api.get(`/orders/${order?.order_number}/invoice/download`, {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `invoice-${order?.order_number}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            showToast('Invoice downloaded', 'success');
        } catch (error) {
            showToast('Failed to download invoice', 'error');
        } finally {
            setDownloadingInvoice(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (!order && !isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] p-4">
                <div className="max-w-md w-full text-center">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-white mb-2">Order Not Found</h2>
                    <p className="text-zinc-500 text-sm mb-6">
                        We couldn't find order #{orderNumber}.
                    </p>
                    <Link to="/account/orders" className="inline-block bg-white text-black px-6 py-3 text-xs font-bold rounded-lg">
                        Back to Orders
                    </Link>
                </div>
            </div>
        );
    }

    if (!order) return null;

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="space-y-4 pb-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-lg font-bold text-white">#{order.order_number}</h1>
                        <p className="text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${order.status === 'delivered' ? 'bg-green-500/10 text-green-400' :
                            order.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                                order.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                    'bg-zinc-800 text-zinc-400'
                        }`}>
                        {order.status}
                    </span>
                </div>

                {/* Items */}
                <div className="bg-zinc-900 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800">
                        <h2 className="text-sm font-bold text-white">Items ({order.items.length})</h2>
                    </div>
                    <div className="divide-y divide-zinc-800">
                        {order.items.map((item) => (
                            <div key={item.id} className="p-4 flex gap-3">
                                <div className="w-16 h-20 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                                    {item.product_image && (
                                        <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm text-white font-medium line-clamp-1">{item.product_name}</h3>
                                    <p className="text-xs text-zinc-500 mb-1">Qty: {item.quantity}</p>
                                    <p className="text-sm text-white font-bold">{formatPrice(item.subtotal)}</p>

                                    {order.status === 'delivered' && (
                                        <button
                                            onClick={() => {
                                                setSelectedItem(item);
                                                setRating(5);
                                                setComment('');
                                                setReviewModalOpen(true);
                                            }}
                                            className="text-xs text-blue-400 mt-2 flex items-center gap-1"
                                        >
                                            <Star size={12} /> Write Review
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Summary */}
                <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm text-zinc-400">
                        <span>Subtotal</span>
                        <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-zinc-400">
                        <span>Shipping</span>
                        <span>{formatPrice(order.shipping)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-zinc-400">
                        <span>Tax</span>
                        <span>{formatPrice(order.tax)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-green-400">
                            <span>Discount</span>
                            <span>-{formatPrice(order.discount_amount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base text-white font-bold pt-2 border-t border-zinc-800">
                        <span>Total</span>
                        <span>{formatPrice(order.total)}</span>
                    </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-zinc-900 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin size={16} className="text-zinc-500" />
                        <h2 className="text-sm font-bold text-white">Shipping Address</h2>
                    </div>
                    <div className="text-sm text-zinc-400 leading-relaxed">
                        <p className="text-white font-medium">{order.shipping_address?.name}</p>
                        <p>{order.shipping_address?.street}</p>
                        <p>{order.shipping_address?.city}, {order.shipping_address?.state}</p>
                        <p className="text-zinc-500 mt-1">{order.shipping_address?.phone}</p>
                    </div>
                </div>

                {/* Payment */}
                <div className="bg-zinc-900 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard size={16} className="text-zinc-500" />
                            <span className="text-sm font-bold text-white">Payment</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.payment_status === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                            }`}>
                            {order.payment_status}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={handleDownloadInvoice}
                        disabled={downloadingInvoice}
                        className="w-full bg-white text-black py-3.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {downloadingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={16} />}
                        Download Invoice
                    </button>

                    {order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'shipped' && (
                        <button
                            onClick={() => {
                                showConfirm({
                                    title: 'Cancel Order',
                                    message: `Are you sure you want to cancel order #${order.order_number}?`,
                                    onConfirm: () => {
                                        cancelOrder.mutate(
                                            { orderNumber: order.order_number },
                                            {
                                                onSuccess: () => {
                                                    showToast('Order cancelled', 'success');
                                                    navigate('/account/orders');
                                                }
                                            }
                                        );
                                    },
                                    confirmText: 'Cancel Order',
                                    cancelText: 'Keep Order'
                                });
                            }}
                            disabled={cancelOrder.isPending}
                            className="w-full border border-red-500/30 text-red-400 py-3.5 text-sm font-bold rounded-lg flex items-center justify-center gap-2"
                        >
                            {cancelOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X size={16} />}
                            Cancel Order
                        </button>
                    )}
                </div>

                {/* Review Modal */}
                {reviewModalOpen && selectedItem && (
                    <div className="fixed inset-0 bg-black/80 flex items-end z-[100]" onClick={() => setReviewModalOpen(false)}>
                        <div className="bg-[#0A0A0A] w-full rounded-t-2xl p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                            <h2 className="text-lg font-bold text-white mb-4">Write Review</h2>
                            <p className="text-sm text-zinc-400 mb-4">{selectedItem.product_name}</p>

                            <div className="flex gap-2 mb-4">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} onClick={() => setRating(star)}>
                                        <Star size={28} className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'} />
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Share your experience..."
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-white text-sm min-h-[100px] resize-none mb-4"
                            />

                            <div className="flex gap-3">
                                <button onClick={() => setReviewModalOpen(false)} className="flex-1 py-3 border border-zinc-700 text-zinc-400 rounded-lg font-bold text-sm">
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (comment.trim().length < 10) {
                                            showToast('Review must be at least 10 characters', 'error');
                                            return;
                                        }
                                        createReview.mutate(
                                            { productId: selectedItem.product_id || selectedItem.variant_id, rating, comment: comment.trim(), orderItemId: selectedItem.id },
                                            { onSuccess: () => { showToast('Review submitted!', 'success'); setReviewModalOpen(false); } }
                                        );
                                    }}
                                    disabled={createReview.isPending || comment.trim().length < 10}
                                    className="flex-1 py-3 bg-white text-black rounded-lg font-bold text-sm disabled:opacity-50"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Desktop Layout (original)
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link to="/account/orders" className="text-zinc-500 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider">Order #{order.order_number}</h1>
                        <p className="text-zinc-500 text-xs font-mono">
                            Placed on {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleDownloadInvoice}
                    disabled={downloadingInvoice}
                    className="flex items-center gap-2 bg-white text-black px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {downloadingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={16} />}
                    Download Invoice
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg overflow-hidden">
                        <div className="p-6 border-b border-[#27272a]">
                            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Order Items</h2>
                        </div>
                        <div className="divide-y divide-[#27272a]">
                            {order.items.map((item) => (
                                <div key={item.id} className="p-6 flex gap-4">
                                    <div className="w-20 h-24 bg-zinc-900 rounded-sm overflow-hidden flex-shrink-0">
                                        {item.product_image && (
                                            <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-white font-bold text-sm">{item.product_name}</h3>
                                                <p className="text-zinc-500 text-xs font-mono mt-1">{item.variant_sku}</p>
                                            </div>
                                            <p className="text-white font-mono font-bold">{formatPrice(item.unit_price)}</p>
                                        </div>
                                        <div className="mt-4 flex justify-between items-center text-xs text-zinc-500">
                                            <span>Qty: {item.quantity}</span>
                                            <span>Total: {formatPrice(item.subtotal)}</span>
                                        </div>
                                        {order.status === 'delivered' && (
                                            <button
                                                onClick={() => { setSelectedItem(item); setRating(5); setComment(''); setReviewModalOpen(true); }}
                                                className="mt-3 text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider flex items-center gap-1"
                                            >
                                                <Star size={12} /> Write Review
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6">
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Order Status</h2>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${order.status === 'delivered' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                <Package size={24} />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm uppercase">{order.status}</p>
                                <p className="text-zinc-500 text-xs">
                                    {order.tracking_number ? `Tracking: ${order.tracking_number}` : 'Processing your order'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6">
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Order Summary</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                            <div className="flex justify-between text-zinc-400"><span>Shipping</span><span>{formatPrice(order.shipping)}</span></div>
                            <div className="flex justify-between text-zinc-400"><span>Tax</span><span>{formatPrice(order.tax)}</span></div>
                            {order.discount_amount > 0 && (
                                <div className="flex justify-between text-green-400"><span>Discount</span><span>-{formatPrice(order.discount_amount)}</span></div>
                            )}
                            <div className="pt-4 border-t border-[#27272a] flex justify-between text-white font-bold text-lg"><span>Total</span><span>{formatPrice(order.total)}</span></div>
                        </div>
                    </div>

                    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4"><MapPin className="text-zinc-500" size={16} /><h2 className="text-sm font-bold text-white uppercase tracking-widest">Shipping Address</h2></div>
                        <div className="text-zinc-400 text-sm leading-relaxed">
                            <p className="text-white font-bold mb-1">{order.shipping_address?.name}</p>
                            <p>{order.shipping_address?.street}</p>
                            <p>{order.shipping_address?.city}, {order.shipping_address?.state}</p>
                            <p className="mt-2 text-zinc-500 font-mono">{order.shipping_address?.phone}</p>
                        </div>
                    </div>

                    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4"><CreditCard className="text-zinc-500" size={16} /><h2 className="text-sm font-bold text-white uppercase tracking-widest">Payment Info</h2></div>
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-400 text-sm">Status</span>
                            <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${order.payment_status === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{order.payment_status}</span>
                        </div>
                    </div>

                    {order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'shipped' && (
                        <div className="bg-red-900/5 border border-red-900/30 rounded-lg p-6">
                            <h2 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2">Cancel Order</h2>
                            <p className="text-zinc-500 text-xs mb-4">You can cancel this order if it hasn't been shipped yet.</p>
                            <button
                                onClick={() => {
                                    showConfirm({
                                        title: 'Cancel Order',
                                        message: `Are you sure you want to cancel order #${order.order_number}?`,
                                        onConfirm: () => { cancelOrder.mutate({ orderNumber: order.order_number }, { onSuccess: () => { showToast('Order cancelled', 'success'); navigate('/account/orders'); } }); },
                                        confirmText: 'Cancel Order',
                                        cancelText: 'Keep Order'
                                    });
                                }}
                                disabled={cancelOrder.isPending}
                                className="border border-red-900/50 text-red-400 px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-red-900/20 transition-colors flex items-center gap-2"
                            >
                                {cancelOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X size={16} />}
                                Cancel Order
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {reviewModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setReviewModalOpen(false)}>
                    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Write Review</h2>
                            <button onClick={() => setReviewModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="mb-6"><p className="text-white font-bold text-sm mb-2">{selectedItem.product_name}</p></div>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Rating</label>
                            <div className="flex gap-2">{[1, 2, 3, 4, 5].map((star) => (<button key={star} onClick={() => setRating(star)}><Star size={32} className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'} /></button>))}</div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Your Review</label>
                            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us about your experience..." className="w-full bg-zinc-900 border border-[#27272a] rounded-lg p-4 text-white text-sm min-h-[120px] resize-none" maxLength={500} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setReviewModalOpen(false)} className="flex-1 border border-[#27272a] text-zinc-400 px-4 py-3 text-xs font-bold uppercase tracking-widest">Cancel</button>
                            <button onClick={() => { if (comment.trim().length < 10) { showToast('Review must be at least 10 characters', 'error'); return; } createReview.mutate({ productId: selectedItem.product_id || selectedItem.variant_id, rating, comment: comment.trim(), orderItemId: selectedItem.id }, { onSuccess: () => { showToast('Review submitted!', 'success'); setReviewModalOpen(false); } }); }} disabled={createReview.isPending || comment.trim().length < 10} className="flex-1 bg-white text-black px-4 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-50">{createReview.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
