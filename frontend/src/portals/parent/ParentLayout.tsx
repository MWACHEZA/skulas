import DashboardLayout from '../../components/portals/DashboardLayout';
import type { NavItem } from '../../components/portals/DashboardLayout';
import EntitySwitcher from '../../components/portals/shared/EntitySwitcher';
import ForceLinkOverlay from '../../components/portals/shared/ForceLinkOverlay';
import { useTerminology } from '../../hooks/useTerminology';

export default function ParentLayout() {
  const { t, isMedical } = useTerminology();

  const navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'fas fa-th-large', to: '/parent/dashboard' },
    { section: 'Academic & Life', label: `${t('student')} Profile`, icon: `fas ${isMedical ? 'fa-user-nurse' : 'fa-user-graduate'}`, to: '/parent/profile' },
    { label: t('reports'), icon: `fas ${isMedical ? 'fa-file-medical-alt' : 'fa-chart-line'}`, to: '/parent/reports' },
    { label: 'Academic History', icon: 'fas fa-history', to: '/parent/history' },
    { label: `${t('attendance')} Record`, icon: `fas ${isMedical ? 'fa-notes-medical' : 'fa-calendar-check'}`, to: '/parent/attendance' },
    { label: `${t('class')} ${t('timetable')}`, icon: 'fas fa-clock', to: '/parent/timetable' },
    { label: 'Health & Conduct', icon: 'fas fa-heartbeat', to: '/parent/wellbeing' },
    { label: 'School Calendar', icon: 'fas fa-calendar-alt', to: '/parent/calendar' },
    
    { section: 'Communication', label: 'Recent Messages', icon: 'fas fa-envelope', to: '/parent/messages' },
    { label: 'Noticeboard', icon: 'fas fa-bullhorn', to: '/parent/notices' },
    { label: 'Approvals', icon: 'fas fa-file-signature', to: '/parent/approvals' },
    
    { section: 'Finance & Logistics', label: 'Fees & Payments', icon: 'fas fa-file-invoice-dollar', to: '/parent/fees' },
    { label: 'Payment Plans', icon: 'fas fa-calendar-check', to: '/parent/payment-plans' },
    { label: 'Tuckshop Wallet', icon: 'fas fa-wallet', to: '/parent/wallet' },
    { label: 'Uniforms', icon: 'fas fa-tshirt', to: '/parent/uniforms' },
    { label: 'Transport Tracker', icon: 'fas fa-bus', to: '/parent/transport' },
    
    { section: 'Settings', label: 'My Settings', icon: 'fas fa-cog', to: '/parent/settings' },
    { label: 'My Profile', icon: 'fas fa-user', to: '/parent/profile' },
    { section: 'Clinic', label: 'Health Complaints', icon: 'fas fa-stethoscope', to: '/parent/clinic/complaints' },
    { label: 'Appointments', icon: 'fas fa-calendar-check', to: '/parent/clinic/appointments' },
    { label: 'Emergencies', icon: 'fas fa-ambulance', to: '/parent/clinic/emergencies' },
    { label: 'IT Support', icon: 'fas fa-headset', to: '/parent/support' },
  ];

  return (
    <>
      <DashboardLayout
        portalName={isMedical ? "Guardian Portal" : "Parent Portal"}
        portalIcon={isMedical ? "fas fa-clinic-medical" : "fas fa-home"}
        roleBadge={t('parent')}
        navItems={navItems}
        sidebarHeaderExtra={<EntitySwitcher />}
      />
      <ForceLinkOverlay />
    </>
  );
}
