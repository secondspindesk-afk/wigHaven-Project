import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, RefreshCw, ChevronLeft, ChevronRight, User, Mail,
    ShoppingBag, Shield, Ban, CheckCircle, MoreVertical
} from 'lucide-react';
import { useAdminUsers, useBanUser, useUnbanUser } from '@/lib/hooks/useUsers';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils/currency';
import { useUser } from '@/lib/hooks/useUser';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

// ==================== MOBILE USER CARD ====================
interface MobileUserCardProps {
    user: any;
    onView: () => void;
    onBan: () => void;
    onUnban: () => void;
    canManage: boolean;
}

function MobileUserCard({ user, onView, onBan, onUnban, canManage }: MobileUserCardProps) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            onClick={onView}
            className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 active:bg-zinc-800/50"
        >
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    {user.role === 'admin' || user.role === 'super_admin' ? (
                        <Shield size={16} className="text-amber-500" />
                    ) : (
                        <User size={16} className="text-zinc-400" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-white font-medium truncate">
                            {user.firstName} {user.lastName}
                        </p>
                        {!user.isActive && (
                            <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-bold rounded">BANNED</span>
                        )}
                    </div>
                    <p className="text-[11px] text-zinc-500 font-mono truncate">{user.email}</p>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-zinc-500">
                            <ShoppingBag size={10} className="inline mr-1" />{user.order_count} orders
                        </span>
                        <span className="text-[10px] text-emerald-400 font-medium">
                            {formatCurrency(user.total_spent)}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                {canManage && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowActions(true);
                        }}
                        className="p-2 -mr-2 text-zinc-500"
                    >
                        <MoreVertical size={18} />
                    </button>
                )}
            </div>

            {/* Actions Bottom Sheet */}
            {showActions && (
                <>
                    <div
                        className="fixed inset-0 bg-black/80 z-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowActions(false);
                        }}
                    />
                    <div
                        className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-4 safe-area-pb"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                        <div className="space-y-2">
                            <button
                                onClick={() => { setShowActions(false); onView(); }}
                                className="w-full p-3 bg-zinc-800 rounded-xl text-left text-sm text-white"
                            >
                                View Details
                            </button>
                            {user.isActive ? (
                                <button
                                    onClick={() => { setShowActions(false); onBan(); }}
                                    className="w-full p-3 bg-red-500/10 rounded-xl text-left text-sm text-red-500 flex items-center gap-2"
                                >
                                    <Ban size={16} /> Ban User
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setShowActions(false); onUnban(); }}
                                    className="w-full p-3 bg-emerald-500/10 rounded-xl text-left text-sm text-emerald-500 flex items-center gap-2"
                                >
                                    <CheckCircle size={16} /> Unban User
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ==================== MAIN COMPONENT ====================
export default function UserList() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const isMobile = useIsMobile();

    // Filters
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [page, setPage] = useState(1);
    const limit = 20;

    // Modal
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showConfirmModal, setShowConfirmModal] = useState<'ban' | 'unban' | null>(null);

    // API
    const { data, isLoading, refetch } = useAdminUsers({
        page,
        limit,
        search: debouncedSearch || undefined,
    });

    const banMutation = useBanUser();
    const unbanMutation = useUnbanUser();
    const { data: currentUser } = useUser();

    const rawUsers = data?.users || [];
    const users = rawUsers.filter((u: any) => u.id !== currentUser?.id);
    const pagination = data?.pagination || { page: 1, pages: 1, total: 0, limit: 20 };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const canManageUser = (user: any) => {
        const isSuperAdmin = currentUser?.role === 'super_admin';
        const targetIsAdmin = user.role === 'admin' || user.role === 'super_admin';
        return isSuperAdmin || (!targetIsAdmin && currentUser?.role === 'admin');
    };

    const handleBan = async () => {
        if (!selectedUser) return;
        try {
            await banMutation.mutateAsync(selectedUser.id);
            showToast(`User banned`, 'success');
            setShowConfirmModal(null);
            setSelectedUser(null);
        } catch (error: any) {
            showToast(error.message || 'Failed to ban', 'error');
        }
    };

    const handleUnban = async () => {
        if (!selectedUser) return;
        try {
            await unbanMutation.mutateAsync(selectedUser.id);
            showToast(`User unbanned`, 'success');
            setShowConfirmModal(null);
            setSelectedUser(null);
        } catch (error: any) {
            showToast(error.message || 'Failed to unban', 'error');
        }
    };

    // ==================== MOBILE LAYOUT ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                {/* Mobile Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg text-white font-semibold">Users</h1>
                        <p className="text-[10px] text-zinc-500 font-mono">{pagination.total} registered</p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="p-2.5 bg-zinc-800 rounded-lg text-zinc-400 active:bg-zinc-700"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Mobile Search */}
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full h-11 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                    />
                </div>

                {/* User Cards */}
                <div className="space-y-3">
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
                        ))
                    ) : users.length === 0 ? (
                        <div className="text-center py-12">
                            <User size={40} className="mx-auto text-zinc-700 mb-4" />
                            <p className="text-zinc-500 text-sm">No users found</p>
                        </div>
                    ) : (
                        users.map((user) => (
                            <MobileUserCard
                                key={user.id}
                                user={user}
                                onView={() => navigate(`/admin/users/${user.id}`)}
                                onBan={() => { setSelectedUser(user); setShowConfirmModal('ban'); }}
                                onUnban={() => { setSelectedUser(user); setShowConfirmModal('unban'); }}
                                canManage={canManageUser(user)}
                            />
                        ))
                    )}
                </div>

                {/* Mobile Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-3 bg-zinc-800 text-zinc-400 rounded-xl disabled:opacity-50"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm text-zinc-400">{page} / {pagination.pages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                            className="p-3 bg-zinc-800 text-zinc-400 rounded-xl disabled:opacity-50"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {/* Mobile Confirm Modal */}
                {showConfirmModal && selectedUser && (
                    <>
                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => { setShowConfirmModal(null); setSelectedUser(null); }} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-5 safe-area-pb">
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                            <h3 className="text-base font-semibold text-white mb-2">
                                {showConfirmModal === 'ban' ? 'Ban User' : 'Unban User'}
                            </h3>
                            <p className="text-sm text-zinc-400 mb-4">
                                {showConfirmModal === 'ban' ? 'This will prevent them from logging in.' : 'This will restore their access.'}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowConfirmModal(null); setSelectedUser(null); }}
                                    className="flex-1 py-3 bg-zinc-800 text-white rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={showConfirmModal === 'ban' ? handleBan : handleUnban}
                                    disabled={banMutation.isPending || unbanMutation.isPending}
                                    className={`flex-1 py-3 rounded-xl text-white ${showConfirmModal === 'ban' ? 'bg-red-600' : 'bg-emerald-600'}`}
                                >
                                    {(banMutation.isPending || unbanMutation.isPending) ? 'Processing...' : 'Confirm'}
                                </button>
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
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Users</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">{pagination.total} REGISTERED USERS</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Search */}
            <div className="bg-[#0A0A0A] border border-[#27272a] p-4 mb-6">
                <div className="relative max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full h-9 pl-9 pr-4 bg-[#050505] border border-[#27272a] text-xs text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#0A0A0A] border border-[#27272a] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#27272a]">
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Email</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Orders</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Total Spent</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Joined</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="border-b border-[#27272a]">
                                        {[...Array(7)].map((_, j) => (
                                            <td key={j} className="px-4 py-4"><div className="h-4 bg-zinc-800 rounded animate-pulse" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500 text-sm">No users found</td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="border-b border-[#27272a] hover:bg-zinc-900/50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                                    {user.role === 'admin' ? <Shield size={14} className="text-amber-500" /> : <User size={14} className="text-zinc-400" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm text-white font-medium">{user.firstName} {user.lastName}</p>
                                                    <p className="text-[10px] text-zinc-500 font-mono uppercase">{(user.role as string) === 'super_admin' ? 'admin' : user.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <Mail size={12} className="text-zinc-500" />
                                                <span className="text-sm text-white font-mono">{user.email}</span>
                                                {user.emailVerified && <CheckCircle size={12} className="text-emerald-500" />}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <ShoppingBag size={12} className="text-zinc-500" />
                                                <span className="text-sm text-white">{user.order_count}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-emerald-400 font-medium">{formatCurrency(user.total_spent)}</span>
                                        </td>
                                        <td className="px-4 py-4 text-xs text-zinc-400 font-mono">{formatDate(user.createdAt)}</td>
                                        <td className="px-4 py-4">
                                            {user.isActive ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">
                                                    <CheckCircle size={10} /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase">
                                                    <Ban size={10} /> Banned
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => navigate(`/admin/users/${user.id}`)} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 hover:text-white text-[10px] font-bold uppercase transition-colors">View</button>
                                                {canManageUser(user) && (
                                                    user.isActive ? (
                                                        <button onClick={() => { setSelectedUser(user); setShowConfirmModal('ban'); }} className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-bold uppercase transition-colors">Ban</button>
                                                    ) : (
                                                        <button onClick={() => { setSelectedUser(user); setShowConfirmModal('unban'); }} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold uppercase transition-colors">Unban</button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[#27272a]">
                        <span className="text-xs text-zinc-500 font-mono">Page {pagination.page} of {pagination.pages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 transition-colors"><ChevronLeft size={14} /></button>
                            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="p-2 bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 transition-colors"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop Confirm Modal */}
            {showConfirmModal && selectedUser && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full">
                        <h2 className="text-lg text-white font-bold mb-4">{showConfirmModal === 'ban' ? 'Ban User' : 'Unban User'}</h2>
                        <p className="text-sm text-zinc-400 mb-6">
                            Are you sure you want to {showConfirmModal} <span className="text-white font-mono">{selectedUser.email}</span>?
                            {showConfirmModal === 'ban' && <span className="block mt-2 text-amber-400">This will prevent them from logging in.</span>}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowConfirmModal(null); setSelectedUser(null); }} className="flex-1 px-4 py-2 bg-zinc-800 text-white text-sm font-bold uppercase hover:bg-zinc-700 transition-colors">Cancel</button>
                            <button
                                onClick={showConfirmModal === 'ban' ? handleBan : handleUnban}
                                disabled={banMutation.isPending || unbanMutation.isPending}
                                className={`flex-1 px-4 py-2 text-white text-sm font-bold uppercase transition-colors disabled:opacity-50 ${showConfirmModal === 'ban' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                            >
                                {(banMutation.isPending || unbanMutation.isPending) ? 'Processing...' : `Confirm ${showConfirmModal}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
