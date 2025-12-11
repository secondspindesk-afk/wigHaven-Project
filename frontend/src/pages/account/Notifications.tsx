import { useNotifications } from '@/lib/hooks/useNotifications';
import { Bell, Check, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

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

    const unreadCount = meta?.unread || 0;
    const totalCount = meta?.total || 0;

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        to="/account"
                        className="text-zinc-500 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-widest">
                            Notifications
                        </h1>
                        <p className="text-zinc-500 text-xs mt-1">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button
                            onClick={() => markAllAsRead()}
                            className="text-xs text-zinc-500 hover:text-white uppercase tracking-wide transition-colors flex items-center gap-1"
                        >
                            <Check size={14} />
                            Mark all read
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button
                            onClick={() => clearAll()}
                            className="text-xs text-zinc-500 hover:text-red-400 uppercase tracking-wide transition-colors flex items-center gap-1"
                        >
                            <Trash2 size={14} />
                            Clear all
                        </button>
                    )}
                </div>
            </div>

            {/* Notifications List */}
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
                        <p className="text-xs mt-1">
                            You'll see order updates, payment confirmations, and more here
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#27272a]">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-5 hover:bg-zinc-900/50 transition-colors relative group ${!notification.isRead ? 'bg-zinc-900/30' : ''
                                    }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notification.isRead ? 'bg-blue-500' : 'bg-transparent'
                                        }`} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-4">
                                            <h3 className={`text-sm font-medium ${!notification.isRead ? 'text-white' : 'text-zinc-400'
                                                }`}>
                                                {notification.title}
                                            </h3>
                                            <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0">
                                                {(() => {
                                                    try {
                                                        return formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });
                                                    } catch {
                                                        return 'Just now';
                                                    }
                                                })()}
                                            </span>
                                        </div>

                                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                                            {notification.message}
                                        </p>

                                        {/* Only show link for meaningful detail pages */}
                                        {notification.link && (() => {
                                            // Normalize old notification links (fix /profile → /account/profile)
                                            let normalizedLink = notification.link;
                                            if (normalizedLink === '/profile') {
                                                normalizedLink = '/account/profile';
                                            } else if (normalizedLink.startsWith('/orders/')) {
                                                normalizedLink = '/account' + normalizedLink;
                                            }

                                            // Only show link for actual detail pages (orders, specific items)
                                            const isOrderLink = normalizedLink.includes('/orders/');
                                            const isProductLink = normalizedLink.includes('/products/');

                                            if (!isOrderLink && !isProductLink) {
                                                return null; // Skip generic links like /profile
                                            }

                                            const linkText = isOrderLink ? 'View Order →' : 'View Product →';

                                            return (
                                                <Link
                                                    to={normalizedLink}
                                                    onClick={() => {
                                                        if (!notification.isRead) markAsRead(notification.id);
                                                    }}
                                                    className="inline-block mt-3 text-[10px] text-blue-400 hover:text-blue-300 uppercase tracking-wide font-mono"
                                                >
                                                    {linkText}
                                                </Link>
                                            );
                                        })()}
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                        {!notification.isRead && (
                                            <button
                                                onClick={() => markAsRead(notification.id)}
                                                className="p-1 text-zinc-500 hover:text-white rounded transition-colors"
                                                title="Mark as read"
                                            >
                                                <Check size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notification.id)}
                                            className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {totalCount > 0 && (
                <div className="mt-4 text-center text-xs text-zinc-600">
                    Showing {notifications.length} of {totalCount} notifications
                </div>
            )}
        </div>
    );
}
