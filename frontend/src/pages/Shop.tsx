import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '@/components/products/ProductCard';
import { Filter, Search, X, ChevronDown } from 'lucide-react';
import { useProducts } from '@/lib/hooks/useProducts';
import { useCategories } from '@/lib/hooks/useCategories';
import type { ProductFilters } from '@/lib/types/product';

export default function Shop() {
    const [searchParams, _setSearchParams] = useSearchParams();

    // Initialize filters from URL params
    const [filters, setFilters] = useState<ProductFilters>({
        page: 1,
        sort: 'newest',
        category: searchParams.get('category') || undefined,
        search: searchParams.get('search') || undefined
    });

    const [showFilters, setShowFilters] = useState(false);
    const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '');
    const [expandedSections, setExpandedSections] = useState({ categories: true, sort: true });

    // Sync URL params when they change (e.g. from navigation)
    useEffect(() => {
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        setFilters(prev => ({
            ...prev,
            category: category || undefined,
            search: search || undefined,
            page: 1 // Reset to page 1 on new filter
        }));

        if (search) setLocalSearch(search);
    }, [searchParams]);

    // React Query hooks - automatic caching and refetching
    const { data: productsData, isLoading } = useProducts(filters);
    const { data: categories = [] } = useCategories();

    const products = productsData?.data || [];
    const pagination = productsData?.pagination;

    const handleCategoryChange = (categorySlug: string) => {
        setFilters((prev) => ({
            ...prev,
            category: prev.category === categorySlug ? undefined : categorySlug,
            page: 1,
        }));
    };

    const handleSortChange = (sort: string) => {
        setFilters((prev) => ({ ...prev, sort: sort as any, page: 1 }));
    };

    const handleSearch = () => {
        if (localSearch.trim()) {
            setFilters((prev) => ({ ...prev, search: localSearch.trim(), page: 1 }));
        }
    };

    const handleClearSearch = () => {
        setLocalSearch('');
        setFilters((prev) => {
            const newFilters = { ...prev };
            delete newFilters.search;
            return { ...newFilters, page: 1 };
        });
    };

    const handleInStockToggle = () => {
        setFilters((prev) => ({ ...prev, inStock: !prev.inStock, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const clearFilters = () => {
        setFilters({ page: 1, sort: 'newest' });
        setLocalSearch('');
    };

    const sortOptions = [
        { value: 'newest', label: 'NEWEST ARRIVALS' },
        { value: 'popular', label: 'MOST POPULAR' },
        { value: 'price_asc', label: 'PRICE: LOW TO HIGH' },
        { value: 'price_desc', label: 'PRICE: HIGH TO LOW' },
    ];

    return (
        <div className="min-h-screen bg-[#050505] py-12">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Header */}
                <div className="mb-8 border-b border-[#27272a] pb-6">
                    <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-[0.2em]">The Collection</h1>
                    <p className="text-zinc-500 text-xs font-mono uppercase">Premium Hair Systems // Curated For You</p>
                </div>

                {/* Search & Controls */}
                <div className="mb-8 flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="SEARCH INVENTORY..."
                            className="w-full bg-[#0A0A0A] border border-[#27272a] text-white text-xs font-mono placeholder:text-zinc-700 pl-10 pr-10 py-3 rounded-sm focus:border-white transition-colors outline-none uppercase"
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                        {localSearch && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Search Button */}
                    <button
                        onClick={handleSearch}
                        className="bg-white text-black font-bold text-[10px] uppercase tracking-widest px-8 py-3 rounded-sm hover:bg-zinc-200 transition-colors"
                    >
                        SEARCH
                    </button>

                    {/* Mobile Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="md:hidden bg-[#0A0A0A] border border-[#27272a] px-4 py-3 rounded-sm flex items-center justify-center gap-2 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-900 transition-colors"
                    >
                        <Filter size={14} />
                        FILTERS
                    </button>
                </div>

                <div className="flex gap-8">
                    {/* Filters Sidebar */}
                    <div
                        className={`${showFilters ? 'block' : 'hidden'
                            } md:block w-full md:w-64 flex-shrink-0`}
                    >
                        <div className="sticky top-24 space-y-8">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-white text-xs font-bold uppercase tracking-widest">Filters</h3>
                                {(filters.category || filters.inStock || filters.search) && (
                                    <button
                                        onClick={() => clearFilters()}
                                        className="text-zinc-500 text-[10px] hover:text-white font-mono uppercase transition-colors"
                                    >
                                        RESET ALL
                                    </button>
                                )}
                            </div>

                            {/* Categories */}
                            <div className="border-b border-[#27272a] pb-6">
                                <button
                                    onClick={() => setExpandedSections(prev => ({ ...prev, categories: !prev.categories }))}
                                    className="w-full flex items-center justify-between group"
                                >
                                    <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono group-hover:text-white transition-colors">
                                        System Type
                                    </h4>
                                    <ChevronDown
                                        className={`w-3 h-3 text-zinc-500 transition-transform duration-300 ${expandedSections.categories ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                <div className={`grid transition-all duration-300 ease-in-out ${expandedSections.categories ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden">
                                        <div className="space-y-1">
                                            {categories.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => handleCategoryChange(cat.id)}
                                                    className={`w-full text-left px-3 py-2 rounded-sm text-[10px] uppercase tracking-wide transition-all font-mono ${filters.category === cat.id
                                                        ? 'bg-white text-black font-bold'
                                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                                                        }`}
                                                >
                                                    <span className="flex justify-between items-center">
                                                        <span>{cat.label}</span>
                                                        <span className={`text-[9px] ${filters.category === cat.id ? 'text-black/60' : 'text-zinc-700'}`}>
                                                            [{cat.count}]
                                                        </span>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* In Stock Toggle */}
                            <div className="border-b border-[#27272a] pb-6 pt-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={filters.inStock || false}
                                            onChange={handleInStockToggle}
                                            className="sr-only peer"
                                        />
                                        <div className="w-8 h-4 bg-[#0A0A0A] border border-[#27272a] rounded-full peer peer-checked:bg-zinc-800 transition-colors"></div>
                                        <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-zinc-600 rounded-full peer-checked:bg-white peer-checked:translate-x-4 transition-transform"></div>
                                    </div>
                                    <span className="text-zinc-400 group-hover:text-white transition-colors text-[10px] uppercase tracking-widest font-mono">
                                        In Stock Only
                                    </span>
                                </label>
                            </div>

                            {/* Price Range Filter */}
                            <div className="border-b border-[#27272a] pb-6 pt-6">
                                <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono mb-4">
                                    Price Range
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] text-zinc-600 uppercase tracking-wide font-mono block mb-1">
                                            Min Price
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            min="0"
                                            value={filters.minPrice || ''}
                                            onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? parseFloat(e.target.value) : undefined, page: 1 }))}
                                            className="w-full bg-[#0A0A0A] border border-[#27272a] text-white text-xs font-mono px-3 py-2 rounded-sm focus:border-white transition-colors outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-zinc-600 uppercase tracking-wide font-mono block mb-1">
                                            Max Price
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="No limit"
                                            min="0"
                                            value={filters.maxPrice || ''}
                                            onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined, page: 1 }))}
                                            className="w-full bg-[#0A0A0A] border border-[#27272a] text-white text-xs font-mono px-3 py-2 rounded-sm focus:border-white transition-colors outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sort Order */}
                            <div className="pt-6">
                                <button
                                    onClick={() => setExpandedSections(prev => ({ ...prev, sort: !prev.sort }))}
                                    className="w-full flex items-center justify-between group mb-4"
                                >
                                    <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono group-hover:text-white transition-colors">
                                        Sort Order
                                    </h4>
                                    <ChevronDown
                                        className={`w-3 h-3 text-zinc-500 transition-transform duration-300 ${expandedSections.sort ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                <div className={`grid transition-all duration-300 ease-in-out ${expandedSections.sort ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden">
                                        <div className="space-y-1">
                                            {sortOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => handleSortChange(option.value)}
                                                    className={`w-full text-left px-3 py-2 rounded-sm text-[10px] uppercase tracking-wide transition-all font-mono ${filters.sort === option.value
                                                        ? 'bg-white text-black font-bold'
                                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                                                        }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 min-w-0">
                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-zinc-500 text-[10px] font-mono uppercase">
                                {isLoading ? (
                                    'SCANNING DATABASE...'
                                ) : (
                                    <>
                                        {pagination?.total || 0} UNITS DETECTED
                                        {filters.category && ` // ${categories.find((c) => c.id === filters.category)?.label}`}
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Active Filters Pills */}
                        {filters.search && (
                            <div className="mb-6 flex flex-wrap gap-2">
                                <span className="bg-[#0A0A0A] border border-[#27272a] px-3 py-1.5 rounded-sm text-[10px] text-white uppercase tracking-wide flex items-center gap-2 font-mono">
                                    QUERY: "{filters.search}"
                                    <button onClick={handleClearSearch} className="hover:text-red-400 transition-colors">
                                        <X size={10} />
                                    </button>
                                </span>
                            </div>
                        )}

                        {/* Loading Skeletons */}
                        {isLoading && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-[#0A0A0A] border border-[#27272a] rounded-sm overflow-hidden animate-pulse">
                                        <div className="aspect-[4/5] bg-[#050505]" />
                                        <div className="p-4 space-y-3">
                                            <div className="h-3 bg-[#050505] w-1/4" />
                                            <div className="h-4 bg-[#050505] w-3/4" />
                                            <div className="h-3 bg-[#050505] w-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Products Grid */}
                        {!isLoading && products.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {!isLoading && products.length === 0 && (
                            <div className="bg-[#0A0A0A] border border-[#27272a] rounded-sm p-16 text-center">
                                <div className="w-16 h-16 bg-[#050505] border border-[#27272a] rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Search className="w-6 h-6 text-zinc-600" />
                                </div>
                                <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest">No Units Found</h3>
                                <p className="text-zinc-500 text-xs mb-8 font-mono uppercase">Adjust parameters to locate inventory</p>
                                <button
                                    onClick={() => clearFilters()}
                                    className="bg-white text-black font-bold text-[10px] uppercase tracking-widest px-6 py-3 rounded-sm hover:bg-zinc-200 transition-colors"
                                >
                                    RESET PARAMETERS
                                </button>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination && pagination.pages > 1 && !isLoading && (
                            <div className="mt-12 flex justify-center gap-2">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="px-4 py-2 bg-[#0A0A0A] border border-[#27272a] text-[10px] font-bold text-white uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-900 transition-colors"
                                >
                                    PREV
                                </button>

                                {[...Array(pagination.pages)].map((_, i) => {
                                    const page = i + 1;
                                    if (
                                        page === 1 ||
                                        page === pagination.pages ||
                                        Math.abs(page - pagination.page) <= 1
                                    ) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`w-8 h-8 flex items-center justify-center text-[10px] font-bold transition-colors ${page === pagination.page
                                                    ? 'bg-white text-black'
                                                    : 'bg-[#0A0A0A] border border-[#27272a] text-zinc-500 hover:text-white hover:border-zinc-600'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    } else if (page === pagination.page - 2 || page === pagination.page + 2) {
                                        return (
                                            <span key={page} className="w-8 h-8 flex items-center justify-center text-zinc-700 text-[10px]">
                                                ...
                                            </span>
                                        );
                                    }
                                    return null;
                                })}

                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.pages}
                                    className="px-4 py-2 bg-[#0A0A0A] border border-[#27272a] text-[10px] font-bold text-white uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-900 transition-colors"
                                >
                                    NEXT
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
