import DashboardLayout from '../../components/portals/DashboardLayout';
import type { NavItem } from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useTerminology } from '../../hooks/useTerminology';

export default function StudentLayout() {
  const { t, isMedical, isUniversity, isPoly, isSeminary } = useTerminology();
  const isTertiary = isUniversity || isPoly || isMedical || isSeminary;

  const studentNav: NavItem[] = [
    { label: 'Dashboard', icon: 'fas fa-tachometer-alt', to: '/student/dashboard' },
    { label: 'My Profile', icon: 'fas fa-user', to: '/student/profile' },
    // Only show Portfolio and Research for University/Tertiary students
    ...(isUniversity ? [
      { label: 'Academic Portfolio', icon: 'fas fa-id-card', to: '/student/portfolio' },
      { label: 'Research Portfolio', icon: 'fas fa-microscope', to: '/student/research' },
    ] : []),
    { label: t('grades'), icon: 'fas fa-chart-line', to: '/student/grades' },
    { label: t('timetable'), icon: 'fas fa-calendar-alt', to: '/student/timetable' },
    { label: t('assignments'), icon: 'fas fa-tasks', to: '/student/assignments' },
    { label: 'Online Exams (CBT)', icon: 'fas fa-laptop-code', to: '/student/cbt' },
    { label: t('attendance'), icon: `fas ${isMedical ? 'fa-notes-medical' : 'fa-clipboard-check'}`, to: '/student/attendance' },
    { label: 'Fees & Payments', icon: 'fas fa-money-bill-wave', to: '/student/fees' },
    { label: 'Uniforms', icon: 'fas fa-tshirt', to: '/student/uniforms' },
    { label: 'Study material', icon: 'fas fa-book-reader', to: '/student/study-materials' },
    { label: 'My Books & Loans', icon: 'fas fa-book-open', to: '/student/my-books', section: 'Resources' },
    { label: 'Events', icon: 'fas fa-calendar-day', to: '/student/events' },
    { section: 'Leadership', label: isTertiary ? 'Student Representative Council (SRC)' : 'Prefects Board', icon: 'fas fa-user-tie', to: '/student/prefects' },
    { label: `${t('class')} Monitor Tool`, icon: 'fas fa-clipboard-check', to: '/student/class-monitor', requiredSecondaryRoles: ['Class Monitor'] },
    { label: 'Sports & Fixtures', icon: 'fas fa-trophy', to: '/student/sports', requiredSecondaryRoles: ['Sports Captain'] },
    { label: 'My House', icon: 'fas fa-house-user', to: '/student/house', requiredSecondaryRoles: ['House Captain'] },
    { label: 'Dining Hall (DH)', icon: 'fas fa-utensils', to: '/student/dining-hall' },
    { label: 'Church & Chaplaincy', icon: 'fas fa-church', to: '/student/chaplaincy', requiredSecondaryRoles: ['Church Prefect'] },
    { label: 'Library Management', icon: 'fas fa-book-reader', to: '/student/library-staff', requiredSecondaryRoles: ['Student Librarian'] },
    { section: 'Clinic', label: 'Health Complaints', icon: 'fas fa-stethoscope', to: '/student/clinic/complaints' },
    { label: 'Appointments', icon: 'fas fa-calendar-check', to: '/student/clinic/appointments' },
    { label: 'Emergencies', icon: 'fas fa-ambulance', to: '/student/clinic/emergencies' },
    { label: 'IT Support', icon: 'fas fa-headset', to: '/student/support', section: 'Help' },
    { label: 'Settings', icon: 'fas fa-cog', to: '/student/settings' },
    {
      label: 'Awards & certificates',
      icon: 'fas fa-award',
      to: '/student/awards'
    }
  ];

  return (
    <ProtectedRoute allowedRoles={['STUDENT']} redirectTo="/student/login">
      <DashboardLayout
        portalName={isMedical ? "Trainee Portal" : "Student Portal"}
        portalIcon={`fas ${isMedical ? 'fa-user-nurse' : 'fa-graduation-cap'}`}
        roleBadge={t('student')}
        navItems={studentNav}
      />
    </ProtectedRoute>
  );
}
