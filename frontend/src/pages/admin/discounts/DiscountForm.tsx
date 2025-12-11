import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Calendar, Tag, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { useCreateDiscount, useUpdateDiscount, useDiscount } from '@/lib/hooks/useDiscounts';
import { useToast } from '@/contexts/ToastContext';
import { DiscountFormData } from '@/lib/api/discounts';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function DiscountForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { showToast } = useToast();
    const isMobile = useIsMobile();
    const isEditMode = !!id;

    const { data: discount, isLoading, isError, refetch } = useDiscount(id);
    const createMutation = useCreateDiscount();
    const updateMutation = useUpdateDiscount();

    const [formData, setFormData] = useState<DiscountFormData>({
        code: '', type: 'percentage', value: 0,
        startsAt: new Date().toISOString().split('T')[0],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        maxUses: undefined, usesPerCustomer: 1, minimumPurchase: 0, isActive: true
    });

    useEffect(() => {
        if (discount) {
            setFormData({
                code: discount.code, type: discount.type, value: discount.value,
                startsAt: new Date(discount.startsAt).toISOString().split('T')[0],
                expiresAt: new Date(discount.expiresAt).toISOString().split('T')[0],
                maxUses: discount.maxUses || undefined, usesPerCustomer: discount.usesPerCustomer,
                minimumPurchase: discount.minimumPurchase || 0, isActive: discount.isActive
            });
        }
    }, [discount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.type === 'percentage' && (formData.value <= 0 || formData.value > 100)) { showToast('Percentage must be 1-100', 'error'); return; }
        if (formData.type === 'fixed' && formData.value <= 0) { showToast('Amount must be > 0', 'error'); return; }
        if (new Date(formData.startsAt) > new Date(formData.expiresAt)) { showToast('End date must be after start', 'error'); return; }

        try {
            const payload = { ...formData, value: Number(formData.value), maxUses: formData.maxUses ? Number(formData.maxUses) : undefined, usesPerCustomer: Number(formData.usesPerCustomer), minimumPurchase: formData.minimumPurchase ? Number(formData.minimumPurchase) : undefined, startsAt: new Date(formData.startsAt).toISOString(), expiresAt: new Date(formData.expiresAt).toISOString() };
            if (isEditMode && id) { await updateMutation.mutateAsync({ id, data: payload }); showToast('Updated', 'success'); }
            else { await createMutation.mutateAsync(payload); showToast('Created', 'success'); }
            navigate('/admin/discounts');
        } catch (error: any) { showToast(error.message || 'Failed', 'error'); }
    };

    if (isEditMode && isLoading) return <div className="flex items-center justify-center h-96"><Loader2 size={32} className="text-white animate-spin" /></div>;
    if (isEditMode && isError) return <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center"><AlertTriangle size={48} className="text-red-500 mb-4" /><p className="text-red-400 mb-4">Failed to load</p><div className="flex gap-3"><button onClick={() => navigate('/admin/discounts')} className="px-4 py-2 bg-zinc-800 text-white text-sm">Go Back</button><button onClick={() => refetch()} className="px-4 py-2 bg-red-500/20 text-red-400 text-sm">Retry</button></div></div>;

    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/admin/discounts')} className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400"><ChevronLeft size={20} /></button>
                    <div><h1 className="text-lg text-white font-semibold">{isEditMode ? 'Edit Discount' : 'New Discount'}</h1><p className="text-[10px] text-zinc-500 font-mono">{isEditMode ? 'UPDATE' : 'CREATE'}</p></div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
                        <p className="text-xs text-zinc-400 font-bold uppercase flex items-center gap-2"><Tag size={14} /> General</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Code</label><input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="SUMMER20" className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white font-mono uppercase" /></div>
                            <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Type</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} className="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white"><option value="percentage">%</option><option value="fixed">GHS</option></select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Value</label><input type="number" required min="1" max={formData.type === 'percentage' ? 100 : undefined} value={formData.value} onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })} className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" /></div>
                            <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Min. Purchase</label><input type="number" min="0" value={formData.minimumPurchase || ''} onChange={(e) => setFormData({ ...formData, minimumPurchase: Number(e.target.value) })} placeholder="0" className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" /></div>
                        </div>
                    </div>
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
                        <p className="text-xs text-zinc-400 font-bold uppercase flex items-center gap-2"><Users size={14} /> Limits</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Total Uses</label><input type="number" min="1" value={formData.maxUses || ''} onChange={(e) => setFormData({ ...formData, maxUses: e.target.value ? Number(e.target.value) : undefined })} placeholder="∞" className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" /></div>
                            <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Per User</label><input type="number" min="1" value={formData.usesPerCustomer} onChange={(e) => setFormData({ ...formData, usesPerCustomer: Number(e.target.value) })} className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" /></div>
                        </div>
                    </div>
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
                        <p className="text-xs text-zinc-400 font-bold uppercase flex items-center gap-2"><Calendar size={14} /> Schedule</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Start</label><input type="date" required value={formData.startsAt} onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })} className="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" /></div>
                            <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">End</label><input type="date" required value={formData.expiresAt} onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })} className="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" /></div>
                        </div>
                        <label className="flex items-center gap-3 pt-2"><input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded bg-zinc-800 border-zinc-700" /><span className="text-sm text-white">Active</span></label>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => navigate('/admin/discounts')} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-medium">Cancel</button>
                        <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">{(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{isEditMode ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] p-8">
            <div className="flex items-center gap-4 mb-8"><button onClick={() => navigate('/admin/discounts')} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"><ChevronLeft size={16} /></button><div><h1 className="text-xl text-white font-medium uppercase tracking-tight">{isEditMode ? 'Edit Discount' : 'New Discount'}</h1><p className="text-[10px] text-zinc-500 font-mono mt-1">{isEditMode ? 'UPDATE' : 'CREATE'}</p></div></div>
            <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
                <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-4"><h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Tag size={14} /> General</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Code</label><input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="SUMMER20" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white font-mono uppercase" /></div><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Type</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed (GHS)</option></select></div><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Value</label><input type="number" required min="1" max={formData.type === 'percentage' ? 100 : undefined} value={formData.value} onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white" /><p className="text-[9px] text-zinc-600">{formData.type === 'percentage' ? '1-100' : 'GHS'}</p></div><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Min. Purchase</label><input type="number" min="0" value={formData.minimumPurchase || ''} onChange={(e) => setFormData({ ...formData, minimumPurchase: Number(e.target.value) })} placeholder="0" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white" /></div></div></div>
                <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-4"><h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={14} /> Limits</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Total Uses</label><input type="number" min="1" value={formData.maxUses || ''} onChange={(e) => setFormData({ ...formData, maxUses: e.target.value ? Number(e.target.value) : undefined })} placeholder="Unlimited" className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white" /><p className="text-[9px] text-zinc-600">Leave empty for unlimited</p></div><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Per Customer</label><input type="number" min="1" value={formData.usesPerCustomer} onChange={(e) => setFormData({ ...formData, usesPerCustomer: Number(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white" /></div></div></div>
                <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-4"><h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={14} /> Schedule</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Start</label><input type="date" required value={formData.startsAt} onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white" /></div><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">End</label><input type="date" required value={formData.expiresAt} onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white" /></div></div><div className="pt-4 border-t border-[#27272a]"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 bg-zinc-900 border border-zinc-800 rounded" /><span className="text-sm text-white">Active</span></label></div></div>
                <div className="flex gap-4 pt-4"><button type="button" onClick={() => navigate('/admin/discounts')} className="flex-1 px-4 py-3 bg-zinc-900 text-zinc-400 font-bold uppercase hover:bg-zinc-800">Cancel</button><button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 px-4 py-3 bg-white text-black font-bold uppercase disabled:opacity-50 flex items-center justify-center gap-2">{(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{isEditMode ? 'Update' : 'Create'}</button></div>
            </form>
        </div>
    );
}
