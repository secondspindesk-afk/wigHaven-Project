import { useState, useEffect } from 'react';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';
import { Smartphone, Check, CreditCard, Banknote, ChevronDown, ChevronUp, ArrowLeft, ShoppingBag } from 'lucide-react';
import { usePublicSettings } from '@/lib/hooks/useSettings';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

import { Loader2 } from 'lucide-react';

interface ReviewStepProps {
    cart: any;
    onBack: () => void;
    onProceed: () => void;
    phoneNumber: string;
    setPhoneNumber: (phone: string) => void;
    paymentProvider: string;
    setPaymentProvider: (provider: string) => void;
    isProcessing?: boolean;
}

const MOMO_PROVIDERS = [
    { id: 'mtn', name: 'MTN MoMo', color: '#FFCC00' },
    { id: 'vod', name: 'Telecel', color: '#E60000' },
    { id: 'tgo', name: 'AirtelTigo', color: '#D52B1E' }
];

export default function ReviewStep({
    cart,
    onBack,
    onProceed,
    phoneNumber,
    setPhoneNumber,
    paymentProvider,
    setPaymentProvider,
    isProcessing = false
}: ReviewStepProps) {
    const { formatPrice } = useCurrencyContext();
    const { data: settings } = usePublicSettings();
    const isMobile = useIsMobile();
    const [showItems, setShowItems] = useState(false);

    if (!cart) return null;

    // Calculate dynamic shipping
    const shippingRate = settings?.shippingFlatRate ?? 25;
    const freeShippingThreshold = settings?.freeShippingThreshold ?? 500;
    const shippingCost = cart.subtotal >= freeShippingThreshold ? 0 : shippingRate;
    const discountAmount = cart.discount?.amount || 0;
    const total = Math.max(0, cart.subtotal - discountAmount + shippingCost + (cart.tax || 0));

    // Cash on Delivery is coming soon - don't allow it yet
    const canProceed = paymentProvider !== 'cash' && phoneNumber.length >= 10;

    // Lock body scroll for sticky button
    useEffect(() => {
        if (isMobile) {
            document.body.style.paddingBottom = '160px';
            return () => { document.body.style.paddingBottom = ''; };
        }
    }, [isMobile]);

    // Mobile Layout
    if (isMobile) {
        // Show loading overlay when processing
        if (isProcessing) {
            return (
                <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-[#00C3F7]/10 rounded-full flex items-center justify-center mb-6">
                        <Loader2 className="w-8 h-8 animate-spin text-[#00C3F7]" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Initializing Payment...</h2>
                    <p className="text-sm text-zinc-500">Please wait while we set up your payment</p>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-[#050505] pb-44">
                {/* Header */}
                <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-sm border-b border-zinc-800">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-lg font-bold text-white">Review Order</h1>
                    </div>
                </div>

                <div className="px-4 pt-4 space-y-4">
                    {/* Payment Methods */}
                    <div className="bg-zinc-900 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <CreditCard size={18} className="text-[#00C3F7]" />
                            <h2 className="text-sm font-bold text-white">Payment Method</h2>
                        </div>

                        {settings?.paymentMethods?.card && (
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {MOMO_PROVIDERS.map((provider) => (
                                    <button
                                        key={provider.id}
                                        onClick={() => setPaymentProvider(provider.id)}
                                        className={`relative p-3 rounded-lg border-2 transition-all ${paymentProvider === provider.id
                                            ? 'border-[#00C3F7] bg-[#00C3F7]/10'
                                            : 'border-zinc-700 bg-zinc-800'
                                            }`}
                                    >
                                        {paymentProvider === provider.id && (
                                            <Check size={12} className="absolute top-1.5 right-1.5 text-[#00C3F7]" />
                                        )}
                                        <div className="text-xs font-bold text-white">{provider.id.toUpperCase()}</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {settings?.paymentMethods?.cash && (
                            <div>
                                <button
                                    onClick={() => setPaymentProvider('cash')}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${paymentProvider === 'cash'
                                        ? 'border-emerald-500 bg-emerald-500/10'
                                        : 'border-zinc-700 bg-zinc-800'
                                        }`}
                                >
                                    <div className={`p-2 rounded-full ${paymentProvider === 'cash' ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-400'}`}>
                                        <Banknote size={16} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="text-xs font-bold text-white">Cash on Delivery</div>
                                        <div className="text-[10px] text-zinc-500 mt-0.5">Pay when you receive</div>
                                    </div>
                                    {paymentProvider === 'cash' && <Check size={16} className="text-emerald-500" />}
                                </button>
                                {paymentProvider === 'cash' && (
                                    <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                        <p className="text-xs text-emerald-400 font-medium">🚀 Coming Soon!</p>
                                        <p className="text-[10px] text-zinc-400 mt-1">Make payment when your order arrives. Place your order now and pay upon delivery.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Phone Input */}
                        {paymentProvider !== 'cash' && (
                            <div className="mt-4">
                                <label className="text-xs text-zinc-500 mb-2 block">Mobile Money Number</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="0241234567"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-[#00C3F7] focus:outline-none"
                                />
                                <p className="text-zinc-600 text-[10px] mt-2">
                                    Test: <button type="button" onClick={() => setPhoneNumber('0551234987')} className="text-[#00C3F7] font-mono hover:underline">0551234987</button> (tap to use)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Order Items (Collapsible) */}
                    <div className="bg-zinc-900 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setShowItems(!showItems)}
                            className="w-full flex items-center justify-between p-4"
                        >
                            <div className="flex items-center gap-2">
                                <ShoppingBag size={18} className="text-zinc-500" />
                                <span className="text-sm font-bold text-white">Order Items ({cart.items.length})</span>
                            </div>
                            {showItems ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
                        </button>

                        {showItems && (
                            <div className="border-t border-zinc-800">
                                {cart.items.map((item: any) => (
                                    <div key={item.variant_id} className="flex gap-3 p-4 border-b border-zinc-800 last:border-0">
                                        <div className="w-14 h-18 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                                            {item.images?.[0] && (
                                                <img src={item.images[0]} alt={item.product_name} className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm text-white font-medium line-clamp-1">{item.product_name}</h3>
                                            <p className="text-xs text-zinc-500">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="text-sm text-white font-bold">{formatPrice(item.unit_price * item.quantity)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm text-zinc-400">
                            <span>Subtotal</span>
                            <span>{formatPrice(cart.subtotal)}</span>
                        </div>
                        {cart.discount && (
                            <div className="flex justify-between text-sm text-emerald-400">
                                <span>Discount ({cart.discount.code})</span>
                                <span>-{formatPrice(cart.discount.amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm text-zinc-400">
                            <span>Shipping</span>
                            <span className={shippingCost === 0 ? 'text-emerald-400' : ''}>{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-zinc-400">
                            <span>Tax</span>
                            <span>{formatPrice(cart.tax)}</span>
                        </div>
                    </div>
                </div>

                {/* Sticky Checkout Bar */}
                <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-zinc-800 p-4 z-50">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-xs text-zinc-500">Total</p>
                            <p className="text-xl font-bold text-white">{formatPrice(total)}</p>
                        </div>
                        {paymentProvider !== 'cash' && !canProceed && (
                            <p className="text-xs text-yellow-500">Enter phone number</p>
                        )}
                    </div>
                    <button
                        onClick={onProceed}
                        disabled={!canProceed}
                        className="w-full bg-white text-black font-bold text-sm py-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {paymentProvider === 'cash' ? <Banknote size={18} /> : <Smartphone size={18} />}
                        {paymentProvider === 'cash' ? 'Place Order' : 'Create Order & Pay'}
                    </button>
                </div>
            </div>
        );
    }

    // Desktop Layout
    // Show loading overlay when processing
    if (isProcessing) {
        return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-12 text-center">
                    <div className="w-20 h-20 bg-[#00C3F7]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Loader2 className="w-10 h-10 animate-spin text-[#00C3F7]" />
                    </div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">Initializing Payment...</h2>
                    <p className="text-sm text-zinc-500">Please wait while we set up your payment</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Payment Section */}
                <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <CreditCard size={20} className="text-[#00C3F7]" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Payment Method</h2>
                    </div>

                    <div className="mb-6 space-y-4">
                        {settings?.paymentMethods?.card && (
                            <div>
                                <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-3 font-semibold">Mobile Money / Card (Paystack)</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {MOMO_PROVIDERS.map((provider) => (
                                        <button
                                            key={provider.id}
                                            onClick={() => setPaymentProvider(provider.id)}
                                            className={`relative p-4 rounded-lg border-2 transition-all ${paymentProvider === provider.id ? 'border-[#00C3F7] bg-[#00C3F7]/10' : 'border-[#27272a] bg-zinc-900/30 hover:border-zinc-700'}`}
                                        >
                                            {paymentProvider === provider.id && <div className="absolute top-2 right-2"><Check size={14} className="text-[#00C3F7]" /></div>}
                                            <div className="text-xs font-bold text-white uppercase tracking-wider">{provider.id.toUpperCase()}</div>
                                            <div className="text-[10px] text-zinc-500 mt-1">{provider.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {settings?.paymentMethods?.cash && (
                            <div className="mt-6">
                                <button
                                    onClick={() => setPaymentProvider('cash')}
                                    className={`w-full relative p-4 rounded-lg border-2 transition-all flex items-center gap-4 ${paymentProvider === 'cash' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#27272a] bg-zinc-900/30 hover:border-zinc-700'}`}
                                >
                                    <div className={`p-2 rounded-full ${paymentProvider === 'cash' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}><Banknote size={20} /></div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-white uppercase tracking-wider">Cash on Delivery</div>
                                        <div className="text-[10px] text-zinc-500 mt-1">Pay when you receive your order</div>
                                    </div>
                                    {paymentProvider === 'cash' && <div className="absolute top-4 right-4"><Check size={14} className="text-emerald-500" /></div>}
                                </button>
                                {paymentProvider === 'cash' && (
                                    <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                                        <p className="text-sm text-emerald-400 font-bold uppercase tracking-wider">🚀 Coming Soon!</p>
                                        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">Pay with cash when your order arrives at your doorstep. Place your order now and complete payment upon delivery.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {paymentProvider !== 'cash' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-3 font-semibold">Phone Number</label>
                            <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0241234567" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-white font-mono focus:border-[#00C3F7] focus:outline-none transition-colors" />
                            <p className="text-zinc-600 text-[10px] mt-2">
                                Test: <button type="button" onClick={() => setPhoneNumber('0551234987')} className="text-[#00C3F7] font-mono hover:underline cursor-pointer">0551234987</button> (click to use)
                            </p>
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg overflow-hidden">
                    <div className="p-6 border-b border-[#27272a]"><h2 className="text-sm font-bold text-white uppercase tracking-widest">Order Items ({cart.items.length})</h2></div>
                    <div className="divide-y divide-[#27272a]">
                        {cart.items.map((item: any) => (
                            <div key={item.variant_id} className="p-6 flex gap-4">
                                <div className="w-16 h-20 bg-zinc-900 rounded-sm overflow-hidden flex-shrink-0">{item.images?.[0] && <img src={item.images[0]} alt={item.product_name} className="w-full h-full object-cover" />}</div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-white font-bold text-sm">{item.product_name}</h3>
                                            <p className="text-zinc-500 text-xs font-mono mt-1">Qty: {item.quantity}</p>
                                            <p className="text-zinc-500 text-[10px] font-mono mt-1 uppercase">{Object.entries(item.attributes || {}).filter(([_, value]) => value).map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-mono font-bold">{formatPrice(item.unit_price * item.quantity)}</p>
                                            {item.quantity > 1 && <p className="text-zinc-600 text-[10px] font-mono">{formatPrice(item.unit_price)} EA</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary Sidebar */}
            <div className="space-y-6">
                <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6 sticky top-24">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Order Summary</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span>{formatPrice(cart.subtotal)}</span></div>
                        {cart.discount && <div className="flex justify-between text-emerald-500"><span>Discount ({cart.discount.code})</span><span>-{formatPrice(cart.discount.amount)}</span></div>}
                        <div className="flex justify-between text-zinc-400"><span>Shipping</span><span>{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</span></div>
                        <div className="flex justify-between text-zinc-400"><span>Tax</span><span>{formatPrice(cart.tax)}</span></div>
                        <div className="pt-4 border-t border-[#27272a] flex justify-between text-white font-bold text-lg"><span>Total</span><span className="font-mono">{formatPrice(total)}</span></div>
                    </div>

                    <button onClick={onProceed} disabled={!canProceed} className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-sm hover:bg-zinc-200 transition-colors mt-8 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {paymentProvider === 'cash' ? <Banknote size={16} /> : <Smartphone size={16} />}
                        {paymentProvider === 'cash' ? 'Place Order' : 'Create Order & Pay'}
                    </button>

                    <button onClick={onBack} className="w-full mt-3 text-zinc-500 hover:text-white text-xs uppercase tracking-wider transition-colors">← Back</button>

                    {!canProceed && paymentProvider !== 'cash' && <p className="text-yellow-500 text-[10px] text-center mt-3">Please enter your mobile money phone number</p>}
                </div>
            </div>
        </div>
    );
}
