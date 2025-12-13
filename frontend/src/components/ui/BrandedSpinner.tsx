import Logo from '@/components/ui/Logo';

interface BrandedSpinnerProps {
    size?: 'xs' | 'sm' | 'md' | 'lg';
    className?: string;
}

export default function BrandedSpinner({ size = 'md', className = '' }: BrandedSpinnerProps) {
    // Map size labels to pixel dimensions for the Logo
    // xs: 14-16px (buttons)
    // sm: 24px (small containers)
    // md: 48px (medium containers)
    // lg: 96px (large containers)

    const sizeMap = {
        xs: 'w-4 h-4',
        sm: 'w-6 h-6',
        md: 'w-12 h-12',
        lg: 'w-24 h-24'
    };

    return (
        <div className={`relative flex items-center justify-center ${className}`}>
            <div className={`relative animate-[pulse_2s_ease-in-out_infinite] ${sizeMap[size]}`}>
                <Logo size={size === 'xs' ? 'sm' : size === 'sm' ? 'sm' : 'md'} className="w-full h-full" />
            </div>
            {/* Optional glow effect for larger sizes */}
            {(size === 'md' || size === 'lg') && (
                <div className={`absolute inset-0 bg-white/5 rounded-full blur-xl animate-pulse ${sizeMap[size]}`} />
            )}
        </div>
    );
}
