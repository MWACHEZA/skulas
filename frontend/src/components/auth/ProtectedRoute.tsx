import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: string;
  allowedRoles?: string[];
  loginPath: string;
}

export default function ProtectedRoute({ children, allowedRole, allowedRoles, loginPath }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to the specific portal login
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  const roles = allowedRoles || (allowedRole ? [allowedRole] : []);
  if (roles.length > 0) {
    const userRoles = [user?.role, ...(user?.secondaryRoles || [])].filter(Boolean) as string[];
    const isSuperOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';
    const hasRoleAccess = roles.some((r) => userRoles.includes(r));
    const hasAdminOversight = isSuperOrAdmin && roles.includes('BURSAR');

    if (!hasRoleAccess && !hasAdminOversight) {
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
  }

  return <>{children}</>;
}

