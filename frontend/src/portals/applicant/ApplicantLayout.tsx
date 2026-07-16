import DashboardLayout from '../../components/portals/DashboardLayout';
import type { NavItem } from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useTerminology } from '../../hooks/useTerminology';

export default function ApplicantLayout() {
  const { t, isMedical } = useTerminology();

  const applicantNav: NavItem[] = [
    { label: 'Dashboard', icon: 'fas fa-tachometer-alt', to: '/applicant/dashboard' },
    { label: 'My Profile', icon: 'fas fa-user', to: '/applicant/profile' },
    { label: 'Status Tracker', icon: 'fas fa-stream', to: '/applicant/timeline' },
    { label: 'Documents', icon: 'fas fa-file-upload', to: '/applicant/documents' },
    { label: 'Interview', icon: 'fas fa-calendar-check', to: '/applicant/interview' },
    { label: 'Fees & Payments', icon: 'fas fa-money-bill-wave', to: '/applicant/fees' },
    { label: 'Messages', icon: 'fas fa-envelope', to: '/applicant/messages', section: 'Support' },
    { label: 'FAQ', icon: 'fas fa-question-circle', to: '/applicant/faq' },
    { label: 'Settings', icon: 'fas fa-cog', to: '/applicant/settings', section: 'Account' },
  ];

  return (
    <ProtectedRoute allowedRoles={['APPLICANT', 'STUDENT']} redirectTo="/applicant/login">
      <DashboardLayout
        portalName={isMedical ? "Applicant Portal" : "Applicant Portal"}
        portalIcon={isMedical ? "fas fa-file-medical" : "fas fa-file-signature"}
        roleBadge={t('applicant')}
        navItems={applicantNav}
      />
    </ProtectedRoute>
  );
}
