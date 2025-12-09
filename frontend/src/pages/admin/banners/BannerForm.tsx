import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Calendar, Link as LinkIcon, ImageIcon, Loader2, AlertTriangle } from 'lucide-react';
import { useCreateBanner, useUpdateBanner, useBanner } from '@/lib/hooks/useBanners';
import { useToast } from '@/contexts/ToastContext';
import { BannerFormData } from '@/lib/api/banners';
import { uploadApi } from '@/lib/api/upload';

export default function BannerForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const isEditMode = !!id;

    // Fetch existing banner if editing
    const { data: existingBanner, isLoading, isError, refetch } = useBanner(id);

    const createMutation = useCreateBanner();
    const updateMutation = useUpdateBanner();

    const [formData, setFormData] = useState<BannerFormData>({
        title: '',
        description: '',
        imageUrl: '',
        linkUrl: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 0,
        isActive: true,
        notifyUsers: false
    });

    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isEditMode && existingBanner) {
            setFormData({
                title: existingBanner.title,
                description: existingBanner.description,
                imageUrl: existingBanner.imageUrl,
                linkUrl: existingBanner.linkUrl,
                startDate: new Date(existingBanner.startDate).toISOString().split('T')[0],
                endDate: new Date(existingBanner.endDate).toISOString().split('T')[0],
                priority: existingBanner.priority,
                isActive: existingBanner.isActive,
                notifyUsers: false
            });
        }
    }, [isEditMode, existingBanner]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const response = await uploadApi.uploadImage(file, 'banner');
            setFormData(prev => ({ ...prev, imageUrl: response.url }));
            showToast('Image uploaded successfully', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to upload image', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.imageUrl) {
            showToast('Banner image is required', 'error');
            return;
        }

        try {
            const dataToSubmit = {
                ...formData,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: new Date(formData.endDate).toISOString(),
                priority: Number(formData.priority)
            };

            if (isEditMode && id) {
                await updateMutation.mutateAsync({ id, data: dataToSubmit });
                showToast('Banner updated successfully', 'success');
            } else {
                await createMutation.mutateAsync(dataToSubmit);
                showToast('Banner created successfully', 'success');
            }
            navigate('/admin/banners');
        } catch (error: any) {
            showToast(error.message || 'Failed to save banner', 'error');
        }
    };

    if (isEditMode && isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 size={32} className="text-white animate-spin" />
            </div>
        );
    }

    if (isEditMode && isError) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <p className="text-red-400 font-medium mb-4">Failed to load banner</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/admin/banners')}
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
        <div className="min-h-screen bg-[#050505] p-8 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/admin/banners')}
                    className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">
                        {isEditMode ? 'Edit Banner' : 'New Banner'}
                    </h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                        {isEditMode ? 'UPDATE BANNER DETAILS' : 'CREATE HOMEPAGE BANNER'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Image */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6">
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ImageIcon size={14} /> Banner Image
                        </h2>

                        <div className="relative aspect-video bg-zinc-900 border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center overflow-hidden group">
                            {formData.imageUrl ? (
                                <>
                                    <img
                                        src={formData.imageUrl}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <p className="text-white text-xs font-bold uppercase">Click to change</p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-6">
                                    <ImageIcon size={48} className="mx-auto text-zinc-700 mb-4" />
                                    <p className="text-sm text-zinc-400 font-medium">Click to upload banner image</p>
                                    <p className="text-xs text-zinc-600 mt-2">Recommended size: 1920x600px</p>
                                </div>
                            )}

                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isUploading}
                            />

                            {isUploading && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                    <Loader2 size={32} className="text-white animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Content</h2>

                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Title</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Summer Sale"
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Subtitle / Description</label>
                            <textarea
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="e.g. Up to 50% off on all wigs"
                                rows={3}
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600 resize-none"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Link URL</label>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                <input
                                    type="url"
                                    value={formData.linkUrl}
                                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-zinc-600"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Settings */}
                <div className="space-y-6">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Calendar size={14} /> Schedule
                        </h2>

                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Start Date</label>
                            <input
                                type="date"
                                required
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">End Date</label>
                            <input
                                type="date"
                                required
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                        </div>
                    </div>

                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Settings</h2>

                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Priority (Higher shows first)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                        </div>

                        <div className="pt-4 border-t border-[#27272a] space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 bg-zinc-900 border border-zinc-800 rounded focus:ring-0 text-white"
                                />
                                <span className="text-sm text-white">Active</span>
                            </label>

                            {!isEditMode && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.notifyUsers}
                                        onChange={(e) => setFormData({ ...formData, notifyUsers: e.target.checked })}
                                        className="w-4 h-4 bg-zinc-900 border border-zinc-800 rounded focus:ring-0 text-white"
                                    />
                                    <span className="text-sm text-white">Notify users about this banner</span>
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/banners')}
                            className="flex-1 px-4 py-3 bg-zinc-800 text-zinc-400 font-bold uppercase hover:bg-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending || isUploading}
                            className="flex-1 px-4 py-3 bg-white text-black font-bold uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {createMutation.isPending || updateMutation.isPending ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            {isEditMode ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
