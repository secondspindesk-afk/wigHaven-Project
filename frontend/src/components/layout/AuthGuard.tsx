import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/lib/hooks/useUser';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { data: user, isLoading } = useUser();
    const location = useLocation();

    // Only show loader on initial load. Background refresh (isFetching) should not block UI.
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

export function RequireGuest({ children }: { children: React.ReactNode }) {
    const { data: user, isLoading } = useUser();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        );
    }

    if (user) {
        return <Navigate to="/account" replace />;
    }

    return <>{children}</>;
}
