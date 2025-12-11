import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutGrid,
    Package,
    ShoppingCart,
    Users,
    BarChart3,
    Archive,
    Star,
    Image,
    Tag,
    Percent,
    Headphones,
    Mail,
    Settings,
    ChevronLeft,
    Megaphone,
    HardDrive
} from 'lucide-react';
import { useSidebarStats } from '@/lib/hooks/useAdminDashboard';
import { useUser } from '@/lib/hooks/useUser';

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    badge?: string | number;
    alert?: boolean;
}

interface AdminSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    isMobileEmbedded?: boolean; // When true, only renders nav content (for mobile layout)
}

export function AdminSidebar({ isOpen, onClose, isMobileEmbedded = false }: AdminSidebarProps) {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const { data: stats, isLoading: statsLoading, error: statsError } = useSidebarStats(true);
    const { data: user } = useUser();
    const isSuperAdmin = user?.role === 'super_admin';

    // Debug: Log stats to help identify issues
    useEffect(() => {
        if (import.meta.env.DEV) {
            console.log('[AdminSidebar] Stats:', { stats, statsLoading, statsError });
        }
    }, [stats, statsLoading, statsError]);

    const mainNavItems: NavItem[] = [
        { label: 'Dashboard', path: '/admin', icon: <LayoutGrid size={18} strokeWidth={1.5} /> },
        { label: 'Products', path: '/admin/products', icon: <Package size={18} strokeWidth={1.5} />, badge: stats?.products },
        { label: 'Orders', path: '/admin/orders', icon: <ShoppingCart size={18} strokeWidth={1.5} />, badge: stats?.orders, alert: (stats?.orders || 0) > 0 },
        { label: 'Users', path: '/admin/users', icon: <Users size={18} strokeWidth={1.5} />, badge: stats?.users },
        { label: 'Categories', path: '/admin/categories', icon: <Tag size={18} strokeWidth={1.5} /> },
        { label: 'Reviews', path: '/admin/reviews', icon: <Star size={18} strokeWidth={1.5} />, badge: stats?.reviews, alert: (stats?.reviews || 0) > 0 },
    ];

    const systemNavItems: NavItem[] = [
        { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 size={18} strokeWidth={1.5} /> },
        { label: 'Inventory', path: '/admin/inventory', icon: <Archive size={18} strokeWidth={1.5} />, alert: (stats?.inventory || 0) > 0, badge: stats?.inventory },
        { label: 'Media', path: '/admin/media', icon: <Image size={18} strokeWidth={1.5} /> },
        { label: 'Discounts', path: '/admin/discounts', icon: <Percent size={18} strokeWidth={1.5} /> },
        { label: 'Banners', path: '/admin/banners', icon: <Megaphone size={18} strokeWidth={1.5} /> },
        { label: 'Support', path: '/admin/support', icon: <Headphones size={18} strokeWidth={1.5} /> },
        { label: 'Emails', path: '/admin/emails', icon: <Mail size={18} strokeWidth={1.5} /> },
        { label: 'Settings', path: '/admin/settings', icon: <Settings size={18} strokeWidth={1.5} /> },
    ];

    // Super Admin only items
    const superAdminNavItems: NavItem[] = [
        { label: 'ImageKit', path: '/admin/imagekit', icon: <HardDrive size={18} strokeWidth={1.5} /> },
    ];

    const isActive = (path: string) => {
        if (path === '/admin') return location.pathname === '/admin';
        return location.pathname.startsWith(path);
    };

    // Mobile nav item renderer - larger touch targets
    const renderMobileNavItem = (item: NavItem) => {
        const active = isActive(item.path);

        return (
            <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-4 px-4 py-3.5 text-sm font-medium rounded-lg transition-all active:scale-[0.98] ${active
                    ? 'bg-white text-black'
                    : 'text-zinc-300 active:bg-zinc-800'
                    }`}
            >
                <span className={active ? 'text-black' : 'text-zinc-400'}>
                    {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {/* Show alert badge (red, pulsing) when alert is true and badge > 0 */}
                {item.alert && typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-xs font-bold rounded-full animate-pulse">
                        {item.badge}
                    </span>
                )}
                {/* Show normal badge when NOT alert and badge > 0 */}
                {!item.alert && typeof item.badge === 'number' && item.badge > 0 && (
                    <span className={`text-xs font-mono ${active ? 'text-zinc-600' : 'text-zinc-500'}`}>
                        {item.badge}
                    </span>
                )}
            </Link>
        );
    };

    // Desktop nav item renderer
    const renderDesktopNavItem = (item: NavItem) => {
        const active = isActive(item.path);

        return (
            <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 px-3 py-2 text-[11px] font-medium uppercase tracking-wide transition-all ${active
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-white hover:bg-[#0A0A0A] border border-transparent hover:border-[#27272a]'
                    }`}
            >
                <span className={active ? 'text-black' : 'text-zinc-500 group-hover:text-white'}>
                    {item.icon}
                </span>
                {!collapsed && (
                    <>
                        <span className="flex-1">{item.label}</span>
                        {/* Show alert badge (red, pulsing) when alert is true and badge > 0 */}
                        {item.alert && typeof item.badge === 'number' && item.badge > 0 && (
                            <span className="text-red-500 font-mono text-[9px] animate-pulse">
                                (! {item.badge})
                            </span>
                        )}
                        {/* Show normal badge when NOT alert and badge > 0 */}
                        {!item.alert && typeof item.badge === 'number' && item.badge > 0 && (
                            <span className={`font-mono text-[9px] ${active ? 'text-zinc-600' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                {item.badge}
                            </span>
                        )}
                    </>
                )}
            </Link>
        );
    };

    // ==================== MOBILE EMBEDDED MODE ====================
    if (isMobileEmbedded) {
        return (
            <nav className="flex-1 overflow-y-auto py-4 px-3 pb-28">
                {/* Main Module */}
                <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                    Main Module
                </p>
                <div className="space-y-1">
                    {mainNavItems.map(renderMobileNavItem)}
                </div>

                {/* System Config */}
                <div className="mt-6 pt-6 border-t border-zinc-800">
                    <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                        System Config
                    </p>
                    <div className="space-y-1">
                        {systemNavItems.map(renderMobileNavItem)}
                    </div>
                </div>

                {/* Super Admin Only */}
                {isSuperAdmin && (
                    <div className="mt-6 pt-6 border-t border-zinc-800">
                        <p className="px-4 text-[10px] font-bold text-amber-500/80 uppercase tracking-widest mb-3">
                            Super Admin
                        </p>
                        <div className="space-y-1">
                            {superAdminNavItems.map(renderMobileNavItem)}
                        </div>
                    </div>
                )}
            </nav>
        );
    }

    // ==================== DESKTOP SIDEBAR ====================
    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r border-[#27272a] bg-[#050505] transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } ${collapsed ? 'w-16' : 'w-64'}`}
            >
                {/* Brand */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-[#27272a]">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-white flex-shrink-0" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5">
                            <path d="M30 20 C 15 30, 15 70, 45 90" />
                            <path d="M38 25 C 28 35, 28 60, 40 75" />
                            <path d="M55 35 C 55 35, 65 38, 70 50 C 72 55, 70 65, 60 75" />
                        </svg>
                        {!collapsed && (
                            <div className="flex flex-col">
                                <span className="font-bold text-xs tracking-widest uppercase text-white">WigHaven</span>
                                <span className="font-mono text-[9px] text-zinc-500">SYS_ADMIN v2.4</span>
                            </div>
                        )}
                    </div>
                    {!collapsed && (
                        <button
                            onClick={() => setCollapsed(true)}
                            className="text-zinc-600 hover:text-white p-1 transition-colors hidden lg:block"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                    {!collapsed && (
                        <p className="px-3 text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2 font-mono">
                            Main Module
                        </p>
                    )}
                    {mainNavItems.map(renderDesktopNavItem)}

                    <div className="pt-6 pb-2">
                        {!collapsed && (
                            <p className="px-3 text-[9px] font-bold text-zinc-600 uppercase tracking-widest font-mono">
                                System Config
                            </p>
                        )}
                    </div>
                    {systemNavItems.map(renderDesktopNavItem)}

                    {/* Super Admin Only */}
                    {isSuperAdmin && (
                        <>
                            <div className="pt-6 pb-2">
                                {!collapsed && (
                                    <p className="px-3 text-[9px] font-bold text-amber-500/80 uppercase tracking-widest font-mono">
                                        Super Admin
                                    </p>
                                )}
                            </div>
                            {superAdminNavItems.map(renderDesktopNavItem)}
                        </>
                    )}
                </nav>

                {/* User Profile (Bottom) */}
                <div className="p-4 border-t border-[#27272a]">
                    <div className={`flex items-center gap-3 p-2 border border-[#27272a] bg-[#0A0A0A] ${collapsed ? 'justify-center' : ''}`}>
                        <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center text-xs font-bold text-white font-mono flex-shrink-0">
                            {user?.firstName?.[0]?.toUpperCase() || 'A'}{user?.lastName?.[0]?.toUpperCase() || 'D'}
                        </div>
                        {!collapsed && (
                            <div className="overflow-hidden">
                                <p className="text-[10px] text-white font-medium uppercase tracking-wider truncate">
                                    {user?.firstName || 'Admin'} {user?.lastName || 'User'}
                                </p>
                                <p className="text-[9px] text-zinc-500 font-mono truncate">
                                    ID: {user?.id?.slice(-6).toUpperCase() || '------'}
                                </p>
                            </div>
                        )}
                    </div>
                    {collapsed && (
                        <button
                            onClick={() => setCollapsed(false)}
                            className="w-full mt-2 text-zinc-600 hover:text-white p-2 transition-colors flex justify-center"
                        >
                            <ChevronLeft size={16} className="rotate-180" />
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
}

export default AdminSidebar;
