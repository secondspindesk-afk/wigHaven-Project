import { useState, useEffect } from 'react';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';
import { ShieldCheck, Smartphone, Check, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useOrder } from '@/lib/hooks/useOrders';
import { useNavigate } from 'react-router-dom';

interface PaymentStepProps {
    payment: any;
    order: any;
    phoneNumber: string;
    paymentProvider: string;
    onBack: () => void;
}

const PROVIDERS: Record<string, { name: string; icon: string; color: string }> = {
    mtn: { name: 'MTN Mobile Money', icon: '📱', color: '#FFCC00' },
    vod: { name: 'Telecel Cash', icon: '📱', color: '#E60000' },
    tgo: { name: 'AirtelTigo Money', icon: '📱', color: '#D52B1E' }
};

export default function PaymentStep({ payment, order, phoneNumber, paymentProvider, onBack }: PaymentStepProps) {
    const { formatPrice } = useCurrencyContext();
    const navigate = useNavigate();
    const [isSuccess, setIsSuccess] = useState(false);
    const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

    // Real-time order tracking via WebSocket (no polling needed)
    // WebSocketContext invalidates ['orders'] cache when payment notification arrives
    const { data: liveOrder } = useOrder(order.orderNumber, {
        email: order.customerEmail || order.guestEmail // Pass email for guest authorization
    });

    // Check for payment success
    useEffect(() => {
        if (liveOrder?.payment_status === 'paid') {
            setIsSuccess(true);
        }
    }, [liveOrder]);

    // Timeout Timer
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!isSuccess && !payment?.error) {
            // Show message after 45 seconds (faster feedback)
            timer = setTimeout(() => setShowTimeoutMessage(true), 45000);
        }
        return () => clearTimeout(timer);
    }, [isSuccess, payment]);

    const provider = PROVIDERS[paymentProvider] || PROVIDERS['mtn'];
    const isPending = payment?.status === 'pending';
    const hasError = payment?.error;

    // SUCCESS VIEW
    if (isSuccess) {
        return (
            <div className="max-w-md mx-auto text-center pt-8">
                <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-8 relative overflow-hidden animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400">
                        <Check size={40} className="stroke-[3]" />
                    </div>

                    <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">
                        Order Confirmed!
                    </h1>
                    <p className="text-zinc-500 text-sm mb-8">
                        Thank you for your purchase. Your order has been received and is being processed.
                    </p>

                    <div className="bg-zinc-900/50 rounded-lg p-4 mb-8 border border-zinc-800">
                        <p className="text-zinc-500 text-xs font-mono mb-1 uppercase tracking-widest">Order Number</p>
                        <p className="text-xl font-mono text-white font-bold">{order.orderNumber}</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/account/orders')}
                            className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <ShoppingBag size={16} />
                            View Order Details
                        </button>

                        <button
                            onClick={() => navigate('/shop')}
                            className="w-full text-zinc-500 font-bold text-xs uppercase tracking-widest py-4 hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            Continue Shopping <ArrowLeft size={14} className="rotate-180" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // PAYMENT PENDING VIEW
    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400">
                        <Smartphone size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">
                        Mobile Money Payment
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        Pay securely with your mobile money account
                    </p>
                </div>

                {/* Amount Display */}
                <div className="bg-zinc-900/50 rounded-lg p-6 mb-8 border border-zinc-800 text-center">
                    <p className="text-zinc-400 text-xs uppercase tracking-widest mb-2">
                        Amount to Pay
                    </p>
                    <p className="text-4xl font-bold text-white font-mono">
                        {formatPrice(order.total)}
                    </p>
                </div>

                {/* Selected Method Display */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
                        <div className="text-2xl">{provider.icon}</div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Provider</p>
                            <p className="text-white font-bold text-sm">{provider.name}</p>
                        </div>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="text-2xl">📞</div>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Phone</p>
                                <p className="text-white font-mono text-sm">{phoneNumber}</p>
                            </div>
                        </div>
                        {/* Change Button */}
                        <button
                            onClick={onBack}
                            className="text-xs text-[#00C3F7] hover:text-white underline"
                        >
                            Change
                        </button>
                    </div>
                </div>

                {/* Payment Status */}
                {isPending && !hasError && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                            <p className="text-yellow-400 font-bold uppercase tracking-wider text-sm">
                                Waiting for Payment
                            </p>
                        </div>
                        <p className="text-zinc-300 text-sm mb-3">
                            {payment.display_text || payment.message}
                        </p>
                        <p className="text-zinc-500 text-xs">
                            Check your phone ({phoneNumber}) for the payment prompt.
                            This page will automatically update once payment is confirmed.
                        </p>
                    </div>
                )}

                {/* Error State */}
                {hasError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-6">
                        <p className="text-red-400 font-bold uppercase tracking-wider text-sm mb-2">
                            ⚠️ Payment Error
                        </p>
                        <p className="text-zinc-300 text-sm">
                            {payment.error}
                        </p>
                        <button
                            onClick={onBack}
                            className="mt-4 text-xs text-[#00C3F7] hover:underline uppercase tracking-wider font-semibold"
                        >
                            Change Details & Retry
                        </button>
                    </div>
                )}

                {/* Waiting Indicator */}
                {!hasError && (
                    <div className="p-4 bg-zinc-900/30 rounded border border-zinc-800">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <p className="text-xs text-zinc-400 uppercase tracking-wider">
                                Real-time payment tracking active
                            </p>
                        </div>
                        <p className="text-[10px] text-zinc-600 text-center">
                            Please approve the transaction on your phone
                        </p>

                        {/* Smart Timeout Message */}
                        {showTimeoutMessage && (
                            <div className="mt-4 pt-4 border-t border-zinc-800 animate-in fade-in slide-in-from-bottom-2">
                                <p className="text-yellow-500 text-xs font-bold text-center mb-1">
                                    Taking longer than expected?
                                </p>
                                <p className="text-zinc-500 text-[10px] text-center leading-relaxed mb-3">
                                    If you've already approved the payment and funds were deducted,
                                    please wait a moment. When payment is received, the order confirmation
                                    will be sent to your email.
                                    Do not close this page.
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] uppercase tracking-wider rounded transition-colors"
                                >
                                    Refresh Status
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="w-full mt-6 flex items-center justify-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs uppercase tracking-widest"
                >
                    <ArrowLeft size={14} />
                    Cancel & Go Back
                </button>

                {/* Security Badge */}
                <div className="mt-8 flex items-center justify-center gap-2 text-zinc-600">
                    <ShieldCheck size={14} />
                    <p className="text-xs uppercase tracking-wider">
                        Secured by Paystack
                    </p>
                </div>
            </div>
        </div>
    );
}
