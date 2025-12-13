import BrandedSpinner from '@/components/ui/BrandedSpinner';

interface SectionLoaderProps {
    className?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function SectionLoader({ className = '', size = 'md' }: SectionLoaderProps) {
    return (
        <div className={`flex items-center justify-center py-12 ${className}`}>
            <BrandedSpinner size={size} />
        </div>
    );
}
