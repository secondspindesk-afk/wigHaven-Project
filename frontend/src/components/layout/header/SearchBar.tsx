import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/api/axios';
import { Link } from 'react-router-dom';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';

interface SearchResult {
    id: string;
    name: string;
    basePrice: number;
    category: { id: string; name: string; slug: string };
    variants: { images: string[] }[];
}

export default function SearchBar() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('search') || '');
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { formatPrice } = useCurrencyContext();

    // Live search query (only if typing and focused) - WITH ERROR HANDLING
    const { data: searchResults, isError } = useQuery({
        queryKey: ['search', query],
        queryFn: async () => {
            if (query.length < 2) return null;
            const response = await axios.get(`/products/search?q=${encodeURIComponent(query)}&page=1`);
            return response.data.data.products.slice(0, 5); // Show top 5 results
        },
        enabled: query.length >= 2 && isFocused,
        staleTime: 1000 * 60 * 2, // 2 minutes
        retry: 2,
    });

    const handleSearch = () => {
        if (query.length >= 2) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
            setIsOpen(false);
            setIsFocused(false);
            inputRef.current?.blur();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    return (
        <div className={`flex items-center transition-all duration-300 relative ${isOpen ? 'w-full md:w-80' : 'w-auto'}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`text-zinc-500 hover:text-white transition-colors ${isOpen ? 'hidden' : 'block'}`}
            >
                <Search size={20} />
            </button>

            <div className={`relative flex flex-col items-center w-full ${isOpen ? 'block' : 'hidden'}`}>
                <div className="relative flex items-center w-full">
                    <Search size={16} className="absolute left-3 text-zinc-500 pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        placeholder="SEARCH PRODUCTS..."
                        className="w-full bg-[#0A0A0A] border border-[#27272a] rounded-sm py-2 pl-9 pr-8 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono uppercase tracking-wide"
                    />
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            setQuery('');
                            setIsFocused(false);
                        }}
                        className="absolute right-2 text-zinc-500 hover:text-white"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Live Search Dropdown - WITH ERROR STATE */}
                {isFocused && query.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0A0A0A] border border-[#27272a] shadow-2xl rounded-sm z-50 max-h-96 overflow-y-auto custom-scrollbar">
                        {isError ? (
                            <div className="p-4 text-center">
                                <p className="text-xs text-red-400 font-mono">Failed to load results. Please try again.</p>
                            </div>
                        ) : searchResults && searchResults.length > 0 ? (
                            <>
                                <div className="p-2 space-y-1">
                                    {searchResults.map((product: SearchResult) => (
                                        <Link
                                            key={product.id}
                                            to={`/products/${product.id}`}
                                            onClick={() => {
                                                setIsOpen(false);
                                                setIsFocused(false);
                                            }}
                                            className="flex items-center gap-3 p-3 hover:bg-zinc-900 transition-colors rounded-sm group"
                                        >
                                            <div className="w-12 h-12 bg-zinc-900 flex-shrink-0 overflow-hidden">
                                                {product.variants?.[0]?.images?.[0] ? (
                                                    <img src={product.variants[0].images[0]} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Search className="w-6 h-6 text-zinc-700" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-bold text-white group-hover:text-zinc-200 truncate uppercase tracking-wide">
                                                    {product.name}
                                                </h4>
                                                <p className="text-[10px] text-zinc-500 font-mono">{product.category?.name || 'WIG'}</p>
                                            </div>
                                            <div className="text-xs font-bold text-zinc-400 group-hover:text-white font-mono">
                                                {formatPrice(product.basePrice)}
                                            </div>
                                        </Link>
                                    ))}
                                </div>

                                {/* View All Results */}
                                <button
                                    onClick={handleSearch}
                                    className="w-full p-3 border-t border-[#27272a] text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 hover:bg-zinc-900 transition-colors font-mono"
                                >
                                    View All Results ({query}) →
                                </button>
                            </>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
