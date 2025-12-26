
import { ShoppingCart, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InsufficientStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: {
        name: string;
        requested: number;
        available: number;
    }[];
    onUpdateCart: () => void;
}

export default function InsufficientStockModal({ isOpen, onClose, items, onUpdateCart }: InsufficientStockModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-[#0A0A0A] border border-[#27272a] w-full max-w-md overflow-hidden rounded-sm shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-[#27272a] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Stock Update</h3>
                                <p className="text-[10px] text-zinc-500 font-mono uppercase">Some items are no longer available</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                            The following items in your cart have insufficient stock to complete your order. We've updated your cart with the maximum available quantities.
                        </p>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-sm">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-bold text-white truncate uppercase tracking-wide">{item.name}</h4>
                                        <p className="text-[10px] text-zinc-500 font-mono">Requested: {item.requested} | Available: {item.available}</p>
                                    </div>
                                    <div className="text-xs font-bold text-amber-500 font-mono">
                                        {item.available === 0 ? 'OUT OF STOCK' : `ONLY ${item.available} LEFT`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-zinc-900/30 border-t border-[#27272a] flex flex-col gap-3">
                        <button
                            onClick={() => {
                                onUpdateCart();
                                onClose();
                            }}
                            className="w-full bg-white text-black py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                        >
                            <ShoppingCart size={14} />
                            Update Cart & Continue
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full border border-zinc-800 text-zinc-400 py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-zinc-900 hover:text-white transition-all"
                        >
                            Review Cart
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
