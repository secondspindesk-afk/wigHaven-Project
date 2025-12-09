import { useCurrencyContext } from '@/lib/context/CurrencyContext';
import { Smartphone, Check, CreditCard, Banknote } from 'lucide-react';
import { usePublicSettings } from '@/lib/hooks/useSettings';

interface ReviewStepProps {
    cart: any;
    onBack: () => void;
    onProceed: () => void;
    phoneNumber: string;
    setPhoneNumber: (phone: string) => void;
    paymentProvider: string;
    setPaymentProvider: (provider: string) => void;
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
    setPaymentProvider
}: ReviewStepProps) {
    const { formatPrice } = useCurrencyContext();
    const { data: settings } = usePublicSettings();

    if (!cart) return null;

    // Calculate dynamic shipping
    const shippingRate = settings?.shippingFlatRate ?? 25;
    const freeShippingThreshold = settings?.freeShippingThreshold ?? 500;
    const shippingCost = cart.subtotal >= freeShippingThreshold ? 0 : shippingRate;

    // Recalculate total with dynamic shipping
    // Note: cart.total from backend might be stale if settings changed recently, 
    // so we recalculate here for display. Ideally backend should also use these settings.
    const discountAmount = cart.discount?.amount || 0;
    const total = Math.max(0, cart.subtotal - discountAmount + shippingCost + (cart.tax || 0));

    const canProceed = paymentProvider === 'cash' ? true : phoneNumber.length >= 10;

    return (
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Payment Section */}
                <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <CreditCard size={20} className="text-[#00C3F7]" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                            Payment Method
                        </h2>
                    </div>

                    {/* Method Selector */}
                    <div className="mb-6 space-y-4">
                        {settings?.paymentMethods?.card && (
                            <div>
                                <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-3 font-semibold">
                                    Mobile Money / Card (Paystack)
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {MOMO_PROVIDERS.map((provider) => (
                                        <button
                                            key={provider.id}
                                            onClick={() => setPaymentProvider(provider.id)}
                                            className={`
                                                relative p-4 rounded-lg border-2 transition-all
                                                ${paymentProvider === provider.id
                                                    ? 'border-[#00C3F7] bg-[#00C3F7]/10'
                                                    : 'border-[#27272a] bg-zinc-900/30 hover:border-zinc-700'
                                                }
                                            `}
                                        >
                                            {paymentProvider === provider.id && (
                                                <div className="absolute top-2 right-2">
                                                    <Check size={14} className="text-[#00C3F7]" />
                                                </div>
                                            )}
                                            <div className="text-xs font-bold text-white uppercase tracking-wider">
                                                {provider.id.toUpperCase()}
                                            </div>
                                            <div className="text-[10px] text-zinc-500 mt-1">
                                                {provider.name}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {settings?.paymentMethods?.cash && (
                            <div className="mt-6">
                                <button
                                    onClick={() => setPaymentProvider('cash')}
                                    className={`
                                        w-full relative p-4 rounded-lg border-2 transition-all flex items-center gap-4
                                        ${paymentProvider === 'cash'
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-[#27272a] bg-zinc-900/30 hover:border-zinc-700'
                                        }
                                    `}
                                >
                                    <div className={`p-2 rounded-full ${paymentProvider === 'cash' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                        <Banknote size={20} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-white uppercase tracking-wider">
                                            Cash on Delivery
                                        </div>
                                        <div className="text-[10px] text-zinc-500 mt-1">
                                            Pay when you receive your order
                                        </div>
                                    </div>
                                    {paymentProvider === 'cash' && (
                                        <div className="absolute top-4 right-4">
                                            <Check size={14} className="text-emerald-500" />
                                        </div>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Phone Number Input (Only for MoMo) */}
                    {paymentProvider !== 'cash' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-3 font-semibold">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="0241234567"
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-white font-mono focus:border-[#00C3F7] focus:outline-none transition-colors"
                            />
                            <p className="text-zinc-600 text-[10px] mt-2">
                                Payment prompt will be sent to this number
                            </p>
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg overflow-hidden">
                    <div className="p-6 border-b border-[#27272a]">
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                            Order Items ({cart.items.length})
                        </h2>
                    </div>
                    <div className="divide-y divide-[#27272a]">
                        {cart.items.map((item: any) => (
                            <div key={item.variant_id} className="p-6 flex gap-4">
                                <div className="w-16 h-20 bg-zinc-900 rounded-sm overflow-hidden flex-shrink-0">
                                    {item.images?.[0] && (
                                        <img
                                            src={item.images[0]}
                                            alt={item.product_name}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-white font-bold text-sm">
                                                {item.product_name}
                                            </h3>
                                            <p className="text-zinc-500 text-xs font-mono mt-1">
                                                Qty: {item.quantity}
                                            </p>
                                            <p className="text-zinc-500 text-[10px] font-mono mt-1 uppercase">
                                                {Object.entries(item.attributes || {})
                                                    .filter(([_, value]) => value)
                                                    .map(([key, value]) => `${key}: ${value}`)
                                                    .join(' · ')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-mono font-bold">
                                                {formatPrice(item.unit_price * item.quantity)}
                                            </p>
                                            {item.quantity > 1 && (
                                                <p className="text-zinc-600 text-[10px] font-mono">
                                                    {formatPrice(item.unit_price)} EA
                                                </p>
                                            )}
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
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6">
                        Order Summary
                    </h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-zinc-400">
                            <span>Subtotal</span>
                            <span>{formatPrice(cart.subtotal)}</span>
                        </div>
                        {cart.discount && (
                            <div className="flex justify-between text-emerald-500">
                                <span>Discount ({cart.discount.code})</span>
                                <span>-{formatPrice(cart.discount.amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-zinc-400">
                            <span>Shipping</span>
                            <span>{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Tax</span>
                            <span>{formatPrice(cart.tax)}</span>
                        </div>
                        <div className="pt-4 border-t border-[#27272a] flex justify-between text-white font-bold text-lg">
                            <span>Total</span>
                            <span className="font-mono">{formatPrice(total)}</span>
                        </div>
                    </div>

                    <button
                        onClick={onProceed}
                        disabled={!canProceed}
                        className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-sm hover:bg-zinc-200 transition-colors mt-8 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {paymentProvider === 'cash' ? <Banknote size={16} /> : <Smartphone size={16} />}
                        {paymentProvider === 'cash' ? 'Place Order' : 'Create Order & Pay'}
                    </button>

                    <button
                        onClick={onBack}
                        className="w-full mt-3 text-zinc-500 hover:text-white text-xs uppercase tracking-wider transition-colors"
                    >
                        ← Back
                    </button>

                    {!canProceed && paymentProvider !== 'cash' && (
                        <p className="text-yellow-500 text-[10px] text-center mt-3">
                            Please enter your mobile money phone number
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
