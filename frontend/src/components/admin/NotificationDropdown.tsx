import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, Check, CheckCheck, Trash2, X,
    Package, ShoppingCart, AlertTriangle, Star,
    CreditCard, MessageSquare, TrendingUp
} from 'lucide-react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
    className?: string;
}

// Notification type icons
const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
    order_placed: <ShoppingCart size={14} />,
    order_payment_confirmed: <CreditCard size={14} />,
    order_status: <Package size={14} />,
    order_cancelled: <X size={14} />,
    order_refunded: <CreditCard size={14} />,
    admin_new_order: <ShoppingCart size={14} />,
    admin_low_stock: <AlertTriangle size={14} />,
    admin_out_of_stock: <AlertTriangle size={14} />,
    admin_new_review: <Star size={14} />,
    admin_payment_failed: <CreditCard size={14} />,
    admin_milestone: <TrendingUp size={14} />,
    back_in_stock: <Package size={14} />,
    review_approved: <Star size={14} />,
    review_rejected: <Star size={14} />,
    promotional: <MessageSquare size={14} />,
    sale_alert: <TrendingUp size={14} />,
    welcome: <MessageSquare size={14} />,
    security: <AlertTriangle size={14} />,
};

// Notification type colors
const NOTIFICATION_COLORS: Record<string, string> = {
    order_placed: 'text-emerald-400',
    order_payment_confirmed: 'text-emerald-400',
    admin_new_order: 'text-emerald-400',
    admin_low_stock: 'text-amber-400',
    admin_out_of_stock: 'text-red-400',
    admin_new_review: 'text-yellow-400',
    admin_payment_failed: 'text-red-400',
    admin_milestone: 'text-purple-400',
    order_cancelled: 'text-red-400',
    order_refunded: 'text-zinc-400',
    security: 'text-red-400',
    promotional: 'text-blue-400',
};

export function NotificationDropdown({ className = '' }: NotificationDropdownProps) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const {
        notifications,
        meta,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll
    } = useNotifications();

    const unreadCount = meta?.unread || 0;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Handle notification click
    const handleNotificationClick = (notification: any) => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    // Format time
    const formatTime = (date: string) => {
        try {
            return formatDistanceToNow(new Date(date), { addSuffix: true });
        } catch {
            return 'Just now';
        }
    };

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-zinc-500 hover:text-white transition-colors"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <Bell size={18} strokeWidth={1.5} />

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[14px] h-[14px] px-1 bg-white text-black text-[9px] font-bold rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <div
                        className="fixed inset-0 z-40 lg:hidden"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#050505] border border-[#27272a] shadow-2xl z-50 max-h-[70vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-white">
                                    Notifications
                                </h3>
                                {unreadCount > 0 && (
                                    <span className="px-1.5 py-0.5 bg-white text-black text-[9px] font-bold rounded">
                                        {unreadCount} new
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={() => markAllAsRead()}
                                        className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                                        title="Mark all as read"
                                    >
                                        <CheckCheck size={14} />
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Clear all notifications?')) {
                                                clearAll();
                                            }
                                        }}
                                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                                        title="Clear all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-5 h-5 border border-zinc-600 border-t-white rounded-full animate-spin" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4">
                                    <Bell size={32} className="text-zinc-700 mb-3" />
                                    <p className="text-xs text-zinc-500 text-center">
                                        No notifications yet
                                    </p>
                                    <p className="text-[10px] text-zinc-600 text-center mt-1">
                                        You'll see new orders, reviews, and alerts here
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-[#27272a]">
                                    {notifications.slice(0, 20).map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`group relative flex gap-3 p-3 cursor-pointer transition-colors ${notification.isRead
                                                    ? 'hover:bg-[#0A0A0A]'
                                                    : 'bg-zinc-900/50 hover:bg-zinc-900'
                                                }`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            {/* Icon */}
                                            <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-zinc-800 ${NOTIFICATION_COLORS[notification.type] || 'text-zinc-400'
                                                }`}>
                                                {NOTIFICATION_ICONS[notification.type] || <Bell size={14} />}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs line-clamp-2 ${notification.isRead ? 'text-zinc-400' : 'text-white'
                                                    }`}>
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-zinc-600 mt-1">
                                                    {formatTime(notification.createdAt)}
                                                </p>
                                            </div>

                                            {/* Unread indicator */}
                                            {!notification.isRead && (
                                                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-white mt-1" />
                                            )}

                                            {/* Actions (visible on hover) */}
                                            <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1">
                                                {!notification.isRead && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(notification.id);
                                                        }}
                                                        className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                                                        title="Mark as read"
                                                    >
                                                        <Check size={12} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification.id);
                                                    }}
                                                    className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-4 py-2 border-t border-[#27272a]">
                                <button
                                    onClick={() => {
                                        navigate('/admin/notifications');
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-center text-[10px] text-zinc-500 hover:text-white uppercase tracking-wider transition-colors"
                                >
                                    View All Notifications
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default NotificationDropdown;
