import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Tag, Calendar, Search, Edit, AlertTriangle, MoreVertical } from 'lucide-react';
import { useDiscounts, useDeleteDiscount } from '@/lib/hooks/useDiscounts';
import { useToast } from '@/contexts/ToastContext';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function DiscountList() {
    const { showToast, showConfirm } = useToast();
    const isMobile = useIsMobile();
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [actionDiscountId, setActionDiscountId] = useState<string | null>(null);

    const { data: discounts, isLoading, isError, refetch } = useDiscounts();
    const deleteMutation = useDeleteDiscount();

    const handleDelete = (discountId: string, code: string) => {
        showConfirm({
            title: 'Delete Discount',
            message: `Delete code "${code}"?`,
            confirmText: 'DELETE',
            onConfirm: async () => {
                try {
                    await deleteMutation.mutateAsync(discountId);
                    showToast('Discount deleted', 'success');
                } catch (error: any) {
                    showToast(error.message || 'Failed', 'error');
                }
            }
        });
    };

    const filteredDiscounts = discounts?.filter(d => d.code.toLowerCase().includes(debouncedSearch.toLowerCase())) || [];
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();
    const hasStarted = (startsAt: string) => new Date(startsAt) <= new Date();
    const isDiscountActive = (discount: { startsAt: string; expiresAt: string; isActive: boolean }) => {
        const now = new Date();
        return discount.isActive && new Date(discount.startsAt) <= now && new Date(discount.expiresAt) > now;
    };

    // ==================== MOBILE LAYOUT ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                {/* Mobile Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg text-white font-semibold">Discounts</h1>
                        <p className="text-[10px] text-zinc-500 font-mono">{filteredDiscounts.length} codes</p>
                    </div>
                    <Link to="/admin/discounts/new" className="px-4 py-2.5 bg-white text-black rounded-xl text-xs font-bold flex items-center gap-2">
                        <Plus size={16} /> Add
                    </Link>
                </div>

                {/* Mobile Search */}
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search codes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none"
                    />
                </div>

                {isError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                        <AlertTriangle size={24} className="mx-auto text-red-500 mb-2" />
                        <button onClick={() => refetch()} className="text-xs text-red-400 underline">Retry</button>
                    </div>
                )}

                {/* Discount Cards */}
                <div className="space-y-3">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />)
                    ) : filteredDiscounts.length === 0 ? (
                        <div className="text-center py-12">
                            <Tag size={40} className="mx-auto text-zinc-700 mb-4" />
                            <p className="text-zinc-500 text-sm">No discounts</p>
                        </div>
                    ) : (
                        filteredDiscounts.map((discount) => (
                            <div key={discount.id} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 bg-zinc-800 rounded-lg">
                                        <Tag size={18} className="text-zinc-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm text-white font-bold font-mono">{discount.code}</h3>
                                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${isDiscountActive(discount) ? 'bg-emerald-500/10 text-emerald-500' : !hasStarted(discount.startsAt) ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {isDiscountActive(discount) ? 'Active' : !hasStarted(discount.startsAt) ? 'Scheduled' : 'Inactive'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-zinc-400 mt-0.5">
                                            {discount.type === 'percentage' ? `${discount.value}% OFF` : `GHS ${discount.value} OFF`}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-500">
                                            <Calendar size={10} />
                                            <span>{formatDate(discount.startsAt)} - {formatDate(discount.expiresAt)}</span>
                                            <span className="ml-auto font-mono">Used: {discount.usedCount}/{discount.maxUses || '∞'}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setActionDiscountId(discount.id)} className="p-1.5 text-zinc-500">
                                        <MoreVertical size={16} />
                                    </button>
                                </div>

                                {/* Actions Bottom Sheet */}
                                {actionDiscountId === discount.id && (
                                    <>
                                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setActionDiscountId(null)} />
                                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-4 safe-area-pb">
                                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                                            <div className="space-y-2">
                                                <Link to={`/admin/discounts/${discount.id}/edit`} onClick={() => setActionDiscountId(null)} className="w-full p-3 bg-zinc-800 rounded-xl text-left text-sm text-white flex items-center gap-3">
                                                    <Edit size={16} /> Edit Discount
                                                </Link>
                                                <button onClick={() => { setActionDiscountId(null); handleDelete(discount.id, discount.code); }} className="w-full p-3 bg-red-500/10 rounded-xl text-left text-sm text-red-500 flex items-center gap-3">
                                                    <Trash2 size={16} /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // ==================== DESKTOP LAYOUT ====================
    return (
        <div className="min-h-screen bg-[#050505] p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Discounts</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">MANAGE COUPON CODES</p>
                </div>
                <Link to="/admin/discounts/new" className="px-4 py-2 bg-white text-black text-xs font-bold uppercase hover:bg-zinc-200 transition-colors flex items-center gap-2">
                    <Plus size={14} /> Create Discount
                </Link>
            </div>

            <div className="mb-6 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                <input type="text" placeholder="Search by code..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#27272a] text-white text-sm focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600" />
            </div>

            {isError && (
                <div className="flex flex-col items-center justify-center py-12 border border-red-500/30 bg-red-500/5 mb-6">
                    <AlertTriangle size={48} className="text-red-500 mb-4" />
                    <p className="text-red-400 font-medium">Failed to load discounts</p>
                    <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30">Try Again</button>
                </div>
            )}

            {!isError && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <div key={i} className="h-32 bg-[#0A0A0A] border border-[#27272a] animate-pulse" />)
                    ) : filteredDiscounts.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-zinc-500 text-sm">No discounts found</div>
                    ) : (
                        filteredDiscounts.map((discount) => (
                            <div key={discount.id} className="bg-[#0A0A0A] border border-[#27272a] p-5 group hover:border-zinc-600 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-zinc-900 text-zinc-400 rounded"><Tag size={16} /></div>
                                        <div>
                                            <h3 className="text-white font-bold font-mono tracking-wider">{discount.code}</h3>
                                            <p className="text-[10px] text-zinc-500 uppercase">{discount.type === 'percentage' ? `${discount.value}% OFF` : `GHS ${discount.value} OFF`}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Link to={`/admin/discounts/${discount.id}/edit`} className="p-2 text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100"><Edit size={14} /></Link>
                                        <button onClick={() => handleDelete(discount.id, discount.code)} className="p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex flex-col gap-1 text-xs text-zinc-400">
                                        <div className="flex items-center gap-2"><Calendar size={12} /><span className={!hasStarted(discount.startsAt) ? 'text-amber-500' : ''}>Starts: {formatDate(discount.startsAt)}</span></div>
                                        <div className="flex items-center gap-2 pl-4"><span className={isExpired(discount.expiresAt) ? 'text-red-500' : ''}>Expires: {formatDate(discount.expiresAt)}</span></div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-[10px] text-zinc-500 font-mono">USED: {discount.usedCount} / {discount.maxUses || '∞'}</div>
                                        <span className={`text-[9px] font-bold uppercase px-2 py-1 ${isDiscountActive(discount) ? 'bg-emerald-500/10 text-emerald-500' : !hasStarted(discount.startsAt) ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
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
