import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { DemoUserProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  activeUser?: DemoUserProfile | null;
  isLoading?: boolean;
  allowedRole: 'ESTUDIANTE' | 'ARRENDADOR';
  redirectTo?: string;
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  activeUser,
  isLoading: propIsLoading,
  allowedRole,
  redirectTo = '/',
  children,
}) => {
  const auth = useAuth();
  const loading = propIsLoading ?? auth.isLoading;
  const effectiveUser = activeUser ?? auth.user;

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center gap-3 text-slate-500 shadow-xs">
        <Loader2 className="w-6 h-6 text-[#1D4ED8] animate-spin" />
        <span className="text-xs font-medium">
          Recuperando sesión segura...
        </span>
      </div>
    );
  }

  if (effectiveUser?.role !== allowedRole) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
