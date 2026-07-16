import type React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({ children, allowedRoles, redirectTo = '/' }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!hasRole(...allowedRoles)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
