import { useState, useEffect } from 'react';
import { Outlet, Link, Navigate, useLocation } from 'react-router-dom';
import { LogOut, User, Settings, Menu, Search, Command, X } from 'lucide-react';
import { useUser } from '@/lib/hooks/useUser';
import { useLogout } from '@/lib/hooks/useLogout';
import { useSystemHealth } from '@/lib/hooks/useAdminDashboard';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminSearchModal from '@/components/admin/AdminSearchModal';
import NotificationDropdown from '@/components/admin/NotificationDropdown';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const { data: user, isLoading } = useUser();
    const { data: systemHealth } = useSystemHealth(!!user && (user.role === 'admin' || user.role === 'super_admin'));
    const logoutMutation = useLogout();
    const isMobile = useIsMobile();

    // Global keyboard shortcut for search (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (isMobile && sidebarOpen) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [isMobile, sidebarOpen]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect if not admin or super_admin
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return <Navigate to="/login" replace />;
    }

    // ==================== MOBILE LAYOUT ====================
    if (isMobile) {
        return (
            <div className="min-h-screen bg-[#050505]">
                {/* Mobile Header - Fixed */}
                <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-[#050505] border-b border-zinc-800">
                    {/* Menu Toggle */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-zinc-400 active:text-white"
                    >
                        <Menu size={22} />
                    </button>

                    {/* Brand */}
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5">
                            <path d="M30 20 C 15 30, 15 70, 45 90" />
                            <path d="M38 25 C 28 35, 28 60, 40 75" />
                            <path d="M55 35 C 55 35, 65 38, 70 50 C 72 55, 70 65, 60 75" />
                        </svg>
                        <span className="font-bold text-xs tracking-widest uppercase text-white">Admin</span>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="p-2 text-zinc-400 active:text-white"
                        >
                            <Search size={20} />
                        </button>
                        <NotificationDropdown />
                    </div>
                </header>

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-50 bg-black/80"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Mobile Sidebar */}
                <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#050505] border-r border-zinc-800 transform transition-transform duration-300 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    {/* Sidebar Header */}
                    <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5">
                                <path d="M30 20 C 15 30, 15 70, 45 90" />
                                <path d="M38 25 C 28 35, 28 60, 40 75" />
                                <path d="M55 35 C 55 35, 65 38, 70 50 C 72 55, 70 65, 60 75" />
                            </svg>
                            <div className="flex flex-col">
                                <span className="font-bold text-xs tracking-widest uppercase text-white">WigHaven</span>
                                <span className="font-mono text-[9px] text-zinc-500">SYS_ADMIN v2.4</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="p-2 text-zinc-400 active:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Sidebar Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto">
                        <AdminSidebar
                            isOpen={true}
                            onClose={() => setSidebarOpen(false)}
                            isMobileEmbedded={true}
                        />
                    </div>

                    {/* User Profile (Bottom) - Fixed */}
                    <div className="shrink-0 p-4 border-t border-zinc-800 bg-[#050505]">
                        <div className="flex items-center gap-3 p-2 border border-zinc-800 bg-zinc-900/50 rounded-lg">
                            <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold text-white font-mono">
                                {user?.firstName?.[0]?.toUpperCase() || 'A'}{user?.lastName?.[0]?.toUpperCase() || 'D'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white font-medium truncate">
                                    {user?.firstName || 'Admin'} {user?.lastName || 'User'}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-mono truncate">
                                    {user?.role?.toUpperCase() || 'ADMIN'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSidebarOpen(false);
                                    logoutMutation.mutate();
                                }}
                                className="p-2 text-red-500 active:bg-red-500/20 rounded-lg"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <main className="pt-14 min-h-screen">
                    <div className="p-4">
                        <Outlet />
                    </div>
                </main>

                {/* Search Modal */}
                <AdminSearchModal
                    open={searchOpen}
                    onClose={() => setSearchOpen(false)}
                />
            </div>
        );
    }

    // ==================== DESKTOP LAYOUT ====================
    const location = useLocation();
    const isSupportPage = location.pathname.startsWith('/admin/support');

    return (
        <div className="flex h-screen overflow-hidden bg-[#050505] selection:bg-white selection:text-black">
            {/* Sidebar */}
            <AdminSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(!sidebarOpen)}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full relative">
                {/* Grid Background Pattern */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                        backgroundSize: '40px 40px',
                        backgroundImage: 'linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)',
                    }}
                />

                {/* Header */}
                <header className="relative z-50 h-16 flex items-center justify-between px-8 border-b border-[#27272a] bg-[#050505]/95 backdrop-blur">
                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 text-zinc-500 hover:text-white transition-colors"
                    >
                        <Menu size={20} />
                    </button>

                    {/* Search Button - Opens Modal */}
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="flex items-center gap-3 flex-1 max-w-md px-3 py-2 border border-[#27272a] bg-[#0A0A0A] hover:border-zinc-600 transition-colors group"
                    >
                        <Search size={14} className="text-zinc-600 group-hover:text-zinc-400" />
                        <span className="text-xs font-mono text-zinc-600 group-hover:text-zinc-400 uppercase flex-1 text-left">
                            Search everything...
                        </span>
                        <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-500">
                            <Command size={10} />
                            <span>K</span>
                        </kbd>
                    </button>

                    {/* Header Actions */}
                    <div className="flex items-center gap-6">
                        {/* System Status */}
                        <div className="hidden md:flex items-center gap-2 border border-[#27272a] bg-[#0A0A0A] px-3 py-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${systemHealth?.database?.status === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}
                                style={{ boxShadow: systemHealth?.database?.status === 'connected' ? '0 0 8px #10b981' : '0 0 8px #ef4444' }} />
                            <span className="text-[9px] font-mono text-zinc-400 uppercase">
                                {systemHealth?.database?.status === 'connected' ? 'System Operational' : 'System Issues'}
                                {systemHealth?.database?.latency_ms !== undefined && (
                                    <span className="text-zinc-600 ml-2">
                                        DB: {systemHealth.database.latency_ms}ms
                                    </span>
                                )}
                            </span>
                        </div>

                        {/* Notifications - Now functional! */}
                        <NotificationDropdown />

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-3 p-2 border border-[#27272a] bg-[#0A0A0A] hover:border-zinc-600 transition-colors"
                            >
                                <div className="w-7 h-7 bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white font-mono">
                                    {user?.firstName?.[0]?.toUpperCase() || 'A'}{user?.lastName?.[0]?.toUpperCase() || 'D'}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-[10px] text-white font-medium uppercase tracking-wider">
                                        {user?.firstName} {user?.lastName}
                                    </p>
                                    <p className="text-[9px] text-zinc-500 font-mono">ID: {user?.id?.slice(-6).toUpperCase() || '8829-X'}</p>
                                </div>
                            </button>

                            {/* Dropdown */}
                            {userMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-50"
                                        onClick={() => setUserMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#0A0A0A] border border-[#27272a] z-[60] py-1">
                                        <Link
                                            to="/admin/profile"
                                            className="flex items-center gap-3 px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
                                            onClick={() => setUserMenuOpen(false)}
                                        >
                                            <User size={14} strokeWidth={1.5} />
                                            Profile
                                        </Link>
                                        <Link
                                            to="/admin/settings"
                                            className="flex items-center gap-3 px-4 py-3 text-[10px] uppercase tracking-wider text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
                                            onClick={() => setUserMenuOpen(false)}
                                        >
                                            <Settings size={14} strokeWidth={1.5} />
                                            Settings
                                        </Link>
                                        <hr className="my-1 border-[#27272a]" />
                                        <button
                                            onClick={() => {
                                                setUserMenuOpen(false);
                                                logoutMutation.mutate();
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-[10px] uppercase tracking-wider text-red-500 hover:bg-red-500/10 transition-colors"
                                        >
                                            <LogOut size={14} strokeWidth={1.5} />
                                            Logout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className={`relative z-0 flex-1 ${isSupportPage ? 'overflow-hidden p-0' : 'overflow-y-auto p-8'}`}>
                    <Outlet />
                </div>
            </main>

            {/* Search Modal */}
            <AdminSearchModal
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
            />
        </div>
    );
}

export default AdminLayout;
