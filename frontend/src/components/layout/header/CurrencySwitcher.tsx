import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';

export default function CurrencySwitcher() {
    const { currency, changeCurrency, supportedCurrencies } = useCurrencyContext();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest font-mono"
            >
                {currency}
                <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-24 bg-[#0A0A0A] border border-[#27272a] shadow-xl py-1 z-50">
                    {supportedCurrencies.map((curr) => (
                        <button
                            key={curr}
                            onClick={() => {
                                changeCurrency(curr);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest font-mono transition-colors ${currency === curr
                                ? 'bg-white text-black'
                                : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                                }`}
                        >
                            {curr}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
