import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/lib/hooks/useUser';

interface AdminRouteProps {
    children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
    const { data: user, isLoading } = useUser();
    const location = useLocation();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
