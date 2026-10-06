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

  const isSuperOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';
  const hasAccess = hasRole(...allowedRoles) || (isSuperOrAdmin && allowedRoles.includes('BURSAR'));

  if (!hasAccess) {
    const fallback =
      user?.role === 'TEACHER'
        ? '/teacher/dashboard'
        : user?.role === 'STUDENT'
        ? '/student/dashboard'
        : user?.role === 'BURSAR'
        ? '/bursar/dashboard'
        : '/admin/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
