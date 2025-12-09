import { Link } from 'react-router-dom';
import { ShoppingBag, Check, Heart } from 'lucide-react';
import { Product, getDefaultVariant } from '@/lib/types/product';
import { useAddToCart } from '@/lib/hooks/useAddToCart';
import { useCart } from '@/lib/hooks/useCart';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';


interface ProductCardProps {
    product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
    const addToCartMutation = useAddToCart();
    const { data: cart } = useCart();
    const { formatPrice } = useCurrencyContext();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const inWishlist = isInWishlist(product.id);

    // Get default variant using shared utility (ensures consistency with ProductInfo)
    const defaultVariant = getDefaultVariant(product.variants || []);

    // Show EXACT price of the variant that will be added (not a range)
    const displayPrice = defaultVariant
        ? formatPrice(defaultVariant.price)
        : formatPrice(product.basePrice);

    // Build variant description for clarity
    const variantDetails = defaultVariant
        ? [
            defaultVariant.length,
            defaultVariant.color,
            defaultVariant.texture,
            defaultVariant.size
        ].filter(Boolean).join(' · ')
        : null;

    // Stock status
    const totalStock =
        product.variants?.reduce((sum, v) => sum + (v.isActive ? v.stock : 0), 0) || 0;
    const isInStock = totalStock > 0;

    // Check if we're showing an alternate variant (first variant was out of stock)
    const firstVariant = product.variants?.[0];
    const isShowingAlternate = defaultVariant && firstVariant &&
        defaultVariant.id !== firstVariant.id &&
        (!firstVariant.isActive || firstVariant.stock <= 0);

    // Get primary image from default variant (NOT product.images which is deprecated)
    const primaryImage = defaultVariant?.images?.[0] || product.variants?.[0]?.images?.[0] || '';

    // SMART CART CHECK: Check if default variant is already in cart
    const existingCartItem = defaultVariant
        ? cart?.items?.find(item => item.variant_id === defaultVariant.id)
        : null;

    const quantityInCart = existingCartItem?.quantity || 0;
    const availableToAdd = defaultVariant ? defaultVariant.stock - quantityInCart : 0;
    const canQuickAdd = defaultVariant && availableToAdd > 0;
    const isAtMaxStock = defaultVariant && quantityInCart >= defaultVariant.stock;

    const handleQuickAdd = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!canQuickAdd) return;

        if (defaultVariant) {
            addToCartMutation.mutate({
                variantId: defaultVariant.id,
                quantity: 1
            });
        }
    };

    return (
        <div className="bg-[#050505] group/card relative hover:bg-[#0A0A0A] transition-colors h-full flex flex-col">
            <Link
                to={`/products/${product.id}${defaultVariant ? `?variant=${defaultVariant.id}` : ''}`}
                className="flex-1 flex flex-col"
            >
                {/* Image Container */}
                <div className="aspect-[4/5] bg-zinc-900 mb-6 overflow-hidden relative">
                    {primaryImage ? (
                        <img
                            src={primaryImage}
                            alt={product.name}
                            className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition-opacity duration-500"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-16 h-16 text-white/10" />
                        </div>
                    )}

                    {/* Wishlist Heart Button */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (inWishlist) {
                                removeFromWishlist.mutate(product.id);
                            } else {
                                addToWishlist.mutate(product.id);
                            }
                        }}
                        className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full hover:bg-black/70 transition-all group/heart"
                    >
                        <Heart
                            size={16}
                            className={`transition-all ${inWishlist
                                ? 'fill-white text-white'
                                : 'text-white/70 group-hover/card:text-white'
                                }`}
                        />
                    </button>

                    {/* Stock Badge */}
                    {!isInStock && (
                        <div className="absolute top-3 left-3">
                            <span className="px-2 py-1 bg-[#27272a] border border-white/10 text-white text-[9px] font-bold uppercase tracking-wider">
                                Out of Stock
                            </span>
                        </div>
                    )}

                    {/* Featured Badge */}
                    {product.isFeatured && isInStock && (
                        <div className="absolute top-3 left-3">
                            <span className="px-2 py-1 bg-white text-black text-[9px] font-bold uppercase tracking-wider">
                                New
                            </span>
                        </div>
                    )}

                    {/* Quick Add Overlay */}
                    {isInStock && defaultVariant && (
                        <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover/card:translate-y-0 transition-transform duration-300">
                            {isAtMaxStock ? (
                                <div className="w-full bg-green-500/10 border border-green-500 text-green-400 py-3 text-[10px] font-bold uppercase tracking-widest text-center flex items-center justify-center gap-2">
                                    <Check size={14} />
                                    In Cart (Max Stock)
                                </div>
                            ) : canQuickAdd ? (
                                <button
                                    onClick={handleQuickAdd}
                                    disabled={addToCartMutation.isPending}
                                    className="w-full bg-white text-black py-3 text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-zinc-200 transition-colors disabled:opacity-60"
                                >
                                    {addToCartMutation.isPending ? 'Adding +' : quantityInCart > 0 ? `Add More (${quantityInCart} in cart)` : 'Quick Add +'}
                                </button>
                            ) : (
                                <div className="w-full bg-yellow-500/10 border border-yellow-500 text-yellow-400 py-3 text-[10px] font-bold uppercase tracking-widest text-center">
                                    Max Stock Reached
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="mt-auto px-6 pb-6">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-white tracking-wide uppercase">
                            {product.name}
                        </h3>
                        <span className="text-sm font-mono text-zinc-300">{displayPrice}</span>
                    </div>

                    {/* Variant Details - Show what will be added */}
                    {variantDetails && (
                        <p className="text-[10px] text-zinc-400 font-mono mb-1">
                            {variantDetails}
                        </p>
                    )}

                    {/* Subtle message when showing alternate variant */}
                    {isShowingAlternate && (
                        <p className="text-[9px] text-blue-400/70 font-mono mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                            More options available
                        </p>
                    )}

                    {/* Category */}
                    <p className="text-[10px] text-zinc-500 font-mono uppercase">
                        {product.category?.name || 'WIG'}
                    </p>
                </div>
            </Link>
        </div>
    );
}
