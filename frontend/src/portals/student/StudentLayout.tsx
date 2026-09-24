import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { useTerminology } from '../../hooks/useTerminology';
import { generatePortalNavigation } from '../../config/navGenerator';

export default function StudentLayout() {
  const { t, isMedical } = useTerminology();
  const { user } = useAuth();
  const location = useLocation();

  const navGroups = generatePortalNavigation('student', user, location.pathname);

  return (
    <ProtectedRoute allowedRoles={['STUDENT']} redirectTo="/student/login">
      <DashboardLayout
        portalName={isMedical ? "Trainee Portal" : "Student Portal"}
        portalIcon={`fas ${isMedical ? 'fa-user-nurse' : 'fa-graduation-cap'}`}
        roleBadge={t('student')}
        navGroups={navGroups}
      />
    </ProtectedRoute>
  );
}
