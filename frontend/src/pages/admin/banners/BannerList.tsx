import { Link } from 'react-router-dom';
import { Plus, Trash2, Edit2, ImageIcon, Calendar, Link as LinkIcon, AlertTriangle, MoreVertical } from 'lucide-react';
import { useBanners, useDeleteBanner } from '@/lib/hooks/useBanners';
import { useToast } from '@/contexts/ToastContext';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useState } from 'react';

export default function BannerList() {
    const { showToast, showConfirm } = useToast();
    const isMobile = useIsMobile();
    const [actionBannerId, setActionBannerId] = useState<string | null>(null);

    const { data: banners, isLoading, isError, refetch } = useBanners();
    const deleteMutation = useDeleteBanner();

    const handleDelete = (bannerId: string, title: string) => {
        showConfirm({
            title: 'Delete Banner',
            message: `Delete banner "${title}"?`,
            confirmText: 'DELETE',
            onConfirm: async () => {
                try {
                    await deleteMutation.mutateAsync(bannerId);
                    showToast('Banner deleted', 'success');
                } catch (error: any) {
                    showToast(error.message || 'Failed', 'error');
                }
            }
        });
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isExpired = (dateString: string) => new Date(dateString) < new Date();

    // ==================== MOBILE LAYOUT ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                {/* Mobile Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg text-white font-semibold">Banners</h1>
                        <p className="text-[10px] text-zinc-500 font-mono">{banners?.length || 0} total</p>
                    </div>
                    <Link to="/admin/banners/new" className="px-4 py-2.5 bg-white text-black rounded-xl text-xs font-bold flex items-center gap-2">
                        <Plus size={16} /> Add
                    </Link>
                </div>

                {isError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                        <AlertTriangle size={24} className="mx-auto text-red-500 mb-2" />
                        <p className="text-sm text-red-400">Failed to load banners</p>
                        <button onClick={() => refetch()} className="mt-2 text-xs text-red-400 underline">Retry</button>
                    </div>
                )}

                {/* Banner Cards */}
                <div className="space-y-3">
                    {isLoading ? (
                        [...Array(2)].map((_, i) => <div key={i} className="h-40 bg-zinc-900 rounded-xl animate-pulse" />)
                    ) : banners?.length === 0 ? (
                        <div className="text-center py-12">
                            <ImageIcon size={40} className="mx-auto text-zinc-700 mb-4" />
                            <p className="text-zinc-500 text-sm">No banners</p>
                        </div>
                    ) : (
                        banners?.map((banner) => (
                            <div key={banner.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                                {/* Image */}
                                <div className="h-32 bg-zinc-800 relative">
                                    {banner.imageUrl ? (
                                        <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><ImageIcon size={32} className="text-zinc-600" /></div>
                                    )}
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] text-white font-bold">P{banner.priority}</div>
                                    <div className="absolute top-2 right-2">
                                        <button onClick={() => setActionBannerId(banner.id)} className="p-1.5 bg-black/60 backdrop-blur rounded text-white">
                                            <MoreVertical size={16} />
                                        </button>
                                    </div>
                                </div>
                                {/* Info */}
                                <div className="p-3">
                                    <h3 className="text-sm text-white font-medium mb-1">{banner.title}</h3>
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                        <Calendar size={10} />
                                        <span>{formatDate(banner.startDate)} - {formatDate(banner.endDate)}</span>
                                        <span className={`ml-auto px-1.5 py-0.5 rounded font-bold ${banner.isActive && !isExpired(banner.endDate) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {banner.isActive && !isExpired(banner.endDate) ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions Bottom Sheet */}
                                {actionBannerId === banner.id && (
                                    <>
                                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setActionBannerId(null)} />
                                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-4 safe-area-pb">
                                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                                            <div className="space-y-2">
                                                <Link to={`/admin/banners/${banner.id}`} onClick={() => setActionBannerId(null)} className="w-full p-3 bg-zinc-800 rounded-xl text-left text-sm text-white flex items-center gap-3">
                                                    <Edit2 size={16} /> Edit Banner
                                                </Link>
                                                <button onClick={() => { setActionBannerId(null); handleDelete(banner.id, banner.title); }} className="w-full p-3 bg-red-500/10 rounded-xl text-left text-sm text-red-500 flex items-center gap-3">
                                                    <Trash2 size={16} /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // ==================== DESKTOP LAYOUT ====================
    return (
        <div className="min-h-screen bg-[#050505] p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Banners</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">MANAGE HOMEPAGE BANNERS</p>
                </div>
                <Link to="/admin/banners/new" className="px-4 py-2 bg-white text-black text-xs font-bold uppercase hover:bg-zinc-200 transition-colors flex items-center gap-2">
                    <Plus size={14} /> Create Banner
                </Link>
            </div>

            {isError && (
                <div className="flex flex-col items-center justify-center py-12 border border-red-500/30 bg-red-500/5 mb-6">
                    <AlertTriangle size={48} className="text-red-500 mb-4" />
                    <p className="text-red-400 font-medium">Failed to load banners</p>
                    <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30">Try Again</button>
                </div>
            )}

            {!isError && (
                <div className="grid grid-cols-1 gap-6">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <div key={i} className="h-48 bg-[#0A0A0A] border border-[#27272a] animate-pulse" />)
                    ) : banners?.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500 text-sm border border-[#27272a] bg-[#0A0A0A]">No banners found</div>
                    ) : (
                        banners?.map((banner) => (
                            <div key={banner.id} className="bg-[#0A0A0A] border border-[#27272a] overflow-hidden group">
                                <div className="flex flex-col md:flex-row h-full">
                                    <div className="w-full md:w-64 h-48 bg-zinc-900 relative">
                                        {banner.imageUrl ? <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600"><ImageIcon size={32} /></div>}
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur text-[10px] text-white font-bold uppercase">Priority: {banner.priority}</div>
                                    </div>
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-lg text-white font-bold">{banner.title}</h3>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link to={`/admin/banners/${banner.id}`} className="p-2 text-zinc-400 hover:text-white"><Edit2 size={14} /></Link>
                                                    <button onClick={() => handleDelete(banner.id, banner.title)} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{banner.description}</p>
                                            <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                                                <div className="flex items-center gap-2"><Calendar size={12} /><span>{formatDate(banner.startDate)} - {formatDate(banner.endDate)}</span></div>
                                                {banner.linkUrl && <div className="flex items-center gap-2"><LinkIcon size={12} /><a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white truncate max-w-[200px]">{banner.linkUrl}</a></div>}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${banner.isActive && !isExpired(banner.endDate) ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            <span className="text-xs font-medium text-zinc-300">{banner.isActive && !isExpired(banner.endDate) ? 'Active' : 'Inactive'}</span>
                                            {isExpired(banner.endDate) && <span className="text-[10px] text-red-500 font-bold uppercase ml-2 bg-red-500/10 px-2 py-0.5">Expired</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
