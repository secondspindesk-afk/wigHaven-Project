import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Plus, Trash2, Loader2, AlertCircle, Star } from 'lucide-react';
import { useProduct, useCreateProduct, useUpdateProduct, useCategories } from '@/lib/hooks/useProducts';
import { ProductFormData, Variant, productApi, Category } from '@/lib/api/products';
import { uploadApi } from '@/lib/api/upload';
import { useToast } from '@/contexts/ToastContext';

const INITIAL_DATA: ProductFormData = {
    name: '',
    description: '',
    basePrice: 0,
    categoryId: '',
    isActive: true,
    isFeatured: false,
    images: [],
    variants: []
};

export default function ProductForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const isEditMode = !!id;

    // State
    const [formData, setFormData] = useState<ProductFormData>(INITIAL_DATA);
    const [activeTab, setActiveTab] = useState<'basic' | 'variants'>('basic');
    const [variantImageUrlInputs, setVariantImageUrlInputs] = useState<Record<number, string>>({});
    // API Hooks
    const { data: product, isLoading: isLoadingProduct } = useProduct(id as string);
    const { data: categories = [] } = useCategories();
    const createMutation = useCreateProduct();
    const updateMutation = useUpdateProduct();

    // Load data in edit mode
    useEffect(() => {
        if (product && isEditMode) {
            // Handle both snake_case and camelCase from API
            const p = product as any;
            setFormData({
                name: p.name || '',
                description: p.description || '',
                basePrice: Number(p.basePrice) || 0,
                categoryId: p.categoryId || '',
                isActive: p.isActive ?? true,
                isFeatured: p.isFeatured ?? false,
                images: p.images || [],
                variants: (p.variants || []).map((v: any) => ({
                    id: v.id,
                    sku: v.sku || '',
                    price: Number(v.price) || 0,
                    stock: Number(v.stock) || 0,
                    color: v.color || '',
                    length: v.length || '',
                    texture: v.texture || '',
                    size: v.size || '',
                    images: v.images || [],
                    isActive: v.isActive ?? true
                }))
            });
        } else if (!isEditMode) {
            // Initialize with one default variant for new products
            setFormData(prev => ({
                ...prev,
                variants: [{
                    sku: '',
                    price: 0,
                    stock: 0,
                    color: '',
                    length: '',
                    texture: '',
                    size: '',
                    images: [],
                    isActive: true
                }]
            }));
        }
    }, [product, isEditMode]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
        }));
    };

    const handleCheckboxChange = (name: string, checked: boolean) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    // --- Variants ---
    const addVariant = () => {
        const newVariant: Variant = {
            sku: '',
            price: formData.basePrice || 0,
            stock: 0,
            length: '',
            color: '',
            texture: '',
            size: '',
            images: [],
            isActive: true
        };
        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, newVariant]
        }));
    };

    const removeVariant = (index: number) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.filter((_, i) => i !== index)
        }));
    };

    const updateVariant = (index: number, field: keyof Variant, value: any) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map((v, i) => {
                if (i !== index) return v;
                // Ensure numeric fields don't become NaN
                if (field === 'price' || field === 'stock') {
                    const numValue = value === '' ? 0 : (typeof value === 'number' ? value : parseFloat(value));
                    return { ...v, [field]: isNaN(numValue) ? 0 : numValue };
                }
                return { ...v, [field]: value };
            })
        }));
    };

    const generateSku = (index: number) => {
        const v = formData.variants[index];
        // Simple SKU generation logic: PROD-COLOR-LENGTH-TEXTURE
        const parts = [
            formData.name.substring(0, 3).toUpperCase(),
            v.color?.substring(0, 3).toUpperCase(),
            v.length,
            v.texture?.substring(0, 3).toUpperCase()
        ].filter(Boolean);

        const sku = parts.join('-') + '-' + Math.floor(Math.random() * 1000);
        updateVariant(index, 'sku', sku);
    };

    // --- Variant Images ---
    const handleVariantImageUpload = async (variantIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newUrls: string[] = [];

        for (const file of Array.from(files)) {
            try {
                const response = await uploadApi.uploadImage(file, 'variant');
                newUrls.push(response.url);
            } catch (error: any) {
                // Handle 409 duplicate - seamlessly use existing URL
                if (error.response?.status === 409 && error.response?.data?.existingFile?.url) {
                    newUrls.push(error.response.data.existingFile.url);
                } else {
                    console.error('Variant image upload failed:', error);
                    showToast(error.response?.data?.error?.message || 'Failed to upload variant image', 'error');
                }
            }
        }

        if (newUrls.length > 0) {
            setFormData(prev => ({
                ...prev,
                variants: prev.variants.map((v, i) =>
                    i === variantIndex ? { ...v, images: [...(v.images || []), ...newUrls] } : v
                )
            }));
            showToast(`Added ${newUrls.length} variant images`, 'success');
        }

        // Reset input
        e.target.value = '';
    };

    // Add variant image via URL
    const addVariantImageUrl = (variantIndex: number) => {
        const url = (variantImageUrlInputs[variantIndex] || '').trim();
        if (!url) return;

        // Basic URL validation
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            showToast('Please enter a valid URL', 'error');
            return;
        }

        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map((v, i) =>
                i === variantIndex ? { ...v, images: [...(v.images || []), url] } : v
            )
        }));
        setVariantImageUrlInputs(prev => ({ ...prev, [variantIndex]: '' }));
        showToast('Image URL added to variant', 'success');
    };

    // Set variant image as default (move to first position)
    const setDefaultVariantImage = (variantIndex: number, imageIndex: number) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map((v, i) => {
                if (i !== variantIndex) return v;
                const images = [...(v.images || [])];
                const [selected] = images.splice(imageIndex, 1);
                images.unshift(selected);
                return { ...v, images };
            })
        }));
        showToast('Default image set', 'success');
    };

    // Remove variant image
    const removeVariantImage = async (variantIndex: number, imageIndex: number) => {
        const variant = formData.variants[variantIndex];
        const imageUrl = variant.images?.[imageIndex];

        // Remove from state
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map((v, i) =>
                i === variantIndex ? { ...v, images: (v.images || []).filter((_, idx) => idx !== imageIndex) } : v
            )
        }));

        // Delete from ImageKit only if it's an ImageKit URL (not external URLs like unsplash)
        if (imageUrl && imageUrl.includes('ik.imagekit.io')) {
            productApi.deleteImage(imageUrl).catch(err => {
                console.warn('Failed to delete from ImageKit:', err);
            });
        }
    };

    // --- Submit ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.name) {
            showToast('Product name is required', 'error');
            return;
        }
        if (!formData.categoryId) {
            showToast('Category is required', 'error');
            return;
        }
        if (formData.basePrice <= 0) {
            showToast('Base price must be greater than 0', 'error');
            return;
        }

        try {
            if (isEditMode && id) {
                await updateMutation.mutateAsync({ id, data: formData });
                showToast('Product updated successfully', 'success');
            } else {
                await createMutation.mutateAsync(formData);
                showToast('Product created successfully', 'success');
            }
            navigate('/admin/products');
        } catch (error: any) {
            console.error('Submit failed:', error);
            showToast(error.response?.data?.message || 'Failed to save product', 'error');
        }
    };

    if (isEditMode && isLoadingProduct) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 size={32} className="text-white animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between py-4 mb-6 border-b border-[#27272a]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/products')}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl text-white font-medium uppercase tracking-tight">
                            {isEditMode ? 'Edit Product' : 'New Product'}
                        </h1>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1">
                            {isEditMode ? `ID: ${id}` : 'ADD NEW ITEM TO INVENTORY'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/products')}
                        className="px-6 py-2 bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 text-[10px] font-bold font-mono uppercase transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="px-6 py-2 bg-white text-black border border-white hover:bg-zinc-200 text-[10px] font-bold font-mono uppercase transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {createMutation.isPending || updateMutation.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Save size={14} strokeWidth={2} />
                        )}
                        Save Product
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-[#27272a]">
                {(['basic', 'variants'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 text-[10px] font-bold font-mono uppercase tracking-wider border-b-2 transition-colors ${activeTab === tab
                            ? 'border-white text-white'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        {tab === 'basic' ? 'Basic Info' : 'Variants & Images'}
                    </button>
                ))}
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Basic Info Tab */}
                    <div className={activeTab === 'basic' ? 'block space-y-8' : 'hidden'}>
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-[#27272a] pb-4">Basic Information</h3>

                            <div className="grid gap-6">
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Product Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                                        placeholder="e.g. Luxury Body Wave Wig"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Category *</label>
                                        <select
                                            name="categoryId"
                                            value={formData.categoryId}
                                            onChange={handleInputChange}
                                            className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors appearance-none"
                                        >
                                            <option value="">Select Category</option>
                                            {(categories as Category[]).map((cat: Category) => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Base Price (GHS) *</label>
                                        <input
                                            type="number"
                                            name="basePrice"
                                            value={formData.basePrice || ''}
                                            onChange={handleInputChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="w-full h-40 p-4 bg-[#050505] border border-[#27272a] text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
                                        placeholder="Detailed product description..."
                                    />
                                </div>

                                {/* Main Variant Attributes */}
                                <div className="border-t border-[#27272a] pt-6">
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Product Attributes (Main Variant)</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Stock Quantity</label>
                                            <input
                                                type="number"
                                                value={formData.variants[0]?.stock || ''}
                                                onChange={(e) => updateVariant(0, 'stock', e.target.value)}
                                                className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Color</label>
                                            <input
                                                type="text"
                                                value={formData.variants[0]?.color || ''}
                                                onChange={(e) => updateVariant(0, 'color', e.target.value)}
                                                className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                                                placeholder="e.g. Natural Black"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Length (inches)</label>
                                            <input
                                                type="text"
                                                value={formData.variants[0]?.length || ''}
                                                onChange={(e) => updateVariant(0, 'length', e.target.value)}
                                                className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                                                placeholder="e.g. 24"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Texture</label>
                                            <input
                                                type="text"
                                                value={formData.variants[0]?.texture || ''}
                                                onChange={(e) => updateVariant(0, 'texture', e.target.value)}
                                                className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                                                placeholder="e.g. Body Wave"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Size</label>
                                            <input
                                                type="text"
                                                value={formData.variants[0]?.size || ''}
                                                onChange={(e) => updateVariant(0, 'size', e.target.value)}
                                                className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
                                                placeholder="e.g. Medium Cap"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Main Variant Images */}
                                <div className="mt-6">
                                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-3 font-bold">Variant Images</label>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                        {(formData.variants[0]?.images || []).map((img, imgIndex) => (
                                            <div key={imgIndex} className="relative aspect-square group/img bg-zinc-900 border border-[#27272a] overflow-hidden">
                                                <img
                                                    src={img}
                                                    alt=""
                                                    className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/18181b/52525b?text=Broken+Image';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeVariantImage(0, imgIndex)}
                                                        className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors"
                                                        title="Remove Image"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                    {imgIndex > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDefaultVariantImage(0, imgIndex)}
                                                            className="p-2 bg-yellow-500/80 text-white rounded-full hover:bg-yellow-600 transition-colors"
                                                            title="Set as Main"
                                                        >
                                                            <Star size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                {imgIndex === 0 && (
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider rounded-sm shadow-sm">
                                                        Main
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        <label className="aspect-square border-2 border-dashed border-[#27272a] hover:border-zinc-500 transition-colors flex flex-col items-center justify-center cursor-pointer bg-[#050505] group/upload">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => handleVariantImageUpload(0, e)}
                                            />
                                            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-2 group-hover/upload:bg-zinc-800 transition-colors">
                                                <Upload size={16} className="text-zinc-400 group-hover/upload:text-white" />
                                            </div>
                                            <span className="text-[9px] text-zinc-500 font-mono uppercase group-hover/upload:text-zinc-400">Upload</span>
                                        </label>
                                    </div>

                                    {/* URL Input */}
                                    <div className="mt-4 flex items-center gap-2 bg-[#050505] border border-[#27272a] p-1 pr-2">
                                        <div className="h-8 w-8 flex items-center justify-center bg-zinc-900 border-r border-[#27272a]">
                                            <Upload size={14} className="text-zinc-500" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Paste image URL and press Enter..."
                                            value={variantImageUrlInputs[0] || ''}
                                            onChange={(e) => setVariantImageUrlInputs(prev => ({ ...prev, [0]: e.target.value }))}
                                            className="flex-1 h-8 bg-transparent text-xs text-white placeholder-zinc-600 focus:outline-none font-mono"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addVariantImageUrl(0);
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => addVariantImageUrl(0)}
                                            className="px-4 py-1.5 bg-zinc-800 text-white text-[10px] uppercase font-bold hover:bg-zinc-700 transition-colors"
                                        >
                                            Add URL
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Variants Tab */}
                    <div className={activeTab === 'variants' ? 'block space-y-8' : 'hidden'}>
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-6">
                            <div className="flex justify-between items-center border-b border-[#27272a] pb-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Additional Variants</h3>
                                <button
                                    type="button"
                                    onClick={addVariant}
                                    className="px-3 py-1.5 bg-white text-black text-[10px] font-bold font-mono uppercase hover:bg-zinc-200 transition-colors flex items-center gap-2"
                                >
                                    <Plus size={12} strokeWidth={2} />
                                    Add Variant
                                </button>
                            </div>

                            {formData.variants.length <= 1 ? (
                                <div className="text-center py-12 border-2 border-dashed border-[#27272a]">
                                    <p className="text-zinc-500 text-xs font-mono uppercase">No additional variants added</p>
                                    <button
                                        type="button"
                                        onClick={addVariant}
                                        className="mt-4 text-emerald-500 hover:text-emerald-400 text-xs font-bold uppercase tracking-wider"
                                    >
                                        + Add Variant
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {formData.variants.map((variant, index) => {
                                        if (index === 0) return null; // Skip main variant
                                        return (
                                            <div key={index} className="bg-[#050505] border border-[#27272a] p-4 relative group">
                                                <button
                                                    onClick={() => removeVariant(index)}
                                                    className="absolute top-2 right-2 p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>

                                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Variant #{index + 1}</h4>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">SKU</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={variant.sku}
                                                                onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                                                                className="w-full h-8 px-3 bg-[#0A0A0A] border border-[#27272a] text-xs text-white focus:outline-none focus:border-zinc-600"
                                                                placeholder="Auto-generated"
                                                            />
                                                            <button
                                                                onClick={() => generateSku(index)}
                                                                className="px-2 bg-zinc-800 text-zinc-400 hover:text-white text-[9px] uppercase font-bold"
                                                                title="Generate SKU"
                                                            >
                                                                Gen
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Price</label>
                                                        <input
                                                            type="number"
                                                            value={variant.price || ''}
                                                            onChange={(e) => updateVariant(index, 'price', e.target.value)}
                                                            className="w-full h-8 px-3 bg-[#0A0A0A] border border-[#27272a] text-xs text-white focus:outline-none focus:border-zinc-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Stock</label>
                                                        <input
                                                            type="number"
                                                            value={variant.stock || ''}
                                                            onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                                                            className="w-full h-8 px-3 bg-[#0A0A0A] border border-[#27272a] text-xs text-white focus:outline-none focus:border-zinc-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Color</label>
                                                        <input
                                                            type="text"
                                                            value={variant.color || ''}
                                                            onChange={(e) => updateVariant(index, 'color', e.target.value)}
                                                            className="w-full h-8 px-3 bg-[#0A0A0A] border border-[#27272a] text-xs text-white focus:outline-none focus:border-zinc-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Length</label>
                                                        <input
                                                            type="text"
                                                            value={variant.length || ''}
                                                            onChange={(e) => updateVariant(index, 'length', e.target.value)}
                                                            className="w-full h-8 px-3 bg-[#0A0A0A] border border-[#27272a] text-xs text-white focus:outline-none focus:border-zinc-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Texture</label>
                                                        <input
                                                            type="text"
                                                            value={variant.texture || ''}
                                                            onChange={(e) => updateVariant(index, 'texture', e.target.value)}
                                                            className="w-full h-8 px-3 bg-[#0A0A0A] border border-[#27272a] text-xs text-white focus:outline-none focus:border-zinc-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Size</label>
                                                        <input
                                                            type="text"
                                                            value={variant.size || ''}
                                                            onChange={(e) => updateVariant(index, 'size', e.target.value)}
                                                            className="w-full h-8 px-3 bg-[#0A0A0A] border border-[#27272a] text-xs text-white focus:outline-none focus:border-zinc-600"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Variant Images */}
                                                <div>
                                                    <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-3 font-bold">Variant Images</label>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        {(variant.images || []).map((img, imgIndex) => (
                                                            <div key={imgIndex} className="relative aspect-square group/img bg-zinc-900 border border-[#27272a] overflow-hidden">
                                                                <img
                                                                    src={img}
                                                                    alt=""
                                                                    className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/18181b/52525b?text=Broken+Image';
                                                                    }}
                                                                />
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeVariantImage(index, imgIndex)}
                                                                        className="p-1.5 bg-red-500/80 text-white rounded-full hover:bg-red-600 transition-colors"
                                                                        title="Remove Image"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                    {imgIndex > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setDefaultVariantImage(index, imgIndex)}
                                                                            className="p-1.5 bg-yellow-500/80 text-white rounded-full hover:bg-yellow-600 transition-colors"
                                                                            title="Set as Main"
                                                                        >
                                                                            <Star size={12} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {imgIndex === 0 && (
                                                                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-bold uppercase tracking-wider rounded-sm shadow-sm">
                                                                        Main
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}

                                                        <label className="aspect-square border-2 border-dashed border-[#27272a] hover:border-zinc-500 transition-colors flex flex-col items-center justify-center cursor-pointer bg-[#050505] group/upload">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                multiple
                                                                className="hidden"
                                                                onChange={(e) => handleVariantImageUpload(index, e)}
                                                            />
                                                            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center mb-1 group-hover/upload:bg-zinc-800 transition-colors">
                                                                <Upload size={14} className="text-zinc-400 group-hover/upload:text-white" />
                                                            </div>
                                                            <span className="text-[8px] text-zinc-500 font-mono uppercase group-hover/upload:text-zinc-400">Upload</span>
                                                        </label>
                                                    </div>

                                                    {/* URL Input */}
                                                    <div className="mt-3 flex items-center gap-2 bg-[#050505] border border-[#27272a] p-1 pr-2">
                                                        <div className="h-7 w-7 flex items-center justify-center bg-zinc-900 border-r border-[#27272a]">
                                                            <Upload size={12} className="text-zinc-500" />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Paste image URL..."
                                                            value={variantImageUrlInputs[index] || ''}
                                                            onChange={(e) => setVariantImageUrlInputs(prev => ({ ...prev, [index]: e.target.value }))}
                                                            className="flex-1 h-7 bg-transparent text-[10px] text-white placeholder-zinc-600 focus:outline-none font-mono"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    addVariantImageUrl(index);
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => addVariantImageUrl(index)}
                                                            className="px-3 py-1 bg-zinc-800 text-white text-[9px] uppercase font-bold hover:bg-zinc-700 transition-colors"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                {/* Right Column - Sidebar (Status & Visibility) */}
                <div className="space-y-6">

                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-6 sticky top-24">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-[#27272a] pb-4">Status & Visibility</h3>

                        <div className="space-y-4">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">Active Status</span>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.isActive ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => handleCheckboxChange('isActive', e.target.checked)}
                                        className="hidden"
                                    />
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </label>

                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">Featured Product</span>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.isFeatured ? 'bg-amber-500' : 'bg-zinc-800'}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isFeatured}
                                        onChange={(e) => handleCheckboxChange('isFeatured', e.target.checked)}
                                        className="hidden"
                                    />
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${formData.isFeatured ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </label>
                        </div>

                        <div className="pt-4 border-t border-[#27272a]">
                            <div className="flex items-start gap-3 p-3 bg-zinc-900/50 border border-zinc-800">
                                <AlertCircle size={16} className="text-zinc-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Quick Tips</p>
                                    <ul className="text-[10px] text-zinc-500 space-y-1 list-disc list-inside">
                                        <li>Use high-quality images (min 1000px)</li>
                                        <li>Set a competitive base price</li>
                                        <li>Add multiple variants for options</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

