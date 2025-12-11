import { Outlet, Link } from 'react-router-dom';
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

    const siteName = settings?.siteName || 'WigHaven';

    return (
        <div className="min-h-screen flex flex-col bg-[#050505] text-zinc-300 font-sans">
            {/* Navigation */}
            <header className="sticky top-0 z-50 w-full border-b border-[#27272a] bg-[#050505]/80 backdrop-blur-md">
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
                        {['SYSTEM', 'SHOP', 'ABOUT', 'CONTACT'].map((item) => (
                            <Link
                                key={item}
                                to={item === 'SYSTEM' ? '/' : `/${item.toLowerCase()}`}
                                className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors font-mono"
                            >
                                {item}
                            </Link>
                        ))}
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
            <footer className="border-t border-[#27272a] bg-[#0A0A0A] py-16">
                <div className="container px-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        {/* Brand */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Logo size="sm" className="w-6 h-6" />
                                <span className="font-semibold text-sm tracking-[0.2em] text-white uppercase">{siteName}</span>
                            </div>
                            <p className="text-zinc-600 text-xs leading-relaxed font-mono">
                                EST. 2024 // PREMIUM HAIR SYSTEMS
                                <br />
                                ENGINEERED FOR PERFECTION
                            </p>
                        </div>

                        {/* Links Columns */}
                        {[
                            { title: 'ARCHIVE', links: ['Wigs', 'Bundles', 'Closures', 'Accessories'] },
                            { title: 'SUPPORT', links: ['FAQ', 'Shipping', 'Care Guide', 'Contact'] }
                        ].map((column) => (
                            <div key={column.title}>
                                <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-6 font-mono">
                                    {column.title}
                                </h4>
                                <ul className="space-y-3">
                                    {column.links.map((link) => (
                                        <li key={link}>
                                            <Link
                                                to={`/shop/${link.toLowerCase()}`}
                                                className="text-xs text-zinc-600 hover:text-white transition-colors uppercase tracking-wide"
                                            >
                                                {link}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        {/* Newsletter */}
                        <div>
                            <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-6 font-mono">
                                STAY CONNECTED
                            </h4>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const email = formData.get('email') as string;
                                if (email) {
                                    fetch('/api/newsletter/subscribe', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ email })
                                    }).then(() => {
                                        alert('Subscribed!');
                                        e.currentTarget.reset();
                                    }).catch(() => alert('Failed to subscribe'));
                                }
                            }} className="flex gap-2">
                                <input
                                    name="email"
                                    type="email"
                                    placeholder="EMAIL ADDRESS"
                                    required
                                    className="bg-[#050505] border border-[#27272a] rounded-sm px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 w-full font-mono placeholder:text-zinc-800"
                                />
                                <button type="submit" className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-sm hover:bg-zinc-200 transition-colors">
                                    JOIN
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="border-t border-[#27272a] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-zinc-700 font-mono uppercase tracking-wider">
                        <p>© 2025 {siteName.toUpperCase()} SYSTEMS. ALL RIGHTS RESERVED.</p>
                        <div className="flex gap-6">
                            <Link to="/privacy" className="hover:text-zinc-500 transition-colors">PRIVACY</Link>
                            <Link to="/terms" className="hover:text-zinc-500 transition-colors">TERMS</Link>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Scroll To Top Button */}
            <ScrollToTop />
        </div>
    );
}
