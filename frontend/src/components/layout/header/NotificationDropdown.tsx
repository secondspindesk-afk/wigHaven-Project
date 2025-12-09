import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Trash2 } from 'lucide-react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationDropdown() {
    const { notifications, meta, markAsRead, markAllAsRead, clearAll, deleteNotification } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = meta?.unread || 0;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-zinc-500 hover:text-white transition-colors p-2"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#050505]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-[#0A0A0A] border border-[#27272a] shadow-2xl rounded-sm z-50 flex flex-col max-h-[80vh]">
                    {/* Header */}
                    <div className="p-4 border-b border-[#27272a] flex items-center justify-between bg-[#050505]">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                            Notifications ({unreadCount})
                        </h3>
                        <div className="flex gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsRead()}
                                    className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-wide transition-colors"
                                    title="Mark all as read"
                                >
                                    <Check size={14} />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={() => clearAll()}
                                    className="text-[10px] text-zinc-500 hover:text-red-400 uppercase tracking-wide transition-colors"
                                    title="Clear all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500">
                                <Bell size={24} className="mx-auto mb-3 opacity-20" />
                                <p className="text-xs uppercase tracking-wide font-mono">No notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#27272a]">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-zinc-900/50 transition-colors relative group ${!notification.isRead ? 'bg-zinc-900/20' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!notification.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className={`text-xs font-medium ${!notification.isRead ? 'text-white' : 'text-zinc-400'}`}>
                                                        {notification.title}
                                                    </h4>
                                                    <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0 ml-2">
                                                        {(() => {
                                                            try {
                                                                return formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });
                                                            } catch (e) {
                                                                return 'Just now';
                                                            }
                                                        })()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-zinc-500 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                {notification.link && (
                                                    <Link
                                                        to={notification.link}
                                                        onClick={() => {
                                                            if (!notification.isRead) markAsRead(notification.id);
                                                            setIsOpen(false);
                                                        }}
                                                        className="inline-block mt-2 text-[10px] text-blue-400 hover:text-blue-300 uppercase tracking-wide font-mono"
                                                    >
                                                        View Details →
                                                    </Link>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                                {!notification.isRead && (
                                                    <button
                                                        onClick={() => markAsRead(notification.id)}
                                                        className="text-zinc-500 hover:text-white"
                                                        title="Mark as read"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteNotification(notification.id)}
                                                    className="text-zinc-500 hover:text-red-400"
                                                    title="Delete"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
