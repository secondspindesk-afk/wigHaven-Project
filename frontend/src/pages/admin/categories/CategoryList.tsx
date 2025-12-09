import { useState, useRef } from 'react';
import { Plus, Edit, Trash2, X, Image as ImageIcon, Upload, Loader2, Check, Search, Filter } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/lib/hooks/useProducts';
import { Category, CategoryFormData } from '@/lib/api/products';
import { uploadApi } from '@/lib/api/upload';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useToast } from '@/contexts/ToastContext';

export default function CategoryList() {
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState<CategoryFormData>({
        name: '',
        description: '',
        image: null,
        isActive: true,
        isFeatured: false,
        type: 'standard'
    });
    const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);
    const [transferCategoryId, setTransferCategoryId] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [typeFilter, setTypeFilter] = useState<string>('');

    // API Hooks
    const { data: categories = [], isLoading } = useCategories({
        search: debouncedSearch || undefined,
        type: typeFilter || undefined
    });
    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();
    const deleteMutation = useDeleteCategory();

    const openAddModal = () => {
        setEditingCategory(null);
        setFormData({
            name: '',
            description: '',
            image: null,
            isActive: true,
            isFeatured: false,
            type: 'standard'
        });
        setIsModalOpen(true);
    };

    const openEditModal = (category: Category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || '',
            image: category.image,
            isActive: category.isActive,
            isFeatured: category.isFeatured,
            type: category.type
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        setFormData({
            name: '',
            description: '',
            image: null,
            isActive: true,
            isFeatured: false,
            type: 'standard'
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const response = await uploadApi.uploadImage(file, 'category');
            setFormData(prev => ({ ...prev, image: response.url }));
            showToast('Image uploaded successfully', 'success');
        } catch (error: any) {
            // Handle 409 duplicate - seamlessly use existing URL
            if (error.response?.status === 409 && error.response?.data?.existingFile?.url) {
                const existingUrl = error.response.data.existingFile.url;
                setFormData(prev => ({ ...prev, image: existingUrl }));
                showToast('Using existing image', 'info');
            } else {
                console.error('Upload failed:', error);
                showToast(error.response?.data?.error?.message || 'Failed to upload image', 'error');
            }
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = () => {
        setFormData(prev => ({ ...prev, image: null }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await updateMutation.mutateAsync({ id: editingCategory.id, data: formData });
                showToast('Category updated successfully', 'success');
            } else {
                await createMutation.mutateAsync(formData);
                showToast('Category created successfully', 'success');
            }
            closeModal();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to save category', 'error');
            console.error(error);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await deleteMutation.mutateAsync({
                id: deleteConfirm.id,
                transferToId: transferCategoryId || undefined
            });
            setDeleteConfirm(null);
            setTransferCategoryId('');
            showToast('Category deleted successfully', 'success');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to delete category', 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Categories</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">ORGANIZE PRODUCT CATALOG</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="px-4 py-2 bg-white text-black border border-white hover:bg-zinc-200 text-[10px] font-bold font-mono uppercase transition-all flex items-center gap-2"
                >
                    <Plus size={14} strokeWidth={2} />
                    Add Category
                </button>
            </div>



            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 p-4 bg-[#0A0A0A] border border-[#27272a]">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" strokeWidth={1.5} />
                    <input
                        type="text"
                        placeholder="SEARCH CATEGORIES..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-10 pr-4 bg-[#050505] border border-[#27272a] text-xs text-white placeholder-zinc-700 font-mono uppercase focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                </div>

                {/* Type Filter */}
                <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" strokeWidth={1.5} />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="h-9 pl-10 pr-8 bg-[#050505] border border-[#27272a] text-xs text-white font-mono uppercase focus:outline-none focus:border-zinc-600 transition-colors appearance-none cursor-pointer"
                    >
                        <option value="">All Types</option>
                        <option value="standard">Standard</option>
                        <option value="collection">Collection</option>
                        <option value="landing">Landing Page</option>
                    </select>
                </div>
            </div>

            {/* Categories Table */}
            <div className="border border-[#27272a] bg-[#0A0A0A]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0f0f0f] border-b border-[#27272a]">
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Image</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Name</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-right">Products</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#27272a]">
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="w-12 h-12 bg-zinc-800" /></td>
                                        <td className="px-6 py-4"><div className="h-3 w-32 bg-zinc-800" /></td>
                                        <td className="px-6 py-4"><div className="h-3 w-20 bg-zinc-800" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-3 w-8 bg-zinc-800 ml-auto" /></td>
                                        <td className="px-6 py-4"><div className="h-5 w-16 bg-zinc-800" /></td>
                                        <td className="px-6 py-4"><div className="h-8 w-20 bg-zinc-800 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <p className="text-zinc-600 font-mono text-xs uppercase">No categories found</p>
                                        <button
                                            onClick={openAddModal}
                                            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#0f0f0f] border border-[#27272a] hover:border-zinc-600 text-zinc-400 hover:text-white text-[10px] font-mono uppercase transition-colors"
                                        >
                                            <Plus size={12} />
                                            Add First Category
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                categories.map((category: Category) => (
                                    <tr key={category.id} className="group hover:bg-zinc-900/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center overflow-hidden relative">
                                                {category.image ? (
                                                    <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon size={16} className="text-zinc-600" strokeWidth={1.5} />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-white font-medium">{category.name}</p>
                                                {category.isFeatured && (
                                                    <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 border border-amber-500/20 uppercase tracking-wider">Featured</span>
                                                )}
                                            </div>
                                            <p className="text-[9px] text-zinc-600 font-mono mt-0.5">/{category.slug}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] text-zinc-400 font-mono uppercase">{category.type}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono text-xs text-zinc-400">{category.productCount}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 text-[9px] font-bold uppercase tracking-wider border ${category.isActive
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                                                }`}>{category.isActive ? 'Active' : 'Inactive'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEditModal(category)}
                                                    className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={14} strokeWidth={1.5} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(category)}
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
            </div>

            {/* Add/Edit Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />
                        <div className="relative w-full max-w-lg bg-[#0A0A0A] border border-[#27272a] shadow-2xl">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-[#27272a]">
                                <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                                    {editingCategory ? 'Edit Category' : 'New Category'}
                                </h2>
                                <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Left Column: Image */}
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Category Image</label>
                                        <div className="relative aspect-square bg-[#050505] border-2 border-dashed border-[#27272a] hover:border-zinc-600 transition-colors group">
                                            {formData.image ? (
                                                <>
                                                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="p-2 bg-white text-black rounded-full hover:bg-zinc-200"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={removeImage}
                                                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                                                >
                                                    {isUploading ? (
                                                        <Loader2 size={24} className="text-zinc-500 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Upload size={24} className="text-zinc-600 mb-2" strokeWidth={1.5} />
                                                            <p className="text-[9px] text-zinc-600 font-mono uppercase">Upload Image</p>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                        </div>
                                        {/* URL Input Option */}
                                        <div className="mt-2">
                                            <input
                                                type="url"
                                                placeholder="Or paste image URL..."
                                                value={formData.image || ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value || null }))}
                                                className="w-full h-8 px-3 bg-[#050505] border border-[#27272a] text-[10px] text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-zinc-600 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Details */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Name *</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                                                placeholder="e.g. Wigs"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Type</label>
                                            <select
                                                value={formData.type}
                                                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                                                className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors appearance-none"
                                            >
                                                <option value="standard">Standard</option>
                                                <option value="collection">Collection</option>
                                                <option value="landing">Landing Page</option>
                                            </select>
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${formData.isActive ? 'bg-emerald-500 border-emerald-500' : 'border-[#27272a] bg-[#050505]'}`}>
                                                    {formData.isActive && <Check size={10} className="text-black" strokeWidth={3} />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isActive}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                                    className="hidden"
                                                />
                                                <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">Active Status</span>
                                            </label>

                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${formData.isFeatured ? 'bg-amber-500 border-amber-500' : 'border-[#27272a] bg-[#050505]'}`}>
                                                    {formData.isFeatured && <Check size={10} className="text-black" strokeWidth={3} />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isFeatured}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                                                    className="hidden"
                                                />
                                                <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">Featured Category</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Description</label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full h-24 p-4 bg-[#050505] border border-[#27272a] text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                                        placeholder="Optional category description..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-[#27272a]">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="flex-1 py-3 bg-zinc-800 text-white text-[10px] font-bold font-mono uppercase hover:bg-zinc-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending || updateMutation.isPending || isUploading}
                                        className="flex-1 py-3 bg-white text-black text-[10px] font-bold font-mono uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                deleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
                        <div className="relative w-full max-w-sm bg-[#0A0A0A] border border-[#27272a] p-6 text-center shadow-2xl">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} className="text-red-500" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-sm font-bold text-white uppercase mb-2">Delete Category?</h3>

                            {deleteConfirm.productCount > 0 ? (
                                <div className="mb-6 text-left bg-amber-500/10 border border-amber-500/20 p-3 rounded">
                                    <p className="text-xs text-amber-500 font-bold mb-1">⚠️ Action Required</p>
                                    <p className="text-[10px] text-zinc-400 mb-3">
                                        This category contains <span className="text-white font-bold">{deleteConfirm.productCount} products</span>.
                                        You must transfer them to another category before deleting.
                                    </p>

                                    <label className="block text-[9px] text-zinc-500 uppercase font-bold mb-1">Transfer Products To:</label>
                                    <select
                                        value={transferCategoryId}
                                        onChange={(e) => setTransferCategoryId(e.target.value)}
                                        className="w-full h-8 px-2 bg-[#050505] border border-[#27272a] text-xs text-white focus:outline-none focus:border-zinc-600"
                                    >
                                        <option value="">Select Category...</option>
                                        {categories
                                            .filter(c => c.id !== deleteConfirm.id)
                                            .map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            ) : (
                                <p className="text-xs text-zinc-500 mb-6">Are you sure you want to delete <span className="text-white font-bold">{deleteConfirm.name}</span>? This action cannot be undone.</p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setDeleteConfirm(null);
                                        setTransferCategoryId('');
                                    }}
                                    className="flex-1 py-2.5 bg-zinc-800 text-white text-[10px] font-bold font-mono uppercase hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteConfirm.productCount > 0 && !transferCategoryId}
                                    className="flex-1 py-2.5 bg-red-600 text-white text-[10px] font-bold font-mono uppercase hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
