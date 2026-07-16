import DashboardLayout from '../../components/portals/DashboardLayout';
import type { NavItem } from '../../components/portals/DashboardLayout';

const alumniNav: NavItem[] = [
  { label: 'Overview', icon: 'fas fa-home', to: '/alumni' },
  { section: 'Network', label: 'Network Directory', icon: 'fas fa-users', to: '/alumni/network' },
  { label: 'Events & Reunions', icon: 'fas fa-calendar-alt', to: '/alumni/events' },
  { section: 'Contributions', label: 'Donations & Fees', icon: 'fas fa-hand-holding-usd', to: '/alumni/fees' },
  { label: 'School Updates', icon: 'fas fa-newspaper', to: '/alumni/updates' },
  { section: 'Account', label: 'Settings', icon: 'fas fa-user-cog', to: '/alumni/settings' },
  { label: 'My Profile', icon: 'fas fa-user', to: '/alumni/profile' },
  { label: 'IT Support', icon: 'fas fa-headset', to: '/alumni/support' },
];

export default function AlumniLayout() {
  return (
    <DashboardLayout
      portalName="Alumni Portal"
      portalIcon="fas fa-user-tie"
      roleBadge="Alumni"
      navItems={alumniNav}
    />
  );
}
