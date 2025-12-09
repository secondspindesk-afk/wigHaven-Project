import Logo from '@/components/ui/Logo';

interface AuthHeaderProps {
    title?: string;
    subtitle?: string;
}

export default function AuthHeader({
    title = 'WigHaven',
    subtitle = 'EST. 2024 // SYSTEM ACCESS'
}: AuthHeaderProps) {
    return (
        <div className="mb-10 text-center">
            <Logo size="lg" className="mb-6" />
            <h1 className="text-white font-semibold text-lg tracking-[0.2em] uppercase">{title}</h1>
            <p className="text-zinc-600 text-xs mt-2 font-mono">{subtitle}</p>
        </div>
    );
}
