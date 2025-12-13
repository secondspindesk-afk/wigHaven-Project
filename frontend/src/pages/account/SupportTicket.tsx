import { useParams, Link } from 'react-router-dom';
import { useSupportTicket, useReplyTicket } from '@/lib/hooks/useSupport';
import { useUser } from '@/lib/hooks/useUser';
import { ArrowLeft, Send, User as UserIcon, Shield, AlertCircle } from 'lucide-react';
import SectionLoader from '@/components/ui/SectionLoader';
import { formatDistanceToNow } from 'date-fns';
import { useState, useRef, useEffect } from 'react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function SupportTicket() {
    const { id } = useParams<{ id: string }>();
    const { data: ticket, isLoading, isError, refetch } = useSupportTicket(id!);
    const replyTicket = useReplyTicket(id!);
    const { data: user } = useUser();
    const [message, setMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

    useEffect(() => { scrollToBottom(); }, [ticket?.messages]);

    const handleReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        replyTicket.mutate({ message }, { onSuccess: () => { setMessage(''); } });
    };

    if (isLoading) {
        return <SectionLoader className="min-h-[400px]" />;
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <AlertCircle size={40} className="text-red-500 mb-4" />
                <p className="text-red-400 text-sm mb-4">Failed to load ticket</p>
                <div className="flex gap-3">
                    <Link to="/account/support" className="px-4 py-2 bg-zinc-800 text-white text-xs rounded-lg">Go Back</Link>
                    <button onClick={() => refetch()} className="px-4 py-2 bg-red-500/20 text-red-400 text-xs rounded-lg">Retry</button>
                </div>
            </div>
        );
    }

    if (!ticket) return null;

    // ==================== MOBILE ====================
    if (isMobile) {
        return (
            <div className="flex flex-col h-[calc(100vh-180px)]">
                {/* Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/50 -mx-4 px-4">
                    <Link to="/account/support" className="p-2 text-zinc-400"><ArrowLeft size={20} /></Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-bold text-white truncate">{ticket.subject}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${ticket.status === 'open' ? 'bg-green-500/10 text-green-400' : ticket.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-zinc-800 text-zinc-400'}`}>{ticket.status}</span>
                            <span className="text-[10px] text-zinc-500">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4 -mx-4 px-4">
                    {ticket.messages.map((msg) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.isAdmin ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                    {msg.isAdmin ? <Shield size={14} /> : <UserIcon size={14} />}
                                </div>
                                <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-cyan-500/20 text-white rounded-tr-sm' : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-sm'}`}>
                                        {msg.message}
                                    </div>
                                    <span className="text-[10px] text-zinc-600 mt-1">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Reply Input */}
                <div className="pt-4 border-t border-zinc-800/50 -mx-4 px-4 pb-4">
                    {ticket.status === 'closed' ? (
                        <p className="text-center text-xs text-zinc-500 py-3">This ticket is closed</p>
                    ) : (
                        <form onSubmit={handleReply} className="flex gap-2">
                            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a reply..." className="flex-1 px-4 py-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-sm text-white" />
                            <button type="submit" disabled={!message.trim() || replyTicket.isPending} className="w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center disabled:opacity-50">
                                {replyTicket.isPending ? <SectionLoader className="py-0" size="xs" /> : <Send size={18} />}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    // ==================== DESKTOP ====================
    return (
        <div className="h-[calc(100vh-140px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6 flex-shrink-0">
                <Link to="/account/support" className="text-zinc-500 hover:text-white transition-colors"><ArrowLeft size={20} /></Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider">{ticket.subject}</h1>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ticket.status === 'open' ? 'bg-green-500/10 text-green-400' : ticket.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-zinc-800 text-zinc-400'}`}>{ticket.status}</span>
                    </div>
                    <p className="text-zinc-500 text-xs font-mono mt-1">Ticket #{ticket.id.slice(0, 8)} • Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-[#0A0A0A] border border-[#27272a] rounded-lg overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {ticket.messages.map((msg) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                            <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.isAdmin ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                    {msg.isAdmin ? <Shield size={14} /> : <UserIcon size={14} />}
                                </div>
                                <div className={`max-w-[80%] space-y-0.5 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                    <div className={`px-3 py-2 rounded-lg text-sm leading-relaxed ${isMe ? 'bg-zinc-800 text-white rounded-tr-none' : 'bg-zinc-900 border border-[#27272a] text-zinc-300 rounded-tl-none'}`}>
                                        {msg.message}
                                    </div>
                                    <span className="text-[10px] text-zinc-600 font-mono">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Reply Input */}
                <div className="px-4 py-3 border-t border-[#27272a] bg-[#050505]">
                    <form onSubmit={handleReply} className="flex gap-3">
                        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your reply..." className="flex-1 bg-zinc-900 border border-[#27272a] rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-700 transition-colors placeholder:text-zinc-600" disabled={ticket.status === 'closed'} />
                        <button type="submit" disabled={!message.trim() || replyTicket.isPending || ticket.status === 'closed'} className="bg-white text-black px-4 font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 rounded-sm flex items-center gap-2 text-xs h-8">
                            {replyTicket.isPending ? <SectionLoader className="py-0" size="xs" /> : <Send size={14} />}
                        </button>
                    </form>
                    {ticket.status === 'closed' && <p className="text-center text-xs text-zinc-500 mt-2">This ticket is closed. Please create a new ticket for further assistance.</p>}
                </div>
            </div>
        </div>
    );
}
