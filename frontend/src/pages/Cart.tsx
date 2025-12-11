import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, X, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { useCart } from '@/lib/hooks/useCart';
import { useUpdateCart } from '@/lib/hooks/useUpdateCart';
import { useRemoveFromCart } from '@/lib/hooks/useRemoveFromCart';
import { formatCurrency } from '@/lib/utils/currency';
import { useToast } from '@/contexts/ToastContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import cartService from '@/lib/api/cart';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function Cart() {
    const navigate = useNavigate();
    const { data: cart, isLoading } = useCart();
    const updateCartMutation = useUpdateCart();
    const removeFromCartMutation = useRemoveFromCart();
    const { showToast } = useToast();
    const isMobile = useIsMobile();

    const [couponCode, setCouponCode] = useState('');
    const [showCoupon, setShowCoupon] = useState(false);
    const queryClient = useQueryClient();

    const handleCheckout = () => {
        // With LocalStorage-first pattern, skip server validation
        // Stock validation happens during order creation
        if (cart && cart.items.length > 0) {
            navigate('/checkout');
        }
    };

    const handleUpdateQuantity = (variantId: string, newQuantity: number) => {
        if (newQuantity < 1) return;
        updateCartMutation.mutate({ variantId, quantity: newQuantity });
    };

    const handleRemoveItem = (itemId: string) => {
        removeFromCartMutation.mutate(itemId);
    };

    const applyCouponMutation = useMutation({
        mutationFn: (code: string) => cartService.applyCoupon({ code }),
        onSuccess: (data) => {
            queryClient.setQueryData(['cart'], data);
            showToast('Coupon applied!', 'success');
            setCouponCode('');
            setShowCoupon(false);
        },
        onError: (error: any) => {
            showToast(error.response?.data?.message || 'Invalid coupon', 'error');
        }
    });

    const removeCouponMutation = useMutation({
        mutationFn: cartService.removeCoupon,
        onSuccess: (data) => {
            queryClient.setQueryData(['cart'], data);
            showToast('Coupon removed', 'success');
        }
    });

    const handleApplyCoupon = () => {
        if (!couponCode.trim()) return;
        applyCouponMutation.mutate(couponCode);
    };

    // Lock body scroll when checkout bar is present
    useEffect(() => {
        if (isMobile && cart && cart.items.length > 0) {
            document.body.style.paddingBottom = '140px';
            return () => { document.body.style.paddingBottom = ''; };
        }
    }, [isMobile, cart]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] py-12 flex items-center justify-center">
                <div className="text-zinc-500 font-mono text-xs animate-pulse">LOADING...</div>
            </div>
        );
    }

    if (!cart || cart.items.length === 0) {
        return (
            <div className={`min-h-screen bg-[#050505] ${isMobile ? 'py-12 px-4' : 'py-24'}`}>
                <div className={`${isMobile ? '' : 'container mx-auto px-4 max-w-4xl'} text-center`}>
                    <div className={`${isMobile ? 'bg-zinc-900 rounded-xl p-8' : 'border border-[#27272a] bg-[#0A0A0A] rounded-sm p-12 max-w-lg mx-auto'}`}>
                        <div className={`${isMobile ? 'w-14 h-14 bg-zinc-800 rounded-full' : 'w-16 h-16 bg-[#050505] border border-[#27272a] rounded-full'} flex items-center justify-center mx-auto mb-6`}>
                            <ShoppingBag className={`${isMobile ? 'w-6 h-6' : 'w-6 h-6'} text-zinc-600`} />
                        </div>
                        <h2 className={`${isMobile ? 'text-lg' : 'text-lg'} font-bold text-white mb-2 uppercase tracking-widest`}>Your Bag is Empty</h2>
                        <p className="text-zinc-500 text-sm mb-8">
                            Looks like you haven't found your perfect style yet.
                        </p>
                        <Link
                            to="/shop"
                            className={`inline-flex items-center gap-2 bg-white text-black font-bold text-xs uppercase tracking-widest px-8 py-3 ${isMobile ? 'rounded-lg' : 'rounded-sm hover:bg-zinc-200'} transition-all`}
                        >
                            START SHOPPING <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="min-h-screen bg-[#050505] pt-4 pb-40">
                {/* Header */}
                <div className="px-4 mb-6">
                    <h1 className="text-xl font-bold text-white">
                        Shopping Bag <span className="text-zinc-500 text-sm">({cart.items_count})</span>
                    </h1>
                </div>

                {/* Items */}
                <div className="px-4 space-y-3">
                    {cart.items.map((item: any) => (
                        <div key={item.variant_id} className="bg-zinc-900 rounded-xl p-3 flex gap-3">
                            {/* Image */}
                            <div className="w-20 h-24 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                                {item.images?.[0] ? (
                                    <img src={item.images[0]} alt={item.product_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                        <ShoppingBag size={16} />
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-sm font-bold text-white line-clamp-1 pr-2">{item.product_name}</h3>
                                    <button
                                        onClick={() => handleRemoveItem(item.variant_id)}
                                        className="p-1 text-zinc-600 active:text-red-400"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <p className="text-[10px] text-zinc-500 uppercase mb-2">
                                    {Object.entries(item.attributes || {})
                                        .filter(([_, value]) => value)
                                        .map(([key, value]) => `${key}: ${value}`)
                                        .join(' • ')}
                                </p>

                                {/* Stock Warning */}
                                {item.stock !== undefined && item.quantity > item.stock && (
                                    <div className="mb-2 px-2 py-1 bg-red-500/10 rounded-lg">
                                        <p className="text-[10px] text-red-400">Only {item.stock} in stock</p>
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
                                        <button
                                            onClick={() => handleUpdateQuantity(item.variant_id, item.quantity - 1)}
                                            disabled={item.quantity <= 1}
                                            className="w-8 h-8 flex items-center justify-center text-zinc-400 active:bg-zinc-700 rounded-md disabled:opacity-30"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-8 text-center text-white font-bold text-sm">{item.quantity}</span>
                                        <button
                                            onClick={() => handleUpdateQuantity(item.variant_id, item.quantity + 1)}
                                            disabled={item.stock !== undefined && item.quantity >= item.stock}
                                            className="w-8 h-8 flex items-center justify-center text-zinc-400 active:bg-zinc-700 rounded-md disabled:opacity-30"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>

                                    {/* Price */}
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">{formatCurrency(item.unit_price * item.quantity)}</p>
                                        {item.quantity > 1 && (
                                            <p className="text-[10px] text-zinc-500">{formatCurrency(item.unit_price)} ea</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Coupon Section */}
                <div className="px-4 mt-4">
                    {!cart.discount?.code ? (
                        <div className="bg-zinc-900 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setShowCoupon(!showCoupon)}
                                className="w-full flex items-center justify-between p-4"
                            >
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <Tag size={16} />
                                    <span className="text-sm">Have a promo code?</span>
                                </div>
                                {showCoupon ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                            </button>

                            {showCoupon && (
                                <div className="px-4 pb-4">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            placeholder="ENTER CODE"
                                            className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm px-4 py-3 rounded-lg font-mono uppercase placeholder:text-zinc-600"
                                        />
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={!couponCode || applyCouponMutation.isPending}
                                            className="bg-white text-black px-6 py-3 text-sm font-bold rounded-lg disabled:opacity-50"
                                        >
                                            {applyCouponMutation.isPending ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Tag size={16} className="text-green-400" />
                                <span className="text-sm text-green-400 font-bold">{cart.discount.code}</span>
                                <span className="text-sm text-green-400">-{formatCurrency(cart.discount.amount)}</span>
                            </div>
                            <button
                                onClick={() => removeCouponMutation.mutate()}
                                className="p-1 text-green-400"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Sticky Checkout Bar */}
                <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-zinc-800 p-4 z-50">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-xs text-zinc-500">Total</p>
                            <p className="text-xl font-bold text-white">{formatCurrency(cart.total)}</p>
                        </div>
                        <div className="text-right text-xs text-zinc-500">
                            {cart.items_count} items
                            {cart.discount?.code && (
                                <span className="text-green-400 ml-2">Discount applied</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleCheckout}
                        className="w-full bg-white text-black font-bold text-sm py-4 rounded-lg flex items-center justify-center gap-2"
                    >
                        Checkout <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        );
    }

    // Desktop Layout
    return (
        <div className="min-h-screen bg-[#050505] py-12">
            <div className="container mx-auto px-4 max-w-6xl">
                <h1 className="text-xl font-bold text-white mb-8 uppercase tracking-widest flex items-center gap-3">
                    Shopping Bag <span className="text-zinc-600 text-sm font-mono">({cart.items_count})</span>
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-4">
                        {cart.items.map((item: any) => (
                            <div key={item.variant_id} className="bg-[#0A0A0A] border border-[#27272a] p-4 rounded-sm flex gap-4 items-center group hover:border-zinc-700 transition-colors">
                                <div className="w-20 h-24 bg-[#050505] border border-[#27272a] overflow-hidden flex-shrink-0">
                                    {item.images?.[0] ? (
                                        <img src={item.images[0]} alt={item.product_name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-700"><ShoppingBag size={16} /></div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-white text-sm font-bold uppercase tracking-wide truncate pr-4">{item.product_name}</h3>
                                        <button onClick={() => handleRemoveItem(item.variant_id)} disabled={removeFromCartMutation.isPending} className="text-zinc-600 hover:text-red-400 transition-colors p-1"><Trash2 size={14} /></button>
                                    </div>

                                    <p className="text-zinc-500 text-[10px] font-mono uppercase">
                                        {Object.entries(item.attributes || {}).filter(([_, value]) => value).map(([key, value]) => `${key}: ${value}`).join(' // ')}
                                    </p>

                                    {item.stock !== undefined && item.quantity > item.stock && (
                                        <div className="mb-3 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded-sm"><p className="text-[10px] text-red-400 font-mono">⚠️ Only {item.stock} in stock</p></div>
                                    )}
                                    {item.stock !== undefined && item.stock <= 3 && item.quantity <= item.stock && (
                                        <div className="mb-3 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-sm"><p className="text-[10px] text-yellow-400 font-mono">Only {item.stock} left</p></div>
                                    )}

                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-3 bg-[#050505] border border-[#27272a] rounded-sm p-1">
                                            <button onClick={() => handleUpdateQuantity(item.variant_id, item.quantity - 1)} disabled={item.quantity <= 1 || updateCartMutation.isPending} className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors disabled:opacity-30"><Minus size={12} /></button>
                                            <span className="text-white font-mono w-6 text-center text-xs">{item.quantity}</span>
                                            <button onClick={() => handleUpdateQuantity(item.variant_id, item.quantity + 1)} disabled={updateCartMutation.isPending || (item.stock !== undefined && item.quantity >= item.stock)} className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors disabled:opacity-30"><Plus size={12} /></button>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-mono text-sm">{formatCurrency(item.unit_price * item.quantity)}</p>
                                            {item.quantity > 1 && <p className="text-zinc-600 text-[10px] font-mono">{formatCurrency(item.unit_price)} EA</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 rounded-sm sticky top-24">
                            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest border-b border-[#27272a] pb-4">Order Summary</h3>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-zinc-400 text-xs font-mono uppercase">
                                    <span>Subtotal</span>
                                    <span className="text-white">{formatCurrency(cart.subtotal)}</span>
                                </div>

                                {cart.discount?.code && (
                                    <div className="flex justify-between text-green-400 text-xs font-mono uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Discount ({cart.discount.code})</span>
                                            <button onClick={() => removeCouponMutation.mutate()} disabled={removeCouponMutation.isPending} className="text-red-400 hover:text-red-300"><X size={12} /></button>
                                        </div>
                                        <span>-{formatCurrency(cart.discount.amount)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-zinc-400 text-xs font-mono uppercase">
                                    <span>Shipping</span>
                                    <span className="text-zinc-600">CALCULATED NEXT</span>
                                </div>
                            </div>

                            {!cart.discount?.code && (
                                <div className="mb-6">
                                    <div className="flex gap-2">
                                        <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="PROMO CODE" className="flex-1 bg-[#050505] border border-[#27272a] text-white text-xs px-3 py-2 rounded-sm focus:border-white outline-none font-mono uppercase placeholder:text-zinc-700" />
                                        <button onClick={handleApplyCoupon} disabled={!couponCode || applyCouponMutation.isPending} className="bg-zinc-800 text-white text-[10px] font-bold uppercase px-4 rounded-sm hover:bg-zinc-700 transition-colors disabled:opacity-50">{applyCouponMutation.isPending ? '...' : 'APPLY'}</button>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-[#27272a] pt-4 mb-6">
                                <div className="flex justify-between items-end">
                                    <span className="text-white font-bold text-xs uppercase tracking-widest">Total</span>
                                    <span className="text-xl font-mono text-white">{formatCurrency(cart.total)}</span>
                                </div>
                            </div>

                            <button onClick={handleCheckout} className="w-full bg-white text-black font-bold text-[10px] uppercase tracking-widest py-4 rounded-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-2">
                                PROCEED TO CHECKOUT <ArrowRight size={14} />
                            </button>

                            <p className="text-zinc-600 text-[10px] text-center mt-4 font-mono uppercase">Secure Checkout</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
