import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Send, Loader2, User, Clock, Mail, UserX, X } from 'lucide-react';
import { useAdminSupportTickets, useUpdateTicketStatus, useAdminReplyTicket, useSupportTicket } from '@/lib/hooks/useSupport';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { SupportTicket } from '@/lib/types/support';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function TicketList() {
    const isMobile = useIsMobile();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyMessage, setReplyMessage] = useState('');

    const { data, isLoading, isError, refetch } = useAdminSupportTickets({ page, status: statusFilter || undefined, priority: priorityFilter || undefined });
    const updateStatusMutation = useUpdateTicketStatus();
    const adminReplyMutation = useAdminReplyTicket();
    const { data: selectedTicket } = useSupportTicket(selectedTicketId || '');

    // Get unread support notifications
    const { notifications, markAsRead } = useNotifications();

    // Extract ticket IDs with unread 'admin_support_reply' notifications and count them
    const unreadTicketCounts = useMemo(() => {
        const counts = new Map<string, number>();
        notifications?.filter(n => n.type === 'admin_support_reply' && !n.isRead).forEach(n => {
            const match = n.link?.match(/ticket=([^&]+)/);
            if (match) {
                const id = match[1];
                counts.set(id, (counts.get(id) || 0) + 1);
            }
        });
        return counts;
    }, [notifications]);

    // Mark notification as read when ticket is opened
    useEffect(() => {
        if (selectedTicketId && notifications) {
            const ticketNotifications = notifications.filter(n =>
                n.type === 'admin_support_reply' &&
                !n.isRead &&
                n.link?.includes(`ticket=${selectedTicketId}`)
            );

            // Mark each unread notification for this ticket as read
            ticketNotifications.forEach(n => markAsRead(n.id));
        }
    }, [selectedTicketId, notifications]);

    const tickets = data?.data || [];
    const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

    const handleStatusChange = (id: string, status: 'open' | 'pending' | 'closed') => updateStatusMutation.mutate({ id, status });
    const handleSendReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicketId || !replyMessage.trim()) return;

        adminReplyMutation.mutate(
            { id: selectedTicketId, message: replyMessage },
            { onSettled: () => setReplyMessage('') }
        );
    };

    const getStatusColor = (s: string) => s === 'open' ? 'bg-green-500/10 text-green-400' : s === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-800 text-zinc-400';
    const getPriorityColor = (p: string) => p === 'high' ? 'bg-red-500/10 text-red-400' : p === 'medium' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-800 text-zinc-400';

    // Get unread count for ticket
    const getUnreadCount = (ticketId: string) => unreadTicketCounts.get(ticketId) || 0;

    // ==================== MOBILE VIEW ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                <div className="flex items-center justify-between">
                    <div><h1 className="text-lg text-white font-semibold">Support</h1><p className="text-[10px] text-zinc-500 font-mono">{pagination.total} tickets</p></div>
                    <button onClick={() => refetch()} className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400"><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /></button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {['', 'open', 'pending', 'closed'].map(s => <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap ${statusFilter === s ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}>{s || 'All'}</button>)}
                </div>
                <div className="h-px bg-zinc-800/50 -mx-4" />
                {isError && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center"><AlertCircle size={24} className="mx-auto text-red-500 mb-2" /><button onClick={() => refetch()} className="text-xs text-red-400 underline">Retry</button></div>}
                <div className="space-y-3">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />)
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-12"><MessageSquare size={40} className="mx-auto text-zinc-700 mb-4" /><p className="text-zinc-500 text-sm">No tickets</p></div>
                    ) : (
                        tickets.map((t: SupportTicket) => (
                            <div
                                key={t.id}
                                onClick={() => setSelectedTicketId(t.id)}
                                className={`relative p-4 bg-zinc-900 rounded-xl border transition-all ${getUnreadCount(t.id) > 0 ? 'border-l-4 border-l-red-500 border-t-zinc-800 border-r-zinc-800 border-b-zinc-800' : 'border-zinc-800'}`}
                            >
                                {/* NEW Badge for Unread */}
                                {getUnreadCount(t.id) > 0 && (
                                    <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-black uppercase bg-red-500 text-white rounded animate-pulse">{getUnreadCount(t.id)} NEW</span>
                                )}
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm text-white font-medium truncate">{t.subject}</h3>
                                            {!t.userId && <span className="px-1 py-0.5 text-[8px] font-bold bg-purple-500/10 text-purple-400 rounded">GUEST</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                                            <User size={10} /><span>{t.userId ? `${t.user?.firstName}` : t.guestName}</span>
                                            <span>•</span><Clock size={10} /><span>{formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}</span>
                                            {t._count?.messages && <><span>•</span><MessageSquare size={10} /><span>{t._count.messages}</span></>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                                        <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${getStatusColor(t.status)}`}>{t.status}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl disabled:opacity-50"><ChevronLeft size={20} /></button>
                        <span className="text-sm text-zinc-400">{page} / {pagination.pages}</span>
                        <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl disabled:opacity-50"><ChevronRight size={20} /></button>
                    </div>
                )}

                {/* Mobile Ticket Detail Sheet */}
                {selectedTicketId && selectedTicket && (
                    <>
                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setSelectedTicketId(null)} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl max-h-[80vh] flex flex-col safe-area-pb">
                            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white truncate flex-1">{selectedTicket.subject}</h3>
                                <button onClick={() => setSelectedTicketId(null)} className="p-1 text-zinc-400"><X size={20} /></button>
                            </div>
                            {selectedTicket.userId ? (
                                <p className="px-4 text-[10px] text-zinc-500">{selectedTicket.user?.firstName} • {selectedTicket.user?.email}</p>
                            ) : (
                                <div className="mx-4 mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                    <div className="flex items-center gap-2"><UserX size={12} className="text-purple-400" /><span className="text-[10px] text-purple-400 font-bold">GUEST</span></div>
                                    <p className="text-[10px] text-zinc-400">{selectedTicket.guestName} • {selectedTicket.guestEmail}</p>
                                </div>
                            )}
                            <div className="flex gap-2 p-4">
                                {['open', 'pending', 'closed'].map(s => (
                                    <button key={s} onClick={() => handleStatusChange(selectedTicketId, s as any)} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg ${selectedTicket.status === s ? getStatusColor(s) : 'bg-zinc-800 text-zinc-500'}`}>{s}</button>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {selectedTicket.messages?.map(msg => (
                                    <div key={msg.id} className={msg.isAdmin ? 'ml-4' : 'mr-4'}>
                                        <div className={`p-3 rounded-xl text-sm ${msg.isAdmin ? 'bg-white/5 border border-white/10' : 'bg-zinc-800'}`}>
                                            <p className="text-zinc-300">{msg.message}</p>
                                        </div>
                                        <p className="text-[9px] text-zinc-600 mt-1">{msg.isAdmin ? 'Admin' : 'Customer'} • {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</p>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleSendReply} className="p-4 border-t border-zinc-800 flex gap-2">
                                <input type="text" value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Reply..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white" disabled={selectedTicket.status === 'closed'} />
                                <button type="submit" disabled={!replyMessage.trim() || adminReplyMutation.isPending} className="p-3 bg-white text-black rounded-xl disabled:opacity-50">
                                    {adminReplyMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ==================== DESKTOP VIEW ====================
    return (
        <div className="h-full bg-[#09090b] flex flex-col font-sans">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#09090b] shrink-0">
                <div><h1 className="text-lg text-white font-bold tracking-tight">Support Tickets</h1><p className="text-[10px] text-zinc-500 font-mono mt-0.5">CUSTOMER SUPPORT CENTER</p></div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-transparent text-white text-[11px] px-2 py-1 font-medium focus:outline-none cursor-pointer">
                            <option value="">All Statuses</option><option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option>
                        </select>
                        <div className="w-px bg-zinc-800 my-1" />
                        <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className="bg-transparent text-white text-[11px] px-2 py-1 font-medium focus:outline-none cursor-pointer">
                            <option value="">All Priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                        </select>
                    </div>
                    <button onClick={() => refetch()} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg transition-colors"><RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /></button>
                </div>
            </div>

            {isError && <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-center justify-between shrink-0"><div className="flex items-center gap-2"><AlertCircle size={14} className="text-red-500" /><span className="text-xs text-red-400">Failed to load tickets</span></div><button onClick={() => refetch()} className="text-[10px] text-red-400 underline font-bold">RETRY</button></div>}

            <div className="flex-1 overflow-hidden flex min-h-0">
                {/* LIST COLUMN - Fixed Width */}
                <div className={`${selectedTicketId ? 'w-[320px]' : 'w-full max-w-5xl mx-auto'} flex flex-col border-r border-[#27272a] bg-[#0A0A0A] transition-all duration-300 h-full`}>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full"><Loader2 size={20} className="animate-spin text-zinc-500" /></div>
                    ) : tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-3"><MessageSquare size={24} className="text-zinc-700" /></div>
                            <h3 className="text-white text-sm font-bold mb-1">No tickets found</h3>
                            <p className="text-zinc-500 text-xs">There are no support tickets matching your filters.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                                <div className="divide-y divide-[#27272a]">
                                    {tickets.map((t: SupportTicket) => (
                                        <div
                                            key={t.id}
                                            onClick={() => setSelectedTicketId(t.id)}
                                            className={`group relative p-4 cursor-pointer transition-all border-l-2 ${selectedTicketId === t.id ? 'bg-zinc-900/50 border-l-white' : 'border-l-transparent hover:bg-zinc-900/30 hover:border-l-zinc-700'} ${getUnreadCount(t.id) > 0 ? 'bg-red-500/5 !border-l-red-500' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div className="flex items-center gap-2 max-w-[70%]">
                                                    <h3 className={`text-[13px] font-semibold truncate ${selectedTicketId === t.id ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>{t.subject}</h3>
                                                    {getUnreadCount(t.id) > 0 && <span className="px-1.5 py-0.5 text-[8px] font-black uppercase bg-red-500 text-white rounded shadow-sm animate-pulse">{getUnreadCount(t.id)} MSG</span>}
                                                </div>
                                                <span className="text-[9px] text-zinc-500 font-mono whitespace-nowrap">{formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}</span>
                                            </div>

                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center gap-2">
                                                    {t.userId ? (
                                                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 group-hover:text-zinc-300">
                                                            <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center"><User size={9} /></div>
                                                            <span className="truncate max-w-[100px]">{t.user?.firstName} {t.user?.lastName}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-[11px] text-purple-400">
                                                            <div className="w-4 h-4 rounded-full bg-purple-500/10 flex items-center justify-center"><UserX size={9} /></div>
                                                            <span className="truncate max-w-[100px] font-medium">{t.guestName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-1.5 py-px text-[9px] font-bold uppercase rounded border border-white/5 ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                                                    <span className={`px-1.5 py-px text-[9px] font-bold uppercase rounded border border-white/5 ${getStatusColor(t.status)}`}>{t.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pagination - Fixed at bottom of list column */}
                            {pagination.pages > 1 && (
                                <div className="p-3 border-t border-[#27272a] flex items-center justify-between bg-[#0A0A0A] shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); setPage(p => Math.max(1, p - 1)); }} disabled={page === 1} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
                                    <span className="text-[10px] font-mono text-zinc-500">Page {pagination.page} / {pagination.pages}</span>
                                    <button onClick={(e) => { e.stopPropagation(); setPage(p => Math.min(pagination.pages, p + 1)); }} disabled={page === pagination.pages} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* CHAT AREA - Flex Grow */}
                {selectedTicketId && selectedTicket ? (
                    <div className="flex-1 flex flex-col bg-[#09090b] h-full overflow-hidden relative">
                        {/* Chat Header */}
                        <div className="px-6 py-3 border-b border-[#27272a] bg-[#09090b] z-10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-base font-bold text-white tracking-tight">{selectedTicket.subject}</h2>
                                        <div className="flex gap-1.5">
                                            {['open', 'pending', 'closed'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => handleStatusChange(selectedTicketId, s as any)}
                                                    disabled={updateStatusMutation.isPending}
                                                    className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded transition-all ${selectedTicket.status === s ? getStatusColor(s) + ' ring-1 ring-white/10' : 'bg-zinc-900 text-zinc-600 hover:text-zinc-400'}`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                                        <span className="flex items-center gap-1.5">
                                            {selectedTicket.userId ? <User size={10} className="text-zinc-400" /> : <UserX size={10} className="text-purple-400" />}
                                            <span className={selectedTicket.userId ? 'text-zinc-300' : 'text-purple-300'}>
                                                {selectedTicket.userId ? `${selectedTicket.user?.firstName} ${selectedTicket.user?.lastName}` : selectedTicket.guestName}
                                            </span>
                                        </span>
                                        <span className="w-0.5 h-0.5 rounded-full bg-zinc-800" />
                                        <span className="flex items-center gap-1.5 text-zinc-500">
                                            <Mail size={10} /> {selectedTicket.userId ? selectedTicket.user?.email : selectedTicket.guestEmail}
                                        </span>
                                        <span className="w-0.5 h-0.5 rounded-full bg-zinc-800" />
                                        <span className="font-mono">#{selectedTicket.id.slice(-8)}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedTicketId(null)} className="p-1.5 hover:bg-zinc-900 rounded-md text-zinc-500 hover:text-white transition-colors"><X size={16} /></button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#09090b]">
                            {/* Original Inquiry */}
                            <div className="flex gap-3 max-w-3xl mx-auto opacity-75">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                                    <User size={12} className="text-zinc-400" />
                                </div>
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-baseline justify-between px-1">
                                        <span className="text-xs font-bold text-zinc-400">Original Inquiry</span>
                                        <span className="text-[10px] text-zinc-600 font-mono">{formatDistanceToNow(new Date(selectedTicket.createdAt), { addSuffix: true })}</span>
                                    </div>
                                    <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl rounded-tl-none text-zinc-300 text-[13px] leading-relaxed">
                                        <span className="italic text-zinc-500">Ticket created with subject "{selectedTicket.subject}"</span>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full h-px bg-zinc-900 max-w-3xl mx-auto my-6" />

                            {selectedTicket.messages?.map((msg) => (
                                <div key={msg.id} className={`flex gap-3 max-w-3xl mx-auto w-full ${msg.isAdmin ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${msg.isAdmin ? 'bg-white border-white text-black' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                                        {msg.isAdmin ? <span className="font-black text-[10px]">W</span> : <User size={12} />}
                                    </div>
                                    <div className={`space-y-1 max-w-[85%] ${msg.isAdmin ? 'items-end flex flex-col' : ''}`}>
                                        <div className="flex items-center gap-2 px-1">
                                            <span className={`text-[10px] font-bold ${msg.isAdmin ? 'text-white' : 'text-zinc-400'}`}>{msg.isAdmin ? 'WigHaven Support' : (selectedTicket.userId ? selectedTicket.user?.firstName : selectedTicket.guestName)}</span>
                                            <span className="text-[9px] text-zinc-600 font-mono">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                                        </div>
                                        <div className={`px-4 py-3 rounded-xl text-[13px] leading-relaxed shadow-sm ${msg.isAdmin ? 'bg-white text-black rounded-tr-none' : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none'}`}>
                                            <p className="whitespace-pre-wrap">{msg.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="h-2" />
                        </div>

                        {/* Reply Area - Fixed Bottom */}
                        <div className="px-4 py-2 bg-[#09090b] border-t border-[#27272a]">
                            <form onSubmit={handleSendReply} className="max-w-3xl mx-auto relative group">
                                <div className="relative flex items-end gap-2 bg-[#0A0A0A] border border-[#27272a] rounded-xl p-1.5 shadow-xl focus-within:border-zinc-800 focus-within:ring-0 focus-within:outline-none transition-all">
                                    <textarea
                                        value={replyMessage}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                        placeholder={selectedTicket.status === 'closed' ? 'This ticket is closed.' : 'Type your reply here...'}
                                        rows={1}
                                        onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px' }}
                                        className="flex-1 bg-transparent border-0 text-white placeholder:text-zinc-600 text-sm px-3 py-2 focus:ring-0 focus:outline-none resize-none max-h-40 min-h-[36px]"
                                        disabled={selectedTicket.status === 'closed'}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!replyMessage.trim() || adminReplyMutation.isPending || selectedTicket.status === 'closed'}
                                        className="mb-0 mr-0.5 p-1.5 bg-white text-black rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:hover:bg-white transition-all hover:scale-105 active:scale-95"
                                    >
                                        {adminReplyMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    </button>
                                </div>
                                <p className="text-center text-[9px] text-zinc-700 mt-1 font-mono">Press Shift + Enter for new line</p>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-[#09090b] text-center p-8 opacity-50 select-none">
                        <div className="w-20 h-20 bg-zinc-900/50 rounded-2xl flex items-center justify-center mb-4 border border-zinc-800 rotate-3">
                            <MessageSquare size={32} className="text-zinc-700" />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-700 mb-1">Select a Ticket</h2>
                        <p className="text-zinc-800 text-sm max-w-xs">Choose a ticket from the left sidebar to view conversation details and reply.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
