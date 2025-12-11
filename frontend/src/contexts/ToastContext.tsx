import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Check, X, Info, AlertTriangle } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

interface ConfirmOptions {
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
}

interface ToastContextType {
    showToast: (message: string, type?: Toast['type']) => void;
    showConfirm: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

// Mobile detection hook
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmData, setConfirmData] = useState<ConfirmOptions | null>(null);
    const isMobile = useIsMobile();

    const showToast = useCallback((message: string | any, type: Toast['type'] = 'info') => {
        let safeMessage: string;
        if (typeof message === 'string') {
            safeMessage = message;
        } else if (message?.message) {
            safeMessage = message.message;
        } else if (message?.error) {
            safeMessage = message.error;
        } else {
            try {
                safeMessage = JSON.stringify(message);
            } catch {
                safeMessage = 'An error occurred';
            }
        }

        const id = Math.random().toString(36).substring(7);
        const newToast: Toast = { id, message: safeMessage, type };

        setToasts(prev => [...prev, newToast]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const showConfirm = useCallback((options: ConfirmOptions) => {
        setConfirmData(options);
    }, []);

    const closeConfirm = (confirmed: boolean) => {
        if (confirmed && confirmData) {
            confirmData.onConfirm();
        }
        setConfirmData(null);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const handleDragEnd = (id: string) => (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Swipe right to dismiss (mobile) or swipe up/down to dismiss
        if (Math.abs(info.offset.x) > 100 || Math.abs(info.offset.y) > 50) {
            removeToast(id);
        }
    };

    const getToastIcon = (type: Toast['type']) => {
        const iconClass = isMobile ? 'w-5 h-5' : 'w-4 h-4';
        switch (type) {
            case 'success':
                return <Check className={`${iconClass} text-emerald-400`} />;
            case 'error':
                return <X className={`${iconClass} text-red-400`} />;
            case 'warning':
                return <AlertTriangle className={`${iconClass} text-amber-400`} />;
            default:
                return <Info className={`${iconClass} text-blue-400`} />;
        }
    };

    const getToastBorderColor = (type: Toast['type']) => {
        switch (type) {
            case 'success': return 'border-l-emerald-500';
            case 'error': return 'border-l-red-500';
            case 'warning': return 'border-l-amber-500';
            default: return 'border-l-blue-500';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, showConfirm }}>
            {children}

            {/* Toast Container - Responsive with Framer Motion */}
            <div className={`fixed z-[100] pointer-events-none ${isMobile
                    ? 'top-16 left-0 right-0 flex flex-col items-center px-4'
                    : 'top-4 right-4 flex flex-col items-end gap-3'
                }`}>
                <AnimatePresence mode="popLayout">
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            layout
                            initial={isMobile
                                ? { opacity: 0, y: -30, scale: 0.95 }
                                : { opacity: 0, x: 50, scale: 0.95 }
                            }
                            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                            exit={isMobile
                                ? { opacity: 0, y: -20, scale: 0.9 }
                                : { opacity: 0, x: 50, scale: 0.9 }
                            }
                            transition={{
                                type: 'spring',
                                stiffness: 400,
                                damping: 25,
                                mass: 0.8
                            }}
                            drag={isMobile ? 'y' : 'x'}
                            dragConstraints={isMobile
                                ? { top: -50, bottom: 50 }
                                : { left: 0, right: 200 }
                            }
                            dragElastic={0.5}
                            onDragEnd={handleDragEnd(toast.id)}
                            whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
                            className={`
                                pointer-events-auto cursor-grab active:cursor-grabbing
                                flex items-center gap-3
                                bg-[#1a1a1a]/95 backdrop-blur-md
                                border border-[#333] border-l-2 ${getToastBorderColor(toast.type)}
                                shadow-2xl select-none touch-pan-y
                                ${isMobile
                                    ? 'w-full max-w-md px-4 py-4 rounded-lg mb-2'
                                    : 'min-w-[300px] max-w-sm pl-4 pr-3 py-4 rounded-sm'
                                }
                            `}
                        >
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`flex-shrink-0 flex items-center justify-center rounded-full bg-black/40 border border-white/5 ${isMobile ? 'w-9 h-9' : 'w-8 h-8'
                                    }`}
                            >
                                {getToastIcon(toast.type)}
                            </motion.div>

                            <span className={`flex-1 font-medium text-zinc-100 ${isMobile ? 'text-sm' : 'text-[13px]'
                                }`}>
                                {toast.message}
                            </span>

                            <button
                                onClick={() => removeToast(toast.id)}
                                className="p-1 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors flex-shrink-0"
                            >
                                <X className={isMobile ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Confirm Modal - Responsive with Framer Motion */}
            <AnimatePresence>
                {confirmData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex justify-center ${isMobile ? 'items-end' : 'items-center'
                            }`}
                        onClick={() => closeConfirm(false)}
                    >
                        <motion.div
                            initial={isMobile
                                ? { y: '100%' }
                                : { scale: 0.9, opacity: 0 }
                            }
                            animate={isMobile
                                ? { y: 0 }
                                : { scale: 1, opacity: 1 }
                            }
                            exit={isMobile
                                ? { y: '100%' }
                                : { scale: 0.9, opacity: 0 }
                            }
                            transition={{
                                type: 'spring',
                                damping: 25,
                                stiffness: 300
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={isMobile
                                ? 'bg-[#121212] w-full rounded-t-2xl p-6 pb-8 shadow-2xl'
                                : 'bg-[#0A0A0A] border border-[#27272a] w-[90%] max-w-sm rounded-sm p-8 shadow-2xl'
                            }
                        >
                            {isMobile ? (
                                /* Mobile Confirm - Bottom sheet */
                                <>
                                    <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-6" />
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-zinc-800 p-3 rounded-full">
                                            <AlertTriangle className="h-5 w-5 text-white" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {confirmData.title}
                                        </h3>
                                    </div>
                                    <p className="text-zinc-400 text-sm leading-relaxed mb-8 pl-1">
                                        {confirmData.message}
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => closeConfirm(true)}
                                            className="w-full py-4 rounded-lg text-sm font-bold uppercase tracking-wide bg-white text-black active:bg-zinc-200 transition-colors"
                                        >
                                            {confirmData.confirmText || 'Confirm'}
                                        </button>
                                        <button
                                            onClick={() => closeConfirm(false)}
                                            className="w-full py-4 rounded-lg text-sm font-medium uppercase tracking-wide bg-transparent border border-zinc-700 text-zinc-400 active:bg-zinc-900 transition-colors"
                                        >
                                            {confirmData.cancelText || 'Cancel'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                /* Desktop Confirm - Centered modal */
                                <>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="border border-[#27272a] p-2 rounded-sm bg-[#050505]">
                                            <AlertTriangle className="h-4 w-4 text-white" />
                                        </div>
                                        <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">
                                            {confirmData.title}
                                        </h3>
                                    </div>
                                    <p className="text-zinc-500 text-xs leading-relaxed mb-8 font-mono uppercase">
                                        {confirmData.message}
                                    </p>
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => closeConfirm(false)}
                                            className="px-6 py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-transparent border border-[#27272a] text-zinc-400 hover:text-white hover:border-white transition-colors"
                                        >
                                            {confirmData.cancelText || 'CANCEL'}
                                        </button>
                                        <button
                                            onClick={() => closeConfirm(true)}
                                            className="px-6 py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-white text-black hover:bg-zinc-200 transition-colors"
                                        >
                                            {confirmData.confirmText || 'CONFIRM'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </ToastContext.Provider>
    );
};
