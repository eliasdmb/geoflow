import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'admin' | 'tecnico';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const { user, role, loading } = useAuth();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <Loader2 className="text-primary-dark font-black animate-spin" size={40} />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
