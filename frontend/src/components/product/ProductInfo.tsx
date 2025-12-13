import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Heart, Share2, Minus, Plus, ShoppingBag, Bell, Check } from 'lucide-react';
import { Product, Variant, getDefaultVariant } from '@/lib/types/product';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';
import { useMutation } from '@tanstack/react-query';
import productApi from '@/lib/api/product';
import { useToast } from '@/contexts/ToastContext';
import { useUser } from '@/lib/hooks/useUser';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/lib/hooks/useCart';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useAddToCart } from '@/lib/hooks/useAddToCart';
import { useIsMobile } from '@/lib/hooks/useIsMobile';


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
    const { showToast } = useToast();
    const isMobile = useIsMobile();

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
        const exactMatch = product.variants.find(v => {
            const colorMatch = !targetColor || v.color === targetColor;
            const lengthMatch = !targetLength || v.length === targetLength;
            const textureMatch = !targetTexture || v.texture === targetTexture;
            const sizeMatch = !targetSize || v.size === targetSize;
            return colorMatch && lengthMatch && textureMatch && sizeMatch;
        });

        if (exactMatch) return exactMatch;

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

        if (candidates.length === 0) candidates = product.variants;

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

    const updateVariant = (variant: Variant) => {
        setSelectedVariant(variant);
        onVariantChange?.(variant);
    };

    const handleColorChange = (color: string) => {
        setSelectedColor(color);
        const bestVariant = findBestVariant(color, selectedLength, selectedTexture, selectedSize, 'color');
        if (bestVariant) {
            updateVariant(bestVariant);
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

    const addToCartMutation = useAddToCart();

    const notifyMutation = useMutation({
        mutationFn: (email: string) => productApi.subscribeToRestock(selectedVariant!.id, email),
        onSuccess: () => showToast("You'll be notified when back in stock!", 'success'),
        onError: (error: any) => {
            const message = error.response?.data?.error || 'Failed to subscribe';
            showToast(message, 'error');
        }
    });

    /**
     * Handle "Notify Me" button click
     * - Logged in: Auto-subscribe using user's email
     * - Guest: Prompt for email
     */
    const handleNotifyMe = () => {
        if (!selectedVariant) return;

        if (user?.email) {
            // Logged-in user: Auto-subscribe with their email
            notifyMutation.mutate(user.email);
        } else {
            // Guest: Prompt for email
            const email = prompt('Enter your email to be notified when this item is back in stock:');
            if (email && email.includes('@')) {
                notifyMutation.mutate(email);
            } else if (email) {
                showToast('Please enter a valid email address', 'error');
            }
        }
    };

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

        if (!canAddToCart) {
            const maxMsg = isInfiniteStock ? 'Max quantity reached' : `Only ${availableStock} left!`;
            showToast(`${maxMsg} You already have ${quantityInCart} in cart.`, 'error');
            return;
        }

        addToCartMutation.mutate({
            variantId: selectedVariant.id,
            quantity,
            productInfo: {
                product_id: product.id,
                product_name: product.name,
                sku: selectedVariant.sku || '',
                unit_price: selectedVariant.price > 0 ? selectedVariant.price : product.basePrice,
                images: selectedVariant.images?.length > 0 ? selectedVariant.images : (product.images || []),
                attributes: {
                    length: selectedVariant.length || null,
                    color: selectedVariant.color || null,
                    texture: selectedVariant.texture || null,
                    size: selectedVariant.size || null,
                },
                stock_available: selectedVariant.stock,
                category: product.category?.slug || 'uncategorized',
            }
        });
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

    /**
     * Share product using Web Share API (mobile) or copy to clipboard (desktop)
     */
    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/products/${product.id}${selectedVariant ? `?variant=${selectedVariant.id}` : ''}`;
        const shareData = {
            title: product.name,
            text: `Check out ${product.name} at WigHaven!`,
            url: shareUrl,
        };

        // Use Web Share API if available (mainly mobile browsers)
        if (navigator.share && isMobile) {
            try {
                await navigator.share(shareData);
                showToast('Shared successfully!', 'success');
            } catch (error: any) {
                // User cancelled sharing - not an error
                if (error.name !== 'AbortError') {
                    console.error('Share failed:', error);
                    showToast('Failed to share', 'error');
                }
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(shareUrl);
                showToast('Link copied to clipboard!', 'success');
            } catch (error) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = shareUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showToast('Link copied to clipboard!', 'success');
            }
        }
    };

    if (!selectedVariant) return <div>Loading options...</div>;

    const isOutOfStock = selectedVariant.stock === 0;
    const isLowStock = selectedVariant.stock > 0 && selectedVariant.stock <= 5;
    const displayPrice = formatPrice(selectedVariant.price > 0 ? selectedVariant.price : product.basePrice);

    // Sticky Add to Cart Bar for Mobile
    const StickyAddToCartBar = () => {
        if (!isMobile) return null;

        return createPortal(
            <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0A0A0A] border-t border-zinc-800 p-4 pb-6">
                <div className="flex items-center gap-3">
                    {/* Price */}
                    <div className="flex-shrink-0">
                        <p className="text-lg font-bold text-white">{displayPrice}</p>
                        {isOutOfStock ? (
                            <p className="text-xs text-red-400">Out of stock</p>
                        ) : isLowStock ? (
                            <p className="text-xs text-yellow-400">Only {selectedVariant.stock} left</p>
                        ) : null}
                    </div>

                    {/* Quantity (compact) */}
                    {!isOutOfStock && !isAtMaxInCart && (
                        <div className="flex items-center bg-zinc-800 rounded-lg">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="p-3 text-zinc-400 active:text-white"
                            >
                                <Minus size={16} />
                            </button>
                            <span className="w-8 text-center font-bold text-white">{quantity}</span>
                            <button
                                onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                                className="p-3 text-zinc-400 active:text-white"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    )}

                    {/* Add to Cart Button */}
                    {isOutOfStock ? (
                        <button
                            onClick={handleNotifyMe}
                            disabled={notifyMutation.isPending}
                            className="flex-1 py-4 bg-zinc-800 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            <Bell size={18} />
                            {notifyMutation.isPending ? 'Subscribing...' : 'Notify Me'}
                        </button>
                    ) : isAtMaxInCart ? (
                        <div className="flex-1 py-4 bg-green-500/10 border border-green-500 text-green-400 font-bold text-sm rounded-lg flex items-center justify-center gap-2">
                            <Check size={18} />
                            Max in Cart
                        </div>
                    ) : (
                        <button
                            onClick={handleAddToCart}
                            disabled={addToCartMutation.isPending}
                            className="flex-1 py-4 bg-white text-black font-bold text-sm rounded-lg flex items-center justify-center gap-2 active:bg-zinc-200 disabled:opacity-60"
                        >
                            {addToCartMutation.isPending ? (
                                <span className="animate-pulse">Adding...</span>
                            ) : (
                                <>
                                    <ShoppingBag size={18} />
                                    {quantityInCart > 0 ? 'Add More' : 'Add to Cart'}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>,
            document.body
        );
    };

    // Variant selector component
    const VariantSelector = ({ label, options, selected, onChange }: { label: string; options: string[]; selected: string | null; onChange: (val: string) => void }) => {
        if (options.length === 0) return null;

        if (isMobile) {
            return (
                <div className="space-y-2">
                    <span className="text-xs text-zinc-400 uppercase tracking-wide">{label}</span>
                    <div className="flex flex-wrap gap-2">
                        {options.map(option => (
                            <button
                                key={option}
                                onClick={() => onChange(option)}
                                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${selected === option
                                    ? 'bg-white text-black'
                                    : 'bg-zinc-800 text-zinc-300 active:bg-zinc-700'
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                <span className="text-sm text-zinc-400 uppercase tracking-widest font-mono">{label}</span>
                <div className="flex flex-wrap gap-3">
                    {options.map(option => (
                        <button
                            key={option}
                            onClick={() => onChange(option)}
                            className={`px-4 py-2 border text-sm font-mono transition-all ${selected === option
                                ? 'border-white bg-white text-black font-bold'
                                : 'border-[#27272a] text-zinc-400 hover:border-zinc-500'
                                }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    // Mobile layout
    if (isMobile) {
        return (
            <>
                <div className="space-y-6 pb-32">
                    {/* Header */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h1 className="text-xl font-bold text-white mb-1">{product.name}</h1>
                                <p className="text-sm text-zinc-400">{product.category?.name || 'Category'}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleWishlist}
                                    className={`p-3 rounded-full transition-all ${isWishlisted
                                        ? 'bg-red-500/10 text-red-500'
                                        : 'bg-zinc-800 text-zinc-400 active:text-white'
                                        }`}
                                >
                                    <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                                </button>
                                <button onClick={handleShare} className="p-3 rounded-full bg-zinc-800 text-zinc-400 active:text-white">
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Price & Stock */}
                        <div className="flex items-center gap-3">
                            <p className="text-2xl font-bold text-white">{displayPrice}</p>
                            {isOutOfStock ? (
                                <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs font-medium rounded">Out of Stock</span>
                            ) : isLowStock ? (
                                <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-medium rounded">Only {selectedVariant.stock} left</span>
                            ) : (
                                <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded">In Stock</span>
                            )}
                        </div>

                        {quantityInCart > 0 && (
                            <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-800/50 px-3 py-2 rounded-lg">
                                <Check size={16} className="text-green-400" />
                                {quantityInCart} already in cart
                            </div>
                        )}
                    </div>

                    {/* Variant Selectors */}
                    <div className="space-y-5 pt-4 border-t border-zinc-800">
                        <VariantSelector label="Color" options={colors} selected={selectedColor} onChange={handleColorChange} />
                        <VariantSelector label="Length" options={lengths} selected={selectedLength} onChange={handleLengthChange} />
                        <VariantSelector label="Texture" options={textures} selected={selectedTexture} onChange={handleTextureChange} />
                        <VariantSelector label="Size" options={sizes} selected={selectedSize} onChange={handleSizeChange} />
                    </div>

                    {/* SKU */}
                    <p className="text-xs text-zinc-600 pt-4 border-t border-zinc-800">
                        SKU: {selectedVariant.sku}
                    </p>
                </div>

                <StickyAddToCartBar />
            </>
        );
    }

    // Desktop layout
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
                        <button onClick={handleShare} className="p-3 rounded-full border border-[#27272a] text-zinc-400 hover:text-white hover:border-white transition-all">
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex items-end gap-4">
                    <p className="text-4xl font-bold text-white font-mono">{displayPrice}</p>
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
                <VariantSelector label="Color" options={colors} selected={selectedColor} onChange={handleColorChange} />
                <VariantSelector label="Length" options={lengths} selected={selectedLength} onChange={handleLengthChange} />
                <VariantSelector label="Texture" options={textures} selected={selectedTexture} onChange={handleTextureChange} />
                <VariantSelector label="Size" options={sizes} selected={selectedSize} onChange={handleSizeChange} />
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-[#27272a] space-y-6">
                {!isOutOfStock ? (
                    <div className="space-y-4">
                        {quantityInCart > 0 && (
                            <div className="text-sm text-zinc-400 flex items-center gap-2">
                                <Check size={16} className="text-green-500" />
                                {quantityInCart} in cart · {availableStock} more available
                            </div>
                        )}

                        <div className="flex gap-4">
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
                        onClick={handleNotifyMe}
                        disabled={notifyMutation.isPending}
                        className="w-full py-4 border border-[#27272a] text-white font-bold uppercase tracking-widest hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        <Bell size={20} />
                        {notifyMutation.isPending ? 'Subscribing...' : 'Notify When Available'}
                    </button>
                )}

                <p className="text-xs text-zinc-600 font-mono text-center">
                    SKU: {selectedVariant.sku}
                </p>
            </div>
        </div>
    );
}
