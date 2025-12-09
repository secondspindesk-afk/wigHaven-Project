import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, Calendar, MapPin, ShoppingBag, Ban, CheckCircle, Edit2, X } from 'lucide-react';
import { usersApi } from '@/lib/api/users';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency } from '@/lib/utils/currency';

import { useUser } from '@/lib/hooks/useUser';

export default function UserDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { data: currentUser } = useUser();

    const { data: user, isLoading, error } = useQuery({
        queryKey: ['admin-user', id],
        queryFn: () => usersApi.getUser(id!),
        enabled: !!id,
    });

    const banMutation = useMutation({
        mutationFn: usersApi.banUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
            showToast('User banned successfully', 'success');
        },
        onError: () => showToast('Failed to ban user', 'error'),
    });

    const unbanMutation = useMutation({
        mutationFn: usersApi.unbanUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
            showToast('User unbanned successfully', 'success');
        },
        onError: () => showToast('Failed to unban user', 'error'),
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: string }) => usersApi.updateUserRole(userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
            showToast('User role updated successfully', 'success');
        },
        onError: () => showToast('Failed to update user role', 'error'),
    });

    const updateDetailsMutation = useMutation({
        mutationFn: (data: any) => usersApi.updateUserDetails(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
            setIsEditing(false);
            showToast('User details updated successfully', 'success');
        },
        onError: () => showToast('Failed to update user details', 'error'),
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    });

    const handleEditClick = () => {
        if (user) {
            setEditForm({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone || ''
            });
            setIsEditing(true);
        }
    };

    const handleSaveDetails = () => {
        updateDetailsMutation.mutate(editForm);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="p-8 text-center text-zinc-500">
                User not found or error loading details.
            </div>
        );
    }

    const isSuperAdmin = currentUser?.role === 'super_admin';
    // Cast to string for type safety - backend filters super_admin but we keep defense-in-depth
    const targetIsAdmin = user.role === 'admin' || (user.role as string) === 'super_admin';
    const canManageUser = isSuperAdmin || (!targetIsAdmin && currentUser?.role === 'admin');

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-zinc-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-zinc-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">User Details</h1>
                        <p className="text-zinc-500 text-sm mt-1">Manage user profile and view history</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Profile Card */}
                    <div className="space-y-6">
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6">
                            <div className="flex flex-col items-center text-center mb-6 relative">
                                {canManageUser && (
                                    <button
                                        onClick={handleEditClick}
                                        className="absolute top-0 right-0 p-2 text-zinc-500 hover:text-white transition-colors"
                                        title="Edit User"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                )}
                                <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-zinc-400">
                                    {user.firstName[0]}{user.lastName[0]}
                                </div>
                                <h2 className="text-xl font-bold text-white">{user.firstName} {user.lastName}</h2>

                                <div className="mt-2 flex items-center gap-2">
                                    <select
                                        value={user.role}
                                        onChange={(e) => updateRoleMutation.mutate({ userId: user.id, role: e.target.value })}
                                        disabled={!isSuperAdmin}
                                        className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider bg-zinc-900 border border-zinc-800 rounded focus:outline-none focus:border-zinc-600 ${user.role === 'admin' ? 'text-purple-500' : 'text-zinc-400'
                                            } ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="customer">Customer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-[#27272a] pt-6">
                                <div className="flex items-center gap-3 text-sm text-zinc-400">
                                    <Mail size={16} className="text-zinc-500" />
                                    <span>{user.email}</span>
                                </div>
                                {user.phone && (
                                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                                        <Phone size={16} className="text-zinc-500" />
                                        <span>{user.phone}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-sm text-zinc-400">
                                    <Calendar size={16} className="text-zinc-500" />
                                    <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-[#27272a]">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="p-3 bg-zinc-900/50 border border-zinc-800">
                                        <div className="text-2xl font-bold text-white">{user.order_count}</div>
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Orders</div>
                                    </div>
                                    <div className="p-3 bg-zinc-900/50 border border-zinc-800">
                                        <div className="text-lg font-bold text-white">{formatCurrency(user.total_spent)}</div>
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Spent</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                {canManageUser && (
                                    user.isActive ? (
                                        <button
                                            onClick={() => banMutation.mutate(user.id)}
                                            className="w-full py-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Ban size={14} />
                                            Ban User
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => unbanMutation.mutate(user.id)}
                                            className="w-full py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <CheckCircle size={14} />
                                            Unban User
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Addresses */}
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <MapPin size={16} className="text-zinc-500" />
                                Addresses
                            </h3>

                            {user.addresses && user.addresses.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {user.addresses.map((addr: any) => (
                                        <div key={addr.id} className="p-4 bg-zinc-900/30 border border-zinc-800 relative group">
                                            {addr.isDefault && (
                                                <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] uppercase font-bold tracking-wider">Default</span>
                                            )}
                                            <p className="font-bold text-zinc-300 mb-1">{addr.firstName} {addr.lastName}</p>
                                            <p className="text-sm text-zinc-500">{addr.addressLine1}</p>
                                            {addr.addressLine2 && <p className="text-sm text-zinc-500">{addr.addressLine2}</p>}
                                            <p className="text-sm text-zinc-500">{addr.city}, {addr.state} {addr.zipCode}</p>
                                            <p className="text-sm text-zinc-500 mt-2">{addr.phone}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500 italic">No addresses saved.</p>
                            )}
                        </div>

                        {/* Recent Orders */}
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <ShoppingBag size={16} className="text-zinc-500" />
                                Recent Orders
                            </h3>

                            {user.orders && user.orders.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-[#27272a]">
                                                <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Order #</th>
                                                <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                                                <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                                <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total</th>
                                                <th className="pb-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#27272a]">
                                            {user.orders.map((order: any) => (
                                                <tr key={order.id} className="group hover:bg-zinc-900/30 transition-colors">
                                                    <td className="py-3 text-sm font-mono text-zinc-400">#{order.orderNumber}</td>
                                                    <td className="py-3 text-sm text-zinc-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                                                    <td className="py-3">
                                                        <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider ${order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' :
                                                            order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                                                'bg-blue-500/10 text-blue-500'
                                                            }`}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-sm font-bold text-white">{formatCurrency(order.total)}</td>
                                                    <td className="py-3">
                                                        <button
                                                            onClick={() => navigate(`/admin/orders/${order.orderNumber}`)}
                                                            className="text-xs text-zinc-500 hover:text-white underline"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500 italic">No orders found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Edit User Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white">Edit User Details</h2>
                            <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">First Name</label>
                                <input
                                    type="text"
                                    value={editForm.firstName}
                                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">Last Name</label>
                                <input
                                    type="text"
                                    value={editForm.lastName}
                                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Email</label>
                            <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Phone</label>
                            <input
                                type="tel"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 px-4 py-2 bg-zinc-800 text-white text-sm font-bold uppercase hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveDetails}
                                disabled={updateDetailsMutation.isPending}
                                className="flex-1 px-4 py-2 bg-white text-black text-sm font-bold uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50"
                            >
                                {updateDetailsMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
