import { useWishlist } from '@/lib/hooks/useWishlist';
import { useAddToCart } from '@/lib/hooks/useAddToCart';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';

export default function Wishlist() {
    const { wishlist, isLoading, removeFromWishlist } = useWishlist();
    const addToCart = useAddToCart();
    const { formatPrice } = useCurrencyContext();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (wishlist.length === 0) {
        return (
            <div className="text-center py-24 border border-[#27272a] bg-[#0A0A0A] rounded-lg">
                <Heart className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-3">Your Wishlist is Empty</h2>
                <p className="text-zinc-500 text-sm font-mono mb-8">
                    Save items you love to your wishlist. Review them anytime and easily move them to the bag.
                </p>
                <Link
                    to="/shop"
                    className="inline-block bg-white text-black px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                >
                    Start Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h1 className="text-xl font-bold text-white uppercase tracking-wider mb-8">My Wishlist ({wishlist.length})</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map((item) => {
                    const product = item.product;
                    // Strict Display: Always show Variant[0]
                    const mainVariant = product.variants?.[0];
                    const displayImage = mainVariant?.images?.[0] || product.images?.[0];

                    // Action: Find first in-stock variant for "Add to Bag" functionality
                    const actionVariant = product.variants?.find(v => v.stock > 0) || mainVariant;
                    const isOutOfStock = !product.isActive || !actionVariant || actionVariant.stock === 0;

                    return (
                        <div key={item.id} className="group bg-[#0A0A0A] border border-[#27272a] rounded-lg overflow-hidden hover:border-zinc-500 transition-colors flex flex-col">
                            {/* Image */}
                            <div className="relative aspect-[4/5] bg-zinc-900 overflow-hidden">
                                {displayImage ? (
                                    <img
                                        src={displayImage}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                        No Image
                                    </div>
                                )}

                                {isOutOfStock && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="bg-black text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-white">
                                            Out of Stock
                                        </span>
                                    </div>
                                )}

                                <button
                                    onClick={() => removeFromWishlist.mutate(product.id)}
                                    className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-red-500/80 transition-colors z-10"
                                    title="Remove from wishlist"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 flex flex-col flex-1">
                                <Link to={`/products/${product.id}`} className="block mb-2">
                                    <h3 className="text-white font-bold text-sm uppercase tracking-wide truncate group-hover:text-zinc-300 transition-colors">
                                        {product.name}
                                    </h3>
                                </Link>

                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-zinc-400 font-mono text-sm">
                                        {mainVariant ? formatPrice(mainVariant.price > 0 ? mainVariant.price : product.basePrice) : 'Unavailable'}
                                    </p>
                                </div>

                                <div className="mt-auto pt-4 border-t border-[#27272a]">
                                    <button
                                        onClick={() => {
                                            if (actionVariant) {
                                                addToCart.mutate({
                                                    variantId: actionVariant.id,
                                                    quantity: 1
                                                });
                                            }
                                        }}
                                        disabled={isOutOfStock}
                                        className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isOutOfStock ? (
                                            <>
                                                <AlertCircle size={14} /> Out of Stock
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingBag size={14} /> Add to Bag
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
