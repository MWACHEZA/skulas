import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { useTerminology } from '../../hooks/useTerminology';
import { generatePortalNavigation } from '../../config/navGenerator';

export default function LibraryLayout() {
  const { t, isMedical } = useTerminology();
  const { user } = useAuth();
  const location = useLocation();

  const navGroups = generatePortalNavigation('librarian', user, location.pathname);

  return (
    <ProtectedRoute allowedRoles={['LIBRARIAN', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'ANCILLARY']} redirectTo="/librarian/login">
      <DashboardLayout
        portalName={isMedical ? t('library') : "Library Portal"}
        portalIcon={isMedical ? "fas fa-briefcase-medical" : "fas fa-book"}
        roleBadge="Librarian"
        navGroups={navGroups}
      />
    </ProtectedRoute>
  );
}
