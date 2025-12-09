import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop - ALWAYS scrolls to top on route navigation
 * Ensures consistent UX - every page starts at the top
 */
export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // ALWAYS scroll to top on route change
        window.scrollTo({
            top: 0,
            behavior: 'instant', // Instant for route changes
        });
    }, [pathname]);

    return null;
}
