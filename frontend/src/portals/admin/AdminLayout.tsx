import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { generatePortalNavigation } from '../../config/navGenerator';

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const secRolesStr = JSON.stringify(user?.secondaryRoles || []);
  const navGroups = useMemo(() => {
    return generatePortalNavigation('admin', user, location.pathname);
  }, [user?.id, user?.role, secRolesStr, location.pathname]);

  return (
    <ProtectedRoute allowedRoles={['SCHOOL_ADMIN']} redirectTo="/admin/login">
      <DashboardLayout
        portalName="Admin Portal"
        portalIcon="fas fa-user-shield"
        roleBadge="Admin"
        navGroups={navGroups}
      />
    </ProtectedRoute>
  );
}
