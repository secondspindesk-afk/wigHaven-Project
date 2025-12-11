import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Send, Loader2, User, Clock, Mail, UserX, X } from 'lucide-react';
import { useAdminSupportTickets, useUpdateTicketStatus, useAdminReplyTicket, useSupportTicket } from '@/lib/hooks/useSupport';
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

    const tickets = data?.data || [];
    const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

    const handleStatusChange = (id: string, status: 'open' | 'pending' | 'closed') => updateStatusMutation.mutate({ id, status });
    const handleSendReply = (e: React.FormEvent) => { e.preventDefault(); if (!selectedTicketId || !replyMessage.trim()) return; adminReplyMutation.mutate({ id: selectedTicketId, message: replyMessage }, { onSuccess: () => { setReplyMessage(''); refetch(); } }); };

    const getStatusColor = (s: string) => s === 'open' ? 'bg-green-500/10 text-green-400' : s === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-800 text-zinc-400';
    const getPriorityColor = (p: string) => p === 'high' ? 'bg-red-500/10 text-red-400' : p === 'medium' ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-800 text-zinc-400';

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
                {/* Divider */}
                <div className="h-px bg-zinc-800/50 -mx-4" />
                {isError && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center"><AlertCircle size={24} className="mx-auto text-red-500 mb-2" /><button onClick={() => refetch()} className="text-xs text-red-400 underline">Retry</button></div>}
                <div className="space-y-3">
                    {isLoading ? [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />) : tickets.length === 0 ? <div className="text-center py-12"><MessageSquare size={40} className="mx-auto text-zinc-700 mb-4" /><p className="text-zinc-500 text-sm">No tickets</p></div> : tickets.map((t: SupportTicket) => (
                        <div key={t.id} onClick={() => setSelectedTicketId(t.id)} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2"><h3 className="text-sm text-white font-medium truncate">{t.subject}</h3>{!t.userId && <span className="px-1 py-0.5 text-[8px] font-bold bg-purple-500/10 text-purple-400 rounded">GUEST</span>}</div>
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1"><User size={10} /><span>{t.userId ? `${t.user?.firstName}` : t.guestName}</span><span>•</span><Clock size={10} /><span>{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</span></div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                                    <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${getStatusColor(t.status)}`}>{t.status}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {pagination.pages > 1 && <div className="flex items-center justify-between pt-4"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl disabled:opacity-50"><ChevronLeft size={20} /></button><span className="text-sm text-zinc-400">{page} / {pagination.pages}</span><button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl disabled:opacity-50"><ChevronRight size={20} /></button></div>}

                {/* Mobile Ticket Detail Sheet */}
                {selectedTicketId && selectedTicket && (
                    <>
                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setSelectedTicketId(null)} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl max-h-[80vh] flex flex-col safe-area-pb">
                            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white truncate flex-1">{selectedTicket.subject}</h3>
                                <button onClick={() => setSelectedTicketId(null)} className="p-1 text-zinc-400"><X size={20} /></button>
                            </div>
                            {selectedTicket.userId ? <p className="px-4 text-[10px] text-zinc-500">{selectedTicket.user?.firstName} • {selectedTicket.user?.email}</p> : <div className="mx-4 mt-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg"><div className="flex items-center gap-2"><UserX size={12} className="text-purple-400" /><span className="text-[10px] text-purple-400 font-bold">GUEST</span></div><p className="text-[10px] text-zinc-400">{selectedTicket.guestName} • {selectedTicket.guestEmail}</p></div>}
                            <div className="flex gap-2 p-4">{['open', 'pending', 'closed'].map(s => <button key={s} onClick={() => handleStatusChange(selectedTicketId, s as any)} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg ${selectedTicket.status === s ? getStatusColor(s) : 'bg-zinc-800 text-zinc-500'}`}>{s}</button>)}</div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {selectedTicket.messages?.map(msg => (
                                    <div key={msg.id} className={msg.isAdmin ? 'ml-4' : 'mr-4'}>
                                        <div className={`p-3 rounded-xl text-sm ${msg.isAdmin ? 'bg-white/5 border border-white/10' : 'bg-zinc-800'}`}><p className="text-zinc-300">{msg.message}</p></div>
                                        <p className="text-[9px] text-zinc-600 mt-1">{msg.isAdmin ? 'Admin' : 'Customer'} • {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</p>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={handleSendReply} className="p-4 border-t border-zinc-800 flex gap-2">
                                <input type="text" value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Reply..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white" disabled={selectedTicket.status === 'closed'} />
                                <button type="submit" disabled={!replyMessage.trim() || adminReplyMutation.isPending} className="p-3 bg-white text-black rounded-xl disabled:opacity-50">{adminReplyMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] p-8 pb-20">
            <div className="flex items-center justify-between mb-8">
                <div><h1 className="text-xl text-white font-medium uppercase tracking-tight">Support Tickets</h1><p className="text-[10px] text-zinc-500 font-mono mt-1">CUSTOMER SUPPORT</p></div>
                <button onClick={() => refetch()} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"><RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /></button>
            </div>
            <div className="flex gap-4 mb-6">
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-zinc-900 border border-zinc-800 text-white text-xs px-3 py-2 rounded-sm"><option value="">All Statuses</option><option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option></select>
                <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className="bg-zinc-900 border border-zinc-800 text-white text-xs px-3 py-2 rounded-sm"><option value="">All Priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
            </div>
            {isError && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 flex items-center justify-between"><div className="flex items-center gap-3"><AlertCircle size={16} className="text-red-500" /><span className="text-sm text-red-400">Failed to load</span></div><button onClick={() => refetch()} className="text-xs text-red-400 underline">Retry</button></div>}
            <div className="flex gap-6">
                <div className="flex-1">
                    <div className="bg-[#0A0A0A] border border-[#27272a] overflow-hidden">
                        {isLoading ? <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-zinc-500" /></div> : tickets.length === 0 ? <div className="text-center py-20"><MessageSquare size={48} className="text-zinc-700 mx-auto mb-4" /><p className="text-zinc-500 text-sm">No tickets</p></div> : <div className="divide-y divide-[#27272a]">{tickets.map((t: SupportTicket) => (
                            <div key={t.id} onClick={() => setSelectedTicketId(t.id)} className={`p-4 cursor-pointer transition-colors ${selectedTicketId === t.id ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1"><h3 className="text-sm font-medium text-white truncate">{t.subject}</h3>{!t.userId && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-500/10 text-purple-400 rounded">GUEST</span>}</div>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">{t.userId ? <><User size={12} /><span>{t.user?.firstName} {t.user?.lastName}</span></> : <><UserX size={12} className="text-purple-400" /><span className="text-purple-400">{t.guestName}</span></>}<span className="text-zinc-600">•</span><Clock size={12} /><span>{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</span></div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0"><span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full ${getPriorityColor(t.priority)}`}>{t.priority}</span><span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full ${getStatusColor(t.status)}`}>{t.status}</span></div>
                                </div>
                            </div>
                        ))}</div>}
                        {pagination.pages > 1 && <div className="flex items-center justify-between px-4 py-3 border-t border-[#27272a]"><span className="text-xs text-zinc-500 font-mono">Page {pagination.page} / {pagination.pages}</span><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-zinc-800 text-zinc-400 disabled:opacity-50"><ChevronLeft size={14} /></button><button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="p-2 bg-zinc-800 text-zinc-400 disabled:opacity-50"><ChevronRight size={14} /></button></div></div>}
                    </div>
                </div>
                {selectedTicketId && selectedTicket && (
                    <div className="w-96 bg-[#0A0A0A] border border-[#27272a] flex flex-col max-h-[calc(100vh-200px)]">
                        <div className="p-4 border-b border-[#27272a]">
                            <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-bold text-white truncate">{selectedTicket.subject}</h3><button onClick={() => setSelectedTicketId(null)} className="text-zinc-500 hover:text-white text-xs">✕</button></div>
                            {selectedTicket.userId ? <p className="text-xs text-zinc-500 mb-3">{selectedTicket.user?.firstName} {selectedTicket.user?.lastName} • {selectedTicket.user?.email}</p> : <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded mb-3"><div className="flex items-center gap-2 mb-1"><UserX size={14} className="text-purple-400" /><span className="text-xs font-bold text-purple-400 uppercase">Guest</span></div><p className="text-xs text-zinc-400">{selectedTicket.guestName}</p><p className="text-xs text-zinc-500 flex items-center gap-1"><Mail size={10} />{selectedTicket.guestEmail}</p></div>}
                            <div className="flex gap-2">{['open', 'pending', 'closed'].map(s => <button key={s} onClick={() => handleStatusChange(selectedTicketId, s as any)} disabled={updateStatusMutation.isPending} className={`px-3 py-1 text-[10px] font-bold uppercase ${selectedTicket.status === s ? getStatusColor(s) : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}>{s}</button>)}</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">{selectedTicket.messages?.map(msg => <div key={msg.id} className={msg.isAdmin ? 'ml-4' : 'mr-4'}><div className={`p-3 rounded text-sm ${msg.isAdmin ? 'bg-white/5 border border-white/10' : 'bg-zinc-800'}`}><p className="text-zinc-300">{msg.message}</p></div><p className="text-[10px] text-zinc-600 mt-1">{msg.isAdmin ? 'Admin' : 'Customer'} • {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</p></div>)}</div>
                        <form onSubmit={handleSendReply} className="p-4 border-t border-[#27272a]"><div className="flex gap-2"><input type="text" value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Type reply..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2 text-sm text-white" disabled={selectedTicket.status === 'closed'} /><button type="submit" disabled={!replyMessage.trim() || adminReplyMutation.isPending || selectedTicket.status === 'closed'} className="px-4 py-2 bg-white text-black font-bold text-xs uppercase disabled:opacity-50 flex items-center gap-2">{adminReplyMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}</button></div></form>
                    </div>
                )}
            </div>
        </div>
    );
}
