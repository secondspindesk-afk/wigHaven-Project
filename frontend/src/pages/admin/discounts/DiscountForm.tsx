import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Calendar, Tag, Users, AlertTriangle } from 'lucide-react';
import { useCreateDiscount, useUpdateDiscount, useDiscount } from '@/lib/hooks/useDiscounts';
import { useToast } from '@/contexts/ToastContext';
import { DiscountFormData } from '@/lib/api/discounts';

export default function DiscountForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { showToast } = useToast();

    const isEditMode = !!id;
    const { data: discount, isLoading, isError, refetch } = useDiscount(id);

    const createMutation = useCreateDiscount();
    const updateMutation = useUpdateDiscount();

    const [formData, setFormData] = useState<DiscountFormData>({
        code: '',
        type: 'percentage',
        value: 0,
        startsAt: new Date().toISOString().split('T')[0],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        maxUses: undefined,
        usesPerCustomer: 1,
        minimumPurchase: 0,
        isActive: true
    });

    useEffect(() => {
        if (discount) {
            setFormData({
                code: discount.code,
                type: discount.type,
                value: discount.value,
                startsAt: new Date(discount.startsAt).toISOString().split('T')[0],
                expiresAt: new Date(discount.expiresAt).toISOString().split('T')[0],
                maxUses: discount.maxUses || undefined,
                usesPerCustomer: discount.usesPerCustomer,
                minimumPurchase: discount.minimumPurchase || 0,
                isActive: discount.isActive
            });
        }
    }, [discount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                value: Number(formData.value),
                maxUses: formData.maxUses ? Number(formData.maxUses) : undefined,
                usesPerCustomer: Number(formData.usesPerCustomer),
                minimumPurchase: formData.minimumPurchase ? Number(formData.minimumPurchase) : undefined,
                startsAt: new Date(formData.startsAt).toISOString(),
                expiresAt: new Date(formData.expiresAt).toISOString()
            };

            if (isEditMode && id) {
                await updateMutation.mutateAsync({ id, data: payload });
                showToast('Discount updated successfully', 'success');
            } else {
                await createMutation.mutateAsync(payload);
                showToast('Discount created successfully', 'success');
            }
            navigate('/admin/discounts');
        } catch (error: any) {
            showToast(error.message || `Failed to ${isEditMode ? 'update' : 'create'} discount`, 'error');
        }
    };

    if (isEditMode && isLoading) {
        return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Loading...</div>;
    }

    if (isEditMode && isError) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <p className="text-red-400 font-medium mb-4">Failed to load discount</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/admin/discounts')}
                        className="px-4 py-2 bg-zinc-800 text-white text-sm hover:bg-zinc-700"
                    >
                        Go Back
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="px-4 py-2 bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/admin/discounts')}
                    className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">{isEditMode ? 'Edit Discount' : 'New Discount'}</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                        {isEditMode ? 'UPDATE COUPON CODE' : 'CREATE A COUPON CODE'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
                {/* General Info */}
                <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-4">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Tag size={14} /> General Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Coupon Code</label>
                            <input
                                type="text"
                                required
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g. SUMMER20"
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600 font-mono uppercase"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Discount Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })}
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (GHS)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Value</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step={formData.type === 'percentage' ? '1' : '0.01'}
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Minimum Purchase</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.minimumPurchase || ''}
                                onChange={(e) => setFormData({ ...formData, minimumPurchase: Number(e.target.value) })}
                                placeholder="0.00"
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Usage Limits */}
                <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-4">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Users size={14} /> Usage Limits
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Total Usage Limit</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.maxUses || ''}
                                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value ? Number(e.target.value) : undefined })}
                                placeholder="Unlimited"
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                            <p className="text-[9px] text-zinc-600">Leave empty for unlimited</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Uses Per Customer</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.usesPerCustomer}
                                onChange={(e) => setFormData({ ...formData, usesPerCustomer: Number(e.target.value) })}
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Schedule */}
                <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-4">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Calendar size={14} /> Schedule
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Start Date</label>
                            <input
                                type="date"
                                required
                                value={formData.startsAt}
                                onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">End Date</label>
                            <input
                                type="date"
                                required
                                value={formData.expiresAt}
                                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[#27272a]">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 bg-zinc-900 border border-zinc-800 rounded focus:ring-0 text-white"
                            />
                            <span className="text-sm text-white">Active immediately</span>
                        </label>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/discounts')}
                        className="flex-1 px-4 py-3 bg-zinc-900 text-zinc-400 font-bold uppercase hover:bg-zinc-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="flex-1 px-4 py-3 bg-white text-black font-bold uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {createMutation.isPending || updateMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        {isEditMode ? 'Update Discount' : 'Create Discount'}
                    </button>
                </div>
            </form>
        </div>
    );
}
