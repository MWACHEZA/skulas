import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole: string;
  loginPath: string;
}

export default function ProtectedRoute({ children, allowedRole, loginPath }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to the specific portal login
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (user?.role !== allowedRole) {
    // If logged in as wrong role, redirect to their home or show unauthorized
    // For simplicity, we'll redirect back to home or their own dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
