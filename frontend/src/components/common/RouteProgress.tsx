import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Configure NProgress
NProgress.configure({
    showSpinner: false,
    trickleSpeed: 200,
    minimum: 0.08,
    easing: 'ease',
    speed: 400,
});

/**
 * RouteProgress - Shows loading bar on route changes
 * Matches the dark theme with white progress bar
 */
export default function RouteProgress() {
    const location = useLocation();

    useEffect(() => {
        NProgress.start();

        // Complete after a short delay (simulates page load)
        const timer = setTimeout(() => {
            NProgress.done();
        }, 200);

        return () => {
            clearTimeout(timer);
            NProgress.done();
        };
    }, [location.pathname]);

    return null;
}
