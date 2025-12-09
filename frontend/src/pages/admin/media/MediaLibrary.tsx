import { useState } from 'react';
import { Search, Trash2, Upload, Copy, Check, Image as ImageIcon, Loader2, AlertTriangle } from 'lucide-react';
import { useMedia, useDeleteMedia, useBatchDeleteMedia } from '@/lib/hooks/useMedia';
import { uploadApi } from '@/lib/api/upload';
import { useToast } from '@/contexts/ToastContext';
import { useDebounce } from '@/lib/hooks/useDebounce';

// Type badge colors
const typeBadgeColors: Record<string, string> = {
    variant: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    category: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    banner: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    review: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export default function MediaLibrary() {
    const { showToast, showConfirm } = useToast();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Debounce search to prevent excessive API calls
    const debouncedSearch = useDebounce(search, 300);

    // API - use debouncedSearch and include isError
    const { data, isLoading, isError, refetch } = useMedia({
        search: debouncedSearch || undefined,
        folder: filter !== 'all' ? filter : undefined,
        limit: 50
    });

    const deleteMutation = useDeleteMedia();
    const batchDeleteMutation = useBatchDeleteMedia();


    const files = data?.files || [];

    // Handlers
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        let successCount = 0;
        let failCount = 0;

        for (const file of Array.from(files)) {
            try {
                // Determine type based on current filter or default to 'product'
                const type = (filter !== 'all' ? filter : 'product') as 'product' | 'category' | 'variant' | 'review' | 'banner';
                await uploadApi.uploadImage(file, type);
                successCount++;
            } catch (error) {
                failCount++;
            }
        }

        setIsUploading(false);
        refetch();

        if (successCount > 0) showToast(`Uploaded ${successCount} files successfully`, 'success');
        if (failCount > 0) showToast(`Failed to upload ${failCount} files`, 'error');

        // Reset input
        e.target.value = '';
    };

    const handleDelete = (id: string) => {
        showConfirm({
            title: 'Delete File',
            message: 'Are you sure you want to delete this file?',
            confirmText: 'DELETE',
            onConfirm: async () => {
                try {
                    await deleteMutation.mutateAsync(id);
                    showToast('File deleted successfully', 'success');
                    setSelectedIds(prev => prev.filter(i => i !== id));
                } catch (error: any) {
                    showToast(error.message || 'Failed to delete file', 'error');
                }
            }
        });
    };

    const handleBatchDelete = () => {
        showConfirm({
            title: 'Bulk Delete',
            message: `Are you sure you want to delete ${selectedIds.length} files?`,
            confirmText: 'DELETE ALL',
            onConfirm: async () => {
                try {
                    await batchDeleteMutation.mutateAsync(selectedIds);
                    showToast('Files deleted successfully', 'success');
                    setSelectedIds([]);
                } catch (error: any) {
                    showToast(error.message || 'Failed to delete files', 'error');
                }
            }
        });
    };


    const handleCopyUrl = (url: string, id: string) => {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        showToast('URL copied to clipboard', 'success');
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="min-h-screen bg-[#050505] p-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Media Library</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                        MANAGE ASSETS & IMAGES
                    </p>
                </div>
                <div className="flex gap-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBatchDelete}
                            className="px-4 py-2 bg-red-500/10 text-red-500 text-xs font-bold uppercase hover:bg-red-500/20 transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={14} />
                            Delete ({selectedIds.length})
                        </button>
                    )}

                    <label className={`px-4 py-2 bg-white text-black text-xs font-bold uppercase hover:bg-zinc-200 transition-colors flex items-center gap-2 cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        Upload Files
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleUpload}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#27272a] text-white text-sm focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    {['all', 'variant', 'banner', 'review', 'category'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-2 text-[10px] font-bold uppercase whitespace-nowrap border transition-colors ${filter === f
                                ? 'bg-zinc-800 text-white border-zinc-700'
                                : 'bg-[#0A0A0A] text-zinc-500 border-[#27272a] hover:border-zinc-600'
                                }`}
                        >
                            {f === 'all' ? 'All Files' : `${f}s`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {isError ? (
                <div className="flex flex-col items-center justify-center py-20 border border-red-500/30 bg-red-500/5">
                    <AlertTriangle size={48} className="text-red-500 mb-4" />
                    <p className="text-red-400 font-medium">Failed to load media</p>
                    <p className="text-xs text-zinc-600 mt-1">Please try refreshing the page</p>
                </div>
            ) : isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="aspect-square bg-[#0A0A0A] border border-[#27272a] animate-pulse" />
                    ))}
                </div>
            ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-[#27272a] bg-[#0A0A0A] border-dashed">
                    <ImageIcon size={48} className="text-zinc-800 mb-4" />
                    <p className="text-zinc-500 font-medium">No files found</p>
                    <p className="text-xs text-zinc-600 mt-1">Upload images to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className={`group relative aspect-square bg-[#0A0A0A] border transition-colors ${selectedIds.includes(file.id) ? 'border-emerald-500' : 'border-[#27272a] hover:border-zinc-500'
                                }`}
                        >
                            {/* Type Badge */}
                            <div className="absolute top-2 left-2 z-10">
                                <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase border rounded ${typeBadgeColors[file.type] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}>
                                    {file.type}
                                </span>
                            </div>

                            {/* Image */}
                            <img
                                src={file.thumbnailUrl || file.url}
                                alt={file.fileName}
                                className="w-full h-full object-cover"
                                onClick={() => toggleSelect(file.id)}
                            />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 pointer-events-none">
                                <div className="flex justify-between items-start pointer-events-auto">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(file.id)}
                                        onChange={() => toggleSelect(file.id)}
                                        className="w-4 h-4 bg-black border border-zinc-500 rounded checked:bg-emerald-500 checked:border-emerald-500 focus:ring-0 cursor-pointer"
                                    />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                                        className="text-zinc-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="pointer-events-auto">
                                    <p className="text-[10px] text-white truncate mb-1">{file.entityName || file.fileName}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] text-zinc-400 font-mono truncate max-w-[80px]">{file.fileName}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleCopyUrl(file.url, file.id); }}
                                            className="text-zinc-400 hover:text-white transition-colors"
                                            title="Copy URL"
                                        >
                                            {copiedId === file.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
