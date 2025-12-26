import { useState, useMemo } from 'react';
import { Search, RefreshCw, Save, AlertTriangle, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { useAdminProducts, useBulkUpdateVariants } from '@/lib/hooks/useProducts';
import { useToast } from '@/contexts/ToastContext';
import { Variant } from '@/lib/api/products';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import Skeleton from '@/components/common/Skeleton';
import TableSkeleton from '@/components/common/TableSkeleton';

interface InventoryItem extends Variant { productName: string; productImage?: string; }

export default function InventoryList() {
    const { showToast } = useToast();
    const isMobile = useIsMobile();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
    const [modifiedStock, setModifiedStock] = useState<Record<string, number>>({});

    const { data, isLoading, refetch } = useAdminProducts({ page, limit: 50, search: search || undefined });
    const bulkUpdateMutation = useBulkUpdateVariants();

    const inventoryItems: InventoryItem[] = useMemo(() => {
        if (!data?.products) return [];
        return data.products.flatMap(p => (p.variants || []).map(v => ({ ...v, productName: p.name, productImage: v.images?.[0] || p.images?.[0] })));
    }, [data?.products]);

    const filteredItems = useMemo(() => {
        if (stockFilter === 'all') return inventoryItems;
        return inventoryItems.filter(i => stockFilter === 'low' ? i.stock > 0 && i.stock <= 5 : i.stock === 0);
    }, [inventoryItems, stockFilter]);

    const handleStockChange = (id: string, val: string) => { const n = parseInt(val); if (!isNaN(n) && n >= 0) setModifiedStock(p => ({ ...p, [id]: n })); };

    const handleSave = async () => {
        if (Object.keys(modifiedStock).length === 0) return;
        try {
            const byVal: Record<number, string[]> = {};
            Object.entries(modifiedStock).forEach(([id, s]) => { if (!byVal[s]) byVal[s] = []; byVal[s].push(id); });
            await Promise.all(Object.entries(byVal).map(([s, ids]) => bulkUpdateMutation.mutateAsync({ variantIds: ids, updates: { stock: parseInt(s) } })));
            showToast(`Updated ${Object.keys(modifiedStock).length} items`, 'success');
            setModifiedStock({}); refetch();
        } catch { showToast('Failed', 'error'); }
    };

    const hasChanges = Object.keys(modifiedStock).length > 0;

    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                <div className="flex items-center justify-between">
                    <div><h1 className="text-lg text-white font-semibold">Inventory</h1><p className="text-[10px] text-zinc-500 font-mono">{filteredItems.length} items</p></div>
                    <div className="flex gap-2">
                        <button onClick={() => refetch()} className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400"><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /></button>
                        {hasChanges && <button onClick={handleSave} className="px-4 py-2.5 bg-white text-black rounded-xl text-xs font-bold flex items-center gap-2"><Save size={16} /> Save</button>}
                    </div>
                </div>
                <div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white" /></div>
                <div className="flex gap-2">{(['all', 'low', 'out'] as const).map(f => <button key={f} onClick={() => setStockFilter(f)} className={`px-3 py-2 rounded-full text-xs font-medium ${stockFilter === f ? f === 'out' ? 'bg-red-500/20 text-red-400' : f === 'low' ? 'bg-amber-500/20 text-amber-400' : 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}>{f === 'all' ? 'All' : f === 'low' ? 'Low' : 'Out'}</button>)}</div>
                {/* Divider */}
                <div className="h-px bg-zinc-800/50 -mx-4" />
                <div className="space-y-3">
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-3">
                                <Skeleton width={48} height={48} borderRadius="0.5rem" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton width="60%" height={14} />
                                    <Skeleton width="30%" height={10} />
                                </div>
                                <Skeleton width={64} height={40} borderRadius="0.5rem" />
                            </div>
                        ))
                    ) : filteredItems.length === 0 ? <div className="text-center py-12"><Package size={40} className="mx-auto text-zinc-700 mb-4" /><p className="text-zinc-500 text-sm">No items</p></div> : filteredItems.map(item => {
                        const cur = modifiedStock[item.id!] ?? item.stock;
                        const mod = modifiedStock[item.id!] !== undefined;
                        const low = cur > 0 && cur <= 5, out = cur === 0;
                        return (
                            <div key={item.id} className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-3">
                                <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">{item.productImage ? <img src={item.productImage} alt="" className="w-full h-full object-cover" /> : <Package className="w-full h-full p-3 text-zinc-600" />}</div>
                                <div className="flex-1 min-w-0"><p className="text-sm text-white font-medium truncate">{item.productName}</p><p className="text-[10px] text-zinc-500 font-mono">{item.sku}</p></div>
                                <div className="flex items-center gap-2"><input type="number" min="0" value={cur} onChange={(e) => handleStockChange(item.id!, e.target.value)} className={`w-16 h-10 text-center bg-zinc-800 border rounded-lg text-sm font-mono ${mod ? 'border-blue-500 text-blue-400' : 'border-zinc-700 text-white'}`} />{out && <span className="text-[9px] px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded font-bold">OUT</span>}{low && !out && <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded font-bold">LOW</span>}</div>
                            </div>
                        );
                    })}
                </div>
                {(data?.pages || 1) > 1 && <div className="flex items-center justify-between pt-4"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl disabled:opacity-50"><ChevronLeft size={20} /></button><span className="text-sm text-zinc-400">{page} / {data?.pages}</span><button onClick={() => setPage(p => Math.min(data?.pages || 1, p + 1))} disabled={page === (data?.pages || 1)} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl disabled:opacity-50"><ChevronRight size={20} /></button></div>}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] p-8">
            <div className="flex items-center justify-between mb-8">
                <div><h1 className="text-xl text-white font-medium uppercase tracking-tight">Inventory</h1><p className="text-[10px] text-zinc-500 font-mono mt-1">MANAGE STOCK LEVELS</p></div>
                <div className="flex gap-2"><button onClick={() => refetch()} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"><RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /></button>{hasChanges && <button onClick={handleSave} className="px-4 py-2 bg-white text-black text-xs font-bold uppercase flex items-center gap-2"><Save size={14} /> Save ({Object.keys(modifiedStock).length})</button>}</div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} /><input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#27272a] text-white text-sm" /></div>
                <div className="flex gap-2">{(['all', 'low', 'out'] as const).map(f => <button key={f} onClick={() => setStockFilter(f)} className={`px-4 py-2 text-[10px] font-bold uppercase border ${stockFilter === f ? f === 'out' ? 'bg-red-500/10 text-red-500 border-red-500' : f === 'low' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500' : 'bg-white text-black border-white' : 'bg-[#0A0A0A] text-zinc-400 border-[#27272a]'}`}>{f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}</button>)}</div>
            </div>
            <div className="bg-[#0A0A0A] border border-[#27272a] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead><tr className="border-b border-[#27272a]"><th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase">Product</th><th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase">SKU</th><th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase">Attributes</th><th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase">Stock</th><th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase">Status</th></tr></thead>
                        <tbody className="divide-y divide-[#27272a]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-0">
                                        <TableSkeleton rows={10} cols={4} />
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-500 text-sm">No items</td></tr> : filteredItems.map(item => {
                                const cur = modifiedStock[item.id!] ?? item.stock;
                                const mod = modifiedStock[item.id!] !== undefined;
                                const low = cur > 0 && cur <= 5, out = cur === 0;
                                return (
                                    <tr key={item.id} className="hover:bg-zinc-900/50">
                                        <td className="px-4 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-zinc-800 rounded overflow-hidden">{item.productImage ? <img src={item.productImage} alt="" className="w-full h-full object-cover" /> : <Package className="w-full h-full p-2 text-zinc-600" />}</div><span className="text-sm text-white">{item.productName}</span></div></td>
                                        <td className="px-4 py-4"><span className="text-xs text-zinc-400 font-mono">{item.sku}</span></td>
                                        <td className="px-4 py-4"><div className="flex gap-2 text-[10px] text-zinc-500 font-mono">{item.color && <span>{item.color}</span>}{item.length && <span>{item.length}"</span>}</div></td>
                                        <td className="px-4 py-4"><div className="flex items-center gap-2"><input type="number" min="0" value={cur} onChange={(e) => handleStockChange(item.id!, e.target.value)} className={`w-20 bg-[#050505] border px-2 py-1 text-sm font-mono ${mod ? 'border-blue-500 text-blue-400' : 'border-[#27272a] text-white'}`} />{low && <AlertTriangle size={14} className="text-yellow-500" />}</div></td>
                                        <td className="px-4 py-4">{out ? <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1">OUT</span> : low ? <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1">LOW</span> : <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1">IN STOCK</span>}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#27272a]"><span className="text-xs text-zinc-500 font-mono">Page {page} / {data?.pages || 1}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-zinc-800 text-zinc-400 disabled:opacity-50"><ChevronLeft size={14} /></button><button onClick={() => setPage(p => Math.min(data?.pages || 1, p + 1))} disabled={page === (data?.pages || 1)} className="p-2 bg-zinc-800 text-zinc-400 disabled:opacity-50"><ChevronRight size={14} /></button></div></div>
            </div>
        </div>
    );
}
