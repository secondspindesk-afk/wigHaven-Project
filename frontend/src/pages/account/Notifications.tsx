import { useNotifications } from '@/lib/hooks/useNotifications';
import { Bell, Check, Trash2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function Notifications() {
    const {
        notifications,
        meta,
        isLoading,
        markAsRead,
        markAllAsRead,
        clearAll,
        deleteNotification
    } = useNotifications();
    const isMobile = useIsMobile();

    const unreadCount = meta?.unread || 0;
    const totalCount = meta?.total || 0;

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-white">Notifications</h1>
                        <p className="text-xs text-zinc-500">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="p-2 text-zinc-500 active:text-white"
                            >
                                <Check size={18} />
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={() => clearAll()}
                                className="p-2 text-zinc-500 active:text-red-400"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Notifications List */}
                <div className="bg-zinc-900 rounded-xl overflow-hidden">
                    {isLoading && notifications.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            <Bell size={20} className="mx-auto mb-2 animate-pulse" />
                            <p className="text-xs">Loading...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500">
                            <Bell size={24} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm text-zinc-400 mb-1">No notifications yet</p>
                            <p className="text-xs">You'll see order updates and more here</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800">
                            {notifications.map((notification) => {
                                // Normalize links
                                let normalizedLink = notification.link;
                                if (normalizedLink === '/profile') normalizedLink = '/account/profile';
                                else if (normalizedLink?.startsWith('/orders/')) normalizedLink = '/account' + normalizedLink;

                                const isOrderLink = normalizedLink?.includes('/orders/');
                                const isProductLink = normalizedLink?.includes('/products/');
                                const showLink = isOrderLink || isProductLink;

                                return (
                                    <div
                                        key={notification.id}
                                        className={`p-4 ${!notification.isRead ? 'bg-zinc-800/30' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!notification.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h3 className={`text-sm font-medium ${!notification.isRead ? 'text-white' : 'text-zinc-400'}`}>
                                                        {notification.title}
                                                    </h3>
                                                    <button
                                                        onClick={() => deleteNotification(notification.id)}
                                                        className="p-1 text-zinc-600 active:text-red-400 flex-shrink-0"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>

                                                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>

                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-[10px] text-zinc-600">
                                                        {(() => {
                                                            try { return formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }); }
                                                            catch { return 'Just now'; }
                                                        })()}
                                                    </span>

                                                    {showLink && normalizedLink && (
                                                        <Link
                                                            to={normalizedLink}
                                                            onClick={() => { if (!notification.isRead) markAsRead(notification.id); }}
                                                            className="text-[10px] text-blue-400 flex items-center gap-0.5"
                                                        >
                                                            View <ChevronRight size={12} />
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {totalCount > 0 && (
                    <p className="text-center text-[10px] text-zinc-600">
                        {notifications.length} of {totalCount}
                    </p>
                )}
            </div>
        );
    }

    // Desktop Layout
    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-xl font-bold text-white uppercase tracking-widest">Notifications</h1>
                    <p className="text-zinc-500 text-xs mt-1">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
                </div>

                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button onClick={() => markAllAsRead()} className="text-xs text-zinc-500 hover:text-white uppercase tracking-wide transition-colors flex items-center gap-1">
                            <Check size={14} /> Mark all read
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button onClick={() => clearAll()} className="text-xs text-zinc-500 hover:text-red-400 uppercase tracking-wide transition-colors flex items-center gap-1">
                            <Trash2 size={14} /> Clear all
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg overflow-hidden">
                {isLoading && notifications.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500">
                        <Bell size={24} className="mx-auto mb-3 opacity-50 animate-pulse" />
                        <p className="text-xs uppercase tracking-wide">Loading notifications...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500">
                        <Bell size={32} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm font-medium text-zinc-400">No notifications yet</p>
                        <p className="text-xs mt-1">You'll see order updates, payment confirmations, and more here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#27272a]">
                        {notifications.map((notification) => {
                            let normalizedLink = notification.link;
                            if (normalizedLink === '/profile') normalizedLink = '/account/profile';
                            else if (normalizedLink?.startsWith('/orders/')) normalizedLink = '/account' + normalizedLink;

                            const isOrderLink = normalizedLink?.includes('/orders/');
                            const isProductLink = normalizedLink?.includes('/products/');

                            return (
                                <div key={notification.id} className={`p-5 hover:bg-zinc-900/50 transition-colors relative group ${!notification.isRead ? 'bg-zinc-900/30' : ''}`}>
                                    <div className="flex gap-4">
                                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notification.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-4">
                                                <h3 className={`text-sm font-medium ${!notification.isRead ? 'text-white' : 'text-zinc-400'}`}>{notification.title}</h3>
                                                <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0">
                                                    {(() => { try { return formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }); } catch { return 'Just now'; } })()}
                                                </span>
                                            </div>

                                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{notification.message}</p>

                                            {notification.link && (isOrderLink || isProductLink) && (
                                                <Link
                                                    to={normalizedLink!}
                                                    onClick={() => { if (!notification.isRead) markAsRead(notification.id); }}
                                                    className="inline-block mt-3 text-[10px] text-blue-400 hover:text-blue-300 uppercase tracking-wide font-mono"
                                                >
                                                    {isOrderLink ? 'View Order →' : 'View Product →'}
                                                </Link>
                                            )}
                                        </div>

                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                            {!notification.isRead && (
                                                <button onClick={() => markAsRead(notification.id)} className="p-1 text-zinc-500 hover:text-white rounded" title="Mark as read"><Check size={14} /></button>
                                            )}
                                            <button onClick={() => deleteNotification(notification.id)} className="p-1 text-zinc-500 hover:text-red-400 rounded" title="Delete"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {totalCount > 0 && (
                <div className="mt-4 text-center text-xs text-zinc-600">Showing {notifications.length} of {totalCount} notifications</div>
            )}
        </div>
    );
}
