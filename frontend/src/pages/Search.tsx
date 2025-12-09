import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import axios from '@/lib/api/axios';
import { useState } from 'react';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';

interface SearchProduct {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    category: { id: string; name: string; slug: string };
    variants: Array<{
        id: string;
        sku: string;
        price: number;
        stock: number;
        images: string[];
        color: string | null;
        length: string | null;
        texture: string | null;
        size: string | null;
        isActive: boolean;
    }>;
}

export default function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [sortBy, setSortBy] = useState<string>('relevance');
    const { formatPrice } = useCurrencyContext();

    // Fetch search results
    const { data, isLoading } = useQuery({
        queryKey: ['deep_search', query, sortBy],
        queryFn: async () => {
            const params = new URLSearchParams({ q: query });
            if (sortBy && sortBy !== 'relevance') params.append('sort', sortBy);

            const response = await axios.get(`/products/search?${params.toString()}`);
            return response.data.data.products;
        },
        enabled: query.length >= 2,
    });

    const results: SearchProduct[] = data || [];

    return (
        <div className="min-h-screen bg-[#050505] pt-16 pb-24">
            <div className="container px-4 py-12">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <Search className="w-8 h-8 text-zinc-600" />
                        <h1 className="text-3xl font-bold text-white uppercase tracking-wider">
                            Search Results
                        </h1>
                    </div>
                    <p className="text-zinc-500 text-sm font-mono">
                        Showing results for <strong className="text-white">"{query}"</strong>
                        {results.length > 0 && ` • ${results.length} products found`}
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-8 pb-6 border-b border-[#27272a]">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-[#0A0A0A] border border-[#27272a] rounded-sm px-4 py-2 text-xs text-white font-mono uppercase tracking-widest focus:outline-none focus:border-zinc-500"
                    >
                        <option value="relevance">Relevance</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="newest">Newest First</option>
                    </select>

                    {searchParams.get('q') && (
                        <button
                            onClick={() => setSearchParams({})}
                            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-sm text-xs text-zinc-400 hover:text-white transition-colors font-mono uppercase tracking-widest"
                        >
                            <X size={14} />
                            Clear Search
                        </button>
                    )}
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="animate-pulse">
                                <div className="bg-zinc-900 aspect-[4/5] mb-4" />
                                <div className="h-4 bg-zinc-900 w-3/4 mb-2" />
                                <div className="h-3 bg-zinc-900 w-1/2" />
                            </div>
                        ))}
                    </div>
                )}

                {/* No Results */}
                {!isLoading && results.length === 0 && (
                    <div className="text-center py-24 border border-[#27272a] bg-zinc-900/20 rounded-lg">
                        <Search className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-3">No Matches Found</h2>
                        <p className="text-zinc-500 text-sm font-mono mb-8 max-w-md mx-auto">
                            We couldn't find any products matching <span className="text-white">"{query}"</span>.
                            Try checking for typos or using broader terms like "blonde" or "curly".
                        </p>

                        <div className="space-y-6">
                            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Popular Searches</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {['Lace Front', 'Body Wave', 'Blonde', '30 Inch', 'HD Lace'].map(term => (
                                    <button
                                        key={term}
                                        onClick={() => setSearchParams({ q: term })}
                                        className="px-4 py-2 border border-[#27272a] hover:border-zinc-500 text-zinc-400 hover:text-white text-xs font-mono transition-all"
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-12">
                            <Link
                                to="/shop"
                                className="inline-block bg-white text-black px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                            >
                                Browse All Products
                            </Link>
                        </div>
                    </div>
                )}

                {/* Results Grid */}
                {!isLoading && results.length > 0 && (
                    <div className="space-y-8">
                        {results.map((product) => (
                            <div
                                key={product.id}
                                className="bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-700 transition-colors group"
                            >
                                <div className="flex flex-col md:flex-row gap-6 p-6">
                                    {/* Image */}
                                    <Link to={`/products/${product.id}`} className="flex-shrink-0">
                                        <div className="w-full md:w-48 aspect-[4/5] bg-zinc-900 overflow-hidden">
                                            {product.variants?.[0]?.images?.[0] ? (
                                                <img
                                                    src={product.variants[0].images[0]}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Search className="w-12 h-12 text-zinc-800" />
                                                </div>
                                            )}
                                        </div>
                                    </Link>

                                    {/* Details */}
                                    <div className="flex-1 flex flex-col">
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <Link to={`/products/${product.id}`}>
                                                        <h3 className="text-lg font-bold text-white uppercase tracking-wide group-hover:text-zinc-300 transition-colors mb-1">
                                                            {product.name}
                                                        </h3>
                                                    </Link>
                                                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                                                        {product.category?.name || 'WIG'}
                                                    </p>
                                                </div>
                                                <p className="text-lg font-bold text-white font-mono flex-shrink-0">
                                                    {formatPrice(product.basePrice)}
                                                </p>
                                            </div>

                                            <p className="text-sm text-zinc-400 mb-4 line-clamp-2 leading-relaxed">
                                                {product.description}
                                            </p>
                                        </div>

                                        {/* Variants */}
                                        {product.variants && product.variants.length > 0 && (
                                            <div className="border-t border-[#27272a] pt-4">
                                                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono mb-3">
                                                    Available Variants ({product.variants.filter(v => v.isActive).length})
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {product.variants.filter(v => v.isActive).slice(0, 6).map((variant) => (
                                                        <div
                                                            key={variant.id}
                                                            className="bg-zinc-900/50 border border-[#27272a] p-3 text-xs"
                                                        >
                                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                                <span className="text-zinc-400 font-mono text-[10px]">
                                                                    {variant.sku}
                                                                </span>
                                                                <span className={`text-[10px] font-bold font-mono ${variant.stock > 5 ? 'text-green-400' : variant.stock > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                    {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of Stock'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {variant.color && (
                                                                    <span className="text-[10px] text-zinc-500 px-2 py-1 bg-zinc-900 rounded-sm font-mono">
                                                                        {variant.color}
                                                                    </span>
                                                                )}
                                                                {variant.length && (
                                                                    <span className="text-[10px] text-zinc-500 px-2 py-1 bg-zinc-900 rounded-sm font-mono">
                                                                        {variant.length}
                                                                    </span>
                                                                )}
                                                                {variant.texture && (
                                                                    <span className="text-[10px] text-zinc-500 px-2 py-1 bg-zinc-900 rounded-sm font-mono">
                                                                        {variant.texture}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-bold text-white mt-2 font-mono">
                                                                {formatPrice(variant.price)}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                                {product.variants.filter(v => v.isActive).length > 6 && (
                                                    <Link
                                                        to={`/products/${product.id}`}
                                                        className="inline-block mt-3 text-[10px] text-blue-400 hover:text-blue-300 uppercase tracking-wide font-mono"
                                                    >
                                                        + {product.variants.filter(v => v.isActive).length - 6} More Variants →
                                                    </Link>
                                                )}
                                            </div>
                                        )}

                                        {/* CTA */}
                                        <Link
                                            to={`/products/${product.id}`}
                                            className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors mt-4"
                                        >
                                            View Full Details →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
