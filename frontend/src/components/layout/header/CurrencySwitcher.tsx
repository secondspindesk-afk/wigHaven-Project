import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { motion, AnimatePresence } from 'framer-motion';

export default function CurrencySwitcher() {
    const { currency, changeCurrency, supportedCurrencies } = useCurrencyContext();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    // Close on click outside (desktop only)
    useEffect(() => {
        if (isMobile) return;

        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile]);

    // Prevent body scroll when mobile modal is open
    useEffect(() => {
        if (isMobile && isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobile, isOpen]);

    const handleCurrencyChange = (curr: string) => {
        changeCurrency(curr);
        setIsOpen(false);
    };

    // Mobile modal - rendered via portal to body
    const MobileModal = () => {
        if (!isMobile || !isOpen) return null;

        return createPortal(
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]"
                onClick={() => setIsOpen(false)}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-0 left-0 right-0 bg-[#121212] rounded-t-2xl"
                    style={{
                        animation: 'slideUp 0.3s ease-out forwards',
                    }}
                >
                    {/* Handle bar */}
                    <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 mb-2" />

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-zinc-800">
                        <h3 className="text-base font-semibold text-white">
                            Select Currency
                        </h3>
                    </div>

                    {/* Currency options */}
                    <div className="py-2">
                        {supportedCurrencies.map((curr) => (
                            <button
                                key={curr}
                                onClick={() => handleCurrencyChange(curr)}
                                className={`w-full flex items-center justify-between px-6 py-4 text-base active:bg-zinc-800 ${currency === curr ? 'text-white' : 'text-zinc-400'
                                    }`}
                            >
                                <span className="font-medium">{curr}</span>
                                {currency === curr && (
                                    <Check size={20} className="text-emerald-400" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Close button */}
                    <div className="p-4 border-t border-zinc-800">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full py-3 bg-zinc-800 rounded-lg text-sm font-medium text-white active:bg-zinc-700"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <style>{`
                    @keyframes slideUp {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                `}</style>
            </div>,
            document.body
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest font-mono"
            >
                {currency}
                <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Mobile modal via portal */}
            <MobileModal />

            {/* Desktop dropdown - inline */}
            <AnimatePresence>
                {isOpen && !isMobile && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-2 w-24 bg-[#0A0A0A] border border-[#27272a] shadow-xl py-1 z-[9999]"
                    >
                        {supportedCurrencies.map((curr) => (
                            <button
                                key={curr}
                                onClick={() => handleCurrencyChange(curr)}
                                className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest font-mono transition-colors ${currency === curr
                                        ? 'bg-white text-black'
                                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                                    }`}
                            >
                                {curr}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
