import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Plus, Trash2, Loader2, AlertCircle, Star, ChevronLeft } from 'lucide-react';
import { useProduct, useCreateProduct, useUpdateProduct, useCategories } from '@/lib/hooks/useProducts';
import { ProductFormData, Variant, productApi, Category } from '@/lib/api/products';
import { uploadApi } from '@/lib/api/upload';
import { useToast } from '@/contexts/ToastContext';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

const INITIAL_DATA: ProductFormData = {
    name: '', description: '', basePrice: 0, categoryId: '', isActive: true, isFeatured: false, images: [], variants: []
};

export default function ProductForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const isMobile = useIsMobile();
    const isEditMode = !!id;

    const [formData, setFormData] = useState<ProductFormData>(INITIAL_DATA);
    const [activeTab, setActiveTab] = useState<'basic' | 'variants'>('basic');
    const [variantImageUrlInputs, setVariantImageUrlInputs] = useState<Record<number, string>>({});

    const { data: product, isLoading: isLoadingProduct } = useProduct(id as string);
    const { data: categories = [] } = useCategories();
    const createMutation = useCreateProduct();
    const updateMutation = useUpdateProduct();

    useEffect(() => {
        if (product && isEditMode) {
            const p = product as any;
            setFormData({
                name: p.name || '', description: p.description || '', basePrice: Number(p.basePrice) || 0,
                categoryId: p.categoryId || '', isActive: p.isActive ?? true, isFeatured: p.isFeatured ?? false,
                images: p.images || [],
                variants: (p.variants || []).map((v: any) => ({
                    id: v.id, sku: v.sku || '', price: Number(v.price) || 0, stock: Number(v.stock) || 0,
                    color: v.color || '', length: v.length || '', texture: v.texture || '', size: v.size || '',
                    images: v.images || [], isActive: v.isActive ?? true
                }))
            });
        } else if (!isEditMode) {
            setFormData(prev => ({
                ...prev,
                variants: [{ sku: '', price: 0, stock: 0, color: '', length: '', texture: '', size: '', images: [], isActive: true }]
            }));
        }
    }, [product, isEditMode]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value }));
    };

    const handleCheckboxChange = (name: string, checked: boolean) => setFormData(prev => ({ ...prev, [name]: checked }));

    const addVariant = () => {
        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, { sku: '', price: formData.basePrice || 0, stock: 0, length: '', color: '', texture: '', size: '', images: [], isActive: true }]
        }));
    };

    const removeVariant = (index: number) => setFormData(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));

    const updateVariant = (index: number, field: keyof Variant, value: any) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map((v, i) => {
                if (i !== index) return v;
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
        const parts = [formData.name.substring(0, 3).toUpperCase(), v.color?.substring(0, 3).toUpperCase(), v.length, v.texture?.substring(0, 3).toUpperCase()].filter(Boolean);
        updateVariant(index, 'sku', parts.join('-') + '-' + Math.floor(Math.random() * 1000));
    };

    const handleVariantImageUpload = async (variantIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        const newUrls: string[] = [];
        for (const file of Array.from(files)) {
            try {
                const response = await uploadApi.uploadImage(file, 'variant');
                newUrls.push(response.url);
            } catch (error: any) {
                if (error.response?.status === 409 && error.response?.data?.existingFile?.url) {
                    newUrls.push(error.response.data.existingFile.url);
                } else showToast(error.response?.data?.error?.message || 'Upload failed', 'error');
            }
        }
        if (newUrls.length) {
            setFormData(prev => ({ ...prev, variants: prev.variants.map((v, i) => i === variantIndex ? { ...v, images: [...(v.images || []), ...newUrls] } : v) }));
            showToast(`Added ${newUrls.length} images`, 'success');
        }
        e.target.value = '';
    };

    const addVariantImageUrl = (variantIndex: number) => {
        const url = (variantImageUrlInputs[variantIndex] || '').trim();
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) { showToast('Invalid URL', 'error'); return; }
        setFormData(prev => ({ ...prev, variants: prev.variants.map((v, i) => i === variantIndex ? { ...v, images: [...(v.images || []), url] } : v) }));
        setVariantImageUrlInputs(prev => ({ ...prev, [variantIndex]: '' }));
    };

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
    };

    const removeVariantImage = (variantIndex: number, imageIndex: number) => {
        const imageUrl = formData.variants[variantIndex]?.images?.[imageIndex];
        setFormData(prev => ({ ...prev, variants: prev.variants.map((v, i) => i === variantIndex ? { ...v, images: (v.images || []).filter((_, idx) => idx !== imageIndex) } : v) }));
        if (imageUrl?.includes('ik.imagekit.io')) productApi.deleteImage(imageUrl).catch(() => { });
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!formData.name) { showToast('Name required', 'error'); return; }
        if (!formData.categoryId) { showToast('Category required', 'error'); return; }
        if (formData.basePrice <= 0) { showToast('Price must be > 0', 'error'); return; }
        if (!formData.description || formData.description.length < 3) { showToast('Description required (min 3 characters)', 'error'); return; }
        try {
            if (isEditMode && id) { await updateMutation.mutateAsync({ id, data: formData }); showToast('Updated', 'success'); }
            else { await createMutation.mutateAsync(formData); showToast('Created', 'success'); }
            navigate('/admin/products');
        } catch (error: any) {
            // Extract detailed validation errors from backend
            const errorData = error.response?.data?.error;
            if (errorData?.fields && errorData.fields.length > 0) {
                // Show first field error
                const firstError = errorData.fields[0];
                showToast(`${firstError.field}: ${firstError.message}`, 'error');
            } else {
                showToast(errorData?.message || error.response?.data?.message || 'Failed', 'error');
            }
        }
    };

    if (isEditMode && isLoadingProduct) return <div className="flex items-center justify-center h-96"><Loader2 size={32} className="text-white animate-spin" /></div>;

    const isPending = createMutation.isPending || updateMutation.isPending;

    // ==================== MOBILE LAYOUT ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-24">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/admin/products')} className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400"><ChevronLeft size={20} /></button>
                    <div>
                        <h1 className="text-lg text-white font-semibold">{isEditMode ? 'Edit Product' : 'New Product'}</h1>
                        <p className="text-[10px] text-zinc-500 font-mono">{isEditMode ? `ID: ${id?.slice(0, 8)}...` : 'ADD TO INVENTORY'}</p>
                    </div>
                </div>

                {/* Tab Pills */}
                <div className="flex gap-2 p-1 bg-zinc-900 rounded-xl">
                    {(['basic', 'variants'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-colors ${activeTab === tab ? 'bg-white text-black' : 'text-zinc-400'}`}>
                            {tab === 'basic' ? 'Basic Info' : 'Variants'}
                        </button>
                    ))}
                </div>

                {/* Basic Info Tab */}
                {activeTab === 'basic' && (
                    <div className="space-y-4">
                        {/* Product Details Card */}
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
                            <p className="text-xs font-bold text-white uppercase">Product Details</p>
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Name *</label>
                                <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Product name..." className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-1">Category *</label>
                                    <select name="categoryId" value={formData.categoryId} onChange={handleInputChange} className="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white">
                                        <option value="">Select</option>
                                        {(categories as Category[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-1">Base Price *</label>
                                    <input type="number" name="basePrice" value={formData.basePrice || ''} onChange={handleInputChange} className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Description</label>
                                <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} placeholder="Product description..." className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white resize-none" />
                            </div>
                        </div>

                        {/* Main Variant Attributes Card */}
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
                            <p className="text-xs font-bold text-white uppercase">Attributes</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-1">Stock</label>
                                    <input type="number" value={formData.variants[0]?.stock || ''} onChange={e => updateVariant(0, 'stock', e.target.value)} className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-1">Color</label>
                                    <input type="text" value={formData.variants[0]?.color || ''} onChange={e => updateVariant(0, 'color', e.target.value)} placeholder="e.g. Black" className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-1">Length</label>
                                    <input type="text" value={formData.variants[0]?.length || ''} onChange={e => updateVariant(0, 'length', e.target.value)} placeholder="e.g. 24 in" className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-500 uppercase block mb-1">Texture</label>
                                    <input type="text" value={formData.variants[0]?.texture || ''} onChange={e => updateVariant(0, 'texture', e.target.value)} placeholder="e.g. Wave" className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Product Images Card */}
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
                            <p className="text-xs font-bold text-white uppercase">Images</p>
                            <div className="grid grid-cols-3 gap-2">
                                {(formData.variants[0]?.images || []).map((img, idx) => (
                                    <div key={idx} className="relative aspect-square bg-zinc-800 rounded-lg overflow-hidden group">
                                        <img src={img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/18181b/52525b?text=Error'; }} />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-active:opacity-100 flex items-center justify-center gap-2">
                                            <button type="button" onClick={() => removeVariantImage(0, idx)} className="p-2 bg-red-500 text-white rounded-full"><Trash2 size={14} /></button>
                                            {idx > 0 && <button type="button" onClick={() => setDefaultVariantImage(0, idx)} className="p-2 bg-yellow-500 text-white rounded-full"><Star size={14} /></button>}
                                        </div>
                                        {idx === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-bold rounded">Main</div>}
                                    </div>
                                ))}
                                <label className="aspect-square border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center cursor-pointer">
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleVariantImageUpload(0, e)} />
                                    <Upload size={20} className="text-zinc-500 mb-1" /><span className="text-[9px] text-zinc-500">Upload</span>
                                </label>
                            </div>
                        </div>

                        {/* Status Card */}
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
                            <p className="text-xs font-bold text-white uppercase">Status</p>
                            <label className="flex items-center justify-between">
                                <span className="text-sm text-zinc-300">Active</span>
                                <div className={`w-12 h-6 rounded-full relative ${formData.isActive ? 'bg-emerald-500' : 'bg-zinc-700'}`} onClick={() => handleCheckboxChange('isActive', !formData.isActive)}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isActive ? 'left-7' : 'left-1'}`} />
                                </div>
                            </label>
                            <label className="flex items-center justify-between">
                                <span className="text-sm text-zinc-300">Featured</span>
                                <div className={`w-12 h-6 rounded-full relative ${formData.isFeatured ? 'bg-amber-500' : 'bg-zinc-700'}`} onClick={() => handleCheckboxChange('isFeatured', !formData.isFeatured)}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isFeatured ? 'left-7' : 'left-1'}`} />
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Variants Tab */}
                {activeTab === 'variants' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-zinc-400">{formData.variants.length - 1} additional variant{formData.variants.length !== 2 ? 's' : ''}</p>
                            <button type="button" onClick={addVariant} className="px-4 py-2 bg-white text-black rounded-xl text-xs font-bold flex items-center gap-2"><Plus size={14} /> Add</button>
                        </div>

                        {formData.variants.length <= 1 ? (
                            <div className="p-8 bg-zinc-900 rounded-xl border border-zinc-800 text-center">
                                <p className="text-zinc-500 text-sm mb-3">No additional variants</p>
                                <button type="button" onClick={addVariant} className="text-emerald-400 text-sm font-medium">+ Add Variant</button>
                            </div>
                        ) : (
                            formData.variants.slice(1).map((variant, i) => {
                                const index = i + 1;
                                return (
                                    <div key={index} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs font-bold text-white">Variant #{index}</p>
                                            <button type="button" onClick={() => removeVariant(index)} className="p-2 text-red-400"><Trash2 size={16} /></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">SKU</label>
                                                <div className="flex gap-1">
                                                    <input type="text" value={variant.sku} onChange={e => updateVariant(index, 'sku', e.target.value)} className="flex-1 h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white" placeholder="Auto" />
                                                    <button type="button" onClick={() => generateSku(index)} className="px-2 bg-zinc-800 text-zinc-400 rounded-lg text-[9px] font-bold">Gen</button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">Price</label>
                                                <input type="number" value={variant.price || ''} onChange={e => updateVariant(index, 'price', e.target.value)} className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">Stock</label>
                                                <input type="number" value={variant.stock || ''} onChange={e => updateVariant(index, 'stock', e.target.value)} className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">Color</label>
                                                <input type="text" value={variant.color || ''} onChange={e => updateVariant(index, 'color', e.target.value)} className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">Length</label>
                                                <input type="text" value={variant.length || ''} onChange={e => updateVariant(index, 'length', e.target.value)} className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white" />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-zinc-500 uppercase block mb-1">Texture</label>
                                                <input type="text" value={variant.texture || ''} onChange={e => updateVariant(index, 'texture', e.target.value)} className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white" />
                                            </div>
                                        </div>
                                        {/* Variant Images */}
                                        <div className="grid grid-cols-4 gap-2">
                                            {(variant.images || []).map((img, imgIdx) => (
                                                <div key={imgIdx} className="relative aspect-square bg-zinc-800 rounded-lg overflow-hidden group">
                                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-active:opacity-100 flex items-center justify-center">
                                                        <button type="button" onClick={() => removeVariantImage(index, imgIdx)} className="p-1.5 bg-red-500 text-white rounded-full"><Trash2 size={12} /></button>
                                                    </div>
                                                    {imgIdx === 0 && <div className="absolute top-0.5 left-0.5 px-1 py-0.5 bg-emerald-500 text-white text-[7px] font-bold rounded">Main</div>}
                                                </div>
                                            ))}
                                            <label className="aspect-square border-2 border-dashed border-zinc-700 rounded-lg flex items-center justify-center cursor-pointer">
                                                <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleVariantImageUpload(index, e)} />
                                                <Upload size={16} className="text-zinc-500" />
                                            </label>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Fixed Bottom Action Bar */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900 border-t border-zinc-800 safe-area-pb flex gap-3">
                    <button type="button" onClick={() => navigate('/admin/products')} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-medium">Cancel</button>
                    <button onClick={() => handleSubmit()} disabled={isPending} className="flex-1 py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isEditMode ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        );
    }

    // ==================== DESKTOP LAYOUT ====================
    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between py-4 mb-6 border-b border-[#27272a]">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/products')} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full"><ArrowLeft size={20} /></button>
                    <div>
                        <h1 className="text-xl text-white font-medium uppercase tracking-tight">{isEditMode ? 'Edit Product' : 'New Product'}</h1>
                        <p className="text-[10px] text-zinc-500 font-mono mt-1">{isEditMode ? `ID: ${id}` : 'ADD NEW ITEM TO INVENTORY'}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={() => navigate('/admin/products')} className="px-6 py-2 bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 text-[10px] font-bold font-mono uppercase">Cancel</button>
                    <button onClick={() => handleSubmit()} disabled={isPending} className="px-6 py-2 bg-white text-black border border-white hover:bg-zinc-200 text-[10px] font-bold font-mono uppercase flex items-center gap-2 disabled:opacity-50">
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Product
                    </button>
                </div>
            </div>

            <div className="flex gap-1 border-b border-[#27272a]">
                {(['basic', 'variants'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-[10px] font-bold font-mono uppercase tracking-wider border-b-2 ${activeTab === tab ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                        {tab === 'basic' ? 'Basic Info' : 'Variants & Images'}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {activeTab === 'basic' && (
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-[#27272a] pb-4">Basic Information</h3>
                            <div className="grid gap-6">
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Product Name *</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white" placeholder="e.g. Luxury Body Wave Wig" />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Category *</label>
                                        <select name="categoryId" value={formData.categoryId} onChange={handleInputChange} className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white">
                                            <option value="">Select Category</option>
                                            {(categories as Category[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Base Price (GHS) *</label>
                                        <input type="number" name="basePrice" value={formData.basePrice || ''} onChange={handleInputChange} min="0" step="0.01" className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">Description</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full h-40 p-4 bg-[#050505] border border-[#27272a] text-sm text-white resize-none" placeholder="Detailed product description..." />
                                </div>
                                <div className="border-t border-[#27272a] pt-6">
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Product Attributes (Main Variant)</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                        {[{ l: 'Stock Quantity', f: 'stock', t: 'number' }, { l: 'Color', f: 'color', p: 'e.g. Natural Black' }, { l: 'Length (inches)', f: 'length', p: 'e.g. 24' }, { l: 'Texture', f: 'texture', p: 'e.g. Body Wave' }, { l: 'Size', f: 'size', p: 'e.g. Medium Cap' }].map(x => (
                                            <div key={x.f}>
                                                <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">{x.l}</label>
                                                <input type={x.t || 'text'} value={(formData.variants[0] as any)?.[x.f] || ''} onChange={e => updateVariant(0, x.f as keyof Variant, e.target.value)} className="w-full h-10 px-4 bg-[#050505] border border-[#27272a] text-sm text-white" placeholder={x.p} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-3 font-bold">Variant Images</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                        {(formData.variants[0]?.images || []).map((img, idx) => (
                                            <div key={idx} className="relative aspect-square group/img bg-zinc-900 border border-[#27272a] overflow-hidden">
                                                <img src={img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/18181b/52525b?text=Error'; }} />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-2">
                                                    <button type="button" onClick={() => removeVariantImage(0, idx)} className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-600"><Trash2 size={14} /></button>
                                                    {idx > 0 && <button type="button" onClick={() => setDefaultVariantImage(0, idx)} className="p-2 bg-yellow-500/80 text-white rounded-full hover:bg-yellow-600"><Star size={14} /></button>}
                                                </div>
                                                {idx === 0 && <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-bold uppercase rounded-sm">Main</div>}
                                            </div>
                                        ))}
                                        <label className="aspect-square border-2 border-dashed border-[#27272a] hover:border-zinc-500 flex flex-col items-center justify-center cursor-pointer bg-[#050505] group/upload">
                                            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleVariantImageUpload(0, e)} />
                                            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-2 group-hover/upload:bg-zinc-800"><Upload size={16} className="text-zinc-400 group-hover/upload:text-white" /></div>
                                            <span className="text-[9px] text-zinc-500 font-mono uppercase">Upload</span>
                                        </label>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 bg-[#050505] border border-[#27272a] p-1 pr-2">
                                        <div className="h-8 w-8 flex items-center justify-center bg-zinc-900 border-r border-[#27272a]"><Upload size={14} className="text-zinc-500" /></div>
                                        <input type="text" placeholder="Paste image URL and press Enter..." value={variantImageUrlInputs[0] || ''} onChange={e => setVariantImageUrlInputs(prev => ({ ...prev, [0]: e.target.value }))} className="flex-1 h-8 bg-transparent text-xs text-white placeholder-zinc-600 focus:outline-none font-mono" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVariantImageUrl(0); } }} />
                                        <button type="button" onClick={() => addVariantImageUrl(0)} className="px-4 py-1.5 bg-zinc-800 text-white text-[10px] uppercase font-bold hover:bg-zinc-700">Add URL</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'variants' && (
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-6">
                            <div className="flex justify-between items-center border-b border-[#27272a] pb-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Additional Variants</h3>
                                <button type="button" onClick={addVariant} className="px-3 py-1.5 bg-white text-black text-[10px] font-bold font-mono uppercase hover:bg-zinc-200 flex items-center gap-2"><Plus size={12} /> Add Variant</button>
                            </div>
                            {formData.variants.length <= 1 ? (
                                <div className="text-center py-12 border-2 border-dashed border-[#27272a]">
                                    <p className="text-zinc-500 text-xs font-mono uppercase">No additional variants added</p>
                                    <button type="button" onClick={addVariant} className="mt-4 text-emerald-500 hover:text-emerald-400 text-xs font-bold uppercase tracking-wider">+ Add Variant</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {formData.variants.map((variant, index) => {
                                        if (index === 0) return null;
                                        return (
                                            <div key={index} className="bg-[#050505] border border-[#27272a] p-4 relative group">
                                                <button onClick={() => removeVariant(index)} className="absolute top-2 right-2 p-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Variant #{index + 1}</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">SKU</label>
                                                        <div className="flex gap-2">
                                                            <input type="text" value={variant.sku} onChange={e => updateVariant(index, 'sku', e.target.value)} className="w-full h-8 px-3 bg-[#0A0A0A] border border-[#27272a] text-xs text-white" placeholder="Auto-generated" />
                                                            <button onClick={() => generateSku(index)} className="px-2 bg-zinc-800 text-zinc-400 hover:text-white text-[9px] uppercase font-bold">Gen</button>
                                                        </div>
                                                    </div>
                                                    {[{ l: 'Price', f: 'price', t: 'number' }, { l: 'Stock', f: 'stock', t: 'number' }, { l: 'Color', f: 'color' }, { l: 'Length', f: 'length' }, { l: 'Texture', f: 'texture' }, { l: 'Size', f: 'size' }].map(x => (
                                                        <div key={x.f}>
                                                            <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-1">{x.l}</label>
                                                            <input type={x.t || 'text'} value={(variant as any)[x.f] || ''} onChange={e => updateVariant(index, x.f as keyof Variant, e.target.value)} className="w-full h-8 px-3 bg-[#0A0A0A] border border-[#27272a] text-xs text-white" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] text-zinc-500 uppercase tracking-wider mb-3 font-bold">Variant Images</label>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        {(variant.images || []).map((img, imgIdx) => (
                                                            <div key={imgIdx} className="relative aspect-square group/img bg-zinc-900 border border-[#27272a] overflow-hidden">
                                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-2">
                                                                    <button type="button" onClick={() => removeVariantImage(index, imgIdx)} className="p-1.5 bg-red-500/80 text-white rounded-full hover:bg-red-600"><Trash2 size={12} /></button>
                                                                    {imgIdx > 0 && <button type="button" onClick={() => setDefaultVariantImage(index, imgIdx)} className="p-1.5 bg-yellow-500/80 text-white rounded-full hover:bg-yellow-600"><Star size={12} /></button>}
                                                                </div>
                                                                {imgIdx === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-bold uppercase rounded-sm">Main</div>}
                                                            </div>
                                                        ))}
                                                        <label className="aspect-square border-2 border-dashed border-[#27272a] hover:border-zinc-500 flex flex-col items-center justify-center cursor-pointer bg-[#050505] group/upload">
                                                            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleVariantImageUpload(index, e)} />
                                                            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center mb-1 group-hover/upload:bg-zinc-800"><Upload size={14} className="text-zinc-400 group-hover/upload:text-white" /></div>
                                                            <span className="text-[8px] text-zinc-500 font-mono uppercase">Upload</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-6 sticky top-24">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-[#27272a] pb-4">Status & Visibility</h3>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-xs text-zinc-400 group-hover:text-white">Active Status</span>
                                <div className={`w-10 h-5 rounded-full relative ${formData.isActive ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
                                    <input type="checkbox" checked={formData.isActive} onChange={e => handleCheckboxChange('isActive', e.target.checked)} className="hidden" />
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </label>
                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-xs text-zinc-400 group-hover:text-white">Featured Product</span>
                                <div className={`w-10 h-5 rounded-full relative ${formData.isFeatured ? 'bg-amber-500' : 'bg-zinc-800'}`}>
                                    <input type="checkbox" checked={formData.isFeatured} onChange={e => handleCheckboxChange('isFeatured', e.target.checked)} className="hidden" />
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
