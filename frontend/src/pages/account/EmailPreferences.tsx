import { useEmailPreferences } from '@/lib/hooks/useEmailPreferences';
import { useUser } from '@/lib/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { Loader2, Mail, Bell, ShoppingCart, AlertTriangle, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function EmailPreferences() {
    const { data: user } = useUser();
    const { preferences, isLoading, updatePreferences, unsubscribeAll } = useEmailPreferences();
    const { showConfirm } = useToast();
    const isMobile = useIsMobile();

    const [marketing, setMarketing] = useState(true);
    const [abandonedCart, setAbandonedCart] = useState(true);
    const [backInStock, setBackInStock] = useState(true);

    useEffect(() => {
        if (preferences) {
            if (preferences.unsubscribedFromAll) {
                setMarketing(false);
                setAbandonedCart(false);
                setBackInStock(false);
            } else {
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
            onConfirm: () => { if (user?.email) { unsubscribeAll.mutate(user.email); } },
            confirmText: 'Unsubscribe',
            cancelText: 'Cancel'
        });
    };

    const emailOptions = [
        { id: 'marketing', icon: Mail, title: 'Marketing & Promotions', desc: 'New arrivals, sales, and exclusive offers.', value: marketing, onChange: setMarketing },
        { id: 'abandonedCart', icon: ShoppingCart, title: 'Cart Reminders', desc: 'Reminders about items left in your bag.', value: abandonedCart, onChange: setAbandonedCart },
        { id: 'backInStock', icon: Bell, title: 'Back in Stock', desc: 'Notifications when favorites return.', value: backInStock, onChange: setBackInStock },
    ];

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>;
    }

    // ==================== MOBILE ====================
    if (isMobile) {
        return (
            <div className="space-y-4">
                {/* Header */}
                <div>
                    <h1 className="text-lg font-bold text-white">Email Preferences</h1>
                    <p className="text-xs text-zinc-500">Choose which emails you receive</p>
                </div>

                {/* Unsubscribed Warning */}
                {preferences?.unsubscribedFromAll && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                        <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-400 text-sm font-bold">Unsubscribed from all</p>
                            <p className="text-red-300/70 text-xs">Enable preferences below to resubscribe.</p>
                        </div>
                    </div>
                )}

                {/* Email Options */}
                <div className="space-y-3">
                    {emailOptions.map(opt => (
                        <div key={opt.id} className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
                                    <opt.icon size={18} className="text-zinc-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <label htmlFor={opt.id} className="text-white text-sm font-medium">{opt.title}</label>
                                        <div className={`relative w-11 h-6 rounded-full transition-colors ${opt.value ? 'bg-cyan-500' : 'bg-zinc-700'}`} onClick={() => opt.onChange(!opt.value)}>
                                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${opt.value ? 'translate-x-5.5 left-0.5' : 'left-0.5'}`} style={{ transform: opt.value ? 'translateX(22px)' : 'translateX(0)' }} />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-zinc-500">{opt.desc}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div className="h-px bg-zinc-800/50 -mx-4" />

                {/* Actions */}
                <div className="space-y-3">
                    <button onClick={handleSave} disabled={updatePreferences.isPending} className="w-full py-3.5 bg-white text-black text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                        {updatePreferences.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} Save Preferences
                    </button>
                    <button onClick={handleUnsubscribeAll} className="w-full py-3 text-zinc-500 text-xs font-bold uppercase">Unsubscribe from All</button>
                </div>
            </div>
        );
    }

    // ==================== DESKTOP ====================
    return (
        <div className="space-y-8 max-w-2xl">
            <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-8">
                <h1 className="text-xl font-bold text-white uppercase tracking-wider mb-2">Email Preferences</h1>
                <p className="text-zinc-400 text-sm font-mono mb-8">Manage which emails you receive from us. We promise not to spam your inbox.</p>

                {preferences?.unsubscribedFromAll && (
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-lg mb-8">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="text-red-400 mt-1" size={20} />
                            <div>
                                <h3 className="text-red-400 font-bold text-sm uppercase tracking-wider">Unsubscribed from all</h3>
                                <p className="text-red-300/70 text-xs mt-1">You have opted out of all email communications. Enable specific preferences below to resubscribe.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {emailOptions.map(opt => (
                        <div key={opt.id} className="flex items-start gap-4 p-4 border border-[#27272a] rounded-lg bg-zinc-900/30">
                            <div className="p-2 bg-zinc-800 rounded-full text-zinc-400"><opt.icon size={20} /></div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <label htmlFor={opt.id} className="text-white font-bold text-sm">{opt.title}</label>
                                    <input type="checkbox" id={opt.id} checked={opt.value} onChange={(e) => opt.onChange(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-white focus:ring-0 focus:ring-offset-0" />
                                </div>
                                <p className="text-zinc-500 text-xs">{opt.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-8 border-t border-[#27272a] flex flex-col md:flex-row gap-4 justify-between items-center">
                    <button onClick={handleUnsubscribeAll} className="text-zinc-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-colors">Unsubscribe from all</button>
                    <button onClick={handleSave} disabled={updatePreferences.isPending} className="bg-white text-black px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-2">
                        {updatePreferences.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
}
