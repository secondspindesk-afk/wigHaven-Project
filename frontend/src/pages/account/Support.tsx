import { useState } from 'react';
import { useSupportTickets, useCreateTicket } from '@/lib/hooks/useSupport';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<TicketFormData>({
        resolver: zodResolver(ticketSchema),
        defaultValues: {
            priority: 'medium',
        },
    });

    const onSubmit = (data: TicketFormData) => {
        createTicket.mutate(data, {
            onSuccess: () => {
                setIsModalOpen(false);
                reset();
            },
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <p className="text-red-400 font-medium mb-4">Failed to load support tickets</p>
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const tickets = data?.data || [];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-xl font-bold text-white uppercase tracking-wider">Support Tickets</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} />
                    New Ticket
                </button>
            </div>

            {tickets.length === 0 ? (
                <div className="text-center py-24 border border-[#27272a] bg-[#0A0A0A] rounded-lg">
                    <MessageSquare className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
                    <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-3">No Support Tickets</h2>
                    <p className="text-zinc-500 text-sm font-mono mb-8">
                        Need help? Create a support ticket and our team will assist you.
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-block bg-white text-black px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                    >
                        Create Ticket
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {tickets.map((ticket) => (
                        <Link
                            key={ticket.id}
                            to={`/account/support/${ticket.id}`}
                            className="block bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6 hover:border-zinc-600 transition-colors group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-white font-bold text-sm group-hover:text-zinc-300 transition-colors">
                                            {ticket.subject}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ticket.status === 'open' ? 'bg-green-500/10 text-green-400' :
                                            ticket.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                                                'bg-zinc-800 text-zinc-400'
                                            }`}>
                                            {ticket.status}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ticket.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                                            ticket.priority === 'medium' ? 'bg-blue-500/10 text-blue-400' :
                                                'bg-zinc-800 text-zinc-400'
                                            }`}>
                                            {ticket.priority}
                                        </span>
                                    </div>
                                    <p className="text-zinc-500 text-xs font-mono">
                                        Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                                <ChevronRight className="text-zinc-600 group-hover:text-white transition-colors" size={20} />
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Ticket Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg w-full max-w-lg p-8 relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                        >
                            <AlertCircle size={20} className="rotate-45" /> {/* Using AlertCircle as close icon placeholder if X not imported, but X is better */}
                        </button>

                        <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6">Create Support Ticket</h2>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Subject</label>
                                <input
                                    {...register('subject')}
                                    className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                                    placeholder="Brief summary of your issue"
                                />
                                {errors.subject && <p className="text-xs text-red-400">{errors.subject.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Priority</label>
                                <select
                                    {...register('priority')}
                                    className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Message</label>
                                <textarea
                                    {...register('message')}
                                    rows={5}
                                    className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                                    placeholder="Describe your issue in detail..."
                                />
                                {errors.message && <p className="text-xs text-red-400">{errors.message.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-sm hover:bg-zinc-200 transition-colors mt-6 flex items-center justify-center gap-2"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Submit Ticket
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
