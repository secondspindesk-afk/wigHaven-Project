import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * BackToTop - Floating button that appears when user scrolls down
 */
export default function BackToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            // Show button when page is scrolled down 300px
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        // Add scroll event listener
        window.addEventListener('scroll', toggleVisibility);

        // Check initial scroll position
        toggleVisibility();

        // Cleanup
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <>
            {isVisible && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-white text-black rounded-sm shadow-lg hover:bg-zinc-200 transition-all duration-300 flex items-center justify-center group hover:scale-110"
                    aria-label="Back to top"
                >
                    <ArrowUp size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                </button>
            )}
        </>
    );
}
