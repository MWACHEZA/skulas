import type React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({ children, allowedRoles, redirectTo = '/' }: ProtectedRouteProps) {
  const { user, isAuthenticated, hasRole } = useAuth();
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

  // Admin Setup Wizard Gating
  if (user?.role === 'SCHOOL_ADMIN') {
    const isOnboarded = user?.isOnboarded !== false && user?.school?.settings?.isOnboarded !== false;
    const isSetupRoute = location.pathname === '/admin/setup' || location.pathname === '/admin/onboarding';

    // If new school (isOnboarded is false), redirect to /admin/setup
    if (!isOnboarded) {
      if (!isSetupRoute) {
        return <Navigate to="/admin/setup" replace />;
      }
    } else {
      // If already onboarded, redirect away from /admin/setup to dashboard
      if (isSetupRoute) {
        return <Navigate to="/admin/dashboard" replace />;
      }
    }
  }

  return <>{children}</>;
}
