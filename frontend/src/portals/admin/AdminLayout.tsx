import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { generatePortalNavigation } from '../../config/navGenerator';

export default function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const navGroups = generatePortalNavigation('admin', user, location.pathname);

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
