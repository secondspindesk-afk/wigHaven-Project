import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, Package, Truck, CheckCircle, XCircle, Clock, AlertCircle,
    Phone, Mail, CreditCard, RefreshCw, DollarSign, Printer, Plus, ChevronDown, MapPin
} from 'lucide-react';
import { useAdminOrder, useUpdateOrderStatus, useRefundOrder, useUpdateTracking, useVerifyPayment } from '@/lib/hooks/useOrders';
import { OrderStatus } from '@/lib/api/orders';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils/currency';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
];

const STATUS_STYLES: Record<OrderStatus, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30', icon: <Clock size={16} /> },
    processing: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30', icon: <Package size={16} /> },
    shipped: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30', icon: <Truck size={16} /> },
    delivered: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30', icon: <CheckCircle size={16} /> },
    cancelled: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30', icon: <XCircle size={16} /> },
    refunded: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-500/30', icon: <AlertCircle size={16} /> },
};

export default function OrderDetails() {
    const { orderNumber } = useParams<{ orderNumber: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const isMobile = useIsMobile();

    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [carrier, setCarrier] = useState('');
    const [forceVerify, setForceVerify] = useState(false);

    const { data: order, isLoading, refetch } = useAdminOrder(orderNumber || '');
    const updateStatusMutation = useUpdateOrderStatus();
    const refundMutation = useRefundOrder();
    const trackingMutation = useUpdateTracking();
    const verifyMutation = useVerifyPayment();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDateShort = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const handleStatusUpdate = async (status: OrderStatus) => {
        if (!orderNumber) return;
        try {
            await updateStatusMutation.mutateAsync({ orderNumber, status });
            showToast(`Order updated to ${status}`, 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to update', 'error');
        }
    };

    const handleRefund = async () => {
        if (!orderNumber) return;
        try {
            await refundMutation.mutateAsync(orderNumber);
            showToast('Order refunded', 'success');
            setShowRefundModal(false);
        } catch (error: any) {
            showToast(error.message || 'Refund failed', 'error');
        }
    };

    const handleAddTracking = async () => {
        if (!orderNumber || !trackingNumber) return;
        try {
            await trackingMutation.mutateAsync({ orderNumber, trackingNumber, carrier });
            showToast('Tracking added', 'success');
            setShowTrackingModal(false);
        } catch (error: any) {
            showToast(error.message || 'Failed', 'error');
        }
    };

    const handleVerifyPayment = async () => {
        if (!orderNumber) return;
        try {
            const result = await verifyMutation.mutateAsync({ orderNumber, force: forceVerify });
            if (result.success) {
                showToast(result.message || 'Payment verified', 'success');
            } else {
                showToast(result.error || 'Verification failed', 'error');
            }
            setShowVerifyModal(false);
            setForceVerify(false);
        } catch (error: any) {
            showToast(error.response?.data?.error || 'Verification failed', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className={`${isMobile ? 'p-4' : 'min-h-screen bg-[#050505] p-8'}`}>
                <div className="max-w-5xl mx-auto animate-pulse space-y-4">
                    <div className="h-8 w-32 bg-zinc-800 rounded" />
                    <div className="h-48 bg-zinc-800 rounded-xl" />
                    <div className="h-32 bg-zinc-800 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className={`${isMobile ? 'p-4' : 'min-h-screen bg-[#050505] p-8'} flex items-center justify-center`}>
                <div className="text-center">
                    <AlertCircle size={48} className="text-zinc-600 mx-auto mb-4" />
                    <h2 className="text-xl text-white mb-2">Order Not Found</h2>
                    <Link to="/admin/orders" className="text-emerald-500">← Back to Orders</Link>
                </div>
            </div>
        );
    }

    const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.pending;

    // ==================== MOBILE LAYOUT ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                {/* Mobile Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/admin/orders')}
                            className="p-2 bg-zinc-800 rounded-lg text-zinc-400"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-base font-mono text-white">#{order.order_number}</h1>
                            <p className="text-[10px] text-zinc-500">{formatDateShort(order.created_at)}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="p-2 bg-zinc-800 rounded-lg text-zinc-400"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Mobile Status Card */}
                <div className={`p-4 ${statusStyle.bg} border ${statusStyle.border} rounded-xl`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={statusStyle.text}>{statusStyle.icon}</div>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase">Status</p>
                                <p className={`text-lg font-bold uppercase ${statusStyle.text}`}>{order.status}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowStatusPicker(true)}
                            className="px-3 py-2 bg-black/30 rounded-lg text-white text-xs font-bold flex items-center gap-1"
                        >
                            Change <ChevronDown size={14} />
                        </button>
                    </div>
                </div>

                {/* Mobile Order Summary */}
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                    <h3 className="text-sm font-semibold text-white mb-3">Order Summary</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Subtotal</span>
                            <span className="text-white">{formatCurrency(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Shipping</span>
                            <span className="text-white">{formatCurrency(order.shipping || 0)}</span>
                        </div>
                        {order.discount_amount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Discount</span>
                                <span className="text-emerald-400">-{formatCurrency(order.discount_amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-bold pt-2 border-t border-zinc-800">
                            <span className="text-white">Total</span>
                            <span className="text-emerald-400">{formatCurrency(order.total)}</span>
                        </div>
                    </div>
                </div>

                {/* Mobile Items */}
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                    <h3 className="text-sm font-semibold text-white mb-3">Items ({order.items?.length || 0})</h3>
                    <div className="space-y-3">
                        {order.items?.map((item: any) => (
                            <div key={item.id} className="flex gap-3">
                                {item.image && (
                                    <img src={item.image} alt="" className="w-14 h-14 object-cover rounded-lg" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{item?.product_name}</p>
                                    <p className="text-[10px] text-zinc-500 font-mono">x{item.quantity}</p>
                                </div>
                                <p className="text-sm text-white">{formatCurrency(item.subtotal)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mobile Tracking */}
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white">Tracking</h3>
                        {!order.tracking_number && (
                            <button
                                onClick={() => setShowTrackingModal(true)}
                                className="text-xs text-emerald-500 font-bold flex items-center gap-1"
                            >
                                <Plus size={14} /> Add
                            </button>
                        )}
                    </div>
                    {order.tracking_number ? (
                        <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
                            <Truck size={20} className="text-zinc-400" />
                            <div>
                                <p className="text-white font-mono">{order.tracking_number}</p>
                                {order.carrier && <p className="text-xs text-zinc-500">{order.carrier}</p>}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-500 text-center py-4">No tracking yet</p>
                    )}
                </div>

                {/* Mobile Customer + Addresses */}
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                    <h3 className="text-sm font-semibold text-white mb-3">Customer</h3>
                    <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Mail size={14} className="text-zinc-500" />
                            <span className="text-white font-mono text-xs truncate">{order.customer_email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Phone size={14} className="text-zinc-500" />
                            <span className="text-white font-mono">{order.customer_phone}</span>
                        </div>
                    </div>
                    {order.shipping_address && (
                        <div className="pt-3 border-t border-zinc-800">
                            <div className="flex items-start gap-2 text-sm text-zinc-400">
                                <MapPin size={14} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-white">{order.shipping_address?.name}</p>
                                    <p>{order.shipping_address?.address}</p>
                                    <p>{order.shipping_address?.city}, {order.shipping_address?.state}</p>
                                    <p>{order.shipping_address?.phone}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile Payment */}
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Payment</h3>
                            <span className={`text-xs uppercase font-bold ${order.payment_status === 'paid' ? 'text-emerald-400' :
                                order.payment_status === 'failed' ? 'text-red-400' : 'text-amber-400'
                                }`}>
                                {order.payment_status}
                            </span>
                        </div>
                        {order.payment_status !== 'paid' && (
                            <button
                                onClick={() => setShowVerifyModal(true)}
                                className="px-3 py-2 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-bold"
                            >
                                Verify
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex gap-3">
                    {order.payment_status === 'paid' && order.status !== 'refunded' && (
                        <button
                            onClick={() => setShowRefundModal(true)}
                            className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                        >
                            <DollarSign size={16} /> Refund
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="flex-1 py-3 bg-zinc-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    >
                        <Printer size={16} /> Print
                    </button>
                </div>

                {/* Mobile Status Picker Bottom Sheet */}
                {showStatusPicker && (
                    <>
                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setShowStatusPicker(false)} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-4 safe-area-pb">
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                            <h3 className="text-sm font-semibold text-white mb-3">Update Status</h3>
                            <div className="space-y-2">
                                {STATUS_OPTIONS.map(opt => {
                                    const style = STATUS_STYLES[opt.value];
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                handleStatusUpdate(opt.value);
                                                setShowStatusPicker(false);
                                            }}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl ${order.status === opt.value ? 'bg-zinc-800 border border-zinc-600' : 'bg-zinc-800/50'} active:bg-zinc-700`}
                                        >
                                            <span className={style.text}>{style.icon}</span>
                                            <span className="text-sm text-white">{opt.label}</span>
                                            {order.status === opt.value && <CheckCircle size={16} className="ml-auto text-emerald-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* Modals - Bottom Sheets on Mobile */}
                {showRefundModal && (
                    <>
                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setShowRefundModal(false)} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-5 safe-area-pb">
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                            <h3 className="text-base font-semibold text-white mb-2">Confirm Refund</h3>
                            <p className="text-sm text-zinc-400 mb-6">
                                Refund <span className="text-white">{formatCurrency(order.total)}</span> to customer?
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowRefundModal(false)} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl">Cancel</button>
                                <button
                                    onClick={handleRefund}
                                    disabled={refundMutation.isPending}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl"
                                >
                                    {refundMutation.isPending ? 'Processing...' : 'Refund'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {showTrackingModal && (
                    <>
                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setShowTrackingModal(false)} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-5 safe-area-pb">
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                            <h3 className="text-base font-semibold text-white mb-4">Add Tracking</h3>
                            <div className="space-y-3 mb-4">
                                <input
                                    type="text"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="Tracking number"
                                    className="w-full h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                                />
                                <input
                                    type="text"
                                    value={carrier}
                                    onChange={(e) => setCarrier(e.target.value)}
                                    placeholder="Carrier (optional)"
                                    className="w-full h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowTrackingModal(false)} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl">Cancel</button>
                                <button
                                    onClick={handleAddTracking}
                                    disabled={!trackingNumber || trackingMutation.isPending}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl disabled:opacity-50"
                                >
                                    {trackingMutation.isPending ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {showVerifyModal && (
                    <>
                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => { setShowVerifyModal(false); setForceVerify(false); }} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-5 safe-area-pb">
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                            <h3 className="text-base font-semibold text-white mb-4">Verify Payment</h3>
                            <label className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl mb-4">
                                <input
                                    type="checkbox"
                                    checked={forceVerify}
                                    onChange={(e) => setForceVerify(e.target.checked)}
                                    className="w-5 h-5 accent-emerald-500"
                                />
                                <div>
                                    <span className="text-sm text-white">Force verify</span>
                                    <p className="text-[10px] text-zinc-500">Mark paid without gateway check</p>
                                </div>
                            </label>
                            {forceVerify && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4">
                                    <p className="text-xs text-amber-400">⚠️ Only use if payment confirmed externally</p>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button onClick={() => { setShowVerifyModal(false); setForceVerify(false); }} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl">Cancel</button>
                                <button
                                    onClick={handleVerifyPayment}
                                    disabled={verifyMutation.isPending}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl"
                                >
                                    {verifyMutation.isPending ? 'Verifying...' : 'Verify'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ==================== DESKTOP LAYOUT ====================
    return (
        <div className="min-h-screen bg-[#050505] p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin/orders')}
                            className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="text-xl text-white font-medium uppercase tracking-tight font-mono">
                                {order.order_number}
                            </h1>
                            <p className="text-[10px] text-zinc-500 font-mono mt-1">
                                {formatDate(order.created_at)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => refetch()}
                            className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                        >
                            <RefreshCw size={16} />
                        </button>
                        {order.payment_status === 'paid' && order.status !== 'refunded' && (
                            <button
                                onClick={() => setShowRefundModal(true)}
                                className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 text-[10px] font-bold font-mono uppercase hover:bg-red-500/20 transition-colors flex items-center gap-2"
                            >
                                <DollarSign size={14} />
                                Refund
                            </button>
                        )}
                        {order.payment_status !== 'paid' && (
                            <button
                                onClick={() => setShowVerifyModal(true)}
                                className="px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-[10px] font-bold font-mono uppercase hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
                            >
                                <CreditCard size={14} />
                                Verify Payment
                            </button>
                        )}
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-bold font-mono uppercase hover:text-white hover:bg-zinc-700 transition-colors flex items-center gap-2"
                        >
                            <Printer size={14} />
                            Print Invoice
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Card */}
                        <div className={`p-6 ${statusStyle.bg} border ${statusStyle.border}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={statusStyle.text}>{statusStyle.icon}</div>
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Order Status</p>
                                        <p className={`text-lg font-bold uppercase ${statusStyle.text}`}>{order.status}</p>
                                    </div>
                                </div>
                                <select
                                    value={order.status}
                                    onChange={(e) => handleStatusUpdate(e.target.value as OrderStatus)}
                                    disabled={updateStatusMutation.isPending}
                                    className="px-4 py-2 bg-[#0A0A0A] border border-[#27272a] text-white text-xs font-mono uppercase cursor-pointer focus:outline-none"
                                >
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Tracking Info */}
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Tracking Information</h3>
                                {!order.tracking_number && (
                                    <button
                                        onClick={() => setShowTrackingModal(true)}
                                        className="text-[10px] text-emerald-500 font-bold uppercase hover:text-emerald-400 flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add Tracking
                                    </button>
                                )}
                            </div>
                            {order.tracking_number ? (
                                <div className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded">
                                    <div className="p-3 bg-zinc-800 rounded-full">
                                        <Truck size={20} className="text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Tracking Number</p>
                                        <p className="text-lg text-white font-mono tracking-wider">{order.tracking_number}</p>
                                        {order.carrier && <p className="text-xs text-zinc-400 mt-1">Carrier: <span className="text-white">{order.carrier}</span></p>}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed border-zinc-800 rounded">
                                    <p className="text-xs text-zinc-500">No tracking information added yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Items */}
                        <div className="bg-[#0A0A0A] border border-[#27272a]">
                            <div className="px-6 py-4 border-b border-[#27272a]">
                                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Order Items ({order.items?.length || 0})</h2>
                            </div>
                            <div className="divide-y divide-[#27272a]">
                                {order.items?.map((item: any) => (
                                    <div key={item.id} className="flex gap-4 p-4">
                                        {item.image && <img src={item.image} alt="" className="w-16 h-16 object-cover border border-[#27272a]" />}
                                        <div className="flex-1">
                                            <p className="text-sm text-white font-medium">{item?.product_name || 'Unknown'}</p>
                                            <p className="text-[10px] text-zinc-500 font-mono mt-1">SKU: {item.variant_sku || 'N/A'}</p>
                                            {item.variant_details && (
                                                <div className="flex gap-2 mt-1">
                                                    {item.variant_details.color && <span className="text-[10px] text-zinc-400">Color: {item.variant_details.color}</span>}
                                                    {item.variant_details.length && <span className="text-[10px] text-zinc-400">Length: {item.variant_details.length}</span>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-white font-medium">{formatCurrency(item.unit_price)}</p>
                                            <p className="text-[10px] text-zinc-500 font-mono">× {item.quantity}</p>
                                            <p className="text-sm text-emerald-400 font-medium mt-1">{formatCurrency(item.subtotal)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Addresses */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-[#0A0A0A] border border-[#27272a] p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Truck size={16} className="text-zinc-500" />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Shipping Address</h3>
                                </div>
                                {order.shipping_address && (
                                    <div className="text-sm text-zinc-400 space-y-1">
                                        <p className="text-white font-medium">{order.shipping_address?.name}</p>
                                        <p>{order.shipping_address?.address}</p>
                                        <p>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.zip_code}</p>
                                        <p>{order.shipping_address?.country}</p>
                                        <p className="flex items-center gap-2 mt-2"><Phone size={12} />{order.shipping_address?.phone}</p>
                                    </div>
                                )}
                            </div>
                            <div className="bg-[#0A0A0A] border border-[#27272a] p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <CreditCard size={16} className="text-zinc-500" />
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Billing Address</h3>
                                </div>
                                {(order.billing_address || order.shipping_address) && (
                                    <div className="text-sm text-zinc-400 space-y-1">
                                        <p className="text-white font-medium">{(order.billing_address || order.shipping_address)?.name}</p>
                                        <p>{(order.billing_address || order.shipping_address)?.address}</p>
                                        <p>{(order.billing_address || order.shipping_address)?.city}, {(order.billing_address || order.shipping_address)?.state} {(order.billing_address || order.shipping_address)?.zip_code}</p>
                                        <p>{(order.billing_address || order.shipping_address)?.country}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 pb-4 border-b border-[#27272a]">Order Summary</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm"><span className="text-zinc-500">Subtotal</span><span className="text-white">{formatCurrency(order.subtotal)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-zinc-500">Shipping</span><span className="text-white">{formatCurrency(order.shipping || 0)}</span></div>
                                {order.discount_amount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-zinc-500">Discount</span>
                                            {order.coupon_code && <span className="text-[10px] text-zinc-600 font-mono uppercase">Code: {order.coupon_code}</span>}
                                        </div>
                                        <span className="text-emerald-400">-{formatCurrency(order.discount_amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm"><span className="text-zinc-500">Tax</span><span className="text-white">{formatCurrency(order.tax || 0)}</span></div>
                                <div className="flex justify-between text-lg font-bold pt-3 border-t border-[#27272a]">
                                    <span className="text-white">Total</span>
                                    <span className="text-emerald-400">{formatCurrency(order.total)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 pb-4 border-b border-[#27272a]">Customer</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-zinc-500" /><span className="text-white font-mono">{order.customer_email}</span></div>
                                <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-zinc-500" /><span className="text-white font-mono">{order.customer_phone}</span></div>
                            </div>
                        </div>

                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 pb-4 border-b border-[#27272a]">Payment</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Status</span>
                                    <span className={`uppercase font-bold ${order.payment_status === 'paid' ? 'text-emerald-400' : order.payment_status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
                                        {order.payment_status}
                                    </span>
                                </div>
                                {order.payment_reference && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-500">Reference</span>
                                        <span className="text-white font-mono text-xs">{order.payment_reference}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {order.notes && (
                            <div className="bg-[#0A0A0A] border border-[#27272a] p-6">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 pb-4 border-b border-[#27272a]">Notes</h3>
                                <p className="text-sm text-zinc-400">{order.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Desktop Modals */}
            {showRefundModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full">
                        <h2 className="text-lg text-white font-bold mb-4">Confirm Refund</h2>
                        <p className="text-sm text-zinc-400 mb-6">
                            Refund order <span className="text-white font-mono">{order.order_number}</span>? This will refund {formatCurrency(order.total)}.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowRefundModal(false)} className="flex-1 px-4 py-2 bg-zinc-800 text-white text-sm font-bold uppercase hover:bg-zinc-700">Cancel</button>
                            <button onClick={handleRefund} disabled={refundMutation.isPending} className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-bold uppercase hover:bg-red-600 disabled:opacity-50">
                                {refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTrackingModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full">
                        <h2 className="text-lg text-white font-bold mb-4">Add Tracking Info</h2>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Tracking Number</label>
                                <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="w-full h-10 px-3 bg-[#050505] border border-[#27272a] text-white focus:outline-none focus:border-zinc-600" placeholder="Enter tracking number..." />
                            </div>
                            <div>
                                <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Carrier (Optional)</label>
                                <input type="text" value={carrier} onChange={(e) => setCarrier(e.target.value)} className="w-full h-10 px-3 bg-[#050505] border border-[#27272a] text-white focus:outline-none focus:border-zinc-600" placeholder="e.g. FedEx, DHL..." />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowTrackingModal(false)} className="flex-1 px-4 py-2 bg-zinc-800 text-white text-sm font-bold uppercase hover:bg-zinc-700">Cancel</button>
                            <button onClick={handleAddTracking} disabled={!trackingNumber || trackingMutation.isPending} className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-bold uppercase hover:bg-emerald-700 disabled:opacity-50">
                                {trackingMutation.isPending ? 'Saving...' : 'Save Tracking'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showVerifyModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full">
                        <h2 className="text-lg text-white font-bold mb-4">Verify Payment</h2>
                        <p className="text-sm text-zinc-400 mb-4">Verify payment for order <span className="text-white font-mono">{order.order_number}</span>.</p>
                        <div className="mb-6 p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={forceVerify} onChange={(e) => setForceVerify(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                                <div>
                                    <span className="text-sm text-white font-medium">Force verify payment</span>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">Mark as paid without API verification</p>
                                </div>
                            </label>
                        </div>
                        {forceVerify && (
                            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                                <p className="text-xs text-amber-400">⚠️ Warning: Force-verify bypasses payment gateway verification.</p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button onClick={() => { setShowVerifyModal(false); setForceVerify(false); }} className="flex-1 px-4 py-2 bg-zinc-800 text-white text-sm font-bold uppercase hover:bg-zinc-700">Cancel</button>
                            <button onClick={handleVerifyPayment} disabled={verifyMutation.isPending} className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-bold uppercase hover:bg-emerald-700 disabled:opacity-50">
                                {verifyMutation.isPending ? 'Verifying...' : 'Verify Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
