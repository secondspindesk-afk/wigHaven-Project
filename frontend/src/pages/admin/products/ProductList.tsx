import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Copy, Upload, Loader2, FileSpreadsheet, CheckSquare, Square, X } from 'lucide-react';
import { useAdminProducts, useDeleteProduct, useDuplicateProduct, useBulkUploadProducts, useCategories, useBulkDeleteProducts, useBulkUpdateProductStatus } from '@/lib/hooks/useProducts';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useToast } from '@/contexts/ToastContext';

export default function ProductList() {
    const { showToast, showConfirm } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [sortBy, setSortBy] = useState<'newest' | 'name' | 'price_asc' | 'price_desc'>('newest');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // API Hooks
    const { data, isLoading } = useAdminProducts({
        search: debouncedSearch || undefined,
        category: selectedCategory || undefined,
        sort: sortBy
    });

    const { data: categories = [] } = useCategories();

    const deleteMutation = useDeleteProduct();
    const duplicateMutation = useDuplicateProduct();
    const bulkUploadMutation = useBulkUploadProducts();
    const bulkDeleteMutation = useBulkDeleteProducts();
    const bulkStatusMutation = useBulkUpdateProductStatus();

    const products = data?.products || [];

    const handleDelete = async (id: string) => {
        try {
            await deleteMutation.mutateAsync(id);
            setDeleteId(null);
            showToast('Product deleted successfully', 'success');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to delete product', 'error');
        }
    };

    const handleDuplicate = async (id: string) => {
        try {
            await duplicateMutation.mutateAsync(id);
            showToast('Product duplicated successfully', 'success');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to duplicate product', 'error');
        }
    };

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result = await bulkUploadMutation.mutateAsync(file);
            showToast(`Processed ${result.processed} products`, 'success');
            if (result.errors && result.errors.length > 0) {
                showToast(`Failed to import ${result.errors.length} products`, 'error');
                console.error('Bulk upload errors:', result.errors);
            }
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Bulk upload failed', 'error');
            console.error(error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const toggleSelectAll = () => {
        if (selectedProducts.length === products.length) {
            setSelectedProducts([]);
        } else {
            setSelectedProducts(products.map(p => p.id));
        }
    };

    const toggleSelectProduct = (id: string) => {
        if (selectedProducts.includes(id)) {
            setSelectedProducts(prev => prev.filter(pId => pId !== id));
        } else {
            setSelectedProducts(prev => [...prev, id]);
        }
    };

    const handleBulkDelete = () => {
        showConfirm({
            title: 'Delete Products',
            message: `Are you sure you want to delete ${selectedProducts.length} products?`,
            confirmText: 'DELETE ALL',
            onConfirm: async () => {
                try {
                    await bulkDeleteMutation.mutateAsync(selectedProducts);
                    setSelectedProducts([]);
                    showToast(`Deleted ${selectedProducts.length} products`, 'success');
                } catch (error: any) {
                    showToast('Failed to delete products', 'error');
                }
            }
        });
    };

    const handleBulkStatus = async (isActive: boolean) => {
        try {
            await bulkStatusMutation.mutateAsync({ ids: selectedProducts, isActive });
            setSelectedProducts([]);
            showToast(`Updated ${selectedProducts.length} products`, 'success');
        } catch (error: any) {
            showToast('Failed to update status', 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Product Inventory</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">MANAGE PRODUCTS & VARIANTS</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleBulkUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="px-4 py-2 bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 text-[10px] font-bold font-mono uppercase transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} strokeWidth={1.5} />}
                            Bulk Upload
                        </button>
                    </div>
                    <Link
                        to="/admin/products/new"
                        className="px-4 py-2 bg-white text-black border border-white hover:bg-zinc-200 text-[10px] font-bold font-mono uppercase transition-all flex items-center gap-2"
                    >
                        <Plus size={14} strokeWidth={2} />
                        Add Product
                    </Link>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 p-4 bg-[#0A0A0A] border border-[#27272a]">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" strokeWidth={1.5} />
                    <input
                        type="text"
                        placeholder="SEARCH BY NAME OR SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-10 pr-4 bg-[#050505] border border-[#27272a] text-xs text-white placeholder-zinc-700 font-mono uppercase focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                </div>

                {/* Category Filter */}
                <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" strokeWidth={1.5} />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="h-9 pl-10 pr-8 bg-[#050505] border border-[#27272a] text-xs text-white font-mono uppercase focus:outline-none focus:border-zinc-600 transition-colors appearance-none cursor-pointer"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.slug}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {/* Sort */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="h-9 px-4 bg-[#050505] border border-[#27272a] text-xs text-white font-mono uppercase focus:outline-none focus:border-zinc-600 transition-colors appearance-none cursor-pointer"
                >
                    <option value="newest">NEWEST FIRST</option>
                    <option value="name">NAME (A-Z)</option>
                    <option value="price_asc">PRICE (LOW-HIGH)</option>
                    <option value="price_desc">PRICE (HIGH-LOW)</option>
                </select>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedProducts.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-white font-mono uppercase font-bold">{selectedProducts.length} SELECTED</span>
                        <button
                            onClick={() => setSelectedProducts([])}
                            className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold flex items-center gap-1"
                        >
                            <X size={12} /> Clear Selection
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleBulkStatus(true)}
                            disabled={bulkStatusMutation.isPending}
                            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] font-bold font-mono uppercase transition-colors"
                        >
                            Set Active
                        </button>
                        <button
                            onClick={() => handleBulkStatus(false)}
                            disabled={bulkStatusMutation.isPending}
                            className="px-3 py-1.5 bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white text-[10px] font-bold font-mono uppercase transition-colors"
                        >
                            Set Inactive
                        </button>
                        <div className="w-px h-4 bg-zinc-700 mx-2" />
                        <button
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteMutation.isPending}
                            className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 text-[10px] font-bold font-mono uppercase transition-colors flex items-center gap-2"
                        >
                            {bulkDeleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            Delete Selected
                        </button>
                    </div>
                </div>
            )}

            {/* Products Table */}
            <div className="border border-[#27272a] bg-[#0A0A0A]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0f0f0f] border-b border-[#27272a]">
                                <th className="px-6 py-4 w-10">
                                    <button
                                        onClick={toggleSelectAll}
                                        className="text-zinc-500 hover:text-white transition-colors"
                                    >
                                        {selectedProducts.length > 0 && selectedProducts.length === products.length ? (
                                            <CheckSquare size={16} />
                                        ) : (
                                            <Square size={16} />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Image</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Product</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-right">Price</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-right">Stock</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272a]">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="w-12 h-12 bg-zinc-800" /></td>
                                        <td className="px-6 py-4"><div className="h-3 w-32 bg-zinc-800" /></td>
                                        <td className="px-6 py-4"><div className="h-3 w-20 bg-zinc-800" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-3 w-16 bg-zinc-800 ml-auto" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-3 w-8 bg-zinc-800 ml-auto" /></td>
                                        <td className="px-6 py-4"><div className="h-5 w-16 bg-zinc-800" /></td>
                                        <td className="px-6 py-4"><div className="h-8 w-24 bg-zinc-800 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <p className="text-zinc-600 font-mono text-xs uppercase">No products found</p>
                                        <Link
                                            to="/admin/products/new"
                                            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#0f0f0f] border border-[#27272a] hover:border-zinc-600 text-zinc-400 hover:text-white text-[10px] font-mono uppercase transition-colors"
                                        >
                                            <Plus size={12} />
                                            Add First Product
                                        </Link>
                                    </td>
                                </tr>
                            ) : (
                                products.map(product => (
                                    <tr key={product.id} className={`group transition-colors ${selectedProducts.includes(product.id) ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'}`}>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleSelectProduct(product.id)}
                                                className={`transition-colors ${selectedProducts.includes(product.id) ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`}
                                            >
                                                {selectedProducts.includes(product.id) ? (
                                                    <CheckSquare size={16} />
                                                ) : (
                                                    <Square size={16} />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-12 h-12 bg-zinc-800 overflow-hidden relative">
                                                {product.variants?.[0]?.images?.[0] ? (
                                                    <img src={product.variants[0].images[0]} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                        <Upload size={16} />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-white font-medium">{product.name}</p>
                                                {product.isFeatured && (
                                                    <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 border border-amber-500/20 uppercase tracking-wider">Featured</span>
                                                )}
                                            </div>
                                            <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{product.variantCount ?? 0} variants</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-zinc-400">{product.category?.name || 'Uncategorized'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono text-xs text-white">GHS {(product.basePrice ?? 0).toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-mono text-xs ${(product.totalStock ?? 0) === 0 ? 'text-red-500' :
                                                (product.totalStock ?? 0) < 10 ? 'text-yellow-500' : 'text-emerald-500'
                                                }`}>{product.totalStock ?? 0}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 text-[9px] font-bold uppercase tracking-wider border ${product.isActive
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                                                }`}>{product.isActive ? 'Active' : 'Inactive'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link to={`/admin/products/${product.id}/edit`} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors" title="Edit">
                                                    <Edit size={14} strokeWidth={1.5} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDuplicate(product.id)}
                                                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                                                    title="Duplicate"
                                                >
                                                    <Copy size={14} strokeWidth={1.5} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(product.id)}
                                                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-900/10 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} strokeWidth={1.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {products.length > 0 && (
                    <div className="px-6 py-4 border-t border-[#27272a] flex justify-between items-center">
                        <p className="text-[10px] text-zinc-600 font-mono uppercase">Showing {products.length} products</p>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
                    <div className="relative w-full max-w-sm bg-[#0A0A0A] border border-[#27272a] p-6 text-center shadow-2xl">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={24} className="text-red-500" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase mb-2">Delete Product?</h3>
                        <p className="text-xs text-zinc-500 mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="flex-1 py-2.5 bg-zinc-800 text-white text-[10px] font-bold font-mono uppercase hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteId)}
                                className="flex-1 py-2.5 bg-red-600 text-white text-[10px] font-bold font-mono uppercase hover:bg-red-700 transition-colors"
                            >
                                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
