import React, { useState } from 'react';
import { Bell, X, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/contexts/ToastContext';
import axios from '@/lib/api/axios';

interface RestockNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string;
    variantName?: string;
    variantId: string;
    initialEmail?: string;
}

export default function RestockNotificationModal({
    isOpen,
    onClose,
    productName,
    variantName,
    variantId,
    initialEmail = ''
}: RestockNotificationModalProps) {
    const [email, setEmail] = useState(initialEmail);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsSubmitting(true);
        try {
            await axios.post('/notifications/restock-request', {
                email,
                variantId
            });
            setIsSuccess(true);
            showToast('We will notify you when this item is back in stock!', 'success');
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
            }, 3000);
        } catch (error) {
            console.error('[RestockModal] Error:', error);
            showToast('Failed to register notification. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Bell size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Notify Me</h3>
                                <p className="text-[10px] text-zinc-500 font-mono uppercase">Back in stock alerts</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {isSuccess ? (
                            <div className="py-8 text-center space-y-4">
                                <div className="flex justify-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500"
                                    >
                                        <CheckCircle2 size={32} />
                                    </motion.div>
                                </div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-widest font-mono">You're on the list!</h4>
                                <p className="text-xs text-zinc-400 font-mono">We'll email you as soon as this item returns.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                                        Get notified when <span className="text-white font-bold">{productName}</span> {variantName && <span className="text-zinc-300">({variantName})</span>} is back in stock.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="ENTER YOUR EMAIL"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-sm py-3 px-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono transition-colors"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-white text-black py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Notify Me'
                                    )}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Footer */}
                    {!isSuccess && (
                        <div className="p-6 bg-zinc-900/30 border-t border-[#27272a]">
                            <p className="text-[9px] text-zinc-600 text-center font-mono uppercase leading-relaxed">
                                By signing up, you agree to receive a one-time email notification when this product is back in stock. We don't spam.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
