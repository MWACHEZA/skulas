import DashboardLayout from '../../components/portals/DashboardLayout';
import type { NavItem } from '../../components/portals/DashboardLayout';
import EntitySwitcher from '../../components/portals/shared/EntitySwitcher';
import ForceLinkOverlay from '../../components/portals/shared/ForceLinkOverlay';

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'fas fa-tachometer-alt', to: '/supplier/dashboard' },
  { section: 'Procurement', label: 'Available Tenders', icon: 'fas fa-file-contract', to: '/supplier/tenders' },
  { label: 'Awarded Contracts', icon: 'fas fa-handshake', to: '/supplier/contracts' },
  { label: 'My Quotations', icon: 'fas fa-file-invoice-dollar', to: '/supplier/quotations' },
  { label: 'Purchase Orders', icon: 'fas fa-shopping-cart', to: '/supplier/orders' },
  { label: 'Uniform Orders', icon: 'fas fa-tshirt', to: '/supplier/uniforms' },
  { section: 'Finance', label: 'Invoices & Payments', icon: 'fas fa-receipt', to: '/supplier/invoices' },
  { section: 'Compliance', label: 'Compliance Status', icon: 'fas fa-shield-alt', to: '/supplier/compliance' },
  { label: 'Policies & Processes', icon: 'fas fa-book', to: '/supplier/policies' },
  { section: 'Account', label: 'Messages', icon: 'fas fa-bell', to: '/supplier/messages' },
  { label: 'Profile Settings', icon: 'fas fa-user-circle', to: '/supplier/profile' },
  { label: 'Contact Us', icon: 'fas fa-headset', to: '/supplier/support' },
];

export default function SupplierLayout() {
  return (
    <>
      <DashboardLayout
        portalName="Supplier Portal"
        portalIcon="fas fa-truck-loading"
        roleBadge="Supplier"
        navItems={navItems}
        sidebarHeaderExtra={<EntitySwitcher />}
      />
      <ForceLinkOverlay />
    </>
  );
}
