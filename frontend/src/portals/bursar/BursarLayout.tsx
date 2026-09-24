import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { generatePortalNavigation } from '../../config/navGenerator';

export default function BursarLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const navGroups = generatePortalNavigation('bursar', user, location.pathname);

  return (
    <ProtectedRoute allowedRoles={['BURSAR']} redirectTo="/bursar/login">
      <DashboardLayout
        portalName="Bursar Portal"
        portalIcon="fas fa-coins"
        roleBadge="Bursar"
        navGroups={navGroups}
      />
    </ProtectedRoute>
  );
}
