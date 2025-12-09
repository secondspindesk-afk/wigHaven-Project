import { useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Clock, Send, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEmailLogs, useEmailStats, useRetryEmail } from '@/lib/hooks/useEmails';
import { useToast } from '@/contexts/ToastContext';
import { format } from 'date-fns';

export default function EmailList() {
    const { showToast } = useToast();
    const [page, setPage] = useState(1);

    // API
    const { data: logsData, isLoading: logsLoading, isError: logsError, refetch: refetchLogs } = useEmailLogs({
        page,
        limit: 20
    });
    const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useEmailStats();
    const retryMutation = useRetryEmail();

    const logs = logsData?.logs || [];
    const pagination = logsData?.pagination || { page: 1, pages: 1, total: 0 };

    const handleRetry = async (id?: string) => {
        try {
            const result = await retryMutation.mutateAsync(id);
            showToast(`Requeued ${result.requeuedCount} emails`, 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to retry emails', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] p-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Email Management</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                        SYSTEM NOTIFICATIONS & LOGS
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => refetchLogs()}
                        className="p-2 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                    >
                        <RefreshCw size={16} className={logsLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {(logsError || statsError) && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={16} className="text-red-500" />
                        <span className="text-sm text-red-400">Failed to load some data</span>
                    </div>
                    <button
                        onClick={() => { refetchLogs(); refetchStats(); }}
                        className="text-xs text-red-400 hover:text-red-300 underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#0A0A0A] border border-[#27272a] p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Send size={16} className="text-blue-500" />
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Total Sent</span>
                    </div>
                    <span className="text-2xl text-white font-mono font-medium">
                        {statsLoading ? '--' : (stats?.sent ?? 0).toLocaleString()}
                    </span>
                </div>
                <div className="bg-[#0A0A0A] border border-[#27272a] p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock size={16} className="text-amber-500" />
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">In Queue</span>
                    </div>
                    <span className="text-2xl text-white font-mono font-medium">
                        {statsLoading ? '--' : (stats?.queue?.waiting ?? 0).toLocaleString()}
                    </span>
                </div>
                <div className="bg-[#0A0A0A] border border-[#27272a] p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertCircle size={16} className="text-red-500" />
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Failed</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-2xl text-white font-mono font-medium">
                            {statsLoading ? '--' : (stats?.failed ?? 0).toLocaleString()}
                        </span>
                        {(stats?.failed ?? 0) > 0 && (
                            <button
                                onClick={() => handleRetry()}
                                disabled={retryMutation.isPending}
                                className="text-[10px] text-red-400 hover:text-red-300 underline disabled:opacity-50"
                            >
                                {retryMutation.isPending ? 'Retrying...' : 'Retry All'}
                            </button>
                        )}
                    </div>
                </div>
                <div className="bg-[#0A0A0A] border border-[#27272a] p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircle size={16} className="text-emerald-500" />
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Success Rate</span>
                    </div>
                    <span className="text-2xl text-white font-mono font-medium">
                        {statsLoading ? '--%' : `${(((stats?.sent ?? 0) / (stats?.total || 1)) * 100).toFixed(1)}%`}
                    </span>
                </div>
            </div>

            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wide">Email Logs</h2>
                <span className="text-xs text-zinc-500 font-mono">
                    {pagination.total} total emails
                </span>
            </div>

            {/* Email Logs Table */}
            <div className="bg-[#0A0A0A] border border-[#27272a] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[#27272a]">
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Recipient</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Subject</th>
                                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-right text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logsLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="border-b border-[#27272a]">
                                        {[...Array(6)].map((_, j) => (
                                            <td key={j} className="px-4 py-4">
                                                <div className="h-4 bg-zinc-800 rounded animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 text-sm">
                                        No email logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="border-b border-[#27272a] hover:bg-zinc-900/50 transition-colors">
                                        <td className="px-4 py-4">
                                            {log.status === 'sent' && <span className="text-emerald-500 text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle size={12} /> Sent</span>}
                                            {log.status === 'failed' && <span className="text-red-500 text-[10px] font-bold uppercase flex items-center gap-1"><AlertCircle size={12} /> Failed</span>}
                                            {log.status === 'pending' && <span className="text-amber-500 text-[10px] font-bold uppercase flex items-center gap-1"><Clock size={12} /> Pending</span>}
                                        </td>
                                        <td className="px-4 py-4 text-xs text-zinc-300 font-mono uppercase">{log.type}</td>
                                        <td className="px-4 py-4 text-xs text-white font-mono">{log.toEmail}</td>
                                        <td className="px-4 py-4 text-xs text-zinc-400">{log.subject}</td>
                                        <td className="px-4 py-4 text-[10px] text-zinc-500 font-mono">
                                            {format(new Date(log.createdAt), 'MMM dd, HH:mm')}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {log.status === 'failed' && (
                                                <button
                                                    onClick={() => handleRetry(log.id)}
                                                    disabled={retryMutation.isPending}
                                                    className="text-zinc-400 hover:text-white transition-colors"
                                                    title="Retry"
                                                >
                                                    <RotateCcw size={14} className={retryMutation.isPending ? 'animate-spin' : ''} />
                                                </button>
                                            )}
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
    );
}
