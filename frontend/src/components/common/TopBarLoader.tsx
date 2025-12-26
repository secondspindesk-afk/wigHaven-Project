import { useEffect, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * TopBarLoader
 * 
 * A slim, premium progress bar at the top of the screen that indicates
 * background data fetching (React Query).
 */
export default function TopBarLoader() {
    const isFetching = useIsFetching();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show loader if fetching takes more than 200ms to avoid flickering
        let timeout: NodeJS.Timeout;
        if (isFetching > 0) {
            timeout = setTimeout(() => setIsVisible(true), 200);
        } else {
            setIsVisible(false);
        }
        return () => clearTimeout(timeout);
    }, [isFetching]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-zinc-800 overflow-hidden"
                >
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{
                            repeat: Infinity,
                            duration: 1.5,
                            ease: "easeInOut"
                        }}
                        className="h-full w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
