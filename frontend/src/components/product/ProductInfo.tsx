import { useState, useEffect } from 'react';
import { Heart, Share2, Minus, Plus, ShoppingBag, Bell, Check } from 'lucide-react';
import { Product, Variant, getDefaultVariant } from '@/lib/types/product';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import cartService from '@/lib/api/cart';
import productApi from '@/lib/api/product';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/lib/hooks/useUser';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/lib/hooks/useCart';
import { useWishlist } from '@/lib/hooks/useWishlist';


interface ProductInfoProps {
    product: Product;
    onVariantChange?: (variant: Variant | null) => void;
}

export default function ProductInfo({ product, onVariantChange }: ProductInfoProps) {
    const { formatPrice } = useCurrencyContext();
    const { data: user } = useUser();
    const { data: cart } = useCart();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const variantIdFromUrl = searchParams.get('variant');
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // State
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const isWishlisted = isInWishlist(product.id);

    // State
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    const [quantity, setQuantity] = useState(1);

    // Variant Options
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedLength, setSelectedLength] = useState<string | null>(null);
    const [selectedTexture, setSelectedTexture] = useState<string | null>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);

    // Extract available options
    const colors = Array.from(new Set(product.variants.map(v => v.color).filter(Boolean))) as string[];
    const lengths = Array.from(new Set(product.variants.map(v => v.length).filter(Boolean))) as string[];
    const textures = Array.from(new Set(product.variants.map(v => v.texture).filter(Boolean))) as string[];
    const sizes = Array.from(new Set(product.variants.map(v => v.size).filter(Boolean))) as string[];

    // Initialize selections with the SAME default variant logic as ProductCard
    useEffect(() => {
        if (product.variants.length > 0) {
            let defaultVariant = getDefaultVariant(product.variants);

            // Override with URL param if valid
            if (variantIdFromUrl) {
                const urlVariant = product.variants.find(v => v.id === variantIdFromUrl);
                if (urlVariant) {
                    defaultVariant = urlVariant;
                }
            }

            if (defaultVariant) {
                setSelectedVariant(defaultVariant);
                onVariantChange?.(defaultVariant);

                if (defaultVariant.color) setSelectedColor(defaultVariant.color);
                if (defaultVariant.length) setSelectedLength(defaultVariant.length);
                if (defaultVariant.texture) setSelectedTexture(defaultVariant.texture);
                if (defaultVariant.size) setSelectedSize(defaultVariant.size);
            }
        }
    }, [product, variantIdFromUrl]);

    // Helper to find best matching variant
    const findBestVariant = (
        targetColor: string | null,
        targetLength: string | null,
        targetTexture: string | null,
        targetSize: string | null,
        priorityAttribute?: 'color' | 'length' | 'texture' | 'size'
    ) => {
        // 1. Try exact match
        const exactMatch = product.variants.find(v => {
            const colorMatch = !targetColor || v.color === targetColor;
            const lengthMatch = !targetLength || v.length === targetLength;
            const textureMatch = !targetTexture || v.texture === targetTexture;
            const sizeMatch = !targetSize || v.size === targetSize;
            return colorMatch && lengthMatch && textureMatch && sizeMatch;
        });

        if (exactMatch) return exactMatch;

        // 2. Find best fallback
        // We MUST match the priority attribute if specified
        let candidates = product.variants;

        if (priorityAttribute === 'color' && targetColor) {
            candidates = candidates.filter(v => v.color === targetColor);
        } else if (priorityAttribute === 'length' && targetLength) {
            candidates = candidates.filter(v => v.length === targetLength);
        } else if (priorityAttribute === 'texture' && targetTexture) {
            candidates = candidates.filter(v => v.texture === targetTexture);
        } else if (priorityAttribute === 'size' && targetSize) {
            candidates = candidates.filter(v => v.size === targetSize);
        }

        // If no candidates match the priority attribute, fall back to all variants
        if (candidates.length === 0) candidates = product.variants;

        // Find candidate with highest match score on OTHER attributes
        let bestMatch = candidates[0];
        let maxScore = -1;

        candidates.forEach(v => {
            let score = 0;
            if (targetColor && v.color === targetColor) score++;
            if (targetLength && v.length === targetLength) score++;
            if (targetTexture && v.texture === targetTexture) score++;
            if (targetSize && v.size === targetSize) score++;

            if (score > maxScore) {
                maxScore = score;
                bestMatch = v;
            }
        });

        return bestMatch;
    };

    // Update variant and notify parent
    const updateVariant = (variant: Variant) => {
        setSelectedVariant(variant);
        onVariantChange?.(variant);
    };

    // Handlers for Smart Selection
    const handleColorChange = (color: string) => {
        setSelectedColor(color);
        const bestVariant = findBestVariant(color, selectedLength, selectedTexture, selectedSize, 'color');
        if (bestVariant) {
            updateVariant(bestVariant);
            // Auto-update other selectors if they don't match the best variant
            if (bestVariant.length !== selectedLength) setSelectedLength(bestVariant.length);
            if (bestVariant.texture !== selectedTexture) setSelectedTexture(bestVariant.texture);
            if (bestVariant.size !== selectedSize) setSelectedSize(bestVariant.size);
        }
    };

    const handleLengthChange = (length: string) => {
        setSelectedLength(length);
        const bestVariant = findBestVariant(selectedColor, length, selectedTexture, selectedSize, 'length');
        if (bestVariant) {
            updateVariant(bestVariant);
            if (bestVariant.color !== selectedColor) setSelectedColor(bestVariant.color);
            if (bestVariant.texture !== selectedTexture) setSelectedTexture(bestVariant.texture);
            if (bestVariant.size !== selectedSize) setSelectedSize(bestVariant.size);
        }
    };

    const handleTextureChange = (texture: string) => {
        setSelectedTexture(texture);
        const bestVariant = findBestVariant(selectedColor, selectedLength, texture, selectedSize, 'texture');
        if (bestVariant) {
            updateVariant(bestVariant);
            if (bestVariant.color !== selectedColor) setSelectedColor(bestVariant.color);
            if (bestVariant.length !== selectedLength) setSelectedLength(bestVariant.length);
            if (bestVariant.size !== selectedSize) setSelectedSize(bestVariant.size);
        }
    };

    const handleSizeChange = (size: string) => {
        setSelectedSize(size);
        const bestVariant = findBestVariant(selectedColor, selectedLength, selectedTexture, size, 'size');
        if (bestVariant) {
            updateVariant(bestVariant);
            if (bestVariant.color !== selectedColor) setSelectedColor(bestVariant.color);
            if (bestVariant.length !== selectedLength) setSelectedLength(bestVariant.length);
            if (bestVariant.texture !== selectedTexture) setSelectedTexture(bestVariant.texture);
        }
    };

    // Mutations
    const addToCartMutation = useMutation({
        mutationFn: cartService.addToCart,
        onSuccess: () => {
            showToast('Added to cart', 'success');
            queryClient.invalidateQueries({ queryKey: ['cart'] });
        },
        onError: (error: any) => {
            showToast(error.response?.data?.message || 'Failed to add to cart', 'error');
        }
    });

    const notifyMutation = useMutation({
        mutationFn: (email: string) => productApi.subscribeToRestock(selectedVariant!.id, email),
        onSuccess: () => showToast("You'll be notified when back in stock!", 'success')
    });

    // SMART CART CHECK: Calculate available stock based on cart
    const existingCartItem = selectedVariant
        ? cart?.items?.find(item => item.variant_id === selectedVariant.id)
        : null;

    const quantityInCart = existingCartItem?.quantity || 0;
    const isInfiniteStock = selectedVariant?.stock === -1;

    const availableStock = selectedVariant
        ? (isInfiniteStock ? 9999 : selectedVariant.stock - quantityInCart)
        : 0;

    const canAddToCart = selectedVariant
        ? (isInfiniteStock ? true : (quantityInCart + quantity) <= selectedVariant.stock)
        : false;

    const isAtMaxInCart = selectedVariant
        ? (isInfiniteStock ? false : quantityInCart >= selectedVariant.stock)
        : false;

    const handleAddToCart = () => {
        if (!selectedVariant) return;
        if (!user) {
            showToast('Please login to add items to cart', 'info');
            navigate('/login');
            return;
        }

        // Smart validation: Check if adding would exceed stock
        if (!canAddToCart) {
            const maxMsg = isInfiniteStock ? 'Max quantity reached' : `Only ${availableStock} left!`;
            showToast(`${maxMsg} You already have ${quantityInCart} in cart.`, 'error');
            return;
        }

        addToCartMutation.mutate({ variantId: selectedVariant.id, quantity });
    };

    const handleWishlist = () => {
        if (!user) {
            showToast('Please login to wishlist items', 'info');
            return;
        }

        if (isWishlisted) {
            removeFromWishlist.mutate(product.id);
        } else {
            addToWishlist.mutate(product.id);
        }
    };

    if (!selectedVariant) return <div>Loading options...</div>;

    const isOutOfStock = selectedVariant.stock === 0;
    const isLowStock = selectedVariant.stock > 0 && selectedVariant.stock <= 5;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="space-y-4 border-b border-[#27272a] pb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-white uppercase tracking-wide font-mono mb-2">
                            {product.name}
                        </h1>
                        <div className="flex items-center gap-4">
                            <span className="text-zinc-600">|</span>
                            <span className="text-zinc-400 text-sm uppercase tracking-wider">{product.category?.name || 'Category'}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleWishlist}
                            className={`p-3 rounded-full border transition-all ${isWishlisted
                                ? 'bg-red-500/10 border-red-500 text-red-500'
                                : 'border-[#27272a] text-zinc-400 hover:text-white hover:border-white'
                                }`}
                        >
                            <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                        </button>
                        <button className="p-3 rounded-full border border-[#27272a] text-zinc-400 hover:text-white hover:border-white transition-all">
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex items-end gap-4">
                    <p className="text-4xl font-bold text-white font-mono">
                        {formatPrice(selectedVariant.price > 0 ? selectedVariant.price : product.basePrice)}
                    </p>
                    {isOutOfStock ? (
                        <span className="text-red-500 font-bold uppercase tracking-wider mb-2">Out of Stock</span>
                    ) : isLowStock ? (
                        <span className="text-yellow-500 font-bold uppercase tracking-wider mb-2">Only {selectedVariant.stock} left!</span>
                    ) : (
                        <span className="text-green-500 font-bold uppercase tracking-wider mb-2">In Stock</span>
                    )}
                </div>
            </div>

            {/* Variant Selectors */}
            <div className="space-y-6">
                {/* Color */}
                {colors.length > 0 && (
                    <div className="space-y-3">
                        <span className="text-sm text-zinc-400 uppercase tracking-widest font-mono">Color</span>
                        <div className="flex flex-wrap gap-3">
                            {colors.map(color => (
                                <button
                                    key={color}
                                    onClick={() => handleColorChange(color)}
                                    className={`px-4 py-2 border text-sm font-mono transition-all ${selectedColor === color
                                        ? 'border-white bg-white text-black font-bold'
                                        : 'border-[#27272a] text-zinc-400 hover:border-zinc-500'
                                        }`}
                                >
                                    {color}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Length */}
                {lengths.length > 0 && (
                    <div className="space-y-3">
                        <span className="text-sm text-zinc-400 uppercase tracking-widest font-mono">Length</span>
                        <div className="flex flex-wrap gap-3">
                            {lengths.map(length => (
                                <button
                                    key={length}
                                    onClick={() => handleLengthChange(length)}
                                    className={`px-4 py-2 border text-sm font-mono transition-all ${selectedLength === length
                                        ? 'border-white bg-white text-black font-bold'
                                        : 'border-[#27272a] text-zinc-400 hover:border-zinc-500'
                                        }`}
                                >
                                    {length}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Texture */}
                {textures.length > 0 && (
                    <div className="space-y-3">
                        <span className="text-sm text-zinc-400 uppercase tracking-widest font-mono">Texture</span>
                        <div className="flex flex-wrap gap-3">
                            {textures.map(texture => (
                                <button
                                    key={texture}
                                    onClick={() => handleTextureChange(texture)}
                                    className={`px-4 py-2 border text-sm font-mono transition-all ${selectedTexture === texture
                                        ? 'border-white bg-white text-black font-bold'
                                        : 'border-[#27272a] text-zinc-400 hover:border-zinc-500'
                                        }`}
                                >
                                    {texture}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Size */}
                {sizes.length > 0 && (
                    <div className="space-y-3">
                        <span className="text-sm text-zinc-400 uppercase tracking-widest font-mono">Size</span>
                        <div className="flex flex-wrap gap-3">
                            {sizes.map(size => (
                                <button
                                    key={size}
                                    onClick={() => handleSizeChange(size)}
                                    className={`px-4 py-2 border text-sm font-mono transition-all ${selectedSize === size
                                        ? 'border-white bg-white text-black font-bold'
                                        : 'border-[#27272a] text-zinc-400 hover:border-zinc-500'
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-[#27272a] space-y-6">
                {!isOutOfStock ? (
                    <div className="space-y-4">
                        {/* Smart Stock Info */}
                        {quantityInCart > 0 && (
                            <div className="text-sm text-zinc-400 flex items-center gap-2">
                                <Check size={16} className="text-green-500" />
                                {quantityInCart} in cart · {availableStock} more available
                            </div>
                        )}

                        <div className="flex gap-4">
                            {/* Quantity */}
                            <div className="flex items-center border border-[#27272a]">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="p-4 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="w-12 text-center font-mono font-bold text-white">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                                    disabled={isAtMaxInCart}
                                    className="p-4 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {/* Add to Cart */}
                            {isAtMaxInCart ? (
                                <div className="flex-1 bg-green-500/10 border border-green-500 text-green-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2 py-4">
                                    <Check size={20} />
                                    Max Stock in Cart
                                </div>
                            ) : (
                                <button
                                    onClick={handleAddToCart}
                                    disabled={addToCartMutation.isPending || !canAddToCart}
                                    className="flex-1 bg-white text-black font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {addToCartMutation.isPending ? (
                                        <span className="animate-pulse">Adding...</span>
                                    ) : (
                                        <>
                                            <ShoppingBag size={20} />
                                            {quantityInCart > 0 ? 'Add More to Cart' : 'Add to Cart'}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            const email = prompt('Enter your email to be notified:');
                            if (email) notifyMutation.mutate(email);
                        }}
                        className="w-full py-4 border border-[#27272a] text-white font-bold uppercase tracking-widest hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2"
                    >
                        <Bell size={20} />
                        Notify When Available
                    </button>
                )}

                {/* SKU */}
                <p className="text-xs text-zinc-600 font-mono text-center">
                    SKU: {selectedVariant.sku}
                </p>
            </div>
        </div>
    );
}
