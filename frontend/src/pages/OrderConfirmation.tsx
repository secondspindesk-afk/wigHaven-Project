import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useOrder } from '@/lib/hooks/useOrders';
import { Loader2, Check, ShoppingBag, Package } from 'lucide-react';

export default function OrderConfirmation() {
    const { orderNumber } = useParams<{ orderNumber: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const email = searchParams.get('email') || undefined;

    const [isConfirmed, setIsConfirmed] = useState(false);
    const [hasTimedOut, setHasTimedOut] = useState(false);
    const [pollingStartTime] = useState(Date.now());

    // Poll for order updates every 3 seconds - STOP when payment confirmed/failed OR timeout
    const { data: order, isLoading, error } = useOrder(orderNumber!, {
        // @ts-ignore - refetchInterval accepts function returning false
        refetchInterval: (data: any) => {
            // Check timeout (5 minutes = 300,000ms)
            const elapsed = Date.now() - pollingStartTime;
            if (elapsed > 300000) {
                setHasTimedOut(true);
                return false;
            }

            // Stop polling if payment is confirmed or failed
            if (data?.payment_status === 'paid' || data?.payment_status === 'failed') {
                return false; // Stop polling
            }
            return 3000; // Continue polling every 3 seconds
        },
        email: email
    });

    // Check if payment is confirmed
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
                <div className="max-w-md w-full bg-[#0A0A0A] border border-red-500/30 rounded-lg p-8 text-center">
                    <h1 className="text-2xl font-bold text-red-400 uppercase tracking-wider mb-4">
                        Order Not Found
                    </h1>
                    <p className="text-zinc-500 text-sm mb-8">
                        We couldn't find this order. Please check your email for order details.
                    </p>
                    <button
                        onClick={() => navigate('/shop')}
                        className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-sm hover:bg-zinc-200 transition-colors"
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
                <div className="max-w-md w-full bg-[#0A0A0A] border border-[#27272a] rounded-lg p-8 text-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-400">
                        <Check size={40} className="stroke-[3]" />
                    </div>

                    <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">
                        Payment Confirmed!
                    </h1>
                    <p className="text-zinc-500 text-sm mb-8">
                        Your order has been confirmed and is being processed.
                    </p>

                    <div className="bg-zinc-900/50 rounded-lg p-4 mb-8 border border-zinc-800">
                        <p className="text-zinc-500 text-xs font-mono mb-1 uppercase tracking-widest">Order Number</p>
                        <p className="text-xl font-mono text-white font-bold">{order.order_number}</p>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-8">
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
                            className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <Package size={16} />
                            View Order Details
                        </button>

                        <button
                            onClick={() => navigate('/shop')}
                            className="w-full text-zinc-500 font-bold text-xs uppercase tracking-widest py-4 hover:text-white transition-colors flex items-center justify-center gap-2"
                        >
                            <ShoppingBag size={16} />
                            Continue Shopping
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // WAITING FOR CONFIRMATION
    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#0A0A0A] border border-[#27272a] rounded-lg p-8 text-center">
                {hasTimedOut ? (
                    // TIMEOUT STATE
                    <>
                        <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader2 className="w-8 h-8 text-orange-400" />
                        </div>

                        <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">
                            Payment Verification Taking Longer
                        </h1>
                        <p className="text-zinc-500 text-sm mb-8">
                            We're still waiting for payment confirmation. This can sometimes take a few minutes.
                        </p>

                        <div className="bg-zinc-900/50 rounded-lg p-4 mb-8 border border-zinc-800">
                            <p className="text-zinc-500 text-xs font-mono mb-1 uppercase tracking-widest">Order Number</p>
                            <p className="text-xl font-mono text-white font-bold">{order?.order_number}</p>
                        </div>

                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6 mb-6">
                            <p className="text-orange-400 text-xs leading-relaxed">
                                If payment was successful, you'll receive an email confirmation shortly.
                                <br /><br />
                                You can safely close this page and check your email or order history.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/account/orders')}
                                className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-sm hover:bg-zinc-200 transition-colors"
                            >
                                View Order History
                            </button>
                            <button
                                onClick={() => navigate('/shop')}
                                className="w-full text-zinc-500 font-bold text-xs uppercase tracking-widest py-4 hover:text-white transition-colors"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    </>
                ) : (
                    // NORMAL WAITING STATE
                    <>
                        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
                        </div>

                        <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">
                            Processing Payment
                        </h1>
                        <p className="text-zinc-500 text-sm mb-8">
                            Please wait while we confirm your payment...
                        </p>

                        <div className="bg-zinc-900/50 rounded-lg p-4 mb-8 border border-zinc-800">
                            <p className="text-zinc-500 text-xs font-mono mb-1 uppercase tracking-widest">Order Number</p>
                            <p className="text-xl font-mono text-white font-bold">{order?.order_number}</p>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                                <p className="text-yellow-400 font-bold uppercase tracking-wider text-sm">
                                    Waiting for Confirmation
                                </p>
                            </div>
                            <p className="text-zinc-400 text-xs leading-relaxed">
                                We're checking with the payment provider. This usually takes a few seconds.
                                <br />
                                <strong className="text-white">Do not close this page.</strong>
                            </p>
                        </div>

                        <div className="p-4 bg-zinc-900/30 rounded border border-zinc-800">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <p className="text-xs text-zinc-400 uppercase tracking-wider">
                                    Real-time updates active
                                </p>
                            </div>
                            <p className="text-[10px] text-zinc-600 text-center">
                                This page will automatically update when payment is confirmed
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
