import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/lib/hooks/useCart';
import { useUpdateCart } from '@/lib/hooks/useUpdateCart';
import { useRemoveFromCart } from '@/lib/hooks/useRemoveFromCart';
import { useCheckout } from '@/lib/hooks/useCheckout';
import { formatCurrency } from '@/lib/utils/currency';
import { useToast } from '@/contexts/ToastContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import cartService from '@/lib/api/cart';

export default function Cart() {
    const navigate = useNavigate();
    const { data: cart, isLoading } = useCart();
    const updateCartMutation = useUpdateCart();
    const removeFromCartMutation = useRemoveFromCart();
    const { validateCart } = useCheckout();
    const { showToast } = useToast();

    const handleCheckout = async () => {
        try {
            const result = await validateCart.refetch();
            if (result.data?.success) {
                navigate('/checkout');
            } else {
                // Error is handled by useCheckout or global error handler, 
                // but we can show a toast here if needed based on result
                if (result.error) {
                    showToast('Some items in your cart are no longer available.', 'error');
                }
            }
        } catch (error) {
            showToast('Failed to validate cart. Please try again.', 'error');
        }
    };

    const handleUpdateQuantity = (variantId: string, newQuantity: number) => {
        if (newQuantity < 1) return;
        updateCartMutation.mutate({ variantId, quantity: newQuantity });
    };

    const handleRemoveItem = (itemId: string) => {
        removeFromCartMutation.mutate(itemId);
    };

    // Coupon Logic
    const [couponCode, setCouponCode] = useState('');
    const queryClient = useQueryClient();

    const applyCouponMutation = useMutation({
        mutationFn: (code: string) => cartService.applyCoupon({ code }),
        onSuccess: (data) => {
            queryClient.setQueryData(['cart'], data);
            showToast('Coupon applied successfully', 'success');
            setCouponCode('');
        },
        onError: (error: any) => {
            showToast(error.response?.data?.message || 'Invalid coupon code', 'error');
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

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] py-12 flex items-center justify-center">
                <div className="text-zinc-500 font-mono text-xs animate-pulse">LOADING SYSTEM DATA...</div>
            </div>
        );
    }

    if (!cart || cart.items.length === 0) {
        return (
            <div className="min-h-screen bg-[#050505] py-24">
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <div className="border border-[#27272a] bg-[#0A0A0A] rounded-sm p-12 max-w-lg mx-auto">
                        <div className="w-16 h-16 bg-[#050505] border border-[#27272a] rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShoppingBag className="w-6 h-6 text-zinc-600" />
                        </div>
                        <h2 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">Your Bag is Empty</h2>
                        <p className="text-zinc-500 text-xs mb-8 font-mono">
                            Looks like you haven't found your perfect style yet.
                        </p>
                        <Link
                            to="/shop"
                            className="inline-flex items-center gap-2 bg-white text-black font-bold text-[10px] uppercase tracking-widest px-8 py-3 rounded-sm hover:bg-zinc-200 transition-all"
                        >
                            START SHOPPING <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

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
                                {/* Product Image */}
                                <div className="w-20 h-24 bg-[#050505] border border-[#27272a] overflow-hidden flex-shrink-0">
                                    {item.images?.[0] ? (
                                        <img
                                            src={item.images[0]}
                                            alt={item.product_name}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                            <ShoppingBag size={16} />
                                        </div>
                                    )}
                                </div>

                                {/* Product Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-white text-sm font-bold uppercase tracking-wide truncate pr-4">
                                            {item.product_name}
                                        </h3>
                                        <button
                                            onClick={() => handleRemoveItem(item.variant_id)}
                                            disabled={removeFromCartMutation.isPending}
                                            className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <p className="text-zinc-500 text-[10px] font-mono uppercase">
                                        {Object.entries(item.attributes || {})
                                            .filter(([_, value]) => value)
                                            .map(([key, value]) => `${key}: ${value}`)
                                            .join(' // ')}
                                    </p>

                                    {/* Stock Warning */}
                                    {item.stock !== undefined && item.quantity > item.stock && (
                                        <div className="mb-3 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded-sm">
                                            <p className="text-[10px] text-red-400 font-mono">
                                                ⚠️ Only {item.stock} in stock
                                            </p>
                                        </div>
                                    )}
                                    {item.stock !== undefined && item.stock <= 3 && item.quantity <= item.stock && (
                                        <div className="mb-3 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-sm">
                                            <p className="text-[10px] text-yellow-400 font-mono">
                                                Only {item.stock} left in stock
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-3 bg-[#050505] border border-[#27272a] rounded-sm p-1">
                                            <button
                                                onClick={() => handleUpdateQuantity(item.variant_id, item.quantity - 1)}
                                                disabled={item.quantity <= 1 || updateCartMutation.isPending}
                                                className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors disabled:opacity-30"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="text-white font-mono w-6 text-center text-xs">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => handleUpdateQuantity(item.variant_id, item.quantity + 1)}
                                                disabled={updateCartMutation.isPending || (item.stock !== undefined && item.quantity >= item.stock)}
                                                className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors disabled:opacity-30"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white font-mono text-sm">
                                                {formatCurrency(item.unit_price * item.quantity)}
                                            </p>
                                            {item.quantity > 1 && (
                                                <p className="text-zinc-600 text-[10px] font-mono">
                                                    {formatCurrency(item.unit_price)} EA
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 rounded-sm sticky top-24">
                            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-widest border-b border-[#27272a] pb-4">
                                Order Summary
                            </h3>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-zinc-400 text-xs font-mono uppercase">
                                    <span>Subtotal</span>
                                    <span className="text-white">{formatCurrency(cart.subtotal)}</span>
                                </div>

                                {/* Discount Display */}
                                {cart.discount?.code && (
                                    <div className="flex justify-between text-green-400 text-xs font-mono uppercase">
                                        <div className="flex items-center gap-2">
                                            <span>Discount ({cart.discount.code})</span>
                                            <button
                                                onClick={() => removeCouponMutation.mutate()}
                                                disabled={removeCouponMutation.isPending}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                        <span>-{formatCurrency(cart.discount.amount)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-zinc-400 text-xs font-mono uppercase">
                                    <span>Shipping</span>
                                    <span className="text-zinc-600">CALCULATED NEXT</span>
                                </div>
                            </div>

                            {/* Coupon Input */}
                            {!cart.discount?.code && (
                                <div className="mb-6">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            placeholder="PROMO CODE"
                                            className="flex-1 bg-[#050505] border border-[#27272a] text-white text-xs px-3 py-2 rounded-sm focus:border-white outline-none font-mono uppercase placeholder:text-zinc-700"
                                        />
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={!couponCode || applyCouponMutation.isPending}
                                            className="bg-zinc-800 text-white text-[10px] font-bold uppercase px-4 rounded-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
                                        >
                                            {applyCouponMutation.isPending ? '...' : 'APPLY'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-[#27272a] pt-4 mb-6">
                                <div className="flex justify-between items-end">
                                    <span className="text-white font-bold text-xs uppercase tracking-widest">Total</span>
                                    <span className="text-xl font-mono text-white">
                                        {formatCurrency(cart.total)}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={validateCart.isFetching}
                                className="w-full bg-white text-black font-bold text-[10px] uppercase tracking-widest py-4 rounded-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {validateCart.isFetching ? 'VALIDATING...' : 'PROCEED TO CHECKOUT'} <ArrowRight size={14} />
                            </button>

                            <p className="text-zinc-600 text-[10px] text-center mt-4 font-mono uppercase">
                                Secure Checkout
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
