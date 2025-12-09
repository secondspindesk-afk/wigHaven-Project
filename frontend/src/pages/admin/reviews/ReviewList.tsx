import { useState } from 'react';
import {
    RefreshCw, ChevronLeft, ChevronRight, Star,
    Check, X, Trash2, Clock, CheckCircle, XCircle, Edit2,
    Shield, ShieldAlert, ShieldCheck,
    Square, CheckSquare
} from 'lucide-react';
import { useAdminReviews, useApproveReview, useRejectReview, useDeleteReview, useUpdateReview } from '@/lib/hooks/useReviews';
import { ReviewStatus, AdminReview, reviewsApi } from '@/lib/api/reviews';
import { settingsApi } from '@/lib/api/settings';
import { useToast } from '@/contexts/ToastContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

export default function ReviewList() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // Filters
    const [statusFilter, setStatusFilter] = useState<ReviewStatus | ''>('');
    const [page, setPage] = useState(1);
    const limit = 20;

    // Selection
    const [selectedReviews, setSelectedReviews] = useState<string[]>([]);

    // Modal
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [editingReview, setEditingReview] = useState<AdminReview | null>(null);
    const [editForm, setEditForm] = useState({ title: '', content: '' });
    const [userActionModal, setUserActionModal] = useState<{ userId: string; userName: string; status: string } | null>(null);

    // API
    const { data, isLoading, refetch } = useAdminReviews({
        page,
        limit,
        status: statusFilter || undefined,
    });

    // Settings Query
    const { data: settings, refetch: refetchSettings } = useQuery({
        queryKey: ['admin', 'settings'],
        queryFn: settingsApi.getSettings
    });

    const approveMutation = useApproveReview();
    const rejectMutation = useRejectReview();
    const deleteMutation = useDeleteReview();
    const updateMutation = useUpdateReview();

    // Bulk Actions Mutation
    const bulkMutation = useMutation({
        mutationFn: async ({ ids, action }: { ids: string[], action: 'approve' | 'reject' | 'delete' }) => {
            return reviewsApi.bulkUpdateReviews(ids, action);
        },
        onSuccess: (data) => {
            showToast(`Successfully ${data.action} ${data.count} reviews`, 'success');
            setSelectedReviews([]);
            queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
        },
        onError: (error: any) => {
            showToast(error.message || 'Bulk action failed', 'error');
        }
    });

    // User Status Mutation
    const userStatusMutation = useMutation({
        mutationFn: async ({ userId, status }: { userId: string, status: 'standard' | 'trusted' | 'blocked' }) => {
            return reviewsApi.updateUserReviewStatus(userId, status);
        },
        onSuccess: (data) => {
            showToast(data.message || 'User status updated', 'success');
            queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
            setUserActionModal(null);
        },
        onError: (error: any) => {
            showToast(error.message || 'Failed to update user status', 'error');
        }
    });

    // Auto-Approve Toggle Mutation
    const settingsMutation = useMutation({
        mutationFn: async (enabled: boolean) => {
            return settingsApi.updateSettings({ review_auto_approve: enabled });
        },
        onSuccess: () => {
            showToast('Auto-approve setting updated', 'success');
            refetchSettings();
        },
        onError: () => {
            showToast('Failed to update setting', 'error');
        }
    });

    const reviews = data?.reviews || [];
    const pagination = data?.pagination || { page: 1, pages: 1, total: 0, limit: 20 };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleApprove = async (reviewId: string) => {
        try {
            await approveMutation.mutateAsync(reviewId);
            showToast('Review approved', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to approve review', 'error');
        }
    };

    const handleReject = async (reviewId: string) => {
        try {
            await rejectMutation.mutateAsync(reviewId);
            showToast('Review rejected', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to reject review', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await deleteMutation.mutateAsync(deleteConfirm);
            showToast('Review deleted', 'success');
            setDeleteConfirm(null);
        } catch (error: any) {
            showToast(error.message || 'Failed to delete review', 'error');
        }
    };

    const handleEditClick = (review: AdminReview) => {
        setEditingReview(review);
        setEditForm({ title: review.title, content: review.content });
    };

    const handleUpdate = async () => {
        if (!editingReview) return;
        try {
            await updateMutation.mutateAsync({
                id: editingReview.id,
                data: editForm
            });
            showToast('Review updated successfully', 'success');
            setEditingReview(null);
        } catch (error: any) {
            showToast(error.message || 'Failed to update review', 'error');
        }
    };

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedReviews.length === reviews.length) {
            setSelectedReviews([]);
        } else {
            setSelectedReviews(reviews.map(r => r.id));
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedReviews.includes(id)) {
            setSelectedReviews(selectedReviews.filter(r => r !== id));
        } else {
            setSelectedReviews([...selectedReviews, id]);
        }
    };

    // Render star rating
    const renderStars = (rating: number) => {
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        size={12}
                        className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}
                    />
                ))}
            </div>
        );
    };

    const getUserStatusIcon = (status: string) => {
        switch (status) {
            case 'trusted': return <ShieldCheck size={14} className="text-emerald-500" />;
            case 'blocked': return <ShieldAlert size={14} className="text-red-500" />;
            default: return <Shield size={14} className="text-zinc-600" />;
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Reviews</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                        {pagination.total} TOTAL REVIEWS
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Auto-Approve Toggle */}
                    <div className="flex items-center gap-3 bg-[#0A0A0A] border border-[#27272a] px-4 py-2 rounded-sm">
                        <span className="text-xs text-zinc-400 font-bold uppercase">Auto-Approve</span>
                        <button
                            onClick={() => settingsMutation.mutate(!settings?.review_auto_approve)}
                            className={`w-8 h-4 rounded-full relative transition-colors ${settings?.review_auto_approve ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${settings?.review_auto_approve ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <button
                        onClick={() => refetch()}
                        className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 mb-6">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                        className={`px-4 py-2 text-[10px] font-bold uppercase transition-colors ${statusFilter === tab.value
                            ? 'bg-white text-black'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Bulk Actions Bar */}
            {selectedReviews.length > 0 && (
                <div className="mb-4 p-2 bg-zinc-900/50 border border-zinc-800 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <span className="text-xs text-white font-mono px-2">
                        {selectedReviews.length} selected
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => bulkMutation.mutate({ ids: selectedReviews, action: 'approve' })}
                            disabled={bulkMutation.isPending}
                            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase hover:bg-emerald-500/20 transition-colors"
                        >
                            Approve Selected
                        </button>
                        <button
                            onClick={() => bulkMutation.mutate({ ids: selectedReviews, action: 'reject' })}
                            disabled={bulkMutation.isPending}
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase hover:bg-red-500/20 transition-colors"
                        >
                            Reject Selected
                        </button>
                        <button
                            onClick={() => bulkMutation.mutate({ ids: selectedReviews, action: 'delete' })}
                            disabled={bulkMutation.isPending}
                            className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase hover:text-white transition-colors"
                        >
                            Delete Selected
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-[#0A0A0A] border border-[#27272a] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#27272a]">
                                <th className="px-4 py-3 w-10">
                                    <button onClick={toggleSelectAll} className="text-zinc-500 hover:text-white">
                                        {selectedReviews.length === reviews.length && reviews.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>
                                </th>
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
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="border-b border-[#27272a]">
                                        <td colSpan={8} className="px-4 py-4">
                                            <div className="h-4 bg-zinc-800 rounded animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : reviews.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-zinc-500 text-sm">
                                        No reviews found
                                    </td>
                                </tr>
                            ) : (
                                reviews.map((review) => {
                                    const statusStyle = STATUS_STYLES[review.status] || { bg: 'bg-zinc-800', text: 'text-zinc-400', icon: <Clock size={12} /> };
                                    const isSelected = selectedReviews.includes(review.id);
                                    const userStatus = review.user?.reviewStatus || 'standard';

                                    return (
                                        <tr
                                            key={review.id}
                                            className={`border-b border-[#27272a] transition-colors ${isSelected ? 'bg-zinc-900/80' : 'hover:bg-zinc-900/50'}`}
                                        >
                                            <td className="px-4 py-4">
                                                <button onClick={() => toggleSelect(review.id)} className={`text-zinc-500 hover:text-white ${isSelected ? 'text-white' : ''}`}>
                                                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm text-white">
                                                    {review.product?.name || 'Unknown Product'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {review.user ? (
                                                    <button
                                                        onClick={() => setUserActionModal({
                                                            userId: review.user.id,
                                                            userName: `${review.user.firstName} ${review.user.lastName}`,
                                                            status: userStatus
                                                        })}
                                                        className="flex items-center gap-2 group hover:bg-zinc-800 px-2 py-1 rounded transition-colors"
                                                    >
                                                        {getUserStatusIcon(userStatus)}
                                                        <div className="text-left">
                                                            <p className="text-sm text-white group-hover:underline decoration-zinc-500 underline-offset-2">
                                                                {review.user.firstName} {review.user.lastName}
                                                            </p>
                                                            <p className="text-[10px] text-zinc-500 font-mono">
                                                                ID: {review.user.id.slice(0, 8)}...
                                                            </p>
                                                        </div>
                                                    </button>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-white">
                                                            {review.authorName || 'Unknown User'}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-500 font-mono italic">
                                                            Guest / Deleted
                                                        </span>
                                                    </div>
                                                )
                                                }
                                            </td>
                                            <td className="px-4 py-4">
                                                {renderStars(review.rating)}
                                            </td>
                                            <td className="px-4 py-4 max-w-xs">
                                                <p className="text-sm text-white font-medium truncate">
                                                    {review.title}
                                                </p>
                                                <p className="text-xs text-zinc-500 line-clamp-2">
                                                    {review.content}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 ${statusStyle.bg} ${statusStyle.text} text-[10px] font-bold uppercase`}>
                                                    {statusStyle.icon}
                                                    {review.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-xs text-zinc-400 font-mono">
                                                {formatDate(review.createdAt)}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* ALWAYS show Approve/Reject buttons to allow revoking/changing */}
                                                    {review.status !== 'approved' && (
                                                        <button
                                                            onClick={() => handleApprove(review.id)}
                                                            disabled={approveMutation.isPending}
                                                            className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                                            title="Approve"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                    )}

                                                    {review.status !== 'rejected' && (
                                                        <button
                                                            onClick={() => handleReject(review.id)}
                                                            disabled={rejectMutation.isPending}
                                                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                            title="Reject"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleEditClick(review)}
                                                        className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(review.id)}
                                                        className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {
                    pagination.pages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-[#27272a]">
                            <span className="text-xs text-zinc-500 font-mono">
                                Page {pagination.page} of {pagination.pages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                    disabled={page === pagination.pages}
                                    className="p-2 bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Delete Confirmation Modal */}
            {
                deleteConfirm && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full">
                            <h2 className="text-lg text-white font-bold mb-4">Delete Review</h2>
                            <p className="text-sm text-zinc-400 mb-6">
                                Are you sure you want to delete this review? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-4 py-2 bg-zinc-800 text-white text-sm font-bold uppercase hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteMutation.isPending}
                                    className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-bold uppercase hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Review Modal */}
            {
                editingReview && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-white">Edit Review</h2>
                                <button onClick={() => setEditingReview(null)} className="text-zinc-500 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Content</label>
                                <textarea
                                    value={editForm.content}
                                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                                    rows={4}
                                    className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setEditingReview(null)}
                                    className="flex-1 px-4 py-2 bg-zinc-800 text-white text-sm font-bold uppercase hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    disabled={updateMutation.isPending}
                                    className="flex-1 px-4 py-2 bg-white text-black text-sm font-bold uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50"
                                >
                                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* User Action Modal */}
            {
                userActionModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-sm w-full">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-lg text-white font-bold">User Status</h2>
                                    <p className="text-xs text-zinc-500 font-mono mt-1">{userActionModal.userName}</p>
                                </div>
                                <button onClick={() => setUserActionModal(null)} className="text-zinc-500 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={() => userStatusMutation.mutate({ userId: userActionModal.userId, status: 'trusted' })}
                                    className={`w-full flex items-center gap-3 px-4 py-3 border transition-colors ${userActionModal.status === 'trusted'
                                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'}`}
                                >
                                    <ShieldCheck size={18} />
                                    <div className="text-left">
                                        <p className="text-sm font-bold uppercase">Trusted User</p>
                                        <p className="text-[10px] opacity-70">Reviews are automatically approved</p>
                                    </div>
                                    {userActionModal.status === 'trusted' && <Check size={16} className="ml-auto" />}
                                </button>

                                <button
                                    onClick={() => userStatusMutation.mutate({ userId: userActionModal.userId, status: 'standard' })}
                                    className={`w-full flex items-center gap-3 px-4 py-3 border transition-colors ${userActionModal.status === 'standard'
                                        ? 'bg-zinc-800 border-zinc-600 text-white'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'}`}
                                >
                                    <Shield size={18} />
                                    <div className="text-left">
                                        <p className="text-sm font-bold uppercase">Standard User</p>
                                        <p className="text-[10px] opacity-70">Reviews require approval (default)</p>
                                    </div>
                                    {userActionModal.status === 'standard' && <Check size={16} className="ml-auto" />}
                                </button>

                                <button
                                    onClick={() => userStatusMutation.mutate({ userId: userActionModal.userId, status: 'blocked' })}
                                    className={`w-full flex items-center gap-3 px-4 py-3 border transition-colors ${userActionModal.status === 'blocked'
                                        ? 'bg-red-500/10 border-red-500/50 text-red-400'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'}`}
                                >
                                    <ShieldAlert size={18} />
                                    <div className="text-left">
                                        <p className="text-sm font-bold uppercase">Blocked User</p>
                                        <p className="text-[10px] opacity-70">Cannot submit reviews</p>
                                    </div>
                                    {userActionModal.status === 'blocked' && <Check size={16} className="ml-auto" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
