interface LogoProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
};

export default function Logo({ size = 'lg', className = '' }: LogoProps) {
    return (
        <div className={`${sizeClasses[size]} mx-auto relative group cursor-pointer ${className}`}>
            {/* Outer Circle */}
            <div className="absolute inset-0 rounded-full border border-zinc-800 group-hover:border-zinc-600 transition-colors"></div>

            {/* The Face/Hair Vector */}
            <svg
                className="w-full h-full p-4 text-white"
                viewBox="0 0 100 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {/* The Hair Swoop (Left) */}
                <path d="M30 20 C 15 30, 15 70, 45 90" />
                <path d="M38 25 C 28 35, 28 60, 40 75" />

                {/* The Face Profile (Right) */}
                <path d="M55 35 C 55 35, 65 38, 70 50 C 72 55, 70 65, 60 75" />

                {/* The Lips/Chin Detail */}
                <path opacity="0.8" d="M68 58 L 62 62" />
            </svg>
        </div>
    );
}
