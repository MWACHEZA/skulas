import DashboardLayout from '../../components/portals/DashboardLayout';
import type { NavItem } from '../../components/portals/DashboardLayout';
import ProtectedRoute from '../../components/portals/ProtectedRoute';
import { useTerminology } from '../../hooks/useTerminology';

export default function BursarLayout() {
  const { t, isMedical } = useTerminology();

  const bursarNav: NavItem[] = [
    { label: 'Dashboard', icon: 'fas fa-tachometer-alt', to: '/bursar/dashboard' },
    
    { section: 'Finance', label: 'Fee Billing', icon: 'fas fa-receipt', to: '/bursar/fees-management/billing' },
    { label: 'Payment History', icon: 'fas fa-money-check-alt', to: '/bursar/fees-management/payment-history' },
    
    { section: 'Fees Management', label: 'Fee Groups', icon: 'fas fa-tags', to: '/bursar/fees-management/groups' },
    { label: 'Manage Invoices', icon: 'fas fa-file-invoice', to: '/bursar/fees-management/invoices' },
    { label: 'Student Ledgers', icon: 'fas fa-book', to: '/bursar/fees-management/ledgers' },
    { label: 'Groceries', icon: 'fas fa-shopping-basket', to: '/bursar/fees-management/groceries' },
    { label: 'Bulk Invoices', icon: 'fas fa-mail-bulk', to: '/bursar/fees-management/bulk-invoices' },
    { label: 'Reminder Logs', icon: 'fas fa-history', to: '/bursar/fees-management/reminder-logs' },
    { label: 'Payment Plans', icon: 'fas fa-calendar-check', to: '/bursar/payment-plans' },
    
    { section: 'Accounts', label: 'Liabilities', icon: 'fas fa-file-invoice-dollar', to: '/bursar/accounts/liabilities' },
    { label: 'Income', icon: 'fas fa-hand-holding-usd', to: '/bursar/accounts/income' },
    { label: 'Expenses', icon: 'fas fa-file-invoice', to: '/bursar/accounts/expenses' },
    { label: 'Uniforms', icon: 'fas fa-tshirt', to: '/bursar/accounts/uniforms' },
    { label: 'Financial Reconciliation', icon: 'fas fa-balance-scale', to: '/bursar/reconcile' },
    
    { section: 'Payroll', label: 'Payroll Management', icon: 'fas fa-users', to: '/bursar/payroll' },
    { label: 'Process Payroll', icon: 'fas fa-play-circle', to: '/bursar/payroll/run' },
    { label: 'Employees / Setup', icon: 'fas fa-users-cog', to: '/bursar/payroll/employees' },
    
    { section: 'Academic Operations', label: 'Class Migration', icon: 'fas fa-exchange-alt', to: '/bursar/class-migration' },
    { section: 'People', label: t('students'), icon: `fas ${isMedical ? 'fa-user-nurse' : 'fa-user-graduate'}`, to: '/bursar/students' },
    
    { section: 'Insights', label: 'Reports', icon: 'fas fa-chart-bar', to: '/bursar/reports' },
    { label: `${t('staff')} Directory`, icon: 'fas fa-address-book', to: '/bursar/payroll/employees' },
    
    { section: 'Operations', label: 'Assets & Inventory', icon: 'fas fa-boxes', to: '/bursar/assets' },
    { label: 'Procurement', icon: 'fas fa-shopping-cart', to: '/bursar/procurement' },
    { label: 'Tuckshop Inventory', icon: 'fas fa-boxes', to: '/bursar/tuckshop/inventory' },
    { label: 'Tuckshop POS', icon: 'fas fa-cash-register', to: '/bursar/tuckshop/sales' },
    { label: 'Tuckshop Reports', icon: 'fas fa-chart-line', to: '/bursar/tuckshop/reports' },
    
    { section: 'Transportation', label: 'Routes', icon: 'fas fa-route', to: '/bursar/transportation/routes' },
    { label: 'Vehicles', icon: 'fas fa-bus', to: '/bursar/transportation/vehicles' },
    { label: 'Assignments', icon: 'fas fa-shuttle-van', to: '/bursar/transportation/assignments' },
    
    { section: t('governance'), label: `${t('governanceShort')} Funding`, icon: 'fas fa-hand-holding-usd', to: '/bursar/sdc/funding' },
    { label: `${t('governanceShort')} Minutes`, icon: 'fas fa-file-contract', to: '/bursar/sdc/minutes' },
    
    { section: 'Financial Config', label: 'Payment Methods', icon: 'fas fa-money-check', to: '/bursar/payment-methods' },
    { label: 'Revenue Allocation', icon: 'fas fa-chart-pie', to: '/bursar/revenue-allocation' },

    { section: 'Account', label: 'Website Settings', icon: 'fas fa-globe', to: '/bursar/website-settings' },
    { label: 'My Profile', icon: 'fas fa-user', to: '/bursar/profile' },
    { label: 'IT Support', icon: 'fas fa-headset', to: '/bursar/support' },
    { section: 'HR & Finance', label: 'My Leave Application', icon: 'fas fa-calendar-minus', to: '/bursar/leave' },
    { label: 'My Awards', icon: 'fas fa-award', to: '/bursar/awards' }
  ];

  return (
    <ProtectedRoute allowedRoles={['BURSAR']} redirectTo="/bursar/login">
      <DashboardLayout
        portalName="Bursar Portal"
        portalIcon="fas fa-money-check-alt"
        roleBadge="Bursar"
        navItems={bursarNav}
      />
    </ProtectedRoute>
  );
}
