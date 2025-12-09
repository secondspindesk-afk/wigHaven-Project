import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Tag, Calendar, Search, Edit, AlertTriangle } from 'lucide-react';
import { useDiscounts, useDeleteDiscount } from '@/lib/hooks/useDiscounts';
import { useToast } from '@/contexts/ToastContext';
import { useDebounce } from '@/lib/hooks/useDebounce';

export default function DiscountList() {
    const { showToast, showConfirm } = useToast();
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);

    const { data: discounts, isLoading, isError, refetch } = useDiscounts();
    const deleteMutation = useDeleteDiscount();

    const handleDelete = (discountId: string, code: string) => {
        showConfirm({
            title: 'Delete Discount',
            message: `Delete discount code "${code}"? This action cannot be undone.`,
            confirmText: 'DELETE',
            onConfirm: async () => {
                try {
                    await deleteMutation.mutateAsync(discountId);
                    showToast('Discount deleted successfully', 'success');
                } catch (error: any) {
                    showToast(error.message || 'Failed to delete discount', 'error');
                }
            }
        });
    };

    const filteredDiscounts = discounts?.filter(d =>
        d.code.toLowerCase().includes(debouncedSearch.toLowerCase())
    ) || [];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const isExpired = (expiresAt: string) => {
        return new Date(expiresAt) < new Date();
    };

    const hasStarted = (startsAt: string) => {
        return new Date(startsAt) <= new Date();
    };

    const isDiscountActive = (discount: { startsAt: string; expiresAt: string; isActive: boolean }) => {
        const now = new Date();
        return discount.isActive && new Date(discount.startsAt) <= now && new Date(discount.expiresAt) > now;
    };

    return (
        <div className="min-h-screen bg-[#050505] p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Discounts</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                        MANAGE COUPON CODES
                    </p>
                </div>
                <Link
                    to="/admin/discounts/new"
                    className="px-4 py-2 bg-white text-black text-xs font-bold uppercase hover:bg-zinc-200 transition-colors flex items-center gap-2"
                >
                    <Plus size={14} />
                    Create Discount
                </Link>
            </div>

            {/* Search */}
            <div className="mb-6 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                <input
                    type="text"
                    placeholder="Search by code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#27272a] text-white text-sm focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
                />
            </div>

            {/* Error State */}
            {isError && (
                <div className="flex flex-col items-center justify-center py-12 border border-red-500/30 bg-red-500/5 mb-6">
                    <AlertTriangle size={48} className="text-red-500 mb-4" />
                    <p className="text-red-400 font-medium">Failed to load discounts</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* List */}
            {!isError && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="h-32 bg-[#0A0A0A] border border-[#27272a] animate-pulse" />
                        ))
                    ) : filteredDiscounts.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-zinc-500 text-sm">
                            No discounts found
                        </div>
                    ) : (
                        filteredDiscounts.map((discount) => (
                            <div key={discount.id} className="bg-[#0A0A0A] border border-[#27272a] p-5 group hover:border-zinc-600 transition-colors relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-zinc-900 text-zinc-400 rounded">
                                            <Tag size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold font-mono tracking-wider">{discount.code}</h3>
                                            <p className="text-[10px] text-zinc-500 uppercase">
                                                {discount.type === 'percentage' ? `${discount.value}% OFF` : `GHS ${discount.value} OFF`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Link
                                            to={`/admin/discounts/${discount.id}/edit`}
                                            className="p-2 text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Edit size={14} />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(discount.id, discount.code)}
                                            className="p-2 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex flex-col gap-1 text-xs text-zinc-400">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={12} />
                                            <span className={!hasStarted(discount.startsAt) ? 'text-amber-500' : ''}>
                                                Starts: {formatDate(discount.startsAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 pl-4">
                                            <span className={isExpired(discount.expiresAt) ? 'text-red-500' : ''}>
                                                Expires: {formatDate(discount.expiresAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-[10px] text-zinc-500 font-mono">
                                            USED: {discount.usedCount} / {discount.maxUses || '∞'}
                                        </div>
                                        <span className={`text-[9px] font-bold uppercase px-2 py-1 ${isDiscountActive(discount)
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : !hasStarted(discount.startsAt)
                                                ? 'bg-amber-500/10 text-amber-500'
                                                : 'bg-red-500/10 text-red-500'
                                            }`}>
                                            {isDiscountActive(discount) ? 'Active' : !hasStarted(discount.startsAt) ? 'Scheduled' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
