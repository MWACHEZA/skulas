import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { generatePortalNavigation } from '../../config/navGenerator';

export default function TeacherLayout() {
  const { user } = useAuth();
  const location = useLocation();

  const navGroups = generatePortalNavigation('teacher', user, location.pathname);

  return (
    <ProtectedRoute allowedRoles={['TEACHER']} redirectTo="/teacher/login">
      <DashboardLayout
        portalName="Teacher Portal"
        portalIcon="fas fa-chalkboard-teacher"
        roleBadge="Teacher"
        navGroups={navGroups}
      />
    </ProtectedRoute>
  );
}
