import { useEmailPreferences } from '@/lib/hooks/useEmailPreferences';
import { useUser } from '@/lib/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { Loader2, Mail, Bell, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function EmailPreferences() {
    const { data: user } = useUser();
    const { preferences, isLoading, updatePreferences, unsubscribeAll } = useEmailPreferences();
    const { showConfirm } = useToast();

    const [marketing, setMarketing] = useState(true);
    const [abandonedCart, setAbandonedCart] = useState(true);
    const [backInStock, setBackInStock] = useState(true);

    useEffect(() => {
        if (preferences) {
            // If unsubscribed from all, force all toggles to false
            if (preferences.unsubscribedFromAll) {
                setMarketing(false);
                setAbandonedCart(false);
                setBackInStock(false);
            } else {
                // Otherwise, use the actual preference values
                setMarketing(preferences.marketingEmails);
                setAbandonedCart(preferences.abandonedCartEmails);
                setBackInStock(preferences.backInStockEmails);
            }
        }
    }, [preferences]);

    const handleSave = () => {
        updatePreferences.mutate({
            marketingEmails: marketing,
            abandonedCartEmails: abandonedCart,
            backInStockEmails: backInStock,
        });
    };

    const handleUnsubscribeAll = () => {
        showConfirm({
            title: 'Unsubscribe from All',
            message: 'Are you sure you want to unsubscribe from ALL emails? You will miss important updates.',
            onConfirm: () => {
                if (user?.email) {
                    unsubscribeAll.mutate(user.email);
                }
            },
            confirmText: 'Unsubscribe',
            cancelText: 'Cancel'
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-2xl">
            <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-8">
                <h1 className="text-xl font-bold text-white uppercase tracking-wider mb-2">Email Preferences</h1>
                <p className="text-zinc-400 text-sm font-mono mb-8">
                    Manage which emails you receive from us. We promise not to spam your inbox.
                </p>

                {preferences?.unsubscribedFromAll ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-lg mb-8">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="text-red-400 mt-1" size={20} />
                            <div>
                                <h3 className="text-red-400 font-bold text-sm uppercase tracking-wider">Unsubscribed from all</h3>
                                <p className="text-red-300/70 text-xs mt-1">
                                    You have opted out of all email communications. Enable specific preferences below to resubscribe.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="space-y-6">
                    {/* Marketing Emails */}
                    <div className="flex items-start gap-4 p-4 border border-[#27272a] rounded-lg bg-zinc-900/30">
                        <div className="p-2 bg-zinc-800 rounded-full text-zinc-400">
                            <Mail size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <label htmlFor="marketing" className="text-white font-bold text-sm">Marketing & Promotions</label>
                                <input
                                    type="checkbox"
                                    id="marketing"
                                    checked={marketing}
                                    onChange={(e) => setMarketing(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-white focus:ring-0 focus:ring-offset-0"
                                />
                            </div>
                            <p className="text-zinc-500 text-xs">
                                Receive updates about new arrivals, sales, and exclusive offers.
                            </p>
                        </div>
                    </div>

                    {/* Abandoned Cart */}
                    <div className="flex items-start gap-4 p-4 border border-[#27272a] rounded-lg bg-zinc-900/30">
                        <div className="p-2 bg-zinc-800 rounded-full text-zinc-400">
                            <ShoppingCart size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <label htmlFor="abandonedCart" className="text-white font-bold text-sm">Cart Reminders</label>
                                <input
                                    type="checkbox"
                                    id="abandonedCart"
                                    checked={abandonedCart}
                                    onChange={(e) => setAbandonedCart(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-white focus:ring-0 focus:ring-offset-0"
                                />
                            </div>
                            <p className="text-zinc-500 text-xs">
                                Get reminders about items left in your shopping bag.
                            </p>
                        </div>
                    </div>

                    {/* Back in Stock */}
                    <div className="flex items-start gap-4 p-4 border border-[#27272a] rounded-lg bg-zinc-900/30">
                        <div className="p-2 bg-zinc-800 rounded-full text-zinc-400">
                            <Bell size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <label htmlFor="backInStock" className="text-white font-bold text-sm">Back in Stock Alerts</label>
                                <input
                                    type="checkbox"
                                    id="backInStock"
                                    checked={backInStock}
                                    onChange={(e) => setBackInStock(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-white focus:ring-0 focus:ring-offset-0"
                                />
                            </div>
                            <p className="text-zinc-500 text-xs">
                                Be notified when your favorite items are back in stock.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-[#27272a] flex flex-col md:flex-row gap-4 justify-between items-center">
                    <button
                        onClick={handleUnsubscribeAll}
                        className="text-zinc-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                        Unsubscribe from all
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={updatePreferences.isPending}
                        className="bg-white text-black px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {updatePreferences.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
}
