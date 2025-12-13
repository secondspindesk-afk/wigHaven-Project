import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/lib/hooks/useUser';
import PageLoader from '@/components/ui/PageLoader';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { data: user, isLoading } = useUser();
    const location = useLocation();

    // Only show loader on initial load. Background refresh (isFetching) should not block UI.
    if (isLoading) {
        if (isLoading) {
            return <PageLoader />;
        }
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

export function RequireGuest({ children }: { children: React.ReactNode }) {
    const { data: user, isLoading } = useUser();

    if (isLoading) {
        if (isLoading) {
            return <PageLoader />;
        }
    }

    if (user) {
        return <Navigate to="/account" replace />;
    }

    return <>{children}</>;
}
