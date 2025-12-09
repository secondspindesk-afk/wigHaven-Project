import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, X, Package, ShoppingCart, Users, Star,
    Tag, Percent, Megaphone, Headphones, ArrowRight,
    Command, Loader2
} from 'lucide-react';
import { useAdminSearch } from '@/lib/hooks/useAdminSearch';
import { AdminSearchResult } from '@/lib/api/admin';

interface AdminSearchModalProps {
    open: boolean;
    onClose: () => void;
}

// Category config for icons and labels
const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    product: { icon: <Package size={14} />, label: 'Products', color: 'text-blue-400' },
    order: { icon: <ShoppingCart size={14} />, label: 'Orders', color: 'text-emerald-400' },
    user: { icon: <Users size={14} />, label: 'Users', color: 'text-purple-400' },
    review: { icon: <Star size={14} />, label: 'Reviews', color: 'text-amber-400' },
    category: { icon: <Tag size={14} />, label: 'Categories', color: 'text-cyan-400' },
    discount: { icon: <Percent size={14} />, label: 'Discounts', color: 'text-pink-400' },
    banner: { icon: <Megaphone size={14} />, label: 'Banners', color: 'text-orange-400' },
    support: { icon: <Headphones size={14} />, label: 'Support', color: 'text-red-400' },
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400',
    inactive: 'bg-zinc-500/20 text-zinc-400',
    pending: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    expired: 'bg-red-500/20 text-red-400',
    scheduled: 'bg-blue-500/20 text-blue-400',
    open: 'bg-amber-500/20 text-amber-400',
    closed: 'bg-zinc-500/20 text-zinc-400',
    processing: 'bg-blue-500/20 text-blue-400',
    shipped: 'bg-cyan-500/20 text-cyan-400',
    delivered: 'bg-emerald-500/20 text-emerald-400',
    cancelled: 'bg-red-500/20 text-red-400',
    refunded: 'bg-zinc-500/20 text-zinc-400',
};

