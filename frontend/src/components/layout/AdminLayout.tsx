import { useState, useEffect } from 'react';
import { Outlet, Link, Navigate } from 'react-router-dom';
import { LogOut, User, Settings, Menu, Search, Command } from 'lucide-react';
import { useUser } from '@/lib/hooks/useUser';
import { useLogout } from '@/lib/hooks/useLogout';
import { useSystemHealth } from '@/lib/hooks/useAdminDashboard';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminSearchModal from '@/components/admin/AdminSearchModal';
import NotificationDropdown from '@/components/admin/NotificationDropdown';

export function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const { data: user, isLoading } = useUser();
    const { data: systemHealth } = useSystemHealth(!!user && (user.role === 'admin' || user.role === 'super_admin'));
    const logoutMutation = useLogout();

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
                <div className="relative z-0 flex-1 overflow-y-auto p-8">
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
