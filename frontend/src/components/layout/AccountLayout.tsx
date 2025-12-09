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
    Mail
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AccountLayout() {
    const { data: user } = useUser();
    const logoutMutation = useLogout();
    const location = useLocation();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/account' },
        { icon: ShoppingBag, label: 'Orders', path: '/account/orders' },
        { icon: Heart, label: 'Wishlist', path: '/account/wishlist' },
        { icon: MapPin, label: 'Addresses', path: '/account/addresses' },
        { icon: UserIcon, label: 'Profile', path: '/account/profile' },
        { icon: HeadphonesIcon, label: 'Support', path: '/account/support' },
        { icon: Mail, label: 'Email Preferences', path: '/account/email-preferences' },
    ];

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
