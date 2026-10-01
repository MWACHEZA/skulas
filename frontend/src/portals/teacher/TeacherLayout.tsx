import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { generatePortalNavigation } from '../../config/navGenerator';
import api from '../../lib/api';

export default function TeacherLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [hasDiningAccess, setHasDiningAccess] = useState<boolean | null>(null);

  useEffect(() => {
    api.get('/api/dining-hall/access')
      .then(res => setHasDiningAccess(res.data.hasAccess))
      .catch(() => setHasDiningAccess(false));
  }, []);

  let navGroups = generatePortalNavigation('teacher', user, location.pathname);

  if (hasDiningAccess === false) {
    navGroups = navGroups.map(group => ({
      ...group,
      items: group.items.filter(item => item.id !== 'teacher-dining')
    })).filter(group => group.items.length > 0);
  }

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
