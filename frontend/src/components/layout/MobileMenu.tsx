import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    X, Home, ShoppingBag, User, Phone, Info, Package, Heart,
    LogOut, LayoutDashboard, Settings, Search, ChevronRight,
    MapPin, HeadphonesIcon, Mail, Bell, Sparkles
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useUser } from '@/lib/hooks/useUser';
import { useLogout } from '@/lib/hooks/useLogout';
import { useCurrencyContext } from '@/lib/context/CurrencyContext';
import { useNotifications } from '@/lib/hooks/useNotifications';
import Logo from '@/components/ui/Logo';
import { useEffect, useState } from 'react';

export default function MobileMenu() {
    const { isMobileMenuOpen, toggleMobileMenu } = useUIStore();
    const { data: user } = useUser();
    const logoutMutation = useLogout();
    const { currency, changeCurrency, supportedCurrencies } = useCurrencyContext();
    const { meta } = useNotifications();
    const [searchQuery, setSearchQuery] = useState('');
    const isAuthenticated = !!user;
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    const unreadCount = meta?.unread || 0;

    useEffect(() => {
        if (isMobileMenuOpen) { document.body.style.overflow = 'hidden'; }
        else { document.body.style.overflow = ''; }
        return () => { document.body.style.overflow = ''; };
    }, [isMobileMenuOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
            toggleMobileMenu();
        }
    };

    const handleLogout = () => { logoutMutation.mutate(); toggleMobileMenu(); };

    if (!isMobileMenuOpen) return null;

    // Guest navigation
    const guestLinks = [
        { label: 'Home', to: '/', icon: Home },
        { label: 'Shop All', to: '/shop', icon: ShoppingBag },
        { label: 'About Us', to: '/about', icon: Info },
        { label: 'Contact', to: '/contact', icon: Phone },
    ];

    // Logged-in quick actions (top of account)
    const accountQuickLinks = [
        { label: 'My Orders', to: '/account/orders', icon: Package, color: 'bg-blue-500/20 text-blue-400' },
        { label: 'Wishlist', to: '/account/wishlist', icon: Heart, color: 'bg-pink-500/20 text-pink-400' },
        { label: 'Addresses', to: '/account/addresses', icon: MapPin, color: 'bg-green-500/20 text-green-400' },
    ];

    // All account settings
    const accountSettingsLinks = [
        { label: 'Notifications', to: '/account/notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
        { label: 'Profile', to: '/account/profile', icon: User },
        { label: 'Support', to: '/account/support', icon: HeadphonesIcon },
        { label: 'Email Preferences', to: '/account/email-preferences', icon: Mail },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[9999]">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={toggleMobileMenu} style={{ animation: 'fadeIn 0.2s ease-out forwards' }} />

            {/* Full-screen Menu */}
            <div className="absolute inset-0 bg-[#0A0A0A] flex flex-col" style={{ animation: 'slideInFromRight 0.3s ease-out forwards' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <Logo size="sm" className="w-8 h-8" />
                        <span className="font-semibold text-base tracking-[0.15em] text-white uppercase">WigHaven</span>
                    </div>
                    <button onClick={toggleMobileMenu} className="p-2 text-zinc-400 active:text-white active:bg-zinc-800 rounded-full" aria-label="Close menu">
                        <X size={24} />
                    </button>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="p-4 border-b border-zinc-800">
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-base text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
                    </div>
                </form>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* === LOGGED IN USER === */}
                    {isAuthenticated && user && (
                        <>
                            {/* User Profile Card */}
                            <Link to="/account" onClick={toggleMobileMenu} className="block p-4 border-b border-zinc-800">
                                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-zinc-900 to-zinc-800/50 rounded-xl">
                                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                                        <span className="text-lg font-bold text-black">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-white">{user.firstName} {user.lastName}</p>
                                        <p className="text-sm text-zinc-500 truncate">{user.email}</p>
                                    </div>
                                    <ChevronRight size={20} className="text-zinc-600" />
                                </div>
                            </Link>

                            {/* Admin Panel Link */}
                            {isAdmin && (
                                <div className="px-4 pt-4">
                                    <Link to="/admin" onClick={toggleMobileMenu} className="flex items-center gap-4 px-4 py-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                                            <LayoutDashboard size={18} className="text-amber-400" />
                                        </div>
                                        <span className="text-base font-medium text-amber-400">Admin Panel</span>
                                        <ChevronRight size={18} className="text-amber-500/50 ml-auto" />
                                    </Link>
                                </div>
                            )}

                            {/* Quick Account Actions - Horizontal Cards */}
                            <div className="p-4 border-b border-zinc-800">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">Quick Access</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {accountQuickLinks.map((link) => (
                                        <Link key={link.to} to={link.to} onClick={toggleMobileMenu} className="flex flex-col items-center gap-2 p-4 bg-zinc-900/50 rounded-xl active:bg-zinc-800">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${link.color.split(' ')[0]}`}>
                                                <link.icon size={18} className={link.color.split(' ')[1]} />
                                            </div>
                                            <span className="text-[11px] text-zinc-400 font-medium text-center">{link.label.split(' ').pop()}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Browse Section */}
                            <div className="p-4">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">Browse</h3>
                                <div className="space-y-1">
                                    <Link to="/" onClick={toggleMobileMenu} className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-zinc-300 active:bg-zinc-800">
                                        <Home size={18} className="text-zinc-500" />
                                        <span className="text-sm font-medium">Home</span>
                                    </Link>
                                    <Link to="/shop" onClick={toggleMobileMenu} className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-zinc-300 active:bg-zinc-800">
                                        <ShoppingBag size={18} className="text-zinc-500" />
                                        <span className="text-sm font-medium">Shop All</span>
                                    </Link>
                                    <Link to="/about" onClick={toggleMobileMenu} className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-zinc-300 active:bg-zinc-800">
                                        <Info size={18} className="text-zinc-500" />
                                        <span className="text-sm font-medium">About</span>
                                    </Link>
                                    <Link to="/contact" onClick={toggleMobileMenu} className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-zinc-300 active:bg-zinc-800">
                                        <Phone size={18} className="text-zinc-500" />
                                        <span className="text-sm font-medium">Contact</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Account Settings - Full List */}
                            <div className="p-4 border-t border-zinc-800">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">Account & Settings</h3>
                                <div className="space-y-1">
                                    {accountSettingsLinks.map((link) => (
                                        <Link key={link.to} to={link.to} onClick={toggleMobileMenu} className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-zinc-300 active:bg-zinc-800">
                                            <link.icon size={18} className="text-zinc-500" />
                                            <span className="text-sm font-medium flex-1">{link.label}</span>
                                            {link.badge && (
                                                <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                                    {link.badge > 9 ? '9+' : link.badge}
                                                </span>
                                            )}
                                            <ChevronRight size={16} className="text-zinc-600" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* === GUEST USER === */}
                    {!isAuthenticated && (
                        <>
                            {/* Welcome Banner */}
                            <div className="p-4 border-b border-zinc-800">
                                <div className="p-5 bg-gradient-to-r from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-xl text-center">
                                    <Sparkles size={24} className="text-cyan-400 mx-auto mb-2" />
                                    <h3 className="text-white font-bold text-sm mb-1">Welcome to WigHaven</h3>
                                    <p className="text-zinc-500 text-xs mb-4">Sign in for personalized experience</p>
                                    <div className="flex gap-3">
                                        <Link to="/login" onClick={toggleMobileMenu} className="flex-1 py-3 bg-white text-black text-xs font-bold uppercase rounded-lg">Sign In</Link>
                                        <Link to="/register" onClick={toggleMobileMenu} className="flex-1 py-3 border border-zinc-700 text-white text-xs font-bold uppercase rounded-lg">Register</Link>
                                    </div>
                                </div>
                            </div>

                            {/* Browse Links */}
                            <div className="p-4">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">Browse</h3>
                                <div className="space-y-1">
                                    {guestLinks.map((link) => (
                                        <Link key={link.to} to={link.to} onClick={toggleMobileMenu} className="flex items-center gap-4 px-4 py-4 rounded-xl text-zinc-300 active:bg-zinc-800">
                                            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                                                <link.icon size={18} className="text-zinc-400" />
                                            </div>
                                            <span className="text-base font-medium">{link.label}</span>
                                            <ChevronRight size={18} className="text-zinc-600 ml-auto" />
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Need Help */}
                            <div className="p-4 border-t border-zinc-800">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">Need Help?</h3>
                                <Link to="/contact" onClick={toggleMobileMenu} className="flex items-center gap-4 px-4 py-4 rounded-xl text-zinc-300 active:bg-zinc-800">
                                    <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center">
                                        <HeadphonesIcon size={18} className="text-cyan-400" />
                                    </div>
                                    <span className="text-base font-medium">Contact Support</span>
                                    <ChevronRight size={18} className="text-zinc-600 ml-auto" />
                                </Link>
                            </div>
                        </>
                    )}

                    {/* Currency Selector */}
                    <div className="p-4 border-t border-zinc-800">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">Currency</h3>
                        <div className="flex gap-2 px-1">
                            {supportedCurrencies.map((curr) => (
                                <button key={curr} onClick={() => changeCurrency(curr)} className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all ${currency === curr ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 active:bg-zinc-700'}`}>
                                    {curr}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer - Logout for authenticated */}
                {isAuthenticated && (
                    <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-red-500/10 text-red-400 active:bg-red-500/20">
                            <LogOut size={18} />
                            <span className="text-sm font-medium">Sign Out</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Animations */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>
        </div>,
        document.body
    );
}
