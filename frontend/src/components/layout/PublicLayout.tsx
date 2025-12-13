import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import CartButton from '@/components/cart/CartButton';
import { useUser } from '@/lib/hooks/useUser';
import { usePublicSettings } from '@/lib/hooks/useSettings';
import { useUIStore } from '@/store/uiStore';
import Logo from '@/components/ui/Logo';
import SearchBar from './header/SearchBar';
import CurrencySwitcher from './header/CurrencySwitcher';
import NotificationDropdown from './header/NotificationDropdown';
import UserMenu from './header/UserMenu';
import MobileMenu from './MobileMenu';
import ScrollToTop from '@/components/common/ScrollToTop';

export function PublicLayout() {
    const { data: user } = useUser();
    const { data: settings } = usePublicSettings();
    const isAuthenticated = !!user;
    const { toggleMobileMenu } = useUIStore();
    const location = useLocation();

    const siteName = settings?.siteName || 'WigHaven';

    return (
        <div className="min-h-screen flex flex-col bg-[#050505] text-zinc-300 font-sans pt-16">
            {/* Navigation */}
            <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-[#27272a] bg-[#050505]/80 backdrop-blur-md">
                <div className="container flex h-16 items-center justify-between px-2 md:px-4">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 md:gap-3 group">
                        <Logo size="sm" className="w-7 h-7 md:w-8 md:h-8" />
                        <span className="font-semibold text-sm md:text-lg tracking-[0.15em] md:tracking-[0.2em] text-white uppercase group-hover:text-zinc-300 transition-colors">
                            {siteName}
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {['SYSTEM', 'SHOP', 'ABOUT', 'CONTACT'].map((item) => {
                            const path = item === 'SYSTEM' ? '/' : `/${item.toLowerCase()}`;
                            const isActive = path === '/'
                                ? location.pathname === '/'
                                : location.pathname.startsWith(path);

                            return (
                                <Link
                                    key={item}
                                    to={path}
                                    className={`text-xs font-bold uppercase tracking-widest transition-colors font-mono ${isActive ? 'text-white' : 'text-zinc-500 hover:text-white'
                                        }`}
                                >
                                    {item}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="hidden md:block">
                            <SearchBar />
                        </div>

                        <div className="hidden md:block w-px h-4 bg-[#27272a]" />

                        <CurrencySwitcher />

                        {isAuthenticated && <NotificationDropdown />}

                        <CartButton />

                        <UserMenu />

                        <button
                            onClick={toggleMobileMenu}
                            className="md:hidden text-zinc-500 hover:text-white transition-colors"
                            aria-label="Open menu"
                        >
                            <Menu size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu */}
            <MobileMenu />

            {/* Main Content */}
            <main className="flex-1 relative">
                <Outlet />
            </main>

            {/* Footer */}
            {!location.pathname.includes('/account/support') && (
                <footer className="border-t border-[#27272a] bg-[#0A0A0A] py-8">
                    <div className="container px-4">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            {/* Brand & Copyright */}
                            <div className="flex items-center gap-4">
                                <Logo size="sm" className="w-8 h-8" />
                                <div className="space-y-0.5">
                                    <span className="font-semibold text-xs tracking-[0.2em] text-white uppercase block">{siteName}</span>
                                    <p className="text-[10px] text-zinc-600 font-mono">
                                        © 2025 ALL RIGHTS RESERVED
                                    </p>
                                </div>
                            </div>

                            {/* Legal Links */}
                            <div className="flex items-center gap-6 text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
                                <Link to="/privacy" className="hover:text-white transition-colors">PRIVACY POLICY</Link>
                                <Link to="/terms" className="hover:text-white transition-colors">TERMS OF SERVICE</Link>
                            </div>
                        </div>
                    </div>
                </footer>
            )}

            {/* Scroll To Top Button */}
            <ScrollToTop />
        </div>
    );
}
