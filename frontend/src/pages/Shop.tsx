import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '@/components/products/ProductCard';
import { Search, X, ChevronDown, ChevronUp, SlidersHorizontal, Grid3X3, LayoutGrid } from 'lucide-react';
import { useProducts } from '@/lib/hooks/useProducts';
import { useCategories } from '@/lib/hooks/useCategories';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import type { ProductFilters } from '@/lib/types/product';
import ShopSkeleton from '@/components/common/ShopSkeleton';

export default function Shop() {
    const [searchParams, _setSearchParams] = useSearchParams();
    const isMobile = useIsMobile();

    // Initialize filters from URL params
    const [filters, setFilters] = useState<ProductFilters>({
        page: 1,
        sort: searchParams.get('sort') as any || 'newest',
        category: searchParams.get('category') || undefined,
        search: searchParams.get('search') || undefined
    });

    const [showFilters, setShowFilters] = useState(false);
    const [showSortSheet, setShowSortSheet] = useState(false);
    const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '');
    const [expandedSections, setExpandedSections] = useState({ categories: true, sort: true, price: false });
    const [mobileGridCols, setMobileGridCols] = useState<2 | 1>(2);

    // Sync URL params when they change (e.g. from navigation)
    useEffect(() => {
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const sort = searchParams.get('sort');

        setFilters(prev => ({
            ...prev,
            category: category || undefined,
            search: search || undefined,
            sort: sort as any || prev.sort,
            page: 1 // Reset to page 1 on new filter
        }));

        if (search) setLocalSearch(search);
    }, [searchParams]);

    // Lock body scroll when filter sheet is open
    useEffect(() => {
        if ((showFilters || showSortSheet) && isMobile) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showFilters, showSortSheet, isMobile]);

    // React Query hooks
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
        setShowSortSheet(false);
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
        setShowFilters(false);
    };

    const activeFilterCount = [
        filters.category,
        filters.inStock,
        filters.search,
        filters.minPrice,
        filters.maxPrice
    ].filter(Boolean).length;

    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'popular', label: 'Most Popular' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
    ];

    const currentSortLabel = sortOptions.find(o => o.value === filters.sort)?.label || 'Sort';

    // Mobile Filter Sheet
    const MobileFilterSheet = () => {
        if (!isMobile || !showFilters) return null;

        return createPortal(
            <div className="fixed inset-0 z-[9999]">
                <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowFilters(false)}
                />
                <div
                    className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] rounded-t-2xl max-h-[85vh] flex flex-col"
                    style={{ animation: 'slideUp 0.3s ease-out forwards' }}
                >
                    {/* Handle */}
                    <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3" />

                    {/* Header */}
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Filters</h3>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="text-sm text-zinc-400 active:text-white"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Filter Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Categories */}
                        <div>
                            <button
                                onClick={() => setExpandedSections(prev => ({ ...prev, categories: !prev.categories }))}
                                className="w-full flex items-center justify-between py-2"
                            >
                                <span className="text-sm font-bold text-white uppercase tracking-wide">Category</span>
                                {expandedSections.categories ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
                            </button>
                            {expandedSections.categories && (
                                <div className="space-y-1 mt-2">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleCategoryChange(cat.id)}
                                            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${filters.category === cat.id
                                                ? 'bg-white text-black font-bold'
                                                : 'text-zinc-400 active:bg-zinc-800'
                                                }`}
                                        >
                                            <span className="flex justify-between items-center">
                                                <span>{cat.label}</span>
                                                <span className={`text-xs ${filters.category === cat.id ? 'text-black/60' : 'text-zinc-600'}`}>
                                                    {cat.count}
                                                </span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* In Stock Toggle */}
                        <div className="flex items-center justify-between py-3 border-t border-zinc-800">
                            <span className="text-sm font-medium text-white">In Stock Only</span>
                            <button
                                onClick={handleInStockToggle}
                                className={`w-12 h-7 rounded-full relative transition-colors ${filters.inStock ? 'bg-white' : 'bg-zinc-800'
                                    }`}
                            >
                                <span className={`absolute top-1 w-5 h-5 rounded-full transition-all ${filters.inStock ? 'right-1 bg-black' : 'left-1 bg-zinc-500'
                                    }`} />
                            </button>
                        </div>

                        {/* Price Range */}
                        <div className="border-t border-zinc-800 pt-4">
                            <button
                                onClick={() => setExpandedSections(prev => ({ ...prev, price: !prev.price }))}
                                className="w-full flex items-center justify-between py-2"
                            >
                                <span className="text-sm font-bold text-white uppercase tracking-wide">Price Range</span>
                                {expandedSections.price ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
                            </button>
                            {expandedSections.price && (
                                <div className="flex gap-3 mt-3">
                                    <div className="flex-1">
                                        <label className="text-xs text-zinc-500 mb-1 block">Min</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={filters.minPrice || ''}
                                            onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? parseFloat(e.target.value) : undefined, page: 1 }))}
                                            className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 rounded-lg focus:border-zinc-600 outline-none"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-zinc-500 mb-1 block">Max</label>
                                        <input
                                            type="number"
                                            placeholder="No limit"
                                            value={filters.maxPrice || ''}
                                            onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined, page: 1 }))}
                                            className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 rounded-lg focus:border-zinc-600 outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Apply Button */}
                    <div className="p-4 border-t border-zinc-800">
                        <button
                            onClick={() => setShowFilters(false)}
                            className="w-full py-4 bg-white text-black font-bold text-sm uppercase tracking-wide rounded-lg active:bg-zinc-200"
                        >
                            Show {pagination?.total || 0} Results
                        </button>
                    </div>
                </div>
                <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            </div>,
            document.body
        );
    };

    // Mobile Sort Sheet
    const MobileSortSheet = () => {
        if (!isMobile || !showSortSheet) return null;

        return createPortal(
            <div className="fixed inset-0 z-[9999]">
                <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowSortSheet(false)}
                />
                <div
                    className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] rounded-t-2xl"
                    style={{ animation: 'slideUp 0.3s ease-out forwards' }}
                >
                    <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3" />
                    <div className="p-4 border-b border-zinc-800">
                        <h3 className="text-lg font-bold text-white">Sort By</h3>
                    </div>
                    <div className="py-2">
                        {sortOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleSortChange(option.value)}
                                className={`w-full text-left px-6 py-4 text-base transition-all ${filters.sort === option.value
                                    ? 'text-white bg-zinc-800'
                                    : 'text-zinc-400 active:bg-zinc-900'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-zinc-800">
                        <button
                            onClick={() => setShowSortSheet(false)}
                            className="w-full py-3 bg-zinc-800 text-white font-medium rounded-lg"
                        >
                            Close
                        </button>
                    </div>
                </div>
                <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            </div>,
            document.body
        );
    };

    return (
        <div className="min-h-screen bg-[#050505]">
            {/* Mobile Search Bar - Sticky */}
            {isMobile && (
                <div className="sticky top-16 z-40 bg-[#050505] border-b border-zinc-800 p-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                        <input
                            type="text"
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search products..."
                            className="w-full bg-zinc-900 border border-zinc-800 text-white text-base pl-12 pr-12 py-3 rounded-xl focus:border-zinc-600 outline-none"
                        />
                        {localSearch && (
                            <button
                                onClick={handleClearSearch}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 active:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className={`container mx-auto px-4 max-w-7xl ${isMobile ? 'py-4' : 'py-12'}`}>
                {/* Header - Desktop Only */}
                {!isMobile && (
                    <div className="mb-8 border-b border-[#27272a] pb-6">
                        <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-[0.2em]">The Collection</h1>
                        <p className="text-zinc-500 text-xs font-mono uppercase">Premium Hair Systems // Curated For You</p>
                    </div>
                )}

                {/* Mobile Header & Toolbar */}
                {isMobile && (
                    <div className="mb-4">
                        {/* Results count */}
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-zinc-400">
                                {isLoading ? 'Loading...' : `${pagination?.total || 0} products`}
                            </p>
                            <button
                                onClick={() => setMobileGridCols(mobileGridCols === 2 ? 1 : 2)}
                                className="p-2 text-zinc-500 active:text-white"
                            >
                                {mobileGridCols === 2 ? <LayoutGrid size={20} /> : <Grid3X3 size={20} />}
                            </button>
                        </div>

                        {/* Filter/Sort Toolbar */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowFilters(true)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${activeFilterCount > 0
                                    ? 'bg-white text-black border-white'
                                    : 'bg-zinc-900 text-white border-zinc-800 active:bg-zinc-800'
                                    }`}
                            >
                                <SlidersHorizontal size={16} />
                                <span className="text-sm font-medium">
                                    Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                                </span>
                            </button>
                            <button
                                onClick={() => setShowSortSheet(true)}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white active:bg-zinc-800"
                            >
                                <span className="text-sm font-medium">{currentSortLabel}</span>
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        {/* Active Filters Pills */}
                        {(filters.search || filters.category) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {filters.search && (
                                    <span className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-full text-xs text-white">
                                        "{filters.search}"
                                        <button onClick={handleClearSearch}><X size={12} /></button>
                                    </span>
                                )}
                                {filters.category && (
                                    <span className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-full text-xs text-white">
                                        {categories.find(c => c.id === filters.category)?.label}
                                        <button onClick={() => handleCategoryChange(filters.category!)}><X size={12} /></button>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Desktop Search & Controls */}
                {!isMobile && (
                    <div className="mb-8 flex gap-4">
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
                                <button onClick={handleClearSearch} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button onClick={handleSearch} className="bg-white text-black font-bold text-[10px] uppercase tracking-widest px-8 py-3 rounded-sm hover:bg-zinc-200 transition-colors">
                            SEARCH
                        </button>
                    </div>
                )}

                <div className="flex gap-8">
                    {/* Desktop Filters Sidebar */}
                    {!isMobile && (
                        <div className="w-64 flex-shrink-0">
                            <div className="sticky top-24 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-white text-xs font-bold uppercase tracking-widest">Filters</h3>
                                    {activeFilterCount > 0 && (
                                        <button onClick={clearFilters} className="text-zinc-500 text-[10px] hover:text-white font-mono uppercase transition-colors">
                                            RESET ALL
                                        </button>
                                    )}
                                </div>

                                {/* Categories */}
                                <div className="border-b border-[#27272a] pb-6">
                                    <button onClick={() => setExpandedSections(prev => ({ ...prev, categories: !prev.categories }))} className="w-full flex items-center justify-between group">
                                        <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono group-hover:text-white transition-colors">System Type</h4>
                                        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-300 ${expandedSections.categories ? 'rotate-180' : ''}`} />
                                    </button>
                                    {expandedSections.categories && (
                                        <div className="mt-4 space-y-1">
                                            {categories.map((cat) => (
                                                <button key={cat.id} onClick={() => handleCategoryChange(cat.id)} className={`w-full text-left px-3 py-2 rounded-sm text-[10px] uppercase tracking-wide transition-all font-mono ${filters.category === cat.id ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
                                                    <span className="flex justify-between items-center">
                                                        <span>{cat.label}</span>
                                                        <span className={`text-[9px] ${filters.category === cat.id ? 'text-black/60' : 'text-zinc-700'}`}>[{cat.count}]</span>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* In Stock Toggle */}
                                <div className="border-b border-[#27272a] pb-6">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input type="checkbox" checked={filters.inStock || false} onChange={handleInStockToggle} className="sr-only peer" />
                                            <div className="w-8 h-4 bg-[#0A0A0A] border border-[#27272a] rounded-full peer peer-checked:bg-zinc-800 transition-colors"></div>
                                            <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-zinc-600 rounded-full peer-checked:bg-white peer-checked:translate-x-4 transition-transform"></div>
                                        </div>
                                        <span className="text-zinc-400 group-hover:text-white transition-colors text-[10px] uppercase tracking-widest font-mono">In Stock Only</span>
                                    </label>
                                </div>

                                {/* Price Range */}
                                <div className="border-b border-[#27272a] pb-6">
                                    <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono mb-4">Price Range</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wide font-mono block mb-1">Min Price</label>
                                            <input type="number" placeholder="0" min="0" value={filters.minPrice || ''} onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? parseFloat(e.target.value) : undefined, page: 1 }))} className="w-full bg-[#0A0A0A] border border-[#27272a] text-white text-xs font-mono px-3 py-2 rounded-sm focus:border-white transition-colors outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-zinc-600 uppercase tracking-wide font-mono block mb-1">Max Price</label>
                                            <input type="number" placeholder="No limit" min="0" value={filters.maxPrice || ''} onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined, page: 1 }))} className="w-full bg-[#0A0A0A] border border-[#27272a] text-white text-xs font-mono px-3 py-2 rounded-sm focus:border-white transition-colors outline-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Sort Order */}
                                <div>
                                    <button onClick={() => setExpandedSections(prev => ({ ...prev, sort: !prev.sort }))} className="w-full flex items-center justify-between group mb-4">
                                        <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono group-hover:text-white transition-colors">Sort Order</h4>
                                        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-300 ${expandedSections.sort ? 'rotate-180' : ''}`} />
                                    </button>
                                    {expandedSections.sort && (
                                        <div className="space-y-1">
                                            {sortOptions.map((option) => (
                                                <button key={option.value} onClick={() => handleSortChange(option.value)} className={`w-full text-left px-3 py-2 rounded-sm text-[10px] uppercase tracking-wide transition-all font-mono ${filters.sort === option.value ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Product Grid */}
                    <div className="flex-1 min-w-0">
                        {/* Results Header - Desktop */}
                        {!isMobile && (
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-zinc-500 text-[10px] font-mono uppercase">
                                    {isLoading ? 'SCANNING DATABASE...' : `${pagination?.total || 0} UNITS DETECTED${filters.category ? ` // ${categories.find(c => c.id === filters.category)?.label}` : ''}`}
                                </p>
                            </div>
                        )}

                        {/* Desktop Active Filters */}
                        {!isMobile && filters.search && (
                            <div className="mb-6 flex flex-wrap gap-2">
                                <span className="bg-[#0A0A0A] border border-[#27272a] px-3 py-1.5 rounded-sm text-[10px] text-white uppercase tracking-wide flex items-center gap-2 font-mono">
                                    QUERY: "{filters.search}"
                                    <button onClick={handleClearSearch} className="hover:text-red-400 transition-colors"><X size={10} /></button>
                                </span>
                            </div>
                        )}

                        {/* Loading Skeletons */}
                        {isLoading && (
                            <ShopSkeleton isMobile={isMobile} mobileGridCols={mobileGridCols} />
                        )}

                        {/* Products Grid */}
                        {!isLoading && products.length > 0 && (
                            <div className={`grid gap-3 md:gap-6 ${isMobile ? (mobileGridCols === 2 ? 'grid-cols-2' : 'grid-cols-1') : 'grid-cols-2 lg:grid-cols-3'}`}>
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} compact={isMobile && mobileGridCols === 2} />
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {!isLoading && products.length === 0 && (
                            <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-12 text-center">
                                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-6 h-6 text-zinc-600" />
                                </div>
                                <h3 className="text-base font-bold text-white mb-2">No products found</h3>
                                <p className="text-zinc-500 text-sm mb-6">Try adjusting your filters</p>
                                <button onClick={clearFilters} className="bg-white text-black font-bold text-sm uppercase tracking-wide px-6 py-3 rounded-lg active:bg-zinc-200">
                                    Clear Filters
                                </button>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination && pagination.pages > 1 && !isLoading && (
                            <div className={`mt-8 flex justify-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className={`px-4 py-2 bg-zinc-900 border border-zinc-800 text-sm font-medium text-white disabled:opacity-30 disabled:cursor-not-allowed active:bg-zinc-800 transition-colors ${isMobile ? 'rounded-lg' : 'rounded-sm text-[10px] uppercase tracking-widest'}`}
                                >
                                    Prev
                                </button>

                                {[...Array(pagination.pages)].map((_, i) => {
                                    const page = i + 1;
                                    if (page === 1 || page === pagination.pages || Math.abs(page - pagination.page) <= 1) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`w-10 h-10 flex items-center justify-center text-sm font-medium transition-colors ${isMobile ? 'rounded-lg' : 'rounded-sm'} ${page === pagination.page
                                                    ? 'bg-white text-black'
                                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 active:text-white'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    } else if (page === pagination.page - 2 || page === pagination.page + 2) {
                                        return <span key={page} className="w-10 h-10 flex items-center justify-center text-zinc-600">...</span>;
                                    }
                                    return null;
                                })}

                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.pages}
                                    className={`px-4 py-2 bg-zinc-900 border border-zinc-800 text-sm font-medium text-white disabled:opacity-30 disabled:cursor-not-allowed active:bg-zinc-800 transition-colors ${isMobile ? 'rounded-lg' : 'rounded-sm text-[10px] uppercase tracking-widest'}`}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Sheets */}
            <MobileFilterSheet />
            <MobileSortSheet />
        </div>
    );
}
