import { Link } from 'react-router-dom';
import { useCategories } from '@/lib/hooks/useCategories';
import { ChevronRight } from 'lucide-react';

export default function FeaturedCategories() {
    const { data: categories = [], isLoading } = useCategories();

    // Get first 6 active categories for featured grid
    const featuredCategories = categories.slice(0, 6);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-square bg-[#0A0A0A] border border-[#27272a] rounded-sm animate-pulse" />
                ))}
            </div>
        );
    }

    if (featuredCategories.length === 0) {
        return null;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] mb-2">
                        Shop by Style
                    </h2>
                    <p className="text-zinc-500 text-xs font-mono uppercase">
                        Find your perfect match
                    </p>
                </div>
                <Link
                    to="/shop"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors font-mono"
                >
                    View All
                    <ChevronRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredCategories.map((category) => (
                    <Link
                        key={category.id}
                        to={`/shop?category=${category.id}`}
                        className="group relative aspect-square bg-[#0A0A0A] border border-[#27272a] rounded-sm overflow-hidden hover:border-white transition-all"
                    >
                        {/* Category Image (if available) */}
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
        </div>
    );
}
