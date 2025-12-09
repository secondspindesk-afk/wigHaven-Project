import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Package, Heart, LayoutDashboard } from 'lucide-react';
import { useUser } from '@/lib/hooks/useUser';
import { useLogout } from '@/lib/hooks/useLogout';

export default function UserMenu() {
    const { data: user, isLoading } = useUser();
    const logoutMutation = useLogout();
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

    // Show nothing while loading to prevent flicker
    if (isLoading) return null;

    if (!user) {
        return (
            <Link to="/login" className="text-zinc-500 hover:text-white transition-colors">
                <User size={20} />
            </Link>
        );
    }

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
            >
                <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center border border-[#27272a] group-hover:border-zinc-500 transition-colors">
                    <span className="text-xs font-bold font-mono text-white">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </span>
                </div>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#0A0A0A] border border-[#27272a] shadow-xl py-2 z-50">
                    <div className="px-4 py-3 border-b border-[#27272a] mb-2">
                        <p className="text-xs font-bold text-white uppercase tracking-wide font-mono truncate">
                            {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate font-mono">
                            {user.email}
                        </p>
                    </div>

                    {isAdmin && (
                        <Link
                            to="/admin"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors font-mono"
                        >
                            <LayoutDashboard size={14} />
                            Admin Panel
                        </Link>
                    )}

                    <Link
                        to="/account"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors font-mono"
                    >
                        <User size={14} />
                        Profile
                    </Link>

                    <Link
                        to="/account/orders"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors font-mono"
                    >
                        <Package size={14} />
                        Orders
                    </Link>

                    <Link
                        to="/account/wishlist"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors font-mono"
                    >
                        <Heart size={14} />
                        Wishlist
                    </Link>

                    <div className="border-t border-[#27272a] my-2" />

                    <button
                        onClick={() => logoutMutation.mutate()}
                        className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-zinc-900 transition-colors font-mono"
                    >
                        <LogOut size={14} />
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}
