import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrder, useCancelOrder } from '@/lib/hooks/useOrders';
import { useCreateReview } from '@/lib/hooks/useReviews';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, MapPin, CreditCard, Package, AlertTriangle, X, Star, Download } from 'lucide-react';
import api from '@/lib/api/axios';

export default function OrderDetails() {
    const { orderNumber } = useParams<{ orderNumber: string }>();
    // Ensure orderNumber is not undefined before calling hook
    const { data: order, isLoading } = useOrder(orderNumber || '', { enabled: !!orderNumber });
    const { formatPrice } = useCurrencyContext();
    const { showConfirm, showToast } = useToast();
    const navigate = useNavigate();
    const cancelOrder = useCancelOrder();
    const createReview = useCreateReview();

    // Review modal state
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);

    // CRITICAL FIX #8: Download invoice handler
    const handleDownloadInvoice = async () => {
        try {
            setDownloadingInvoice(true);
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
            showToast('Invoice downloaded successfully', 'success');
        } catch (error) {
            showToast('Failed to download invoice', 'error');
            console.error('Download invoice error:', error);
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

    // CRITICAL FIX #5: Proper error/not found state
    if (!order && !isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] p-4">
                <div className="max-w-md w-full text-center">
                    <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-2">Order Not Found</h2>
                    <p className="text-zinc-500 text-sm mb-8">
                        We couldn't find order #{orderNumber}. It may not exist or you don't have access to it.
                    </p>
                    <Link
                        to="/account/orders"
                        className="inline-block bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                    >
                        Back to Orders
                    </Link>
                </div>
            </div>
        );
    }

    if (!order) return null;

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

                {/* CRITICAL FIX #8: Download Invoice Button */}
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
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Items */}
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
                                                {item.variant_details && (
                                                    <div className="flex gap-2 mt-2">
                                                        {Object.entries(item.variant_details).map(([key, value]) => (
                                                            value && (
                                                                <span key={key} className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-1 rounded-sm uppercase">
                                                                    {key}: {value}
                                                                </span>
                                                            )
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-white font-mono font-bold">{formatPrice(item.unit_price)}</p>
                                        </div>
                                        <div className="mt-4 flex justify-between items-center text-xs text-zinc-500">
                                            <span>Qty: {item.quantity}</span>
                                            <span>Total: {formatPrice(item.subtotal)}</span>
                                        </div>

                                        {/* CRITICAL FIX #7: Write Review Button (only for delivered orders) */}
                                        {order.status === 'delivered' && (
                                            <button
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setRating(5);
                                                    setComment('');
                                                    setReviewModalOpen(true);
                                                }}
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

                    {/* Timeline (Simplified) */}
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

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6">
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Order Summary</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-zinc-400">
                                <span>Subtotal</span>
                                <span>{formatPrice(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                                <span>Shipping</span>
                                <span>{formatPrice(order.shipping)}</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                                <span>Tax</span>
                                <span>{formatPrice(order.tax)}</span>
                            </div>
                            {order.discount_amount > 0 && (
                                <div className="flex justify-between text-green-400">
                                    <div className="flex flex-col">
                                        <span>Discount</span>
                                        {order.coupon_code && (
                                            <span className="text-[10px] text-green-500/70 font-mono uppercase">
                                                Code: {order.coupon_code}
                                            </span>
                                        )}
                                    </div>
                                    <span>-{formatPrice(order.discount_amount)}</span>
                                </div>
                            )}
                            <div className="pt-4 border-t border-[#27272a] flex justify-between text-white font-bold text-lg">
                                <span>Total</span>
                                <span>{formatPrice(order.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <MapPin className="text-zinc-500" size={16} />
                            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Shipping Address</h2>
                        </div>
                        <div className="text-zinc-400 text-sm leading-relaxed">
                            <p className="text-white font-bold mb-1">{order.shipping_address?.name}</p>
                            <p>{order.shipping_address?.street}</p>
                            <p>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.zipCode}</p>
                            <p>{order.shipping_address?.country}</p>
                            <p className="mt-2 text-zinc-500 font-mono">{order.shipping_address?.phone}</p>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <CreditCard className="text-zinc-500" size={16} />
                            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Payment Info</h2>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-400 text-sm">Status</span>
                            <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${order.payment_status === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                {order.payment_status}
                            </span>
                        </div>
                    </div>

                    {/* CRITICAL FIX #6: Cancel Order Button */}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'shipped' && (
                        <div className="bg-red-900/5 border border-red-900/30 rounded-lg p-6">
                            <h2 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2">Cancel Order</h2>
                            <p className="text-zinc-500 text-xs mb-4">
                                You can cancel this order if it hasn't been shipped yet.
                            </p>
                            <button
                                onClick={() => {
                                    showConfirm({
                                        title: 'Cancel Order',
                                        message: `Are you sure you want to cancel order #${order.order_number}? This action cannot be undone.`,
                                        onConfirm: () => {
                                            cancelOrder.mutate(
                                                { orderNumber: order.order_number },
                                                {
                                                    onSuccess: () => {
                                                        showToast('Order cancelled successfully', 'success');
                                                        navigate('/account/orders');
                                                    },
                                                    onError: (error: any) => {
                                                        showToast(error.response?.data?.message || 'Failed to cancel order', 'error');
                                                    }
                                                }
                                            );
                                        },
                                        confirmText: 'Cancel Order',
                                        cancelText: 'Keep Order'
                                    });
                                }}
                                disabled={cancelOrder.isPending}
                                className="border border-red-900/50 text-red-400 px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-red-900/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {cancelOrder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X size={16} />}
                                Cancel Order
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* CRITICAL FIX #7: Review Modal */}
            {
                reviewModalOpen && selectedItem && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setReviewModalOpen(false)}>
                        <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white uppercase tracking-wider">Write Review</h2>
                                <button onClick={() => setReviewModalOpen(false)} className="text-zinc-500 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mb-6">
                                <p className="text-white font-bold text-sm mb-2">{selectedItem.product_name}</p>
                                <p className="text-zinc-500 text-xs">{selectedItem.variant_sku}</p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setRating(star)}
                                            className="transition-colors"
                                        >
                                            <Star
                                                size={32}
                                                className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Your Review</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Tell us about your experience with this product..."
                                    className="w-full bg-zinc-900 border border-[#27272a] rounded-lg p-4 text-white text-sm focus:border-zinc-600 focus:outline-none min-h-[120px] resize-none"
                                    maxLength={500}
                                />
                                <p className="text-zinc-600 text-xs mt-2">{comment.length}/500</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setReviewModalOpen(false)}
                                    className="flex-1 border border-[#27272a] text-zinc-400 px-4 py-3 text-xs font-bold uppercase tracking-widest hover:border-zinc-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (comment.trim().length < 10) {
                                            showToast('Review must be at least 10 characters', 'error');
                                            return;
                                        }
                                        createReview.mutate(
                                            {
                                                productId: selectedItem.product_id || selectedItem.variant_id, // Assuming variant_id is available if product_id is not
                                                rating,
                                                comment: comment.trim(),
                                                orderItemId: selectedItem.id,
                                            },
                                            {
                                                onSuccess: () => {
                                                    showToast('Review submitted! It will be visible after approval.', 'success');
                                                    setReviewModalOpen(false);
                                                    setComment('');
                                                    setRating(5);
                                                },
                                                onError: (error: any) => {
                                                    showToast(error.response?.data?.message || 'Failed to submit review', 'error');
                                                }
                                            }
                                        );
                                    }}
                                    disabled={createReview.isPending || comment.trim().length < 10}
                                    className="flex-1 bg-white text-black px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {createReview.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Review'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
