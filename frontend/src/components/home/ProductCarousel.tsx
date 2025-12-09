import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import type { Product } from '@/lib/types/product';

interface ProductCarouselProps {
    products: Product[];
    title: string;
    subtitle?: string;
    isLoading?: boolean;
}

export default function ProductCarousel({ products, title, subtitle, isLoading }: ProductCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return;

        const scrollAmount = 400;
        const newScrollLeft =
            scrollContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);

        scrollContainerRef.current.scrollTo({
            left: newScrollLeft,
            behavior: 'smooth',
        });
    };

    if (isLoading) {
        return (
            <div>
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] mb-2">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-zinc-500 text-xs font-mono uppercase">{subtitle}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="bg-[#0A0A0A] border border-[#27272a] rounded-sm overflow-hidden animate-pulse"
                        >
                            <div className="aspect-[4/5] bg-[#050505]" />
                            <div className="p-4 space-y-3">
                                <div className="h-3 bg-[#050505] w-1/4" />
                                <div className="h-4 bg-[#050505] w-3/4" />
                                <div className="h-3 bg-[#050505] w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (products.length === 0) {
        return null;
    }

    return (
        <div className="relative group">
            <div className="mb-8">
                <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] mb-2">
                    {title}
                </h2>
                {subtitle && (
                    <p className="text-zinc-500 text-xs font-mono uppercase">{subtitle}</p>
                )}
            </div>

            {/* Navigation Arrows */}
            {products.length > 4 && (
                <>
                    <button
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 border border-[#27272a] text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black flex items-center justify-center -ml-5"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/80 border border-[#27272a] text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black flex items-center justify-center -mr-5"
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            {/* Scrollable Container */}
            <div
                ref={scrollContainerRef}
                className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {products.map((product) => (
                    <div
                        key={product.id}
                        className="flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] snap-start"
                    >
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>
        </div>
    );
}
