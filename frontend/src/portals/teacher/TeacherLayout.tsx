import DashboardLayout from '../../components/portals/DashboardLayout';
import type { NavItem } from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useTerminology } from '../../hooks/useTerminology';

export default function TeacherLayout() {
  const { t, isMedical, isUniversity, isPoly } = useTerminology();

  const isTertiary = isUniversity || isPoly || isMedical;

  const teacherNav: NavItem[] = [
    { label: 'Dashboard', icon: 'fas fa-tachometer-alt', to: '/teacher/dashboard' },
    { label: 'My Profile', icon: 'fas fa-user', to: '/teacher/profile' },
    { label: `My ${t('classes')}`, icon: `fas ${isMedical ? 'fa-hospital-user' : 'fa-door-open'}`, to: '/teacher/classes', section: 'Academic' },
    { label: t('students'), icon: `fas ${isMedical ? 'fa-user-nurse' : 'fa-user-graduate'}`, to: '/teacher/students' },
    
    // Conditionally show Research Supervision for Tertiary only
    ...(isTertiary ? [
      { label: 'Research Supervision', icon: 'fas fa-user-friends', to: '/teacher/supervision' }
    ] : []),

    { label: 'Grades & Results', icon: 'fas fa-chart-line', to: '/teacher/grades' },
    { label: t('assignments'), icon: 'fas fa-tasks', to: '/teacher/assignments' },
    
    // Flattened Attendance items (no longer a dropdown)
    { label: 'Daily Student Attendance', icon: `fas ${isMedical ? 'fa-notes-medical' : 'fa-clipboard-check'}`, to: '/teacher/attendance/student' },
    { label: 'QR Attendance', icon: 'fas fa-qrcode', to: '/teacher/attendance/qr' },
    { label: 'Daily Student Attendance Report', icon: 'fas fa-chart-bar', to: '/teacher/attendance/report' },
    { label: 'Attendance Logs', icon: 'fas fa-fingerprint', to: '/teacher/attendance-logs' },
    
    // Flattened Live class items (no longer a dropdown)
    { label: 'Zoom Live Class', icon: 'fas fa-video', to: '/teacher/live-class/zoom' },
    { label: 'Jitsi Live Class', icon: 'fas fa-video', to: '/teacher/live-class/jitsi' },
    
    // Flattened Courses (remove Add Course and Enrol Student subitems)
    { label: 'Courses', icon: 'fas fa-laptop-code', to: '/teacher/courses' },
    { label: 'Revenue Report', icon: 'fas fa-file-invoice-dollar', to: '/teacher/online-learning/revenue-report' },
    
    { label: 'Provide student study materials', icon: 'fas fa-book-reader', to: '/teacher/study-materials' },
    
    // Conditionally show Lesson Planner for K12 only
    ...(!isTertiary ? [
      { label: 'Lesson Planner', icon: 'fas fa-calendar-check', to: '/teacher/planner' }
    ] : []),
    
    { label: 'Syllabus Manager', icon: 'fas fa-book-open', to: '/teacher/syllabus' },
    { section: 'CBT', label: 'Manage CBT', icon: 'fas fa-list', to: '/teacher/cbt/manage' },
    { label: t('timetable'), icon: 'fas fa-calendar-alt', to: '/teacher/timetable' },
    
    { label: 'Sports & Fixtures', icon: 'fas fa-trophy', to: '/teacher/sports', requiredSecondaryRoles: ['Sports Master', 'Sports Coordinator'] },
    { label: 'School Farm Projects', icon: 'fas fa-tractor', to: '/teacher/farm', requiredSecondaryRoles: ['Agriculture Teacher', 'Farm Assistant'] },
    { label: 'Dining Hall (DH)', icon: 'fas fa-utensils', to: '/teacher/dining-hall' },
    { label: 'Work Schedules', icon: 'fas fa-clock', to: '/teacher/schedules' },
    { label: isTertiary ? 'Student Council (SRC)' : 'Prefects Board', icon: 'fas fa-user-tie', to: '/teacher/prefects', requiredSecondaryRoles: ['Senior Teacher'] },
    { label: 'House Management', icon: 'fas fa-house-user', to: '/teacher/house', requiredSecondaryRoles: ['House Master'] },
    { label: 'Chaplaincy Services', icon: 'fas fa-church', to: '/teacher/chaplaincy', requiredSecondaryRoles: ['School Chaplain'] },
    
    { label: 'Submissions', icon: 'fas fa-file-upload', to: '/teacher/submissions' },
    
    { label: 'Messages', icon: 'fas fa-envelope', to: '/teacher/messages', section: 'Communication' },
    { label: 'Reports', icon: 'fas fa-chart-bar', to: '/teacher/reports', section: 'Reports' },
    
    { label: 'Library & Loans', icon: 'fas fa-book', to: '/teacher/library', section: 'Resources' },
    { label: 'My Textbooks', icon: 'fas fa-book-bookmark', to: '/teacher/textbooks', section: 'Resources' },
    { label: 'Requisitions & Procurement', icon: 'fas fa-shopping-cart', to: '/teacher/procurement', section: 'Resources' },
    { label: 'Asset Management', icon: 'fas fa-boxes', to: '/teacher/assets', section: 'Resources' },
    
    // Restrict clinic section for teacher: complaints, appointments, emergencies only
    { section: 'Clinic', label: 'Health Complaints', icon: 'fas fa-stethoscope', to: '/teacher/clinic/complaints' },
    { label: 'Appointments', icon: 'fas fa-calendar-check', to: '/teacher/clinic/appointments' },
    { label: 'Emergencies', icon: 'fas fa-ambulance', to: '/teacher/clinic/emergencies' },
    
    { label: 'IT Support', icon: 'fas fa-headset', to: '/teacher/support', section: 'Help' },
    { label: 'Settings', icon: 'fas fa-cog', to: '/teacher/settings' },
    { section: 'HR & Finance', label: 'My Leave Application', icon: 'fas fa-calendar-minus', to: '/teacher/leave' },
    { label: 'My Awards', icon: 'fas fa-award', to: '/teacher/awards' }
  ];

  return (
    <ProtectedRoute allowedRoles={['TEACHER']} redirectTo="/teacher/login">
      <DashboardLayout
        portalName="Teacher Portal"
        portalIcon="fas fa-chalkboard-teacher"
        roleBadge="Teacher"
        navItems={teacherNav}
      />
    </ProtectedRoute>
  );
}
