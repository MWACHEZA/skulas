import DashboardLayout from '../../components/portals/DashboardLayout';
import type { NavItem } from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useTerminology } from '../../hooks/useTerminology';

export default function AdminLayout() {
  const { t, isMedical, isUniversity, isPoly, isSeminary } = useTerminology();
  const isTertiary = isUniversity || isPoly || isMedical || isSeminary;

  const adminNav: NavItem[] = [
    { label: 'Dashboard', icon: 'fas fa-tachometer-alt', to: '/admin/dashboard' },
    { section: 'Academic', label: t('students'), icon: `fas ${isMedical ? 'fa-user-nurse' : 'fa-user-graduate'}`, to: '/admin/students' },
    { label: t('teachers'), icon: `fas ${isMedical ? 'fa-hospital-user' : 'fa-chalkboard-teacher'}`, to: '/admin/teachers' },
    { label: t('classes'), icon: `fas ${isMedical ? 'fa-hospital' : 'fa-door-open'}`, to: '/admin/classes' },
    { label: 'House Management', icon: 'fas fa-home', to: '/admin/house' },
    { label: 'Chaplaincy Services', icon: 'fas fa-church', to: '/admin/chaplaincy' },
    { label: isTertiary ? 'Student Representative Council (SRC)' : 'Prefects Board', icon: 'fas fa-user-tie', to: '/admin/prefects' },
    { label: 'Staff Work Schedules', icon: 'fas fa-clock', to: '/admin/schedules' },
    { label: 'Class Migration', icon: 'fas fa-exchange-alt', to: '/admin/class-migration' },
    { label: 'Departments', icon: 'fas fa-building', to: '/admin/departments' },
    { label: t('subjects'), icon: `fas ${isMedical ? 'fa-book-medical' : 'fa-book-open'}`, to: '/admin/subjects' },
    { label: 'Syllabus Manager', icon: 'fas fa-book-open', to: '/admin/syllabus' },
    { label: 'Lesson Planner', icon: 'fas fa-calendar-check', to: '/admin/lesson-plan' },
    { label: t('timetable'), icon: 'fas fa-calendar-alt', to: '/admin/timetable' },
    { label: 'Provide student study materials', icon: 'fas fa-book-reader', to: '/admin/study-materials' },
    
    { section: 'Assessments', label: 'Marks Entry', icon: 'fas fa-pen-nib', to: '/admin/assessments/marks-entry' },
    { label: 'Principal Comments', icon: 'fas fa-comment-medical', to: '/admin/assessments/principal-comments' },
    
    { section: 'CBT', label: 'Manage CBT', icon: 'fas fa-list', to: '/admin/cbt/manage' },
    
    { section: 'Personnel', label: 'Users & Roles', icon: 'fas fa-users-cog', to: '/admin/users' },
    { label: 'Staff Admins', icon: 'fas fa-user-shield', to: '/admin/staff-admins' },
    { label: 'Bursars', icon: 'fas fa-money-check-alt', to: '/admin/bursars' },
    { label: 'Librarians', icon: 'fas fa-book', to: '/admin/librarians' },
    { label: 'Ancillary Staff', icon: 'fas fa-hard-hat', to: '/admin/ancillary' },
    { label: 'Alumni', icon: `fas ${isMedical ? 'fa-user-md' : 'fa-user-graduate'}`, to: '/admin/alumni' },

    { section: 'Operations', label: 'Applications', icon: 'fas fa-file-alt', to: '/admin/applications' },
    { label: 'Fees Overview', icon: 'fas fa-money-bill-wave', to: '/admin/fees' },
    { section: 'Fees Management', label: 'Fee Groups', icon: 'fas fa-tags', to: '/admin/fees-management/groups' },
    { label: 'Fees Billing', icon: 'fas fa-file-invoice-dollar', to: '/admin/fees-management/billing' },
    { label: 'Manage Invoices', icon: 'fas fa-file-invoice', to: '/admin/fees-management/invoices' },
    { label: 'Payment History', icon: 'fas fa-history', to: '/admin/fees-management/payment-history' },
    { label: 'Student Ledgers', icon: 'fas fa-book', to: '/admin/fees-management/ledgers' },
    { label: 'Groceries', icon: 'fas fa-shopping-basket', to: '/admin/fees-management/groceries' },
    { label: 'Bulk Invoices', icon: 'fas fa-mail-bulk', to: '/admin/fees-management/bulk-invoices' },
    { label: 'Reminder Logs', icon: 'fas fa-history', to: '/admin/fees-management/reminder-logs' },
    { label: 'Payment Plans', icon: 'fas fa-calendar-check', to: '/admin/payment-plans' },
    { section: 'Operations cont.', label: 'Procurement', icon: 'fas fa-shopping-cart', to: '/admin/procurement' },
    { label: 'Suppliers', icon: 'fas fa-truck-loading', to: '/admin/suppliers' },
    { label: 'Asset Register', icon: 'fas fa-boxes', to: '/admin/assets' },
    { label: 'Asset Maintenance', icon: 'fas fa-tools', to: '/admin/asset-maintenance' },
    { label: 'School Farm Projects', icon: 'fas fa-tractor', to: '/admin/farm' },
    { label: 'Dining Hall (DH)', icon: 'fas fa-utensils', to: '/admin/dining-hall' },

    { section: 'Transportation', label: 'Routes', icon: 'fas fa-route', to: '/admin/transportation/routes' },
    { label: 'Vehicles', icon: 'fas fa-bus', to: '/admin/transportation/vehicles' },
    { label: 'Assignments', icon: 'fas fa-shuttle-van', to: '/admin/transportation/assignments' },

    { section: 'Human Resources', label: 'Recruitment - Vacancies', icon: 'fas fa-briefcase', to: '/admin/hr/vacancies' },
    { label: 'Recruitment - Applications', icon: 'fas fa-file-signature', to: '/admin/hr/applications' },
    { label: 'Manage Payroll', icon: 'fas fa-money-check-alt', to: '/admin/hr/payroll/list' },
    { label: 'Manage Awards', icon: 'fas fa-award', to: '/admin/hr/awards' },
    { label: 'Leaves', icon: 'fas fa-calendar-times', to: '/admin/hr/leaves' },
    { label: 'Staff Clock-in Logs', icon: 'fas fa-fingerprint', to: '/admin/hr/attendance' },
    { label: 'My Leave Application', icon: 'fas fa-calendar-minus', to: '/admin/leave' },
    { label: 'My Awards', icon: 'fas fa-award', to: '/admin/awards' },

    { section: 'Resources', label: 'Library & Loans', icon: 'fas fa-book', to: '/admin/library' },

    { section: 'Communication', label: 'Announcements', icon: 'fas fa-bullhorn', to: '/admin/announcements' },
    { label: 'Messages', icon: 'fas fa-envelope', to: '/admin/messages' },
    { label: 'Website Settings', icon: 'fas fa-globe', to: '/admin/website-settings' },

    { section: 'Insights', label: t('reports'), icon: `fas ${isMedical ? 'fa-file-medical-alt' : 'fa-chart-bar'}`, to: '/admin/reports' },
    { label: 'Design & Templates', icon: 'fas fa-palette', to: '/admin/document-templates' },

    { section: t('governance'), label: `${t('governanceShort')} Meeting Minutes`, icon: 'fas fa-file-signature', to: '/admin/sdc-minutes' },
    { label: `${t('governanceShort')} Project Funding`, icon: 'fas fa-chart-line', to: '/admin/sdc-funding' },

    { section: 'System', label: 'Subscription', icon: 'fas fa-credit-card', to: '/admin/subscription' },
    { section: 'Clinic', label: 'Health Complaints', icon: 'fas fa-stethoscope', to: '/admin/clinic/complaints' },
    { label: 'Appointments', icon: 'fas fa-calendar-check', to: '/admin/clinic/appointments' },
    { label: 'Emergencies', icon: 'fas fa-ambulance', to: '/admin/clinic/emergencies' },
    { label: 'Referrals', icon: 'fas fa-file-medical', to: '/admin/clinic/referrals' },
    { label: 'Immunization', icon: 'fas fa-syringe', to: '/admin/clinic/immunization' },
    { label: 'IT Helpdesk', icon: 'fas fa-headset', to: '/admin/helpdesk' },
    { label: 'Student Club', icon: 'fas fa-users', to: '/admin/student-club' },
    { label: 'Sports Management', icon: 'fas fa-running', to: '/admin/sports-management' },

    { section: 'Financial config', label: 'Payment Methods', icon: 'fas fa-money-check', to: '/admin/payment-methods' },
    { label: 'Revenue Allocation', icon: 'fas fa-chart-pie', to: '/admin/revenue-allocation' },
    
    { section: 'Accounts', label: 'Liabilities', icon: 'fas fa-file-invoice-dollar', to: '/admin/accounts/liabilities' },
    { label: 'Income', icon: 'fas fa-hand-holding-usd', to: '/admin/accounts/income' },
    { label: 'Expenses', icon: 'fas fa-file-invoice', to: '/admin/accounts/expenses' },
    { label: 'Uniforms', icon: 'fas fa-tshirt', to: '/admin/accounts/uniforms' }
  ];

  return (
    <ProtectedRoute allowedRoles={['SCHOOL_ADMIN']} redirectTo="/admin/login">
      <DashboardLayout
        portalName="Admin Portal"
        portalIcon="fas fa-user-shield"
        roleBadge="Admin"
        navItems={adminNav}
      />
    </ProtectedRoute>
  );
}
