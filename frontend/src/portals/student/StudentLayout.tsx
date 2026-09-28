import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';
import { useTerminology } from '../../hooks/useTerminology';
import { generatePortalNavigation, type NavGroup } from '../../config/navGenerator';
import api from '../../lib/api';

export default function StudentLayout() {
  const { t, isMedical } = useTerminology();
  const { user } = useAuth();
  const location = useLocation();
  const [isLeader, setIsLeader] = useState(false);

  useEffect(() => {
    api.get('/api/student-requests/leadership-check')
      .then(res => {
        if (res.data?.isLeader) {
          setIsLeader(true);
        }
      })
      .catch(() => setIsLeader(false));
  }, []);

  const baseNavGroups = generatePortalNavigation('student', user, location.pathname);

  // If leader, inject the "Cleaning Requests" navigation entry with "Leader" badge
  const navGroups: NavGroup[] = baseNavGroups.map(g => ({
    ...g,
    items: [...g.items]
  }));

  if (isLeader) {
    const studentLifeGroup = navGroups.find(g => g.id === 'STUDENT_LIFE');
    const leaderItem = {
      id: 'student-cleaning-requests',
      label: 'Cleaning Requests',
      to: '/student/cleaning-requests',
      icon: 'fas fa-soap',
      badge: 'Leader'
    };

    if (studentLifeGroup) {
      if (!studentLifeGroup.items.some(i => i.id === 'student-cleaning-requests')) {
        studentLifeGroup.items.push(leaderItem);
      }
    } else {
      navGroups.push({
        id: 'STUDENT_LIFE',
        label: 'Leadership',
        icon: 'fas fa-user-shield',
        order: 99,
        items: [leaderItem]
      });
    }
  }

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
