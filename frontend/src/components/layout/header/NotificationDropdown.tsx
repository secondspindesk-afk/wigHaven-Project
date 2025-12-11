import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Check, Trash2 } from 'lucide-react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationDropdown() {
    const { notifications, meta, markAsRead, markAllAsRead, clearAll, deleteNotification } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    // Close on click outside (desktop only)
    useEffect(() => {
        if (isMobile) return;

        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile]);

    // Prevent body scroll when mobile modal is open
    useEffect(() => {
        if (isMobile && isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobile, isOpen]);

    const unreadCount = meta?.unread || 0;

    const NotificationList = () => (
        <>
            {notifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                    <Bell size={32} className="mx-auto mb-3 opacity-20" />
                    <p className={`uppercase tracking-wide ${isMobile ? 'text-sm' : 'text-xs font-mono'}`}>
                        No notifications
                    </p>
                </div>
            ) : (
                <div className={`divide-y ${isMobile ? 'divide-zinc-800' : 'divide-[#27272a]'}`}>
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-4 transition-colors relative ${!notification.isRead ? (isMobile ? 'bg-zinc-900/40' : 'bg-zinc-900/20') : ''} ${isMobile ? 'active:bg-zinc-800' : 'hover:bg-zinc-900/50 group'}`}
                        >
                            <div className="flex gap-3">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!notification.isRead ? 'bg-blue-500' : 'bg-transparent'}`} />
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`font-medium ${!notification.isRead ? 'text-white' : 'text-zinc-400'} ${isMobile ? 'text-sm' : 'text-xs'}`}>
                                            {notification.title}
                                        </h4>
                                        <span className={`text-zinc-600 flex-shrink-0 ml-2 ${isMobile ? 'text-xs' : 'text-[10px] font-mono'}`}>
                                            {(() => {
                                                try {
                                                    return formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });
                                                } catch {
                                                    return 'Just now';
                                                }
                                            })()}
                                        </span>
                                    </div>
                                    <p className={`text-zinc-500 leading-relaxed ${isMobile ? 'text-sm' : 'text-xs'}`}>
                                        {notification.message}
                                    </p>
                                    {notification.link && (
                                        <Link
                                            to={notification.link}
                                            onClick={() => {
                                                if (!notification.isRead) markAsRead(notification.id);
                                                setIsOpen(false);
                                            }}
                                            className={`inline-block mt-2 text-blue-400 uppercase tracking-wide ${isMobile ? 'text-sm py-2' : 'text-[10px] font-mono hover:text-blue-300'}`}
                                        >
                                            View Details →
                                        </Link>
                                    )}
                                </div>

                                {/* Actions - always visible on mobile, hover on desktop */}
                                <div className={`flex flex-col gap-2 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                                    {!notification.isRead && (
                                        <button
                                            onClick={() => markAsRead(notification.id)}
                                            className={`text-zinc-500 ${isMobile ? 'p-2 active:bg-zinc-700 rounded-full' : 'hover:text-white'}`}
                                            title="Mark as read"
                                        >
                                            <Check size={isMobile ? 18 : 14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteNotification(notification.id)}
                                        className={`text-zinc-500 ${isMobile ? 'p-2 active:bg-zinc-700 rounded-full' : 'hover:text-red-400'}`}
                                        title="Delete"
                                    >
                                        <X size={isMobile ? 18 : 14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    // Mobile modal - rendered via portal to body
    const MobileModal = () => {
        if (!isMobile || !isOpen) return null;

        return createPortal(
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]"
                onClick={() => setIsOpen(false)}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-0 left-0 right-0 bg-[#121212] rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up"
                    style={{
                        animation: 'slideUp 0.3s ease-out forwards',
                    }}
                >
                    {/* Handle bar */}
                    <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 mb-2" />

                    {/* Header */}
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-white">
                            Notifications {unreadCount > 0 && `(${unreadCount})`}
                        </h3>
                        <div className="flex gap-4">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsRead()}
                                    className="text-sm text-zinc-400 active:text-white"
                                >
                                    Mark all read
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={() => clearAll()}
                                    className="text-sm text-red-400 active:text-red-300"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="overflow-y-auto flex-1">
                        <NotificationList />
                    </div>

                    {/* Close button */}
                    <div className="p-4 border-t border-zinc-800">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full py-3 bg-zinc-800 rounded-lg text-sm font-medium text-white active:bg-zinc-700"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <style>{`
                    @keyframes slideUp {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                `}</style>
            </div>,
            document.body
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-zinc-500 hover:text-white transition-colors p-1 md:p-2"
            >
                <Bell className="w-[18px] h-[18px] md:w-5 md:h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 md:top-1 md:right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#050505]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Mobile modal via portal */}
            <MobileModal />

            {/* Desktop dropdown - inline */}
            <AnimatePresence>
                {isOpen && !isMobile && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-2 w-96 bg-[#0A0A0A] border border-[#27272a] shadow-2xl rounded-sm z-[9999] flex flex-col max-h-[80vh]"
                    >
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
                            <NotificationList />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
