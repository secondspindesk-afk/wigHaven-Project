import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { User, LogOut, Package, Heart, LayoutDashboard } from 'lucide-react';
import { useUser } from '@/lib/hooks/useUser';
import { useLogout } from '@/lib/hooks/useLogout';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserMenu() {
    const { data: user, isLoading } = useUser();
    const logoutMutation = useLogout();
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

    // Show nothing while loading to prevent flicker
    if (isLoading) return null;

    if (!user) {
        return (
            <Link to="/login" className="text-zinc-500 hover:text-white transition-colors">
                <User className="w-[18px] h-[18px] md:w-5 md:h-5" />
            </Link>
        );
    }

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';

    const menuItems = [
        ...(isAdmin ? [{ to: '/admin', icon: LayoutDashboard, label: 'Admin Panel' }] : []),
        { to: '/account', icon: User, label: 'Profile' },
        { to: '/account/orders', icon: Package, label: 'Orders' },
        { to: '/account/wishlist', icon: Heart, label: 'Wishlist' },
    ];

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
                    className="absolute bottom-0 left-0 right-0 bg-[#121212] rounded-t-2xl"
                    style={{
                        animation: 'slideUp 0.3s ease-out forwards',
                    }}
                >
                    {/* Handle bar */}
                    <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mt-3 mb-2" />

                    {/* User info */}
                    <div className="px-6 py-4 border-b border-zinc-800">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                                <span className="text-lg font-bold text-white">
                                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                </span>
                            </div>
                            <div>
                                <p className="text-base font-semibold text-white">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-sm text-zinc-500">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-2">
                        {menuItems.map((item) => (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-4 px-6 py-4 text-base text-zinc-300 active:bg-zinc-800"
                            >
                                <item.icon size={20} />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-zinc-800 py-2">
                        <button
                            onClick={() => {
                                logoutMutation.mutate();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-4 px-6 py-4 text-base text-red-400 active:bg-zinc-800"
                        >
                            <LogOut size={20} />
                            Logout
                        </button>
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
                className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
            >
                <div className="w-7 h-7 md:w-8 md:h-8 bg-zinc-900 rounded-full flex items-center justify-center border border-[#27272a] group-hover:border-zinc-500 transition-colors">
                    <span className="text-[10px] md:text-xs font-bold font-mono text-white">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </span>
                </div>
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
                        className="absolute top-full right-0 mt-2 w-56 bg-[#0A0A0A] border border-[#27272a] shadow-xl py-2 z-[9999]"
                    >
                        <div className="px-4 py-3 border-b border-[#27272a] mb-2">
                            <p className="text-xs font-bold text-white uppercase tracking-wide font-mono truncate">
                                {user.firstName} {user.lastName}
                            </p>
                            <p className="text-[10px] text-zinc-500 truncate font-mono">
                                {user.email}
                            </p>
                        </div>

                        {menuItems.map((item) => (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors font-mono"
                            >
                                <item.icon size={14} />
                                {item.label}
                            </Link>
                        ))}

                        <div className="border-t border-[#27272a] my-2" />

                        <button
                            onClick={() => logoutMutation.mutate()}
                            className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-zinc-900 transition-colors font-mono"
                        >
                            <LogOut size={14} />
                            Logout
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
