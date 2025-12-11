import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import type { Product } from '@/lib/types/product';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { Link } from 'react-router-dom';

interface ProductCarouselProps {
    products: Product[];
    title: string;
    subtitle?: string;
    isLoading?: boolean;
    viewAllLink?: string;
}

export default function ProductCarousel({ products, title, subtitle, isLoading, viewAllLink }: ProductCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return;

        const scrollAmount = isMobile ? 200 : 400;
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
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
                        <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
                    </div>
                </div>
                <div className={`flex gap-3 overflow-hidden ${isMobile ? '-mx-4 px-4' : ''}`}>
                    {[...Array(isMobile ? 2 : 4)].map((_, i) => (
                        <div
                            key={i}
                            className={`flex-shrink-0 ${isMobile ? 'w-40' : 'w-[calc(25%-18px)]'} bg-[#0A0A0A] border border-[#27272a] rounded-lg overflow-hidden animate-pulse`}
                        >
                            <div className="aspect-[3/4] bg-zinc-900" />
                            <div className="p-3 space-y-2">
                                <div className="h-3 bg-zinc-800 w-3/4 rounded" />
                                <div className="h-4 bg-zinc-800 w-1/2 rounded" />
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
            {/* Header */}
            <div className="flex items-center justify-between mb-4 md:mb-8">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-widest mb-1">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-zinc-500 text-xs">{subtitle}</p>
                    )}
                </div>
                {viewAllLink && (
                    <Link
                        to={viewAllLink}
                        className="flex items-center gap-1 text-xs font-medium text-zinc-400 active:text-white transition-colors"
                    >
                        View All
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                )}
            </div>

            {/* Navigation Arrows - desktop only */}
            {products.length > 4 && !isMobile && (
                <>
                    <button
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 backdrop-blur-sm border border-white/10 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-black hover:scale-110 flex items-center justify-center -ml-6"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 backdrop-blur-sm border border-white/10 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-black hover:scale-110 flex items-center justify-center -mr-6"
                        aria-label="Scroll right"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            {/* Scrollable Container */}
            <div
                ref={scrollContainerRef}
                className={`flex gap-3 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 ${isMobile ? '-mx-4 px-4' : ''
                    }`}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {products.map((product) => (
                    <div
                        key={product.id}
                        className={`flex-shrink-0 snap-start ${isMobile
                                ? 'w-40'
                                : 'w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]'
                            }`}
                    >
                        <ProductCard product={product} compact={isMobile} />
                    </div>
                ))}
            </div>

            {/* Scroll indicator for mobile */}
            {isMobile && products.length > 2 && (
                <div className="flex justify-center mt-4 gap-1">
                    <div className="w-8 h-1 bg-white/30 rounded-full" />
                    <div className="w-2 h-1 bg-white/10 rounded-full" />
                    <div className="w-2 h-1 bg-white/10 rounded-full" />
                </div>
            )}
        </div>
    );
}