export function AdminSearchModal({ open, onClose }: AdminSearchModalProps) {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const {
        query,
        setQuery,
        results,
        total,
        allResults,
        hasResults,
        isLoading,
        isFetching,
        clearSearch
    } = useAdminSearch();

    // Focus input when modal opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setSelectedIndex(-1);
        }
    }, [open]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!hasResults) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < allResults.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : allResults.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && allResults[selectedIndex]) {
                    handleResultClick(allResults[selectedIndex]);
                }
                break;
            case 'Escape':
                onClose();
                break;
        }
    }, [hasResults, allResults, selectedIndex, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && resultsRef.current) {
            const selectedElement = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            selectedElement?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    // Handle result click
    const handleResultClick = (result: AdminSearchResult) => {
        navigate(result.url);
        onClose();
        clearSearch();
    };

    // Close on backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Global keyboard shortcut for opening
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (!open) {
                    // This is handled by parent, but adding for completeness
                }
            }
            if (e.key === 'Escape' && open) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    // Get flat index for a result
    let flatIndex = -1;
    const getFlatIndex = () => {
        flatIndex++;
        return flatIndex;
    };

    // Render a category section
    const renderCategory = (categoryResults: AdminSearchResult[], type: string) => {
        if (!categoryResults || categoryResults.length === 0) return null;

        const config = CATEGORY_CONFIG[type] || { icon: null, label: type, color: 'text-zinc-400' };

        return (
            <div key={type} className="mb-4">
                <div className="flex items-center gap-2 px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                    <span className={config.color}>{config.icon}</span>
                    {config.label}
                    <span className="text-zinc-700">({categoryResults.length})</span>
                </div>
                <div className="space-y-0.5">
                    {categoryResults.map((result) => {
                        const index = getFlatIndex();
                        const isSelected = selectedIndex === index;

                        return (
                            <button
                                key={result.id}
                                data-index={index}
                                onClick={() => handleResultClick(result)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${isSelected
                                        ? 'bg-white text-black'
                                        : 'hover:bg-[#0A0A0A] text-zinc-300'
                                    }`}
                            >
                                {/* Image or Icon */}
                                {result.image ? (
                                    <img
                                        src={result.image}
                                        alt=""
                                        className="w-8 h-8 object-cover rounded bg-zinc-800"
                                    />
                                ) : (
                                    <div className={`w-8 h-8 flex items-center justify-center rounded ${isSelected ? 'bg-zinc-200' : 'bg-zinc-800'
                                        }`}>
                                        <span className={isSelected ? 'text-zinc-600' : config.color}>
                                            {config.icon}
                                        </span>
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium truncate ${isSelected ? 'text-black' : ''
                                        }`}>
                                        {result.title}
                                    </p>
                                    <p className={`text-[10px] truncate ${isSelected ? 'text-zinc-600' : 'text-zinc-500'
                                        }`}>
                                        {result.subtitle}
                                    </p>
                                </div>

                                {/* Status Badge */}
                                {result.status && (
                                    <span className={`px-2 py-0.5 text-[9px] font-medium uppercase rounded ${isSelected
                                            ? 'bg-zinc-200 text-zinc-700'
                                            : STATUS_COLORS[result.status] || 'bg-zinc-700 text-zinc-400'
                                        }`}>
                                        {result.status}
                                    </span>
                                )}

                                {/* Meta */}
                                {result.meta && (
                                    <span className={`text-[10px] font-mono ${isSelected ? 'text-zinc-600' : 'text-zinc-500'
                                        }`}>
                                        {result.meta}
                                    </span>
                                )}

                                {/* Arrow */}
                                <ArrowRight size={12} className={
                                    isSelected ? 'text-zinc-600' : 'text-zinc-600 opacity-0 group-hover:opacity-100'
                                } />
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/80 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div className="w-full max-w-2xl bg-[#050505] border border-[#27272a] shadow-2xl overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#27272a]">
                    <Search size={18} className="text-zinc-500" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search products, orders, users, reviews..."
                        className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {(isLoading || isFetching) && (
                        <Loader2 size={16} className="text-zinc-500 animate-spin" />
                    )}
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="text-zinc-500 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900 rounded text-[10px] text-zinc-500">
                        <span>ESC</span>
                    </div>
                </div>

                {/* Results */}
                <div
                    ref={resultsRef}
                    className="max-h-[60vh] overflow-y-auto"
                >
                    {/* Empty State - No Query */}
                    {!query && (
                        <div className="px-4 py-12 text-center">
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <Command size={14} className="text-zinc-600" />
                                <span className="text-[10px] text-zinc-600 font-mono">
                                    ⌘K to open • Type to search
                                </span>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {Object.entries(CATEGORY_CONFIG).map(([type, config]) => (
                                    <span
                                        key={type}
                                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-900 rounded text-[10px] text-zinc-500"
                                    >
                                        <span className={config.color}>{config.icon}</span>
                                        {config.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State - Query too short */}
                    {query && query.length < 2 && (
                        <div className="px-4 py-8 text-center">
                            <p className="text-xs text-zinc-500">
                                Type at least 2 characters to search
                            </p>
                        </div>
                    )}

                    {/* Empty State - No results */}
                    {query.length >= 2 && !isLoading && !hasResults && (
                        <div className="px-4 py-12 text-center">
                            <Search size={32} className="mx-auto mb-3 text-zinc-700" />
                            <p className="text-sm text-zinc-400">No results found for "{query}"</p>
                            <p className="text-xs text-zinc-600 mt-1">
                                Try different keywords or check spelling
                            </p>
                        </div>
                    )}

                    {/* Results */}
                    {hasResults && results && (
                        <div className="py-2">
                            {/* Reset flat index counter */}
                            {(() => { flatIndex = -1; return null; })()}

                            {renderCategory(results.products, 'product')}
                            {renderCategory(results.orders, 'order')}
                            {renderCategory(results.users, 'user')}
                            {renderCategory(results.reviews, 'review')}
                            {renderCategory(results.categories, 'category')}
                            {renderCategory(results.discounts, 'discount')}
                            {renderCategory(results.banners, 'banner')}
                            {renderCategory(results.support, 'support')}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {hasResults && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-[#27272a] bg-[#050505]">
                        <span className="text-[10px] text-zinc-600 font-mono">
                            {total} result{total !== 1 ? 's' : ''} found
                        </span>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-600">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑↓</kbd>
                                navigate
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↵</kbd>
                                select
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminSearchModal;
