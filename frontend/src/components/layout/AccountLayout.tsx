import { Outlet, Link, useLocation } from 'react-router-dom';
import { useUser } from '@/lib/hooks/useUser';
import { useLogout } from '@/lib/hooks/useLogout';
import {
    LayoutDashboard,
    ShoppingBag,
    Heart,
    MapPin,
    User as UserIcon,
    LogOut,
    HeadphonesIcon,
    Mail,
    MoreHorizontal,
    Bell
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { useNotifications } from '@/lib/hooks/useNotifications';

export default function AccountLayout() {
    const { data: user } = useUser();
    const logoutMutation = useLogout();
    const location = useLocation();
    const isMobile = useIsMobile();
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const { meta } = useNotifications();
    const unreadCount = meta?.unread || 0;

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/account', mobileLabel: 'Home' },
        { icon: ShoppingBag, label: 'Orders', path: '/account/orders', mobileLabel: 'Orders' },
        { icon: Heart, label: 'Wishlist', path: '/account/wishlist', mobileLabel: 'Wishlist' },
        { icon: MapPin, label: 'Addresses', path: '/account/addresses', mobileLabel: 'Address' },
        { icon: UserIcon, label: 'Profile', path: '/account/profile', mobileLabel: 'Profile' },
        { icon: HeadphonesIcon, label: 'Support', path: '/account/support', mobileLabel: 'Support' },
        { icon: Mail, label: 'Email Preferences', path: '/account/email-preferences', mobileLabel: 'Email' },
    ];

    // Bottom nav items (first 4 + more menu)
    const bottomNavItems = menuItems.slice(0, 4);
    const moreMenuItems = menuItems.slice(4);

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="min-h-screen bg-[#050505] pb-20">
                {/* Mobile Header */}
                <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-sm border-b border-zinc-800">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold text-sm">
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </div>
                            <div>
                                <h1 className="text-sm font-bold text-white">{user?.firstName}</h1>
                                <p className="text-[10px] text-zinc-500 truncate max-w-[150px]">{user?.email}</p>
                            </div>
                        </div>
                        <Link
                            to="/account/notifications"
                            className="relative p-2 text-zinc-400"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {/* Main Content */}
                <main className="px-4 py-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Outlet />
                    </motion.div>
                </main>

                {/* Bottom Navigation */}
                <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-zinc-800 pb-safe">
                    <div className="flex items-center justify-around py-2">
                        {bottomNavItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex flex-col items-center gap-1 px-3 py-2 min-w-[64px] transition-colors ${isActive ? 'text-white' : 'text-zinc-500'
                                        }`}
                                >
                                    <item.icon size={20} />
                                    <span className="text-[10px] font-medium">{item.mobileLabel}</span>
                                </Link>
                            );
                        })}
                        <button
                            onClick={() => setMoreMenuOpen(true)}
                            className={`flex flex-col items-center gap-1 px-3 py-2 min-w-[64px] transition-colors ${moreMenuItems.some(i => location.pathname === i.path) ? 'text-white' : 'text-zinc-500'
                                }`}
                        >
                            <MoreHorizontal size={20} />
                            <span className="text-[10px] font-medium">More</span>
                        </button>
                    </div>
                </nav>

                {/* More Menu Sheet */}
                {moreMenuOpen && createPortal(
                    <div
                        className="fixed inset-0 z-[9999] bg-black/60"
                        onClick={() => setMoreMenuOpen(false)}
                    >
                        <div
                            className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] rounded-t-2xl animate-slideUp"
                            onClick={(e) => e.stopPropagation()}
                            style={{ animation: 'slideUp 0.3s ease-out' }}
                        >
                            <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto my-3" />

                            <div className="p-4 space-y-1">
                                {moreMenuItems.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setMoreMenuOpen(false)}
                                            className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-colors ${isActive ? 'bg-white text-black' : 'text-zinc-300 active:bg-zinc-800'
                                                }`}
                                        >
                                            <item.icon size={20} />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    );
                                })}

                                <div className="pt-4 mt-4 border-t border-zinc-800">
                                    <button
                                        onClick={() => {
                                            setMoreMenuOpen(false);
                                            logoutMutation.mutate();
                                        }}
                                        className="flex items-center gap-4 px-4 py-4 rounded-xl text-red-400 active:bg-red-500/10 w-full"
                                    >
                                        <LogOut size={20} />
                                        <span className="font-medium">Logout</span>
                                    </button>
                                </div>
                            </div>

                            <div className="h-8" />
                        </div>
                    </div>,
                    document.body
                )}

                <style>{`
                    @keyframes slideUp {
                        from { transform: translateY(100%); }
                        to { transform: translateY(0); }
                    }
                `}</style>
            </div>
        );
    }

    // Desktop Layout
    return (
        <div className="min-h-screen bg-[#050505] pt-24 pb-12">
            <div className="container px-4">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar */}
                    <aside className="w-full lg:w-64 flex-shrink-0">
                        <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-6 sticky top-24">
                            {/* User Info */}
                            <div className="flex items-center gap-3 mb-8 pb-8 border-b border-[#27272a]">
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold text-lg">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">{user?.firstName} {user?.lastName}</h3>
                                    <p className="text-zinc-500 text-xs truncate max-w-[120px]">{user?.email}</p>
                                </div>
                            </div>

                            {/* Navigation */}
                            <nav className="space-y-1">
                                {menuItems.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${isActive
                                                ? 'bg-white text-black'
                                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                                                }`}
                                        >
                                            <item.icon size={16} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* Logout */}
                            <div className="mt-8 pt-8 border-t border-[#27272a]">
                                <button
                                    onClick={() => logoutMutation.mutate()}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Outlet />
                        </motion.div>
                    </main>
                </div>
            </div>
        </div>
    );
}
