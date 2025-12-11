import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { useCategories } from '@/lib/hooks/useCategories';
import { ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function FeaturedCategories() {
    const { data: categories = [], isLoading } = useCategories();
    const scrollRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    // Get first 6 active categories for featured grid
    const featuredCategories = categories.slice(0, 6);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="h-6 w-32 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className={`${isMobile ? 'flex gap-3 overflow-hidden' : 'grid grid-cols-4 gap-6'}`}>
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className={`${isMobile ? 'flex-shrink-0 w-36 aspect-[3/4]' : 'aspect-square'} bg-[#0A0A0A] border border-[#27272a] rounded-lg animate-pulse`}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (featuredCategories.length === 0) {
        return null;
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 md:mb-8">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-white uppercase tracking-widest mb-1">
                        Shop by Style
                    </h2>
                    <p className="text-zinc-500 text-xs">
                        Find your perfect match
                    </p>
                </div>
                <Link
                    to="/shop"
                    className="flex items-center gap-1 text-xs font-medium text-zinc-400 active:text-white transition-colors"
                >
                    View All
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Categories - Horizontal scroll on mobile, grid on desktop */}
            {isMobile ? (
                <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {featuredCategories.map((category) => (
                        <Link
                            key={category.id}
                            to={`/shop?category=${category.id}`}
                            className="flex-shrink-0 w-32 snap-start group"
                        >
                            <div className="relative aspect-[3/4] bg-[#0A0A0A] border border-zinc-800 rounded-xl overflow-hidden active:scale-95 transition-transform">
                                {/* Category Image */}
                                {category.image ? (
                                    <img
                                        src={category.image}
                                        alt={category.label}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
                                )}

                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                                {/* Content */}
                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                    <h3 className="text-sm font-bold text-white mb-0.5 line-clamp-1">
                                        {category.label}
                                    </h3>
                                    <p className="text-[10px] text-zinc-400">
                                        {category.count} {category.count === 1 ? 'item' : 'items'}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                /* Desktop Grid */
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {featuredCategories.map((category) => (
                        <Link
                            key={category.id}
                            to={`/shop?category=${category.id}`}
                            className="group relative aspect-square bg-[#0A0A0A] border border-[#27272a] rounded-sm overflow-hidden hover:border-white transition-all"
                        >
                            {/* Category Image */}
                            {category.image ? (
                                <img
                                    src={category.image}
                                    alt={category.label}
                                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-[#050505]" />
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-1">
                                    {category.label}
                                </h3>
                                <p className="text-[10px] text-zinc-400 font-mono uppercase">
                                    {category.count} {category.count === 1 ? 'Style' : 'Styles'}
                                </p>
                            </div>

                            {/* Hover Arrow */}
                            <div className="absolute top-4 right-4 w-8 h-8 bg-white text-black rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
