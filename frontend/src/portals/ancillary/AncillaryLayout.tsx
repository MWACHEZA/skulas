import DashboardLayout from '../../components/portals/DashboardLayout';
import type { NavItem } from '../../components/portals/DashboardLayout';

const ancillaryNav: NavItem[] = [
  { label: 'Overview', icon: 'fas fa-home', to: '/ancillary' },
  { section: 'Internal Services', label: 'IT Support', icon: 'fas fa-laptop-medical', to: '/ancillary/it-support' },
  { label: 'Assets & Inventory', icon: 'fas fa-boxes', to: '/ancillary/assets' },
  { label: 'Procurement', icon: 'fas fa-shopping-cart', to: '/ancillary/procurement' },
  { label: 'Staff Directory', icon: 'fas fa-address-book', to: '/ancillary/directory' },
  { section: 'Front Office', label: 'Admission Inquiries', icon: 'fas fa-envelope-open-text', to: '/ancillary/office/inquiries', requiredSecondaryRoles: ['Receptionist', 'Front Desk Officer'] },
  { label: 'Visitor Book', icon: 'fas fa-book-open', to: '/ancillary/office/visitors', requiredSecondaryRoles: ['Receptionist', 'Front Desk Officer', 'Boarding Master', 'Hostel Matron'] },
  { label: 'Phone Call Log', icon: 'fas fa-phone-alt', to: '/ancillary/office/calls', requiredSecondaryRoles: ['Receptionist', 'Front Desk Officer', 'Boarding Master', 'Hostel Matron'] },
  { label: 'Complaints', icon: 'fas fa-exclamation-circle', to: '/ancillary/office/complaints', requiredSecondaryRoles: ['Receptionist', 'Front Desk Officer'] },
  { label: 'Website Settings', icon: 'fas fa-globe', to: '/ancillary/website-settings', requiredSecondaryRoles: ['Receptionist', 'Front Desk Officer'] },
  { section: 'Boarding Management', label: 'Hostel Category', icon: 'fas fa-tags', to: '/ancillary/boarding/hostel-category', requiredSecondaryRoles: ['Boarding Master', 'Hostel Matron', 'Hostel Supervisor'] },
  { label: 'Hostel Room', icon: 'fas fa-door-open', to: '/ancillary/boarding/hostel-room', requiredSecondaryRoles: ['Boarding Master', 'Hostel Matron', 'Hostel Supervisor'] },
  { label: 'Manage Dormitory', icon: 'fas fa-building', to: '/ancillary/boarding/manage-hostel', requiredSecondaryRoles: ['Boarding Master', 'Hostel Matron', 'Hostel Supervisor'] },
  { label: 'Assign Students', icon: 'fas fa-user-plus', to: '/ancillary/boarding/assign-students', requiredSecondaryRoles: ['Boarding Master', 'Hostel Matron', 'Hostel Supervisor'] },
  { label: 'Security & Visitor Log', icon: 'fas fa-user-shield', to: '/ancillary/security', requiredSecondaryRoles: ['Security Guard', 'Security Supervisor', 'Gate Officer'] },
  { section: 'Tuckshop Operations', label: 'Dashboard', icon: 'fas fa-store', to: '/ancillary/tuckshop', requiredSecondaryRoles: ['Tuckshop Manager', 'Cashier', 'Tuckshop Assistant'] },
  { label: 'Inventory', icon: 'fas fa-boxes', to: '/ancillary/tuckshop/inventory', requiredSecondaryRoles: ['Tuckshop Manager', 'Cashier', 'Tuckshop Assistant'] },
  { label: 'Sales POS', icon: 'fas fa-cash-register', to: '/ancillary/tuckshop/sales', requiredSecondaryRoles: ['Tuckshop Manager', 'Cashier', 'Tuckshop Assistant'] },
  { label: 'Reports', icon: 'fas fa-chart-line', to: '/ancillary/tuckshop/reports', requiredSecondaryRoles: ['Tuckshop Manager', 'Cashier', 'Tuckshop Assistant'] },
  { label: 'Agriculture & Farm', icon: 'fas fa-tractor', to: '/ancillary/farm', requiredSecondaryRoles: ['Farm Manager'] },
  { label: 'Dining Hall (DH)', icon: 'fas fa-utensils', to: '/ancillary/dining-hall' },
  { label: 'Library Management', icon: 'fas fa-book', to: '/library', requiredSecondaryRoles: ['Library Assistant', 'Librarian'] },
  { label: 'House Management', icon: 'fas fa-house-user', to: '/ancillary/house', requiredSecondaryRoles: ['House Master'] },
  { label: 'Sports & Fixtures', icon: 'fas fa-trophy', to: '/ancillary/sports', requiredSecondaryRoles: ['Sports Coordinator'] },
  { section: 'Transportation', label: 'Routes', icon: 'fas fa-route', to: '/ancillary/transportation/routes', requiredSecondaryRoles: ['Driver', 'Transport Coordinator'] },
  { label: 'Vehicles', icon: 'fas fa-bus', to: '/ancillary/transportation/vehicles', requiredSecondaryRoles: ['Driver', 'Transport Coordinator'] },
  { label: 'Assignments', icon: 'fas fa-shuttle-van', to: '/ancillary/transportation/assignments', requiredSecondaryRoles: ['Driver', 'Transport Coordinator'] },
  { section: 'Human Resources', label: 'My Leave Application', icon: 'fas fa-calendar-minus', to: '/ancillary/leave' },
  { label: 'My Awards', icon: 'fas fa-award', to: '/ancillary/awards' },
  { label: 'My Payslips', icon: 'fas fa-file-invoice-dollar', to: '/ancillary/payslips' },
  { label: 'Work Schedules', icon: 'fas fa-clock', to: '/ancillary/schedules' },
  { label: 'Give student award', icon: 'fas fa-medal', to: '/ancillary/give-award' },
  { section: 'Communication', label: 'Messages', icon: 'fas fa-envelope', to: '/ancillary/messages' },
  { section: 'Clinic', label: 'Health Complaints', icon: 'fas fa-stethoscope', to: '/ancillary/clinic/complaints' },
  { label: 'Appointments', icon: 'fas fa-calendar-check', to: '/ancillary/clinic/appointments' },
  { label: 'Emergencies', icon: 'fas fa-ambulance', to: '/ancillary/clinic/emergencies' },
  { label: 'Referrals', icon: 'fas fa-file-medical', to: '/ancillary/clinic/referrals' },
  { label: 'Immunization', icon: 'fas fa-syringe', to: '/ancillary/clinic/immunization' },
  { section: 'Account', label: 'My Profile', icon: 'fas fa-user', to: '/ancillary/profile' },
];

export default function AncillaryLayout() {
  return (
    <DashboardLayout
      portalName="Ancillary Staff Portal"
      portalIcon="fas fa-hands-helping"
      roleBadge="Staff"
      navItems={ancillaryNav}
    />
  );
}
