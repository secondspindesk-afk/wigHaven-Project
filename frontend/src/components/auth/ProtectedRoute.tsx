import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/lib/hooks/useUser';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { data: user, isLoading } = useUser();
    const location = useLocation();

    if (isLoading) {
        return <div>Loading...</div>; // Or a proper loading spinner
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
