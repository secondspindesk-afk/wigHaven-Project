import { motion } from 'framer-motion';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    borderRadius?: string | number;
}

/**
 * Skeleton
 * 
 * A premium skeleton component with a subtle shimmer animation.
 */
export default function Skeleton({ className = '', width, height, borderRadius = '0.125rem' }: SkeletonProps) {
    return (
        <div
            className={`relative overflow-hidden bg-zinc-900 ${className}`}
            style={{ width, height, borderRadius }}
        >
            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear"
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            />
        </div>
    );
}
