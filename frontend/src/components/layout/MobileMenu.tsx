import { Link } from 'react-router-dom';
import { X, Home, ShoppingBag, User, Phone, Info } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useUser } from '@/lib/hooks/useUser';
import Logo from '@/components/ui/Logo';

export default function MobileMenu() {
    const { isMobileMenuOpen, toggleMobileMenu } = useUIStore();
    const { data: user } = useUser();
    const isAuthenticated = !!user;

    if (!isMobileMenuOpen) return null;

    const mainLinks = [
        { label: 'Home', to: '/', icon: Home },
        { label: 'Shop', to: '/shop', icon: ShoppingBag },
        { label: 'About', to: '/about', icon: Info },
        { label: 'Contact', to: '/contact', icon: Phone },
    ];

    const accountLinks = isAuthenticated
        ? [
            { label: 'Dashboard', to: '/account' },
            { label: 'Orders', to: '/account/orders' },
            { label: 'Wishlist', to: '/account/wishlist' },
            { label: 'Profile', to: '/account/profile' },
        ]
        : [
            { label: 'Login', to: '/login' },
            { label: 'Register', to: '/register' },
        ];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-fade-in"
                onClick={toggleMobileMenu}
            />

            {/* Menu Drawer */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-[#0A0A0A] border-l border-[#27272a] shadow-2xl animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#27272a]">
                    <div className="flex items-center gap-2">
                        <Logo size="sm" className="w-6 h-6" />
                        <span className="font-semibold text-sm tracking-[0.2em] text-white uppercase">
                            WigHaven
                        </span>
                    </div>
                    <button
                        onClick={toggleMobileMenu}
                        className="p-2 text-zinc-500 hover:text-white transition-colors"
                        aria-label="Close menu"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col h-[calc(100%-80px)] overflow-y-auto">
                    {/* Main Links */}
                    <div className="p-6 border-b border-[#27272a]">
                        <h3 className="text-[10px] font-bold text-white uppercase tracking-widest mb-4 font-mono">
                            Menu
                        </h3>
                        <div className="space-y-1">
                            {mainLinks.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        onClick={toggleMobileMenu}
                                        className="flex items-center gap-3 px-4 py-3 rounded-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
                                    >
                                        <Icon size={16} />
                                        <span className="text-sm uppercase tracking-wide font-mono">
                                            {link.label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Account Links */}
                    <div className="p-6">
                        <h3 className="text-[10px] font-bold text-white uppercase tracking-widest mb-4 font-mono">
                            {isAuthenticated ? 'My Account' : 'Join Us'}
                        </h3>
                        <div className="space-y-1">
                            {accountLinks.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={toggleMobileMenu}
                                    className="flex items-center gap-3 px-4 py-3 rounded-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
                                >
                                    <User size={16} />
                                    <span className="text-sm uppercase tracking-wide font-mono">
                                        {link.label}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </nav>
            </div>
        </>
    );
}
