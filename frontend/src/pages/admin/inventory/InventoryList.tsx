import { useState, useMemo } from 'react';
import {
    Search, RefreshCw, Save, AlertTriangle,
    ChevronLeft, ChevronRight, Package
} from 'lucide-react';
import { useAdminProducts, useBulkUpdateVariants } from '@/lib/hooks/useProducts';
import { useToast } from '@/contexts/ToastContext';
import { Variant } from '@/lib/api/products';

interface InventoryItem extends Variant {
    productName: string;
    productImage?: string;
}

export default function InventoryList() {
    const { showToast } = useToast();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

    // Track modified stock levels: { variantId: newStock }
    const [modifiedStock, setModifiedStock] = useState<Record<string, number>>({});

    const { data, isLoading, refetch } = useAdminProducts({
        page,
        limit: 50, // Fetch more for inventory view
        search: search || undefined,
    });

    const bulkUpdateMutation = useBulkUpdateVariants();

    // Flatten products to variants
    const inventoryItems: InventoryItem[] = useMemo(() => {
        if (!data?.products) return [];
        return data.products.flatMap(product =>
            (product.variants || []).map(variant => ({
                ...variant,
                productName: product.name,
                productImage: variant.images?.[0] || product.images?.[0]
            }))
        );
    }, [data?.products]);

    // Client-side filtering for stock status (since API pagination is per product)
    const filteredItems = useMemo(() => {
        if (stockFilter === 'all') return inventoryItems;
        return inventoryItems.filter(item => {
            if (stockFilter === 'low') return item.stock > 0 && item.stock <= 5;
            if (stockFilter === 'out') return item.stock === 0;
            return true;
        });
    }, [inventoryItems, stockFilter]);

    const handleStockChange = (variantId: string, value: string) => {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setModifiedStock(prev => ({
                ...prev,
                [variantId]: numValue
            }));
        }
    };

    const handleSave = async () => {
        const variantIds = Object.keys(modifiedStock);
        if (variantIds.length === 0) return;

        try {
            // We need to send updates one by one or grouped by value if the API supported it.
            // But our API supports bulk update with SAME updates for all IDs.
            // Wait, the API I implemented: `bulkUpdateVariants(variantIds, updates)` applies the SAME update to all.
            // This is NOT what we want for individual stock editing.
            // I need to check if I can update multiple variants with DIFFERENT values.
            // The current API `bulkUpdateVariants` applies `updates` object to ALL `variantIds`.

            // WORKAROUND: For now, we'll fire multiple requests. 
            // Ideally, we should update the backend to accept an array of updates.
            // Or use `updateVariant` in a loop.

            // Let's use a loop for now, it's safer.
            // Actually, let's group by stock value to minimize requests if possible, 
            // but stock values are likely unique.

            // Since I don't have a "bulk update with different values" endpoint, 
            // I will use Promise.all with individual updates. 
            // Wait, I don't have `useUpdateVariant` exposed here? 
            // I do have `useUpdateProduct` but that's for products.
            // I need `useUpdateVariant`? No, `updateProduct` handles variants too but it's complex.

            // Let's check `variantController.js`. It has `updateVariant`.
            // I should add `updateVariant` to `useProducts.ts` if it's not there.
            // It is NOT there.

            // Okay, I will implement a "Save" that iterates.
            // But wait, `bulkUpdateVariants` in `variantController.js` takes `variantIds` and `updates`.
            // If I want to update stock for ID1 to 10 and ID2 to 20, I can't use that endpoint as is.

            // I will add `useUpdateVariant` to `useProducts.ts` first?
            // Or I can just use `bulkUpdateVariants` for each unique stock value?
            // e.g. "Set all selected to 10".
            // But the UI implies individual editing.

            // Let's stick to the plan: "Inline editing of stock levels".
            // I'll group updates by value.
            const updatesByValue: Record<number, string[]> = {};
            Object.entries(modifiedStock).forEach(([id, stock]) => {
                if (!updatesByValue[stock]) updatesByValue[stock] = [];
                updatesByValue[stock].push(id);
            });

            const promises = Object.entries(updatesByValue).map(([stock, ids]) =>
                bulkUpdateMutation.mutateAsync({
                    variantIds: ids,
                    updates: { stock: parseInt(stock) }
                })
            );

            await Promise.all(promises);

            showToast(`Updated stock for ${variantIds.length} items`, 'success');
            setModifiedStock({});
            refetch();
        } catch (error) {
            showToast('Failed to update stock', 'error');
        }
    };

    const hasChanges = Object.keys(modifiedStock).length > 0;

    return (
        <div className="min-h-screen bg-[#050505] p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Inventory</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                        MANAGE STOCK LEVELS
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => refetch()}
                        className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    {hasChanges && (
                        <button
                            onClick={handleSave}
                            disabled={bulkUpdateMutation.isPending}
                            className="px-4 py-2 bg-white text-black text-xs font-bold uppercase hover:bg-zinc-200 transition-colors flex items-center gap-2"
                        >
                            {bulkUpdateMutation.isPending ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : (
                                <Save size={14} />
                            )}
                            Save Changes ({Object.keys(modifiedStock).length})
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                    <input
                        type="text"
                        placeholder="Search by product, SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#27272a] text-white text-sm focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setStockFilter('all')}
                        className={`px-4 py-2 text-[10px] font-bold uppercase border ${stockFilter === 'all'
                            ? 'bg-white text-black border-white'
                            : 'bg-[#0A0A0A] text-zinc-400 border-[#27272a] hover:border-zinc-600'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setStockFilter('low')}
                        className={`px-4 py-2 text-[10px] font-bold uppercase border ${stockFilter === 'low'
                            ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500'
                            : 'bg-[#0A0A0A] text-zinc-400 border-[#27272a] hover:border-zinc-600'
                            }`}
                    >
                        Low Stock
                    </button>
                    <button
                        onClick={() => setStockFilter('out')}
                        className={`px-4 py-2 text-[10px] font-bold uppercase border ${stockFilter === 'out'
                            ? 'bg-red-500/10 text-red-500 border-red-500'
                            : 'bg-[#0A0A0A] text-zinc-400 border-[#27272a] hover:border-zinc-600'
                            }`}
                    >
                        Out of Stock
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#0A0A0A] border border-[#27272a] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#27272a]">
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Product</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">SKU</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Attributes</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Stock Level</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272a]">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-4"><div className="h-4 w-32 bg-zinc-800 rounded" /></td>
                                        <td className="px-4 py-4"><div className="h-4 w-24 bg-zinc-800 rounded" /></td>
                                        <td className="px-4 py-4"><div className="h-4 w-20 bg-zinc-800 rounded" /></td>
                                        <td className="px-4 py-4"><div className="h-8 w-20 bg-zinc-800 rounded" /></td>
                                        <td className="px-4 py-4"><div className="h-4 w-16 bg-zinc-800 rounded" /></td>
                                    </tr>
                                ))
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-zinc-500 text-sm">
                                        No inventory items found
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => {
                                    const currentStock = modifiedStock[item.id!] ?? item.stock;
                                    const isModified = modifiedStock[item.id!] !== undefined;
                                    const isLow = currentStock > 0 && currentStock <= 5;
                                    const isOut = currentStock === 0;

                                    return (
                                        <tr key={item.id} className="hover:bg-zinc-900/50 transition-colors group">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                                                        {item.productImage ? (
                                                            <img src={item.productImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package className="w-full h-full p-2 text-zinc-600" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-white font-medium">{item.productName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs text-zinc-400 font-mono">{item.sku}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex gap-2 text-[10px] text-zinc-500 uppercase font-mono">
                                                    {item.color && <span>{item.color}</span>}
                                                    {item.length && <span>{item.length}"</span>}
                                                    {item.texture && <span>{item.texture}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={currentStock}
                                                        onChange={(e) => handleStockChange(item.id!, e.target.value)}
                                                        className={`w-20 bg-[#050505] border px-2 py-1 text-sm font-mono focus:outline-none ${isModified
                                                            ? 'border-blue-500 text-blue-400'
                                                            : 'border-[#27272a] text-white focus:border-zinc-600'
                                                            }`}
                                                    />
                                                    {isLow && <AlertTriangle size={14} className="text-yellow-500" />}
                                                    {isOut && <XCircle size={14} className="text-red-500" />}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {isOut ? (
                                                    <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 uppercase">Out of Stock</span>
                                                ) : isLow ? (
                                                    <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 uppercase">Low Stock</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 uppercase">In Stock</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#27272a]">
                    <span className="text-xs text-zinc-500 font-mono">
                        Page {page} of {data?.pages || 1}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(data?.pages || 1, p + 1))}
                            disabled={page === (data?.pages || 1)}
                            className="p-2 bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function XCircle({ size, className }: { size: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
    );
}
