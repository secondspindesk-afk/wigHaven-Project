import { useState } from 'react';
import { Search, Trash2, Upload, Copy, Check, Image as ImageIcon, Loader2, AlertTriangle } from 'lucide-react';
import { useMedia, useDeleteMedia, useBatchDeleteMedia } from '@/lib/hooks/useMedia';
import { uploadApi } from '@/lib/api/upload';
import { useToast } from '@/contexts/ToastContext';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

const typeBadgeColors: Record<string, string> = {
    variant: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    category: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    banner: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    review: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export default function MediaLibrary() {
    const { showToast, showConfirm } = useToast();
    const isMobile = useIsMobile();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const debouncedSearch = useDebounce(search, 300);
    const { data, isLoading, isError, refetch } = useMedia({ search: debouncedSearch || undefined, folder: filter !== 'all' ? filter : undefined, limit: 50 });
    const deleteMutation = useDeleteMedia();
    const batchDeleteMutation = useBatchDeleteMedia();
    const files = data?.files || [];

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsUploading(true);
        let successCount = 0, failCount = 0;
        for (const file of Array.from(files)) {
            try { const type = (filter !== 'all' ? filter : 'product') as 'product' | 'category' | 'variant' | 'review' | 'banner'; await uploadApi.uploadImage(file, type); successCount++; } catch { failCount++; }
        }
        setIsUploading(false); refetch(); e.target.value = '';
        if (successCount > 0) showToast(`Uploaded ${successCount} files`, 'success');
        if (failCount > 0) showToast(`Failed ${failCount} files`, 'error');
    };

    const handleDelete = (id: string) => { showConfirm({ title: 'Delete File', message: 'Delete this file?', confirmText: 'DELETE', onConfirm: async () => { try { await deleteMutation.mutateAsync(id); showToast('Deleted', 'success'); setSelectedIds(p => p.filter(i => i !== id)); } catch (e: any) { showToast(e.message || 'Failed', 'error'); } } }); };
    const handleBatchDelete = () => { showConfirm({ title: 'Bulk Delete', message: `Delete ${selectedIds.length} files?`, confirmText: 'DELETE ALL', onConfirm: async () => { try { await batchDeleteMutation.mutateAsync(selectedIds); showToast('Deleted', 'success'); setSelectedIds([]); } catch (e: any) { showToast(e.message || 'Failed', 'error'); } } }); };
    const handleCopyUrl = (url: string, id: string) => { navigator.clipboard.writeText(url); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); showToast('Copied', 'success'); };
    const toggleSelect = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

    // ==================== MOBILE ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-24">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><ImageIcon size={18} className="text-white" /><h1 className="text-lg text-white font-semibold">Media</h1></div>
                    <div className="flex gap-2">
                        {selectedIds.length > 0 && <button onClick={handleBatchDelete} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl"><Trash2 size={16} /></button>}
                        <label className={`p-2.5 bg-white text-black rounded-xl ${isUploading ? 'opacity-50' : ''}`}>{isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}<input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" /></label>
                    </div>
                </div>

                {/* Search */}
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} /><input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-zinc-900/50 border border-zinc-800/50 text-white text-sm rounded-xl" /></div>

                {/* Filter Pills */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                    {['all', 'variant', 'banner', 'review', 'category'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap rounded-xl ${filter === f ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                    ))}
                </div>

                {/* Divider */}
                <div className="h-px bg-zinc-800/50 -mx-4" />

                {/* Selection Bar */}
                {selectedIds.length > 0 && <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-xl"><span className="text-xs text-white font-medium">{selectedIds.length} selected</span><button onClick={() => setSelectedIds([])} className="text-xs text-zinc-400">Clear</button></div>}

                {/* Grid */}
                {isError ? (
                    <div className="flex flex-col items-center justify-center py-16"><AlertTriangle size={40} className="text-red-500 mb-3" /><p className="text-red-400 text-sm">Failed to load</p></div>
                ) : isLoading ? (
                    <div className="grid grid-cols-3 gap-2">{[...Array(9)].map((_, i) => <div key={i} className="aspect-square bg-zinc-800 rounded-xl animate-pulse" />)}</div>
                ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16"><ImageIcon size={40} className="text-zinc-700 mb-3" /><p className="text-zinc-500 text-sm">No files</p></div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {files.map((file) => (
                            <div key={file.id} onClick={() => toggleSelect(file.id)} className={`relative aspect-square rounded-xl overflow-hidden border-2 ${selectedIds.includes(file.id) ? 'border-emerald-500' : 'border-transparent'}`}>
                                <img src={file.thumbnailUrl || file.url} alt={file.fileName} className="w-full h-full object-cover" />
                                <div className="absolute top-1.5 left-1.5"><span className={`px-1.5 py-0.5 text-[7px] font-bold uppercase border rounded ${typeBadgeColors[file.type] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}>{file.type}</span></div>
                                {selectedIds.includes(file.id) && <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={12} className="text-white" /></div>}
                                <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                                    <div className="flex justify-between items-center">
                                        <button onClick={(e) => { e.stopPropagation(); handleCopyUrl(file.url, file.id); }} className="p-1.5 text-white/70">{copiedId === file.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} className="p-1.5 text-white/70"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ==================== DESKTOP ====================
    return (
        <div className="min-h-screen bg-[#050505] p-8 pb-20">
            <div className="flex items-center justify-between mb-8">
                <div><h1 className="text-xl text-white font-medium uppercase tracking-tight">Media Library</h1><p className="text-[10px] text-zinc-500 font-mono mt-1">MANAGE ASSETS & IMAGES</p></div>
                <div className="flex gap-3">
                    {selectedIds.length > 0 && <button onClick={handleBatchDelete} className="px-4 py-2 bg-red-500/10 text-red-500 text-xs font-bold uppercase flex items-center gap-2"><Trash2 size={14} />Delete ({selectedIds.length})</button>}
                    <label className={`px-4 py-2 bg-white text-black text-xs font-bold uppercase flex items-center gap-2 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>{isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}Upload<input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" /></label>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} /><input type="text" placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#27272a] text-white text-sm" /></div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">{['all', 'variant', 'banner', 'review', 'category'].map((f) => (<button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 text-[10px] font-bold uppercase whitespace-nowrap border ${filter === f ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-[#0A0A0A] text-zinc-500 border-[#27272a]'}`}>{f === 'all' ? 'All Files' : `${f}s`}</button>))}</div>
            </div>

            {isError ? (
                <div className="flex flex-col items-center justify-center py-20 border border-red-500/30 bg-red-500/5"><AlertTriangle size={48} className="text-red-500 mb-4" /><p className="text-red-400 font-medium">Failed to load media</p></div>
            ) : isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">{[...Array(12)].map((_, i) => <div key={i} className="aspect-square bg-[#0A0A0A] border border-[#27272a] animate-pulse" />)}</div>
            ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-[#27272a] bg-[#0A0A0A] border-dashed"><ImageIcon size={48} className="text-zinc-800 mb-4" /><p className="text-zinc-500 font-medium">No files found</p></div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {files.map((file) => (
                        <div key={file.id} className={`group relative aspect-square bg-[#0A0A0A] border ${selectedIds.includes(file.id) ? 'border-emerald-500' : 'border-[#27272a] hover:border-zinc-500'}`}>
                            <div className="absolute top-2 left-2 z-10"><span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase border rounded ${typeBadgeColors[file.type] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}>{file.type}</span></div>
                            <img src={file.thumbnailUrl || file.url} alt={file.fileName} className="w-full h-full object-cover" onClick={() => toggleSelect(file.id)} />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 pointer-events-none">
                                <div className="flex justify-between items-start pointer-events-auto">
                                    <input type="checkbox" checked={selectedIds.includes(file.id)} onChange={() => toggleSelect(file.id)} className="w-4 h-4 bg-black border border-zinc-500 rounded checked:bg-emerald-500" />
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} className="text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button>
                                </div>
                                <div className="pointer-events-auto">
                                    <p className="text-[10px] text-white truncate mb-1">{file.entityName || file.fileName}</p>
                                    <div className="flex justify-between items-center"><span className="text-[9px] text-zinc-400 font-mono truncate max-w-[80px]">{file.fileName}</span><button onClick={(e) => { e.stopPropagation(); handleCopyUrl(file.url, file.id); }} className="text-zinc-400 hover:text-white">{copiedId === file.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}</button></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
