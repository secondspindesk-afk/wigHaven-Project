import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useOrder } from '@/lib/hooks/useOrders';
import { Loader2, Check, ShoppingBag, Package } from 'lucide-react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function OrderConfirmation() {
    const { orderNumber } = useParams<{ orderNumber: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const email = searchParams.get('email') || undefined;
    const isMobile = useIsMobile();

    const [isConfirmed, setIsConfirmed] = useState(false);

    // Real-time order tracking via WebSocket (no polling needed)
    // WebSocketContext invalidates ['orders'] cache when payment notification arrives
    const { data: order, isLoading, error } = useOrder(orderNumber!, {
        email: email
    });

    useEffect(() => {
        if (order?.payment_status === 'paid') {
            setIsConfirmed(true);
        }
    }, [order]);

    if (isLoading && !order) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
                <div className={`w-full bg-[#0A0A0A] border border-red-500/30 p-8 text-center ${isMobile ? 'rounded-2xl' : 'max-w-md rounded-lg'}`}>
                    <h1 className={`font-bold text-red-400 mb-4 ${isMobile ? 'text-xl' : 'text-2xl uppercase tracking-wider'}`}>
                        Order Not Found
                    </h1>
                    <p className="text-zinc-500 text-sm mb-8">
                        We couldn't find this order. Please check your email for order details.
                    </p>
                    <button
                        onClick={() => navigate('/shop')}
                        className={`w-full bg-white text-black font-bold py-4 hover:bg-zinc-200 transition-colors ${isMobile ? 'text-sm rounded-xl' : 'text-xs uppercase tracking-widest rounded-sm'}`}
                    >
                        Back to Shop
                    </button>
                </div>
            </div>
        );
    }

    // CONFIRMED STATE
    if (isConfirmed) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
                <div className={`w-full bg-[#0A0A0A] border border-[#27272a] p-8 text-center animate-in zoom-in duration-300 ${isMobile ? 'rounded-2xl' : 'max-w-md rounded-lg'}`}>
                    <div className={`bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400 ${isMobile ? 'w-16 h-16' : 'w-20 h-20'}`}>
                        <Check size={isMobile ? 32 : 40} className="stroke-[3]" />
                    </div>

                    <h1 className={`font-bold text-white mb-2 ${isMobile ? 'text-xl' : 'text-2xl uppercase tracking-wider'}`}>
                        Payment Confirmed!
                    </h1>
                    <p className="text-zinc-500 text-sm mb-6">
                        Your order has been confirmed and is being processed.
                    </p>

                    <div className={`bg-zinc-900/50 p-4 mb-6 border border-zinc-800 ${isMobile ? 'rounded-xl' : 'rounded-lg'}`}>
                        <p className="text-zinc-500 text-xs font-mono mb-1 uppercase tracking-widest">Order Number</p>
                        <p className={`font-mono text-white font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>{order.order_number}</p>
                    </div>

                    <div className={`bg-blue-500/10 border border-blue-500/30 p-4 mb-6 ${isMobile ? 'rounded-xl' : 'rounded-lg'}`}>
                        <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                            📧 Confirmation Email Sent
                        </p>
                        <p className="text-zinc-400 text-xs">
                            Check your inbox at <span className="text-white font-mono">{order.customer_email}</span>
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/account/orders')}
                            className={`w-full bg-white text-black font-bold py-4 hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 ${isMobile ? 'text-sm rounded-xl' : 'text-xs uppercase tracking-widest rounded-sm'}`}
                        >
                            <Package size={16} />
                            View Order Details
                        </button>

                        <button
                            onClick={() => navigate('/shop')}
                            className={`w-full text-zinc-500 font-bold py-4 hover:text-white transition-colors flex items-center justify-center gap-2 ${isMobile ? 'text-sm' : 'text-xs uppercase tracking-widest'}`}
                        >
                            <ShoppingBag size={16} />
                            Continue Shopping
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // WAITING FOR CONFIRMATION (WebSocket will notify when payment completes)
    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
            <div className={`w-full bg-[#0A0A0A] border border-[#27272a] p-8 text-center ${isMobile ? 'rounded-2xl' : 'max-w-md rounded-lg'}`}>
                <div className={`bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ${isMobile ? 'w-14 h-14' : 'w-16 h-16'}`}>
                    <Loader2 className={`animate-spin text-yellow-400 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
                </div>

                <h1 className={`font-bold text-white mb-2 ${isMobile ? 'text-lg' : 'text-2xl uppercase tracking-wider'}`}>
                    Processing Payment
                </h1>
                <p className="text-zinc-500 text-sm mb-6">
                    Please wait while we confirm your payment...
                </p>

                <div className={`bg-zinc-900/50 p-4 mb-6 border border-zinc-800 ${isMobile ? 'rounded-xl' : 'rounded-lg'}`}>
                    <p className="text-zinc-500 text-xs font-mono mb-1 uppercase tracking-widest">Order Number</p>
                    <p className={`font-mono text-white font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>{order?.order_number}</p>
                </div>

                <div className={`bg-yellow-500/10 border border-yellow-500/30 p-4 mb-6 ${isMobile ? 'rounded-xl' : 'rounded-lg'}`}>
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                        <p className={`text-yellow-400 font-bold uppercase tracking-wider ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            Waiting for Confirmation
                        </p>
                    </div>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                        We're checking with the payment provider. This usually takes a few seconds.
                        <br />
                        <strong className="text-white">Do not close this page.</strong>
                    </p>
                </div>

                <div className={`p-4 bg-zinc-900/30 border border-zinc-800 ${isMobile ? 'rounded-xl' : 'rounded'}`}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-xs text-zinc-400 uppercase tracking-wider">
                            Real-time updates via WebSocket
                        </p>
                    </div>
                    <p className="text-[10px] text-zinc-600 text-center">
                        This page will automatically update when payment is confirmed
                    </p>
                </div>
            </div>
        </div>
    );
}
