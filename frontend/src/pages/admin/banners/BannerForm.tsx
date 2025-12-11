import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Calendar, Link as LinkIcon, ImageIcon, Loader2, AlertTriangle } from 'lucide-react';
import { useCreateBanner, useUpdateBanner, useBanner } from '@/lib/hooks/useBanners';
import { useToast } from '@/contexts/ToastContext';
import { BannerFormData } from '@/lib/api/banners';
import { uploadApi } from '@/lib/api/upload';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function BannerForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const isMobile = useIsMobile();
    const isEditMode = !!id;

    const { data: existingBanner, isLoading, isError, refetch } = useBanner(id);
    const createMutation = useCreateBanner();
    const updateMutation = useUpdateBanner();

    const [formData, setFormData] = useState<BannerFormData>({
        title: '', description: '', imageUrl: '', linkUrl: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 0, isActive: true, notifyUsers: false
    });
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isEditMode && existingBanner) {
            setFormData({
                title: existingBanner.title, description: existingBanner.description,
                imageUrl: existingBanner.imageUrl, linkUrl: existingBanner.linkUrl,
                startDate: new Date(existingBanner.startDate).toISOString().split('T')[0],
                endDate: new Date(existingBanner.endDate).toISOString().split('T')[0],
                priority: existingBanner.priority, isActive: existingBanner.isActive, notifyUsers: false
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
            showToast('Image uploaded', 'success');
        } catch (error: any) { showToast(error.message || 'Failed', 'error'); }
        finally { setIsUploading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.imageUrl) { showToast('Image required', 'error'); return; }
        try {
            const payload = { ...formData, startDate: new Date(formData.startDate).toISOString(), endDate: new Date(formData.endDate).toISOString(), priority: Number(formData.priority) };
            if (isEditMode && id) { await updateMutation.mutateAsync({ id, data: payload }); showToast('Updated', 'success'); }
            else { await createMutation.mutateAsync(payload); showToast('Created', 'success'); }
            navigate('/admin/banners');
        } catch (error: any) { showToast(error.message || 'Failed', 'error'); }
    };

    if (isEditMode && isLoading) return <div className="flex items-center justify-center h-96"><Loader2 size={32} className="text-white animate-spin" /></div>;
    if (isEditMode && isError) return <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center"><AlertTriangle size={48} className="text-red-500 mb-4" /><p className="text-red-400 mb-4">Failed to load</p><div className="flex gap-3"><button onClick={() => navigate('/admin/banners')} className="px-4 py-2 bg-zinc-800 text-white text-sm">Go Back</button><button onClick={() => refetch()} className="px-4 py-2 bg-red-500/20 text-red-400 text-sm">Retry</button></div></div>;

    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/admin/banners')} className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400"><ChevronLeft size={20} /></button>
                    <div><h1 className="text-lg text-white font-semibold">{isEditMode ? 'Edit Banner' : 'New Banner'}</h1><p className="text-[10px] text-zinc-500 font-mono">{isEditMode ? 'UPDATE' : 'CREATE'}</p></div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                        <p className="text-xs text-zinc-400 font-bold uppercase mb-3">Banner Image</p>
                        <div className="relative aspect-video bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden">
                            {formData.imageUrl ? <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" /> : <div className="text-center"><ImageIcon size={40} className="mx-auto text-zinc-600 mb-2" /><p className="text-xs text-zinc-500">Tap to upload</p></div>}
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />
                            {isUploading && <div className="absolute inset-0 bg-black/80 flex items-center justify-center"><Loader2 size={32} className="text-white animate-spin" /></div>}
                        </div>
                    </div>
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
                        <p className="text-xs text-zinc-400 font-bold uppercase">Content</p>
                        <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Title</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" /></div>
                        <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Description</label><textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white resize-none" /></div>
                        <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Link URL</label><div className="relative"><LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} /><input type="url" value={formData.linkUrl} onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })} placeholder="https://..." className="w-full h-11 pl-10 pr-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" /></div></div>
                    </div>
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
                        <p className="text-xs text-zinc-400 font-bold uppercase flex items-center gap-2"><Calendar size={14} /> Schedule</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Start</label><input type="date" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" /></div>
                            <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">End</label><input type="date" required value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" /></div>
                        </div>
                    </div>
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4">
                        <p className="text-xs text-zinc-400 font-bold uppercase">Settings</p>
                        <div><label className="text-[10px] text-zinc-500 uppercase block mb-1">Priority</label><input type="number" min="0" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })} className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" /></div>
                        <label className="flex items-center gap-3"><input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded bg-zinc-800 border-zinc-700" /><span className="text-sm text-white">Active</span></label>
                        {!isEditMode && <label className="flex items-center gap-3"><input type="checkbox" checked={formData.notifyUsers} onChange={(e) => setFormData({ ...formData, notifyUsers: e.target.checked })} className="w-5 h-5 rounded bg-zinc-800 border-zinc-700" /><span className="text-sm text-white">Notify users</span></label>}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => navigate('/admin/banners')} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-medium">Cancel</button>
                        <button type="submit" disabled={createMutation.isPending || updateMutation.isPending || isUploading} className="flex-1 py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">{(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{isEditMode ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] p-8 pb-20">
            <div className="flex items-center gap-4 mb-8"><button onClick={() => navigate('/admin/banners')} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"><ChevronLeft size={16} /></button><div><h1 className="text-xl text-white font-medium uppercase tracking-tight">{isEditMode ? 'Edit Banner' : 'New Banner'}</h1><p className="text-[10px] text-zinc-500 font-mono mt-1">{isEditMode ? 'UPDATE BANNER' : 'CREATE BANNER'}</p></div></div>
            <form onSubmit={handleSubmit} className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6"><h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><ImageIcon size={14} /> Banner Image</h2><div className="relative aspect-video bg-zinc-900 border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center overflow-hidden group">{formData.imageUrl ? <><img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><p className="text-white text-xs font-bold uppercase">Click to change</p></div></> : <div className="text-center p-6"><ImageIcon size={48} className="mx-auto text-zinc-700 mb-4" /><p className="text-sm text-zinc-400 font-medium">Click to upload</p><p className="text-xs text-zinc-600 mt-2">1920x600px</p></div>}<input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />{isUploading && <div className="absolute inset-0 bg-black/80 flex items-center justify-center"><Loader2 size={32} className="text-white animate-spin" /></div>}</div></div>
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-4"><h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Content</h2><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Title</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white" /></div><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Description</label><textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white resize-none" /></div><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Link URL</label><div className="relative"><LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} /><input type="url" value={formData.linkUrl} onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })} placeholder="https://..." className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 text-sm text-white" /></div></div></div>
                </div>
                <div className="space-y-6">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-4"><h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={14} /> Schedule</h2><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Start Date</label><input type="date" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white" /></div><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">End Date</label><input type="date" required value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white" /></div></div>
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 space-y-4"><h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Settings</h2><div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Priority</label><input type="number" min="0" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white" /></div><div className="pt-4 border-t border-[#27272a] space-y-3"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 bg-zinc-900 border border-zinc-800 rounded" /><span className="text-sm text-white">Active</span></label>{!isEditMode && <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.notifyUsers} onChange={(e) => setFormData({ ...formData, notifyUsers: e.target.checked })} className="w-4 h-4 bg-zinc-900 border border-zinc-800 rounded" /><span className="text-sm text-white">Notify users</span></label>}</div></div>
                    <div className="flex gap-3 pt-4"><button type="button" onClick={() => navigate('/admin/banners')} className="flex-1 px-4 py-3 bg-zinc-800 text-zinc-400 font-bold uppercase hover:bg-zinc-700">Cancel</button><button type="submit" disabled={createMutation.isPending || updateMutation.isPending || isUploading} className="flex-1 px-4 py-3 bg-white text-black font-bold uppercase disabled:opacity-50 flex items-center justify-center gap-2">{(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{isEditMode ? 'Update' : 'Create'}</button></div>
                </div>
            </form>
        </div>
    );
}
