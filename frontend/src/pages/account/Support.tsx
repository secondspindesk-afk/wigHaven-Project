import { useState } from 'react';
import { useSupportTickets, useCreateTicket } from '@/lib/hooks/useSupport';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, ChevronRight, AlertCircle, X, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import SectionLoader from '@/components/ui/SectionLoader';
import { formatDistanceToNow } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

const ticketSchema = z.object({
    subject: z.string().min(5, 'Subject must be at least 5 characters'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
    priority: z.enum(['low', 'medium', 'high']),
});

type TicketFormData = z.infer<typeof ticketSchema>;

export default function Support() {
    const [page, _setPage] = useState(1);
    const { data, isLoading, isError, refetch } = useSupportTickets(page);
    const createTicket = useCreateTicket();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const isMobile = useIsMobile();

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TicketFormData>({
        resolver: zodResolver(ticketSchema),
        defaultValues: { priority: 'medium' },
    });

    const onSubmit = (data: TicketFormData) => {
        createTicket.mutate(data, { onSuccess: () => { setIsModalOpen(false); reset(); } });
    };

    const tickets = data?.data || [];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open': return <CheckCircle size={14} className="text-green-400" />;
            case 'pending': return <Clock size={14} className="text-amber-400" />;
            case 'closed': return <AlertTriangle size={14} className="text-zinc-400" />;
            default: return null;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'open': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'closed': return 'bg-zinc-800 text-zinc-400 border-zinc-700';
            default: return 'bg-zinc-800 text-zinc-400';
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500/10 text-red-400';
            case 'medium': return 'bg-blue-500/10 text-blue-400';
            case 'low': return 'bg-zinc-800 text-zinc-400';
            default: return 'bg-zinc-800 text-zinc-400';
        }
    };

    // ==================== MOBILE ====================
    if (isMobile) {
        return (
            <div className="space-y-6 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-white">Support</h1>
                        <p className="text-xs text-zinc-500 mt-0.5">Get help from our team</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2.5 bg-white text-black text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-white/10">
                        <Plus size={16} strokeWidth={2.5} /> New
                    </button>
                </div>

                {/* Loading */}
                {isLoading && <SectionLoader className="py-20" />}

                {/* Error */}
                {isError && (
                    <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-center">
                        <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
                        <p className="text-red-400 text-sm font-medium mb-3">Failed to load tickets</p>
                        <button onClick={() => refetch()} className="px-4 py-2 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg">Retry</button>
                    </div>
                )}

                {/* Empty */}
                {!isLoading && !isError && tickets.length === 0 && (
                    <div className="p-10 bg-gradient-to-b from-zinc-900 to-zinc-900/50 border border-zinc-800/50 rounded-2xl text-center">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare size={28} className="text-zinc-600" />
                        </div>
                        <h2 className="text-lg font-bold text-white mb-2">No Tickets Yet</h2>
                        <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">Need help with something? Create a support ticket and we'll get back to you.</p>
                        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-white text-black text-sm font-bold rounded-xl">Create Ticket</button>
                    </div>
                )}

                {/* Tickets List */}
                {!isLoading && !isError && tickets.length > 0 && (
                    <div className="space-y-3">
                        {tickets.map((ticket) => (
                            <Link
                                key={ticket.id}
                                to={`/account/support/${ticket.id}`}
                                className="block p-4 bg-zinc-900/80 backdrop-blur border border-zinc-800/50 rounded-xl active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm text-white font-semibold truncate mb-1">{ticket.subject}</h3>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusStyle(ticket.status)}`}>{ticket.status}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getPriorityStyle(ticket.priority)}`}>{ticket.priority}</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
                                            <Clock size={10} /> {formatDistanceToNow(new Date(ticket.updatedAt || ticket.createdAt), { addSuffix: true })}
                                            {ticket._count?.messages && <span className="ml-2">• {ticket._count.messages} messages</span>}
                                        </p>
                                    </div>
                                    <ChevronRight size={18} className="text-zinc-600 shrink-0 mt-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Create Ticket Bottom Sheet */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                        <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-5 pb-10 safe-area-pb" onClick={e => e.stopPropagation()}>
                            <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-5" />
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white">New Support Ticket</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                <div>
                                    <label className="block text-[11px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Subject</label>
                                    <input {...register('subject')} className="w-full px-4 py-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition" placeholder="What do you need help with?" />
                                    {errors.subject && <p className="text-xs text-red-400 mt-1.5">{errors.subject.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-[11px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Priority</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['low', 'medium', 'high'].map((p) => (
                                            <label key={p} className="relative">
                                                <input type="radio" {...register('priority')} value={p} className="peer sr-only" />
                                                <div className={`px-3 py-2.5 rounded-xl text-center text-xs font-bold uppercase border cursor-pointer transition peer-checked:border-white peer-checked:bg-white/5 border-zinc-700 hover:border-zinc-600`}>{p}</div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Message</label>
                                    <textarea {...register('message')} rows={4} className="w-full px-4 py-3.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition resize-none" placeholder="Describe your issue in detail..." />
                                    {errors.message && <p className="text-xs text-red-400 mt-1.5">{errors.message.message}</p>}
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-white text-black text-sm font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition">
                                    {isSubmitting && <SectionLoader className="py-0" size="xs" />} Submit Ticket
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ==================== DESKTOP ====================
    if (isLoading) {
        return <SectionLoader className="min-h-[400px]" />;
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <p className="text-red-400 font-medium mb-4">Failed to load support tickets</p>
                <button onClick={() => refetch()} className="px-4 py-2 bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30">Try Again</button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
                    <p className="text-sm text-zinc-500 mt-1">View and manage your support requests</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-white text-black px-5 py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors flex items-center gap-2 rounded">
                    <Plus size={18} strokeWidth={2.5} /> New Ticket
                </button>
            </div>

            {tickets.length === 0 ? (
                <div className="text-center py-24 border border-zinc-800 bg-zinc-900/50 rounded-xl">
                    <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="w-9 h-9 text-zinc-600" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-3">No Support Tickets</h2>
                    <p className="text-zinc-500 text-sm mb-8 max-w-md mx-auto">Need help with your order or have a question? Create a support ticket and our team will assist you.</p>
                    <button onClick={() => setIsModalOpen(true)} className="inline-block bg-white text-black px-8 py-3 text-sm font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors rounded">Create Ticket</button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {tickets.map((ticket) => (
                        <Link
                            key={ticket.id}
                            to={`/account/support/${ticket.id}`}
                            className="group block bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-900 transition-all"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        {getStatusIcon(ticket.status)}
                                        <h3 className="text-white font-semibold group-hover:text-zinc-200 transition-colors truncate">{ticket.subject}</h3>
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(ticket.status)}`}>{ticket.status}</span>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPriorityStyle(ticket.priority)}`}>{ticket.priority}</span>
                                        <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                                            <Clock size={12} /> Updated {formatDistanceToNow(new Date(ticket.updatedAt || ticket.createdAt), { addSuffix: true })}
                                        </span>
                                        {ticket._count?.messages && (
                                            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                                                <MessageSquare size={12} /> {ticket._count.messages} messages
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="text-zinc-600 group-hover:text-white transition-colors shrink-0" size={22} />
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Ticket Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-8 relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20} /></button>
                        <h2 className="text-xl font-bold text-white mb-2">Create Support Ticket</h2>
                        <p className="text-sm text-zinc-500 mb-6">Describe your issue and our team will respond shortly.</p>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div>
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Subject</label>
                                <input {...register('subject')} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600" placeholder="Brief summary of your issue" />
                                {errors.subject && <p className="text-xs text-red-400 mt-1">{errors.subject.message}</p>}
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Priority</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['low', 'medium', 'high'].map((p) => (
                                        <label key={p} className="relative">
                                            <input type="radio" {...register('priority')} value={p} className="peer sr-only" />
                                            <div className={`px-4 py-2.5 rounded-lg text-center text-xs font-bold uppercase cursor-pointer transition border peer-checked:border-white peer-checked:bg-white/10 border-zinc-700 hover:border-zinc-600`}>{p}</div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Message</label>
                                <textarea {...register('message')} rows={5} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors resize-none placeholder:text-zinc-600" placeholder="Describe your issue in detail..." />
                                {errors.message && <p className="text-xs text-red-400 mt-1">{errors.message.message}</p>}
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-white text-black font-bold text-sm uppercase tracking-wider py-3.5 rounded-lg hover:bg-zinc-200 transition-colors mt-4 flex items-center justify-center gap-2">
                                {isSubmitting && <SectionLoader className="py-0" size="xs" />} Submit Ticket
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
