import { useState } from 'react';
import {
    RefreshCw, ChevronLeft, ChevronRight, Star,
    Check, X, Trash2, Clock, CheckCircle, XCircle, Edit2,
    Shield, ShieldAlert, ShieldCheck,
    Square, CheckSquare, MoreVertical
} from 'lucide-react';
import { useAdminReviews, useApproveReview, useRejectReview, useDeleteReview, useUpdateReview } from '@/lib/hooks/useReviews';
import { ReviewStatus, AdminReview, reviewsApi } from '@/lib/api/reviews';
import { settingsApi } from '@/lib/api/settings';
import { useToast } from '@/contexts/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

const STATUS_TABS: { value: ReviewStatus | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

const STATUS_STYLES: Record<ReviewStatus, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', icon: <Clock size={12} /> },
    approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: <CheckCircle size={12} /> },
    rejected: { bg: 'bg-red-500/10', text: 'text-red-500', icon: <XCircle size={12} /> },
};

// ==================== MOBILE REVIEW CARD ====================
interface MobileReviewCardProps {
    review: AdminReview;
    isSelected: boolean;
    onToggleSelect: () => void;
    onApprove: () => void;
    onReject: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onUserClick: () => void;
}

function MobileReviewCard({ review, isSelected, onToggleSelect, onApprove, onReject, onEdit, onDelete, onUserClick }: MobileReviewCardProps) {
    const [showActions, setShowActions] = useState(false);
    const statusStyle = STATUS_STYLES[review.status] || STATUS_STYLES.pending;
    const userStatus = review.user?.reviewStatus || 'standard';

    const renderStars = (rating: number) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={10} className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'} />
            ))}
        </div>
    );

    return (
        <div className={`p-4 bg-zinc-900 rounded-xl border ${isSelected ? 'border-white/50' : 'border-zinc-800'}`}>
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <button onClick={onToggleSelect} className="mt-1 text-zinc-500">
                    {isSelected ? <CheckSquare size={18} className="text-white" /> : <Square size={18} />}
                </button>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{review.product?.name || 'Unknown'}</p>
                    <button onClick={onUserClick} className="flex items-center gap-1.5 mt-1">
                        {userStatus === 'trusted' && <ShieldCheck size={12} className="text-emerald-500" />}
                        {userStatus === 'blocked' && <ShieldAlert size={12} className="text-red-500" />}
                        {userStatus === 'standard' && <Shield size={12} className="text-zinc-600" />}
                        <span className="text-[11px] text-zinc-400">{review.user?.firstName || review.authorName || 'Guest'}</span>
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded flex items-center gap-1 ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.icon} {review.status}
                    </span>
                    <button onClick={() => setShowActions(true)} className="p-1 text-zinc-500">
                        <MoreVertical size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="pl-8">
                <div className="flex items-center gap-2 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-[10px] text-zinc-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-white font-medium">{review.title}</p>
                <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{review.content}</p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pl-8 mt-3">
                {review.status !== 'approved' && (
                    <button onClick={onApprove} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-bold">Approve</button>
                )}
                {review.status !== 'rejected' && (
                    <button onClick={onReject} className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-bold">Reject</button>
                )}
            </div>

            {/* Actions Bottom Sheet */}
            {showActions && (
                <>
                    <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setShowActions(false)} />
                    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-4 safe-area-pb">
                        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                        <div className="space-y-2">
                            {review.status !== 'approved' && (
                                <button onClick={() => { setShowActions(false); onApprove(); }} className="w-full p-3 bg-emerald-500/10 rounded-xl text-left text-sm text-emerald-500 flex items-center gap-3">
                                    <Check size={16} /> Approve Review
                                </button>
                            )}
                            {review.status !== 'rejected' && (
                                <button onClick={() => { setShowActions(false); onReject(); }} className="w-full p-3 bg-red-500/10 rounded-xl text-left text-sm text-red-500 flex items-center gap-3">
                                    <X size={16} /> Reject Review
                                </button>
                            )}
                            <button onClick={() => { setShowActions(false); onEdit(); }} className="w-full p-3 bg-zinc-800 rounded-xl text-left text-sm text-white flex items-center gap-3">
                                <Edit2 size={16} /> Edit Review
                            </button>
                            <button onClick={() => { setShowActions(false); onDelete(); }} className="w-full p-3 bg-zinc-800 rounded-xl text-left text-sm text-zinc-400 flex items-center gap-3">
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ==================== MAIN COMPONENT ====================
export default function ReviewList() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const isMobile = useIsMobile();

    // Filters
    const [statusFilter, setStatusFilter] = useState<ReviewStatus | ''>('');
    const [page, setPage] = useState(1);
    const limit = 20;

    // Selection
    const [selectedReviews, setSelectedReviews] = useState<string[]>([]);

    // Modals
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [editingReview, setEditingReview] = useState<AdminReview | null>(null);
    const [editForm, setEditForm] = useState({ title: '', content: '' });
    const [userActionModal, setUserActionModal] = useState<{ userId: string; userName: string; status: string } | null>(null);

    // API
    const { data, isLoading, refetch } = useAdminReviews({ page, limit, status: statusFilter || undefined });
    const { data: settings, refetch: refetchSettings } = useQuery({ queryKey: ['admin', 'settings'], queryFn: settingsApi.getSettings });

    const approveMutation = useApproveReview();
    const rejectMutation = useRejectReview();
    const deleteMutation = useDeleteReview();
    const updateMutation = useUpdateReview();

    const bulkMutation = useMutation({
        mutationFn: async ({ ids, action }: { ids: string[], action: 'approve' | 'reject' | 'delete' }) => reviewsApi.bulkUpdateReviews(ids, action),
        onSuccess: (data) => { showToast(`${data.action} ${data.count} reviews`, 'success'); setSelectedReviews([]); queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] }); },
        onError: (error: any) => { showToast(error.message || 'Failed', 'error'); }
    });

    const userStatusMutation = useMutation({
        mutationFn: async ({ userId, status }: { userId: string, status: 'standard' | 'trusted' | 'blocked' }) => reviewsApi.updateUserReviewStatus(userId, status),
        onSuccess: (data) => { showToast(data.message || 'Status updated', 'success'); queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] }); setUserActionModal(null); },
        onError: (error: any) => { showToast(error.message || 'Failed', 'error'); }
    });

    const settingsMutation = useMutation({
        mutationFn: async (enabled: boolean) => settingsApi.updateSettings({ review_auto_approve: enabled }),
        onSuccess: () => { showToast('Setting updated', 'success'); refetchSettings(); },
        onError: () => { showToast('Failed', 'error'); }
    });

    const reviews = data?.reviews || [];
    const pagination = data?.pagination || { page: 1, pages: 1, total: 0, limit: 20 };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const handleApprove = async (reviewId: string) => { try { await approveMutation.mutateAsync(reviewId); showToast('Approved', 'success'); } catch { showToast('Failed', 'error'); } };
    const handleReject = async (reviewId: string) => { try { await rejectMutation.mutateAsync(reviewId); showToast('Rejected', 'success'); } catch { showToast('Failed', 'error'); } };
    const handleDelete = async () => { if (!deleteConfirm) return; try { await deleteMutation.mutateAsync(deleteConfirm); showToast('Deleted', 'success'); setDeleteConfirm(null); } catch { showToast('Failed', 'error'); } };
    const handleEditClick = (review: AdminReview) => { setEditingReview(review); setEditForm({ title: review.title, content: review.content }); };
    const handleUpdate = async () => { if (!editingReview) return; try { await updateMutation.mutateAsync({ id: editingReview.id, data: editForm }); showToast('Updated', 'success'); setEditingReview(null); } catch { showToast('Failed', 'error'); } };

    const toggleSelectAll = () => { selectedReviews.length === reviews.length ? setSelectedReviews([]) : setSelectedReviews(reviews.map(r => r.id)); };
    const toggleSelect = (id: string) => { selectedReviews.includes(id) ? setSelectedReviews(selectedReviews.filter(r => r !== id)) : setSelectedReviews([...selectedReviews, id]); };

    const renderStars = (rating: number) => (
        <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={12} className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'} />)}</div>
    );

    const getUserStatusIcon = (status: string) => {
        if (status === 'trusted') return <ShieldCheck size={14} className="text-emerald-500" />;
        if (status === 'blocked') return <ShieldAlert size={14} className="text-red-500" />;
        return <Shield size={14} className="text-zinc-600" />;
    };

    // ==================== MOBILE LAYOUT ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                {/* Mobile Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg text-white font-semibold">Reviews</h1>
                        <p className="text-[10px] text-zinc-500 font-mono">{pagination.total} total</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Auto-Approve Toggle */}
                        <button
                            onClick={() => settingsMutation.mutate(!settings?.review_auto_approve)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-bold ${settings?.review_auto_approve ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-400'}`}
                        >
                            Auto-✓
                        </button>
                        <button onClick={() => refetch()} className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400">
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Mobile Status Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap ${statusFilter === tab.value ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div className="h-px bg-zinc-800/50 -mx-4" />

                {/* Mobile Bulk Actions */}
                {selectedReviews.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-zinc-900 border-t border-zinc-800 safe-area-pb">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-white">{selectedReviews.length} selected</span>
                            <button onClick={() => setSelectedReviews([])} className="text-xs text-zinc-400">Clear</button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => bulkMutation.mutate({ ids: selectedReviews, action: 'approve' })} className="flex-1 py-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-bold">Approve</button>
                            <button onClick={() => bulkMutation.mutate({ ids: selectedReviews, action: 'reject' })} className="flex-1 py-2.5 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold">Reject</button>
                            <button onClick={() => bulkMutation.mutate({ ids: selectedReviews, action: 'delete' })} className="flex-1 py-2.5 bg-zinc-800 text-zinc-400 rounded-xl text-xs font-bold">Delete</button>
                        </div>
                    </div>
                )}

                {/* Review Cards */}
                <div className={`space-y-3 ${selectedReviews.length > 0 ? 'pb-28' : ''}`}>
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <div key={i} className="h-32 bg-zinc-900 rounded-xl animate-pulse" />)
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-12">
                            <Star size={40} className="mx-auto text-zinc-700 mb-4" />
                            <p className="text-zinc-500 text-sm">No reviews</p>
                        </div>
                    ) : (
                        reviews.map((review) => (
                            <MobileReviewCard
                                key={review.id}
                                review={review}
                                isSelected={selectedReviews.includes(review.id)}
                                onToggleSelect={() => toggleSelect(review.id)}
                                onApprove={() => handleApprove(review.id)}
                                onReject={() => handleReject(review.id)}
                                onEdit={() => handleEditClick(review)}
                                onDelete={() => setDeleteConfirm(review.id)}
                                onUserClick={() => review.user && setUserActionModal({ userId: review.user.id, userName: `${review.user.firstName} ${review.user.lastName}`, status: review.user.reviewStatus || 'standard' })}
                            />
                        ))
                    )}
                </div>

                {/* Mobile Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl disabled:opacity-50"><ChevronLeft size={20} /></button>
                        <span className="text-sm text-zinc-400">{page} / {pagination.pages}</span>
                        <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl disabled:opacity-50"><ChevronRight size={20} /></button>
                    </div>
                )}

                {/* Mobile Modals */}
                {deleteConfirm && (
                    <>
                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setDeleteConfirm(null)} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-5 safe-area-pb">
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                            <h3 className="text-base font-semibold text-white mb-2">Delete Review</h3>
                            <p className="text-sm text-zinc-400 mb-4">This cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl">Cancel</button>
                                <button onClick={handleDelete} disabled={deleteMutation.isPending} className="flex-1 py-3 bg-red-600 text-white rounded-xl">{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</button>
                            </div>
                        </div>
                    </>
                )}

                {editingReview && (
                    <>
                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setEditingReview(null)} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-5 safe-area-pb">
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                            <h3 className="text-base font-semibold text-white mb-4">Edit Review</h3>
                            <div className="space-y-3">
                                <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" className="w-full h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white" />
                                <textarea value={editForm.content} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })} placeholder="Content" rows={4} className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white resize-none" />
                            </div>
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setEditingReview(null)} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl">Cancel</button>
                                <button onClick={handleUpdate} disabled={updateMutation.isPending} className="flex-1 py-3 bg-white text-black rounded-xl">{updateMutation.isPending ? 'Saving...' : 'Save'}</button>
                            </div>
                        </div>
                    </>
                )}

                {userActionModal && (
                    <>
                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setUserActionModal(null)} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-5 safe-area-pb">
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                            <h3 className="text-base font-semibold text-white mb-1">User Status</h3>
                            <p className="text-xs text-zinc-500 mb-4">{userActionModal.userName}</p>
                            <div className="space-y-2">
                                {['trusted', 'standard', 'blocked'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => userStatusMutation.mutate({ userId: userActionModal.userId, status: status as any })}
                                        className={`w-full p-3 rounded-xl flex items-center gap-3 ${userActionModal.status === status ? 'bg-zinc-800 border border-zinc-600' : 'bg-zinc-800/50'}`}
                                    >
                                        {status === 'trusted' && <ShieldCheck size={18} className="text-emerald-500" />}
                                        {status === 'standard' && <Shield size={18} className="text-zinc-400" />}
                                        {status === 'blocked' && <ShieldAlert size={18} className="text-red-500" />}
                                        <div className="flex-1 text-left">
                                            <p className="text-sm text-white capitalize">{status}</p>
                                            <p className="text-[10px] text-zinc-500">
                                                {status === 'trusted' && 'Auto-approved reviews'}
                                                {status === 'standard' && 'Reviews need approval'}
                                                {status === 'blocked' && 'Cannot submit reviews'}
                                            </p>
                                        </div>
                                        {userActionModal.status === status && <Check size={16} className="text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ==================== DESKTOP LAYOUT ====================
    return (
        <div className="min-h-screen bg-[#050505] p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Reviews</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">{pagination.total} TOTAL REVIEWS</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-[#0A0A0A] border border-[#27272a] px-4 py-2 rounded-sm">
                        <span className="text-xs text-zinc-400 font-bold uppercase">Auto-Approve</span>
                        <button onClick={() => settingsMutation.mutate(!settings?.review_auto_approve)} className={`w-8 h-4 rounded-full relative transition-colors ${settings?.review_auto_approve ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                            <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${settings?.review_auto_approve ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    <button onClick={() => refetch()} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors">
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 mb-6">
                {STATUS_TABS.map((tab) => (
                    <button key={tab.value} onClick={() => { setStatusFilter(tab.value); setPage(1); }} className={`px-4 py-2 text-[10px] font-bold uppercase transition-colors ${statusFilter === tab.value ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Bulk Actions */}
            {selectedReviews.length > 0 && (
                <div className="mb-4 p-2 bg-zinc-900/50 border border-zinc-800 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <span className="text-xs text-white font-mono px-2">{selectedReviews.length} selected</span>
                    <div className="flex gap-2">
                        <button onClick={() => bulkMutation.mutate({ ids: selectedReviews, action: 'approve' })} disabled={bulkMutation.isPending} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase hover:bg-emerald-500/20">Approve Selected</button>
                        <button onClick={() => bulkMutation.mutate({ ids: selectedReviews, action: 'reject' })} disabled={bulkMutation.isPending} className="px-3 py-1.5 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase hover:bg-red-500/20">Reject Selected</button>
                        <button onClick={() => bulkMutation.mutate({ ids: selectedReviews, action: 'delete' })} disabled={bulkMutation.isPending} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase hover:text-white">Delete Selected</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-[#0A0A0A] border border-[#27272a] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#27272a]">
                                <th className="px-4 py-3 w-10"><button onClick={toggleSelectAll} className="text-zinc-500 hover:text-white">{selectedReviews.length === reviews.length && reviews.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}</button></th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Product</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Rating</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Review</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-right text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => <tr key={i} className="border-b border-[#27272a]"><td colSpan={8} className="px-4 py-4"><div className="h-4 bg-zinc-800 rounded animate-pulse" /></td></tr>)
                            ) : reviews.length === 0 ? (
                                <tr><td colSpan={8} className="px-4 py-12 text-center text-zinc-500 text-sm">No reviews found</td></tr>
                            ) : (
                                reviews.map((review) => {
                                    const statusStyle = STATUS_STYLES[review.status] || STATUS_STYLES.pending;
                                    const isSelected = selectedReviews.includes(review.id);
                                    const userStatus = review.user?.reviewStatus || 'standard';
                                    return (
                                        <tr key={review.id} className={`border-b border-[#27272a] transition-colors ${isSelected ? 'bg-zinc-900/80' : 'hover:bg-zinc-900/50'}`}>
                                            <td className="px-4 py-4"><button onClick={() => toggleSelect(review.id)} className={`text-zinc-500 hover:text-white ${isSelected ? 'text-white' : ''}`}>{isSelected ? <CheckSquare size={16} /> : <Square size={16} />}</button></td>
                                            <td className="px-4 py-4"><span className="text-sm text-white">{review.product?.name || 'Unknown'}</span></td>
                                            <td className="px-4 py-4">
                                                {review.user ? (
                                                    <button onClick={() => setUserActionModal({ userId: review.user.id, userName: `${review.user.firstName} ${review.user.lastName}`, status: userStatus })} className="flex items-center gap-2 group hover:bg-zinc-800 px-2 py-1 rounded transition-colors">
                                                        {getUserStatusIcon(userStatus)}
                                                        <div className="text-left">
                                                            <p className="text-sm text-white group-hover:underline decoration-zinc-500 underline-offset-2">{review.user.firstName} {review.user.lastName}</p>
                                                            <p className="text-[10px] text-zinc-500 font-mono">ID: {review.user.id.slice(0, 8)}...</p>
                                                        </div>
                                                    </button>
                                                ) : (
                                                    <div><span className="text-sm text-white">{review.authorName || 'Unknown'}</span><span className="text-[10px] text-zinc-500 font-mono italic block">Guest / Deleted</span></div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">{renderStars(review.rating)}</td>
                                            <td className="px-4 py-4 max-w-xs"><p className="text-sm text-white font-medium truncate">{review.title}</p><p className="text-xs text-zinc-500 line-clamp-2">{review.content}</p></td>
                                            <td className="px-4 py-4"><span className={`inline-flex items-center gap-1 px-2 py-1 ${statusStyle.bg} ${statusStyle.text} text-[10px] font-bold uppercase`}>{statusStyle.icon}{review.status}</span></td>
                                            <td className="px-4 py-4 text-xs text-zinc-400 font-mono">{formatDate(review.createdAt)}</td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {review.status !== 'approved' && <button onClick={() => handleApprove(review.id)} disabled={approveMutation.isPending} className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Approve"><Check size={14} /></button>}
                                                    {review.status !== 'rejected' && <button onClick={() => handleReject(review.id)} disabled={rejectMutation.isPending} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Reject"><X size={14} /></button>}
                                                    <button onClick={() => handleEditClick(review)} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white" title="Edit"><Edit2 size={14} /></button>
                                                    <button onClick={() => setDeleteConfirm(review.id)} className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-red-400" title="Delete"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[#27272a]">
                        <span className="text-xs text-zinc-500 font-mono">Page {pagination.page} of {pagination.pages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50"><ChevronLeft size={14} /></button>
                            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="p-2 bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop Modals */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full">
                        <h2 className="text-lg text-white font-bold mb-4">Delete Review</h2>
                        <p className="text-sm text-zinc-400 mb-6">Are you sure? This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-zinc-800 text-white text-sm font-bold uppercase hover:bg-zinc-700">Cancel</button>
                            <button onClick={handleDelete} disabled={deleteMutation.isPending} className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-bold uppercase hover:bg-red-600 disabled:opacity-50">{deleteMutation.isPending ? 'Deleting...' : 'Delete'}</button>
                        </div>
                    </div>
                </div>
            )}

            {editingReview && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white">Edit Review</h2>
                            <button onClick={() => setEditingReview(null)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Title</label><input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white" /></div>
                        <div className="space-y-1"><label className="text-[10px] text-zinc-500 uppercase font-bold">Content</label><textarea value={editForm.content} onChange={(e) => setEditForm({ ...editForm, content: e.target.value })} rows={4} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white resize-none" /></div>
                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setEditingReview(null)} className="flex-1 px-4 py-2 bg-zinc-800 text-white text-sm font-bold uppercase hover:bg-zinc-700">Cancel</button>
                            <button onClick={handleUpdate} disabled={updateMutation.isPending} className="flex-1 px-4 py-2 bg-white text-black text-sm font-bold uppercase hover:bg-zinc-200 disabled:opacity-50">{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                    </div>
                </div>
            )}

            {userActionModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-sm w-full">
                        <div className="flex justify-between items-center mb-6">
                            <div><h2 className="text-lg text-white font-bold">User Status</h2><p className="text-xs text-zinc-500 font-mono mt-1">{userActionModal.userName}</p></div>
                            <button onClick={() => setUserActionModal(null)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="space-y-2">
                            <button onClick={() => userStatusMutation.mutate({ userId: userActionModal.userId, status: 'trusted' })} className={`w-full flex items-center gap-3 px-4 py-3 border transition-colors ${userActionModal.status === 'trusted' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'}`}>
                                <ShieldCheck size={18} /><div className="text-left"><p className="text-sm font-bold uppercase">Trusted User</p><p className="text-[10px] opacity-70">Reviews auto-approved</p></div>{userActionModal.status === 'trusted' && <Check size={16} className="ml-auto" />}
                            </button>
                            <button onClick={() => userStatusMutation.mutate({ userId: userActionModal.userId, status: 'standard' })} className={`w-full flex items-center gap-3 px-4 py-3 border transition-colors ${userActionModal.status === 'standard' ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'}`}>
                                <Shield size={18} /><div className="text-left"><p className="text-sm font-bold uppercase">Standard User</p><p className="text-[10px] opacity-70">Reviews require approval</p></div>{userActionModal.status === 'standard' && <Check size={16} className="ml-auto" />}
                            </button>
                            <button onClick={() => userStatusMutation.mutate({ userId: userActionModal.userId, status: 'blocked' })} className={`w-full flex items-center gap-3 px-4 py-3 border transition-colors ${userActionModal.status === 'blocked' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'}`}>
                                <ShieldAlert size={18} /><div className="text-left"><p className="text-sm font-bold uppercase">Blocked User</p><p className="text-[10px] opacity-70">Cannot submit reviews</p></div>{userActionModal.status === 'blocked' && <Check size={16} className="ml-auto" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
