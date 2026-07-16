import DashboardLayout from '../../components/portals/DashboardLayout';
import type { NavItem } from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';

const acadexNav: NavItem[] = [
  { label: 'Platform Dashboard', icon: 'fas fa-globe-africa', to: '/acadex' },
  { section: 'Schools', label: 'School Registry', icon: 'fas fa-school', to: '/acadex/schools' },
  { label: 'New Provisioning', icon: 'fas fa-plus-circle', to: '/acadex/provision' },
  { section: 'Billing', label: 'Subscription Tiers', icon: 'fas fa-layer-group', to: '/acadex/plans' },
  { label: 'Global Revenue', icon: 'fas fa-chart-line', to: '/acadex/revenue' },
  { section: 'Security', label: 'Platform Logs', icon: 'fas fa-history', to: '/acadex/logs' },
  { label: 'System Settings', icon: 'fas fa-cogs', to: '/acadex/settings' },
  { section: 'Account', label: 'My Profile', icon: 'fas fa-user-shield', to: '/acadex/profile' },
];

export default function AcadexLayout() {
  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']} redirectTo="/acadex/login">
      <DashboardLayout
        portalName="Acadex Platform"
        portalIcon="fas fa-shield-alt"
        roleBadge="Platform Admin"
        navItems={acadexNav}
        className="acadex-theme"
      />
    </ProtectedRoute>
  );
}
