import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
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
          : user?.role === 'ANCILLARY'
          ? '/ancillary/dashboard'
          : user?.role === 'CLINIC'
          ? '/clinic/dashboard'
          : '/admin/dashboard';
      return <Navigate to={fallback} replace />;
    }
  }

  // Modular Tenancy & Role-Specific Access Check
  const currentPath = location.pathname;
  const matchedPage = PAGE_REGISTRY.find((p) => {
    const base = p.route.split('?')[0];
    return currentPath === base || (base !== '/' && currentPath.startsWith(base + '/'));
  });

  const userModules: Record<string, boolean> | undefined =
    user?.modules ||
    user?.school?.subscription?.modules ||
    user?.school?.modules;

  if (matchedPage?.module && matchedPage.module !== 'core' && userModules) {
    if (userModules[matchedPage.module] === false) {
      const fallback =
        user?.role === 'TEACHER'
          ? '/teacher/dashboard'
          : user?.role === 'STUDENT'
          ? '/student/dashboard'
          : user?.role === 'BURSAR'
          ? '/bursar/dashboard'
          : user?.role === 'PARENT'
          ? '/parent/dashboard'
          : '/admin/dashboard';
      return <Navigate to={fallback} replace />;
    }
  }

  // Specialized secondary roles check (e.g. driver cannot access boarding, matron cannot access transport)
  if (matchedPage?.requiredSecondaryRoles && matchedPage.requiredSecondaryRoles.length > 0) {
    const isSuperOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';
    if (!isSuperOrAdmin) {
      const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s_-]+/g, '');
      const pageSecRoles = matchedPage.requiredSecondaryRoles.map(normalize);
      const userSecRoles = (user?.secondaryRoles || []).map(normalize);
      const metaSecRoles = Array.isArray((user?.metadata as any)?.secondaryRoles)
        ? (user!.metadata as any).secondaryRoles.map(normalize)
        : [];
      const designation = normalize((user?.metadata as any)?.designation || (user?.metadata as any)?.jobTitle || '');
      const deptName = normalize((user as any)?.dept?.name || '');

      const hasSpecialization = userSecRoles.length > 0 || metaSecRoles.length > 0 || Boolean(designation) || Boolean(deptName);
      if (hasSpecialization) {
        const hasSecRole = pageSecRoles.some(r =>
          userSecRoles.includes(r) ||
          metaSecRoles.includes(r) ||
          (designation && (designation.includes(r) || r.includes(designation))) ||
          (deptName && (deptName.includes(r) || r.includes(deptName)))
        );
        if (!hasSecRole) {
          const fallback =
            user?.role === 'ANCILLARY'
              ? '/ancillary/dashboard'
              : user?.role === 'TEACHER'
              ? '/teacher/dashboard'
              : '/admin/dashboard';
          return <Navigate to={fallback} replace />;
        }
      }
    }
  }

  return <>{children}</>;
}

