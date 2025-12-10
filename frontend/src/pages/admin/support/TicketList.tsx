import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
    MessageSquare,
    RefreshCw,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Send,
    Loader2,
    User,
    Clock,
    Mail,
    UserX
} from 'lucide-react';
import { useAdminSupportTickets, useUpdateTicketStatus, useAdminReplyTicket, useSupportTicket } from '@/lib/hooks/useSupport';
import { SupportTicket } from '@/lib/types/support';

export default function TicketList() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyMessage, setReplyMessage] = useState('');

    // API
    const { data, isLoading, isError, refetch } = useAdminSupportTickets({
        page,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined
    });
    const updateStatusMutation = useUpdateTicketStatus();
    const adminReplyMutation = useAdminReplyTicket();
    const { data: selectedTicket } = useSupportTicket(selectedTicketId || '');

    const tickets = data?.data || [];
    const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

    const handleStatusChange = (ticketId: string, newStatus: 'open' | 'pending' | 'closed') => {
        updateStatusMutation.mutate({ id: ticketId, status: newStatus });
    };

    const handleSendReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicketId || !replyMessage.trim()) return;

        adminReplyMutation.mutate(
            { id: selectedTicketId, message: replyMessage },
            {
                onSuccess: () => {
                    setReplyMessage('');
                    refetch();
                }
            }
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-green-500/10 text-green-400';
            case 'pending': return 'bg-amber-500/10 text-amber-400';
            case 'closed': return 'bg-zinc-800 text-zinc-400';
            default: return 'bg-zinc-800 text-zinc-400';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500/10 text-red-400';
            case 'medium': return 'bg-blue-500/10 text-blue-400';
            case 'low': return 'bg-zinc-800 text-zinc-400';
            default: return 'bg-zinc-800 text-zinc-400';
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] p-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Support Tickets</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                        CUSTOMER SUPPORT MANAGEMENT
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="bg-zinc-900 border border-zinc-800 text-white text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-zinc-600"
                >
                    <option value="">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                </select>
                <select
                    value={priorityFilter}
                    onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                    className="bg-zinc-900 border border-zinc-800 text-white text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-zinc-600"
                >
                    <option value="">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
            </div>

            {/* Error */}
            {isError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={16} className="text-red-500" />
                        <span className="text-sm text-red-400">Failed to load tickets</span>
                    </div>
                    <button onClick={() => refetch()} className="text-xs text-red-400 hover:text-red-300 underline">
                        Retry
                    </button>
                </div>
            )}

            <div className="flex gap-6">
                {/* Ticket List */}
                <div className="flex-1">
                    <div className="bg-[#0A0A0A] border border-[#27272a] overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 size={24} className="animate-spin text-zinc-500" />
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="text-center py-20">
                                <MessageSquare size={48} className="text-zinc-700 mx-auto mb-4" />
                                <p className="text-zinc-500 text-sm">No tickets found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#27272a]">
                                {tickets.map((ticket: SupportTicket) => (
                                    <div
                                        key={ticket.id}
                                        onClick={() => setSelectedTicketId(ticket.id)}
                                        className={`p-4 cursor-pointer transition-colors ${selectedTicketId === ticket.id
                                            ? 'bg-zinc-900'
                                            : 'hover:bg-zinc-900/50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-sm font-medium text-white truncate">
                                                        {ticket.subject}
                                                    </h3>
                                                    {!ticket.userId && (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-purple-500/10 text-purple-400 rounded">
                                                            GUEST
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                    {ticket.userId ? (
                                                        <>
                                                            <User size={12} />
                                                            <span>{ticket.user?.firstName} {ticket.user?.lastName}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserX size={12} className="text-purple-400" />
                                                            <span className="text-purple-400">{ticket.guestName}</span>
                                                        </>
                                                    )}
                                                    <span className="text-zinc-600">•</span>
                                                    <Clock size={12} />
                                                    <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full ${getPriorityColor(ticket.priority)}`}>
                                                    {ticket.priority}
                                                </span>
                                                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full ${getStatusColor(ticket.status)}`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination.pages > 1 && (
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
                        )}
                    </div>
                </div>

                {/* Ticket Detail Sidebar */}
                {selectedTicketId && selectedTicket && (
                    <div className="w-96 bg-[#0A0A0A] border border-[#27272a] flex flex-col max-h-[calc(100vh-200px)]">
                        {/* Header */}
                        <div className="p-4 border-b border-[#27272a]">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-white truncate">{selectedTicket.subject}</h3>
                                <button
                                    onClick={() => setSelectedTicketId(null)}
                                    className="text-zinc-500 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* User/Guest Info */}
                            {selectedTicket.userId ? (
                                <p className="text-xs text-zinc-500 mb-3">
                                    {selectedTicket.user?.firstName} {selectedTicket.user?.lastName} • {selectedTicket.user?.email}
                                </p>
                            ) : (
                                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <UserX size={14} className="text-purple-400" />
                                        <span className="text-xs font-bold text-purple-400 uppercase">Guest Ticket</span>
                                    </div>
                                    <p className="text-xs text-zinc-400">
                                        <span className="font-medium">{selectedTicket.guestName}</span>
                                    </p>
                                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                                        <Mail size={10} />
                                        {selectedTicket.guestEmail}
                                    </p>
                                    <p className="text-[10px] text-purple-300/70 mt-2">
                                        ⚡ Replies will be sent to their email
                                    </p>
                                </div>
                            )}

                            {/* Status Controls */}
                            <div className="flex gap-2">
                                {['open', 'pending', 'closed'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusChange(selectedTicketId, status as 'open' | 'pending' | 'closed')}
                                        disabled={updateStatusMutation.isPending}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${selectedTicket.status === status
                                            ? getStatusColor(status)
                                            : 'bg-zinc-800 text-zinc-500 hover:text-white'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {selectedTicket.messages?.map((msg) => (
                                <div key={msg.id} className={`${msg.isAdmin ? 'ml-4' : 'mr-4'}`}>
                                    <div className={`p-3 rounded text-sm ${msg.isAdmin
                                        ? 'bg-white/5 border border-white/10'
                                        : 'bg-zinc-800'
                                        }`}>
                                        <p className="text-zinc-300">{msg.message}</p>
                                    </div>
                                    <p className="text-[10px] text-zinc-600 mt-1">
                                        {msg.isAdmin ? 'Admin' : 'Customer'} • {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Reply Form */}
                        <form onSubmit={handleSendReply} className="p-4 border-t border-[#27272a]">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Type admin reply..."
                                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                                    disabled={selectedTicket.status === 'closed'}
                                />
                                <button
                                    type="submit"
                                    disabled={!replyMessage.trim() || adminReplyMutation.isPending || selectedTicket.status === 'closed'}
                                    className="px-4 py-2 bg-white text-black font-bold text-xs uppercase hover:bg-zinc-200 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    {adminReplyMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
