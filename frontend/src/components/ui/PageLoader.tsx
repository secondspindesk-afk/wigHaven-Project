import Logo from '@/components/ui/Logo';

interface PageLoaderProps {
    className?: string;
}

export default function PageLoader({ className = '' }: PageLoaderProps) {
    return (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505] ${className}`}>
            <div className="relative">
                {/* Pulse Effect Background */}
                <div className="absolute inset-0 bg-white/5 rounded-full blur-xl animate-pulse" />

                {/* Logo with Breathe Animation */}
                <div className="relative animate-[pulse_3s_ease-in-out_infinite]">
                    <Logo size="lg" className="w-24 h-24 md:w-32 md:h-32" />
                </div>
            </div>

            <p className="mt-8 text-xs font-bold tracking-[0.3em] text-zinc-500 animate-pulse font-mono uppercase">
                Loading System
            </p>
        </div>
    );
}
