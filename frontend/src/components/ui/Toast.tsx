import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Check, X, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onDismiss: (id: string) => void;
    duration?: number;
}

const toastVariants = cva(
    "relative flex items-center justify-between gap-4 pl-4 pr-3 py-4 w-full max-w-[340px] md:max-w-sm rounded-[4px] shadow-2xl glass-panel border-l-2 backdrop-blur-md select-none touch-pan-y",
    {
        variants: {
            type: {
                success: "border-l-emerald-500 bg-emerald-500/5",
                error: "border-l-red-500 bg-red-500/5",
                warning: "border-l-amber-500 bg-amber-500/5",
                info: "border-l-blue-500 bg-blue-500/5",
                loading: "border-l-zinc-500 bg-zinc-500/5",
            },
        },
        defaultVariants: {
            type: "info",
        },
    }
);

const iconVariants = {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
};

const Icons = {
    success: <Check className="w-4 h-4 text-emerald-400" />,
    error: <X className="w-4 h-4 text-red-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    info: <Info className="w-4 h-4 text-blue-400" />,
    loading: <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />,
};

export function Toast({ id, message, type, onDismiss, duration = 4000 }: ToastProps) {
    useEffect(() => {
        if (duration === Infinity) return;

        const timer = setTimeout(() => {
            onDismiss(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onDismiss]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x > 100) {
            onDismiss(id);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
            drag="x"
            dragConstraints={{ left: 0, right: 300 }}
            dragElastic={{ left: 0, right: 0.5 }} // Nice elastic pull feeling
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
            className={cn(toastVariants({ type }), "cursor-grab active:cursor-grabbing hover:translate-x-[-2px] transition-transform will-change-transform")}
        >
            <div className="flex items-center gap-3.5 overflow-hidden">
                <motion.div
                    variants={iconVariants}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 border border-white/5"
                >
                    {Icons[type]}
                </motion.div>

                <p className="text-[13px] font-medium leading-relaxed text-zinc-100 font-sans tracking-wide">
                    {message}
                </p>
            </div>

            <button
                onClick={() => onDismiss(id)}
                className="p-1 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors flex-shrink-0"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </motion.div>
    );
}

// Container for stacking toasts
export function ToastViewport({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col items-end gap-3 pointer-events-none w-full max-w-[100vw] pr-4 pl-4 md:pl-0">
            {/* Stacking Context requires children to have pointer-events-auto */}
            <div className="flex flex-col gap-3 w-full items-end pointer-events-auto">
                <AnimatePresence mode="popLayout">
                    {children}
                </AnimatePresence>
            </div>
        </div>
    );
}
