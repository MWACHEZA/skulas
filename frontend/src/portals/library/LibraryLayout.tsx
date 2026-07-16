import DashboardLayout from '../../components/portals/DashboardLayout';
import type { NavItem } from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useTerminology } from '../../hooks/useTerminology';

export default function LibraryLayout() {
  const { t, isMedical } = useTerminology();

  const libraryNav: NavItem[] = [
    { label: 'Dashboard', icon: 'fas fa-tachometer-alt', to: '/librarian/dashboard' },
    { section: 'Catalog', label: 'Book Catalog', icon: 'fas fa-book', to: '/librarian/books' },
    { label: 'Resource Categories', icon: 'fas fa-tags', to: '/librarian/categories' },
    { label: 'Digital Repository', icon: 'fas fa-cloud-download-alt', to: '/librarian/digital' },
    { label: 'Active Loans', icon: 'fas fa-handshake', to: '/librarian/loans' },
    { label: 'Overdue Books', icon: 'fas fa-exclamation-circle', to: '/librarian/overdue' },
    { label: 'Requests', icon: 'fas fa-hand-holding', to: '/librarian/requests' },
    { section: 'Resources', label: 'Asset Management', icon: 'fas fa-boxes', to: '/librarian/assets' },
    { label: 'Requisitions & Procurement', icon: 'fas fa-shopping-cart', to: '/librarian/procurement' },
    { section: 'Insights', label: t('reports'), icon: `fas ${isMedical ? 'fa-file-medical-alt' : 'fa-chart-bar'}`, to: '/librarian/reports' },
    { section: 'Attendance', label: 'Attendance Logs', icon: 'fas fa-fingerprint', to: '/librarian/attendance' },
    { section: 'Communication', label: 'Messages', icon: 'fas fa-envelope', to: '/librarian/messages' },
    { section: 'Account', label: 'Settings', icon: 'fas fa-cog', to: '/librarian/settings' },
    { label: 'My Profile', icon: 'fas fa-user', to: '/librarian/profile' },
    { label: 'My Leave Application', icon: 'fas fa-calendar-minus', to: '/librarian/leave' },
    { label: 'My Awards', icon: 'fas fa-award', to: '/librarian/awards' },
    { label: 'My Payslips', icon: 'fas fa-file-invoice-dollar', to: '/librarian/payslips' },
    { label: 'Work Schedules', icon: 'fas fa-clock', to: '/librarian/schedules' },
    { label: 'IT Support', icon: 'fas fa-headset', to: '/librarian/support' },
  ];

  return (
    <ProtectedRoute allowedRoles={['LIBRARIAN']} redirectTo="/librarian/login">
      <DashboardLayout
        portalName={isMedical ? t('library') : "Library Portal"}
        portalIcon={isMedical ? "fas fa-briefcase-medical" : "fas fa-book"}
        roleBadge="Librarian"
        navItems={libraryNav}
      />
    </ProtectedRoute>
  );
}
