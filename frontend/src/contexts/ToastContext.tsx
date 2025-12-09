import React, { createContext, useContext, useState, useCallback } from 'react';
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

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmData, setConfirmData] = useState<ConfirmOptions | null>(null);

    const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = Math.random().toString(36).substring(7);
        const newToast: Toast = { id, message, type };

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

    const getToastIcon = (type: Toast['type']) => {
        switch (type) {
            case 'success':
                return <Check className="w-4 h-4 text-emerald-500" />;
            case 'error':
                return <X className="w-4 h-4 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            default:
                return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, showConfirm }}>
            {children}

            {/* Toast Container - Industrial Design */}
            <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className="
                            animate-toast-in pointer-events-auto
                            flex items-center justify-between gap-4
                            bg-[#0A0A0A] border border-[#27272a]
                            pl-4 pr-3 py-4 rounded-sm shadow-xl
                            min-w-[300px] max-w-sm
                        "
                    >
                        <div className="flex items-center gap-3">
                            <div className="border border-[#27272a] p-1 rounded-sm bg-[#050505]">
                                {getToastIcon(toast.type)}
                            </div>
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest font-mono">
                                {toast.message}
                            </span>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-zinc-600 hover:text-white transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirm Modal - Industrial Design */}
            {confirmData && (
                <div
                    className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in"
                    onClick={() => closeConfirm(false)}
                >
                    <div
                        className="bg-[#0A0A0A] border border-[#27272a] w-[90%] max-w-sm rounded-sm p-8 animate-scale-in shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
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
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
};
