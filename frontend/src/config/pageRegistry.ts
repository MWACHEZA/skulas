import { PERMISSIONS } from './permissions';

export interface PageDefinition {
  id: string;
  label: string;
  route: string;
  group: CanonicalGroupId;
  icon: string;
  permissionKey?: string;
  portalVisibility: ('admin' | 'teacher' | 'bursar' | 'librarian' | 'ancillary' | 'clinic' | 'student' | 'parent' | 'sdc')[];
  requiredRoles?: string[];
  requiredSecondaryRoles?: string[];
  badge?: string;
  searchKeywords?: string[];
  tabs?: { id: string; label: string; route?: string }[];
  department?: string;
  approvalChain?: string[];
  condition?: (user: any) => boolean;
  isSetupRequired?: boolean;
  showTour?: boolean;
}

export type CanonicalGroupId = 
  | 'PEOPLE_ENROLLMENT'
  | 'ACADEMICS'
  | 'STUDENT_LIFE'
  | 'FINANCE_BILLING'
  | 'PROCUREMENT_ASSETS'
  | 'HR_PAYROLL'
  | 'TRANSPORT'
  | 'LIBRARY'
  | 'CLINIC_HEALTH'
  | 'COMMUNICATION_PORTAL'
  | 'SDC_GOVERNANCE'
  | 'SYSTEM';

export interface CanonicalGroupConfig {
  id: CanonicalGroupId;
  label: string;
  icon: string;
  order: number;
}

export const CANONICAL_GROUPS: Record<CanonicalGroupId, CanonicalGroupConfig> = {
  PEOPLE_ENROLLMENT: { id: 'PEOPLE_ENROLLMENT', label: 'People & Enrollment', icon: 'fas fa-users', order: 1 },
  ACADEMICS: { id: 'ACADEMICS', label: 'Academics', icon: 'fas fa-graduation-cap', order: 2 },
  STUDENT_LIFE: { id: 'STUDENT_LIFE', label: 'Student Life & Discipline', icon: 'fas fa-user-shield', order: 3 },
  FINANCE_BILLING: { id: 'FINANCE_BILLING', label: 'Finance & Billing', icon: 'fas fa-receipt', order: 4 },
  PROCUREMENT_ASSETS: { id: 'PROCUREMENT_ASSETS', label: 'Procurement & Assets', icon: 'fas fa-boxes', order: 5 },
  HR_PAYROLL: { id: 'HR_PAYROLL', label: 'HR & Payroll', icon: 'fas fa-id-badge', order: 6 },
  TRANSPORT: { id: 'TRANSPORT', label: 'Transport', icon: 'fas fa-bus', order: 7 },
  LIBRARY: { id: 'LIBRARY', label: 'Library', icon: 'fas fa-book-reader', order: 8 },
  CLINIC_HEALTH: { id: 'CLINIC_HEALTH', label: 'Clinic & Health', icon: 'fas fa-notes-medical', order: 9 },
  COMMUNICATION_PORTAL: { id: 'COMMUNICATION_PORTAL', label: 'Communication & Portal', icon: 'fas fa-bullhorn', order: 10 },
  SDC_GOVERNANCE: { id: 'SDC_GOVERNANCE', label: 'SDC & Governance', icon: 'fas fa-landmark', order: 11 },
  SYSTEM: { id: 'SYSTEM', label: 'System', icon: 'fas fa-cog', order: 12 },
};

/**
 * MASTER PAGE REGISTRY (Single Source of Truth)
 * Maps every canonical ERP page to its canonical group, icon, route, permission, and role visibility.
 */
export const PAGE_REGISTRY: PageDefinition[] = [
  // =========================================================================
  // 1. CORE ADMIN CONSOLIDATED PAGES
  // =========================================================================
  {
    id: 'admin-dashboard',
    label: 'Dashboard',
    route: '/admin/dashboard',
    group: 'SYSTEM',
    icon: 'fas fa-tachometer-alt',
    permissionKey: PERMISSIONS.DASHBOARD_METRICS,
    portalVisibility: ['admin'],
    searchKeywords: ['home', 'actions', 'overview', 'summary']
  },
  {
    id: 'admin-students',
    label: 'Students Directory',
    route: '/admin/students',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-user-graduate',
    permissionKey: PERMISSIONS.PEOPLE_STUDENTS_VIEW,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'profile', label: 'Profile' },
      { id: 'academics', label: 'Academics' },
      { id: 'fees', label: 'Fees' },
      { id: 'attendance', label: 'Attendance' },
      { id: 'clinic', label: 'Clinic' },
      { id: 'transport', label: 'Transport' },
      { id: 'parents', label: 'Parents' }
    ],
    searchKeywords: ['pupils', 'learners', 'admission', 'enrollment', 'student directory']
  },
  {
    id: 'admin-admissions',
    label: 'Admissions Pipeline',
    route: '/admin/admissions',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-id-card',
    permissionKey: PERMISSIONS.PEOPLE_STUDENTS_MANAGE,
    portalVisibility: ['admin'],
    searchKeywords: ['applications', 'inquiries', 'intake', 'pipeline']
  },
  {
    id: 'admin-finance-overview',
    label: 'Finance Overview',
    route: '/admin/finance/overview',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-chart-pie',
    permissionKey: PERMISSIONS.FINANCE_FEES_VIEW,
    portalVisibility: ['admin'],
    searchKeywords: ['finance dashboard', 'collections', 'overdue', 'total billed']
  },
  {
    id: 'admin-finance-billing',
    label: 'Fees & Billing',
    route: '/admin/finance/billing',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-receipt',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'invoices', label: 'Invoices' },
      { id: 'receipts', label: 'Receipts' },
      { id: 'ledgers', label: 'Student Ledgers' }
    ],
    searchKeywords: ['invoices', 'receipts', 'student ledgers', 'billing', 'payments', 'statements']
  },
  {
    id: 'admin-finance-payment-plans',
    label: 'Payment Plans',
    route: '/admin/finance/payment-plans',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-calendar-check',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['admin'],
    searchKeywords: ['payment agreements', 'milestones', 'installments']
  },
  {
    id: 'admin-finance-wallets',
    label: 'Wallets & Tuckshop',
    route: '/admin/finance/wallets',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-wallet',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'sales', label: 'Tuckshop Sales' },
      { id: 'inventory', label: 'Store Inventory' },
      { id: 'topups', label: 'Wallet Top-ups' }
    ],
    searchKeywords: ['canteen', 'tuckshop', 'pocket money', 'groceries', 'pos']
  },
  {
    id: 'admin-academics-setup',
    label: 'Academic Setup',
    route: '/admin/academics/setup',
    group: 'ACADEMICS',
    icon: 'fas fa-sliders-h',
    permissionKey: PERMISSIONS.ACADEMICS_SUBJECTS_VIEW,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'subjects', label: 'Subjects' },
      { id: 'classes', label: 'Classes & Streams' },
      { id: 'grading', label: 'Grading Scales' }
    ],
    searchKeywords: ['curriculum', 'subjects', 'classes', 'streams', 'grading settings']
  },
  {
    id: 'admin-departments',
    label: 'Academic Departments',
    route: '/admin/departments',
    group: 'ACADEMICS',
    icon: 'fas fa-sitemap',
    permissionKey: PERMISSIONS.ACADEMICS_SUBJECTS_MANAGE,
    portalVisibility: ['admin'],
    searchKeywords: ['departments', 'hod', 'faculty', 'subject departments', 'academic departments']
  },
  {
    id: 'admin-academics-marks',
    label: 'Marks & Reports',
    route: '/admin/academics/marks',
    group: 'ACADEMICS',
    icon: 'fas fa-pen-alt',
    permissionKey: PERMISSIONS.ACADEMICS_MARKS_ENTRY,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'marks', label: 'Marks Entry' },
      { id: 'reports', label: 'Academic Reports' }
    ],
    searchKeywords: ['marks entry', 'report cards', 'scores', 'transcripts', 'terminal reports']
  },
  {
    id: 'admin-academics-timetable',
    label: 'Timetable & Calendar',
    route: '/admin/academics/timetable',
    group: 'ACADEMICS',
    icon: 'fas fa-calendar-alt',
    permissionKey: PERMISSIONS.ACADEMICS_TIMETABLE_VIEW,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'schedule', label: 'Weekly Schedule' },
      { id: 'calendar', label: 'Academic Calendar' }
    ],
    searchKeywords: ['timetable', 'periods', 'schedule', 'school calendar', 'term dates']
  },
  {
    id: 'admin-attendance',
    label: 'Attendance & Clock-In',
    route: '/admin/attendance',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-fingerprint',
    permissionKey: PERMISSIONS.STUDENT_LIFE_CLOCK_LOGS,
    portalVisibility: ['admin'],
    searchKeywords: ['presence', 'roll call', 'clock-in logs', 'staff register', 'student attendance']
  },
  {
    id: 'admin-clinic',
    label: 'Clinic & Welfare',
    route: '/admin/clinic',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-notes-medical',
    permissionKey: PERMISSIONS.CLINIC_DASHBOARD_VIEW,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'visits', label: 'Patient Visits' },
      { id: 'inventory', label: 'Pharmacy Inventory' },
      { id: 'reports', label: 'Clinical Reports' }
    ],
    searchKeywords: ['health', 'sick bay', 'triage', 'nurse', 'vitals', 'drugs', 'dispensing']
  },
  {
    id: 'admin-discipline',
    label: 'Discipline & Awards',
    route: '/admin/discipline',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-balance-scale',
    permissionKey: PERMISSIONS.STUDENT_LIFE_PREFECTS,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'conduct', label: 'Conduct Incidents' },
      { id: 'awards', label: 'Merits & Awards' }
    ],
    searchKeywords: ['conduct', 'detention', 'punishment', 'infractions', 'merits', 'awards', 'certificates']
  },
  {
    id: 'admin-transport',
    label: 'Transport & Fleet',
    route: '/admin/transport',
    group: 'TRANSPORT',
    icon: 'fas fa-bus',
    permissionKey: PERMISSIONS.TRANSPORT_ROUTES_MANAGE,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'buses', label: 'Buses' },
      { id: 'routes', label: 'Routes' },
      { id: 'map', label: 'Live Map' },
      { id: 'fees', label: 'Transport Fees' }
    ],
    searchKeywords: ['school bus', 'routes', 'fleet', 'gps tracking', 'bus fares', 'transportation']
  },
  {
    id: 'admin-uniforms',
    label: 'Uniforms & Supplies',
    route: '/admin/uniforms',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-boxes',
    permissionKey: PERMISSIONS.PEOPLE_UNIFORMS_MANAGE,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'uniforms', label: 'Uniforms Stock' },
      { id: 'bookstore', label: 'Bookstore' }
    ],
    searchKeywords: ['uniforms', 'blazers', 'books', 'stationery', 'stock inventory']
  },
  {
    id: 'admin-communication',
    label: 'Communication Hub',
    route: '/admin/communication',
    group: 'COMMUNICATION_PORTAL',
    icon: 'fas fa-bullhorn',
    permissionKey: PERMISSIONS.COMMUNICATION_ANNOUNCEMENTS,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'messages', label: 'Messages Inbox' },
      { id: 'announcements', label: 'Announcements Sent' },
      { id: 'approvals', label: 'Pending Approvals' }
    ],
    searchKeywords: ['messages', 'broadcasts', 'circulars', 'approvals', 'consent forms', 'inbox']
  },
  {
    id: 'admin-system',
    label: 'Users & Access Control',
    route: '/admin/system',
    group: 'SYSTEM',
    icon: 'fas fa-users-cog',
    permissionKey: PERMISSIONS.PEOPLE_USERS_MANAGE,
    portalVisibility: ['admin'],
    searchKeywords: ['users', 'roles', 'staff', 'teachers', 'bursars', 'passwords', 'permissions']
  },
  {
    id: 'admin-system-config',
    label: 'System Configuration',
    route: '/admin/system-config',
    group: 'SYSTEM',
    icon: 'fas fa-sliders-h',
    permissionKey: PERMISSIONS.SETTINGS_INSTITUTIONAL,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'branding', label: 'School Profile & Receipts' },
      { id: 'gateways', label: 'SMS & Email Gateways' },
      { id: 'notifications', label: 'Notification Triggers' },
      { id: 'backup', label: 'Backup & Data Exports' }
    ],
    searchKeywords: ['branding', 'sms gateway', 'email smtp', 'receipt headers', 'backup', 'data export', 'configuration']
  },
  {
    id: 'admin-boarding',
    label: 'Boarding & Hostels',
    route: '/admin/boarding',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-hotel',
    permissionKey: PERMISSIONS.PEOPLE_HOUSES_MANAGE,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'hostels', label: 'Hostels' },
      { id: 'rooms', label: 'Dorm Rooms' },
      { id: 'allocations', label: 'Boarder Allocations' }
    ],
    searchKeywords: ['hostels', 'dorms', 'dormitory', 'houses', 'student houses', 'boarders', 'residential', 'boarding']
  },
  {
    id: 'admin-clubs',
    label: 'Clubs & Societies',
    route: '/admin/clubs',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-users',
    permissionKey: PERMISSIONS.STUDENT_LIFE_CLUBS,
    portalVisibility: ['admin'],
    searchKeywords: ['clubs', 'societies', 'extracurricular', 'student clubs', 'societies']
  },
  {
    id: 'admin-dining',
    label: 'Dining Hall Service',
    route: '/admin/dining',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-utensils',
    permissionKey: PERMISSIONS.STUDENT_LIFE_PREFECTS,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'menu', label: 'Weekly Menu' },
      { id: 'reports', label: 'Dietary Records' }
    ],
    searchKeywords: ['dining hall', 'weekly menu', 'food service', 'special diets']
  },
  {
    id: 'admin-procurement',
    label: 'Procurement & Requisitions',
    route: '/admin/procurement',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-shopping-cart',
    permissionKey: PERMISSIONS.PROCUREMENT_REQUISITIONS,
    portalVisibility: ['admin'],
    searchKeywords: ['procurement', 'purchase orders', 'requisitions', 'suppliers']
  },
  {
    id: 'admin-assets',
    label: 'Asset Register',
    route: '/admin/assets',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-boxes',
    permissionKey: PERMISSIONS.ASSETS_REGISTER_VIEW,
    portalVisibility: ['admin'],
    tabs: [
      { id: 'register', label: 'Asset Register' },
      { id: 'maintenance', label: 'Maintenance Schedule' }
    ],
    searchKeywords: ['assets', 'equipment', 'depreciation', 'facilities']
  },

  // =========================================================================
  // 2. BURSAR PORTAL PAGES
  // =========================================================================
  {
    id: 'bursar-dashboard',
    label: 'Dashboard',
    route: '/bursar/dashboard',
    group: 'SYSTEM',
    icon: 'fas fa-tachometer-alt',
    permissionKey: PERMISSIONS.FINANCE_FEES_VIEW,
    portalVisibility: ['bursar'],
    searchKeywords: ['home', 'overview', 'bursar']
  },
  {
    id: 'bursar-students',
    label: 'Students Directory',
    route: '/bursar/students',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-user-graduate',
    permissionKey: PERMISSIONS.PEOPLE_STUDENTS_VIEW,
    portalVisibility: ['bursar'],
    searchKeywords: ['students', 'ledgers', 'balances', 'learners']
  },
  {
    id: 'bursar-uniforms',
    label: 'Uniforms Management',
    route: '/bursar/accounts/uniforms',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-tshirt',
    permissionKey: PERMISSIONS.PEOPLE_UNIFORMS_MANAGE,
    portalVisibility: ['bursar'],
    searchKeywords: ['uniforms', 'attire', 'clothing', 'stock']
  },
  {
    id: 'bursar-fees',
    label: 'Fees & Invoices',
    route: '/bursar/fees',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-file-invoice-dollar',
    permissionKey: PERMISSIONS.FINANCE_FEES_VIEW,
    portalVisibility: ['bursar'],
    tabs: [
      { id: 'billing', label: 'Fee Billing' },
      { id: 'invoices', label: 'Invoices & Receipts' },
      { id: 'bulk-invoices', label: 'Bulk Invoicing' },
      { id: 'ledgers', label: 'Student Ledgers' },
      { id: 'reminders', label: 'Payment Reminders' },
      { id: 'payment-methods', label: 'Payment Methods' }
    ],
    searchKeywords: ['fees', 'billing', 'invoices', 'receipts', 'student ledgers', 'reminders']
  },
  {
    id: 'bursar-tuckshop',
    label: 'Wallets & Tuckshop',
    route: '/bursar/tuckshop',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-cash-register',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['bursar'],
    tabs: [
      { id: 'sales', label: 'POS & Sales' },
      { id: 'inventory', label: 'Store Inventory' },
      { id: 'topups', label: 'Wallet Top-ups' },
      { id: 'cashup', label: 'Till Sessions & Cash-Up' }
    ],
    searchKeywords: ['tuckshop', 'canteen', 'pos', 'wallets', 'pocket money', 'inventory', 'cashup']
  },
  {
    id: 'bursar-payment-plans',
    label: 'Payment Plans',
    route: '/bursar/payment-plans',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-calendar-check',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['bursar'],
    searchKeywords: ['payment agreements', 'installments', 'debt relief']
  },
  {
    id: 'admin-gl',
    label: 'General Ledger (GL)',
    route: '/bursar/accounts/gl',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-book-open',
    permissionKey: PERMISSIONS.FINANCE_REPORTS_VIEW,
    portalVisibility: ['bursar', 'admin'],
    tabs: [
      { id: 'coa', label: 'Chart of Accounts' },
      { id: 'journal', label: 'Journal Entries' },
      { id: 'audit', label: 'Audit Trail' }
    ],
    searchKeywords: ['gl', 'general ledger', 'journal entries', 'audit trail', 'reversals', 'double-entry']
  },
  {
    id: 'admin-financial-reports',
    label: 'Financial Reports Suite',
    route: '/bursar/accounts/financial-reports',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-chart-line',
    permissionKey: PERMISSIONS.FINANCE_REPORTS_VIEW,
    portalVisibility: ['bursar', 'admin'],
    tabs: [
      { id: 'trial-balance', label: 'Trial Balance' },
      { id: 'income-statement', label: 'Income Statement' },
      { id: 'balance-sheet', label: 'Balance Sheet' },
      { id: 'cash-flow', label: 'Cash Flow' },
      { id: 'aged-debtors', label: 'Aged Debtors' }
    ],
    searchKeywords: ['financial statements', 'trial balance', 'income statement', 'balance sheet', 'cash flow', 'aged debtors']
  },
  {
    id: 'admin-budgets',
    label: 'Budgets & Approvals',
    route: '/bursar/budgets',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-balance-scale',
    permissionKey: PERMISSIONS.FINANCE_COA_MANAGE,
    portalVisibility: ['bursar', 'admin'],
    searchKeywords: ['budget', 'approvals', 'threshold', 'governance', 'tier']
  },
  {
    id: 'bursar-fiscal',
    label: 'ZIMRA Fiscalisation',
    route: '/bursar/fiscal',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-shield-alt',
    permissionKey: PERMISSIONS.FINANCE_REPORTS_VIEW,
    portalVisibility: ['bursar', 'admin'],
    tabs: [
      { id: 'devices', label: 'Virtual Devices' },
      { id: 'receipts', label: 'Fiscal Receipts' },
      { id: 'queue', label: 'Pending Queue' }
    ],
    searchKeywords: ['fiscal', 'zimra', 'vfd', 'fdms', 'receipt', 'tax invoice', 'hardware']
  },
  {
    id: 'bursar-zimra-returns',
    label: 'Statutory & EMIS Returns',
    route: '/bursar/zimra/returns',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-landmark',
    permissionKey: PERMISSIONS.FINANCE_REPORTS_VIEW,
    portalVisibility: ['bursar', 'admin'],
    tabs: [
      { id: 'vat2', label: 'VAT 2 Return' },
      { id: 'p2', label: 'NSSA P2' },
      { id: 'emis', label: 'Zimche/EMIS' },
      { id: 'clearance', label: 'ITF263 Clearance' }
    ],
    searchKeywords: ['zimra', 'vat2', 'p2', 'nssa', 'emis', 'clearance', 'statutory']
  },
  {
    id: 'bursar-sdc',
    label: 'SDC Governance',
    route: '/bursar/sdc',
    group: 'SDC_GOVERNANCE',
    icon: 'fas fa-landmark',
    permissionKey: PERMISSIONS.GOVERNANCE_MINUTES,
    portalVisibility: ['bursar', 'sdc'],
    tabs: [
      { id: 'minutes', label: 'Meeting Minutes' },
      { id: 'funding', label: 'Project Funding' }
    ],
    searchKeywords: ['sdc', 'governance', 'minutes', 'funding']
  },
  {
    id: 'bursar-procurement',
    label: 'Procurement & Requisitions',
    route: '/bursar/procurement',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-shopping-cart',
    permissionKey: PERMISSIONS.PROCUREMENT_REQUISITIONS,
    portalVisibility: ['bursar'],
    searchKeywords: ['procurement', 'purchase orders', 'orders', 'requisitions']
  },
  {
    id: 'bursar-assets',
    label: 'Asset Register',
    route: '/bursar/assets',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-boxes',
    permissionKey: PERMISSIONS.ASSETS_REGISTER_VIEW,
    portalVisibility: ['bursar'],
    searchKeywords: ['assets', 'equipment', 'depreciation']
  },
  {
    id: 'bursar-payroll',
    label: 'Manage Payroll',
    route: '/bursar/payroll',
    group: 'HR_PAYROLL',
    icon: 'fas fa-money-check-alt',
    permissionKey: PERMISSIONS.HR_PAYROLL_MANAGE,
    portalVisibility: ['bursar'],
    tabs: [
      { id: 'list', label: 'Payroll Batches' },
      { id: 'run', label: 'Process Payroll Run' },
      { id: 'settings', label: 'Salary Bands & PAYE' },
      { id: 'employees', label: 'Staff Ledgers' }
    ],
    searchKeywords: ['payroll', 'salaries', 'paye', 'nssa', 'deductions', 'payslips']
  },

  // =========================================================================
  // 3. TEACHER PORTAL PAGES
  // =========================================================================
  {
    id: 'teacher-dashboard',
    label: 'Dashboard',
    route: '/teacher/dashboard',
    group: 'SYSTEM',
    icon: 'fas fa-tachometer-alt',
    permissionKey: PERMISSIONS.ACADEMICS_SUBJECTS_VIEW,
    portalVisibility: ['teacher'],
    searchKeywords: ['home', 'overview', 'teacher']
  },
  {
    id: 'teacher-curriculum',
    label: 'Curriculum & Syllabus',
    route: '/teacher/curriculum',
    group: 'ACADEMICS',
    icon: 'fas fa-scroll',
    permissionKey: PERMISSIONS.ACADEMICS_SYLLABUS_MANAGE,
    portalVisibility: ['teacher'],
    tabs: [
      { id: 'syllabus', label: 'Syllabus' },
      { id: 'schemes', label: 'Schemes of Work' },
      { id: 'lesson-plans', label: 'Lesson Plans' },
      { id: 'observations', label: 'Lesson Observations' }
    ],
    searchKeywords: ['curriculum', 'syllabus', 'lesson planner', 'schemes of work', 'observations']
  },
  {
    id: 'teacher-timetable',
    label: 'Timetable',
    route: '/teacher/timetable',
    group: 'ACADEMICS',
    icon: 'fas fa-calendar-alt',
    permissionKey: PERMISSIONS.ACADEMICS_TIMETABLE_VIEW,
    portalVisibility: ['teacher'],
    searchKeywords: ['schedule', 'periods', 'classes', 'weekly timetable']
  },
  {
    id: 'teacher-study-materials',
    label: 'Study Materials',
    route: '/teacher/study-materials',
    group: 'ACADEMICS',
    icon: 'fas fa-file-pdf',
    permissionKey: PERMISSIONS.ACADEMICS_STUDY_MATERIAL,
    portalVisibility: ['teacher'],
    searchKeywords: ['handouts', 'lecture notes', 'slides', 'documents']
  },
  {
    id: 'teacher-grades',
    label: 'Grades & Reports',
    route: '/teacher/grades',
    group: 'ACADEMICS',
    icon: 'fas fa-pen-alt',
    permissionKey: PERMISSIONS.ACADEMICS_MARKS_ENTRY,
    portalVisibility: ['teacher'],
    tabs: [
      { id: 'marks-entry', label: 'Marks Entry' },
      { id: 'reports', label: 'Academic Reports' }
    ],
    searchKeywords: ['grades', 'marks', 'assessments', 'scores', 'report cards']
  },
  {
    id: 'teacher-question-bank',
    label: 'Question Bank',
    route: '/teacher/question-bank',
    group: 'ACADEMICS',
    icon: 'fas fa-database',
    permissionKey: PERMISSIONS.ACADEMICS_MARKS_ENTRY,
    portalVisibility: ['teacher'],
    searchKeywords: ['exam papers', 'tests', 'question builder', 'past papers']
  },
  {
    id: 'teacher-cbt',
    label: 'Online Exams (CBT)',
    route: '/teacher/cbt/manage',
    group: 'ACADEMICS',
    icon: 'fas fa-laptop-code',
    permissionKey: PERMISSIONS.ACADEMICS_CBT_MANAGE,
    portalVisibility: ['teacher'],
    searchKeywords: ['cbt', 'online exams', 'quizzes', 'test builder']
  },
  {
    id: 'teacher-students',
    label: 'Students Directory',
    route: '/teacher/students',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-user-graduate',
    permissionKey: PERMISSIONS.PEOPLE_STUDENTS_VIEW,
    portalVisibility: ['teacher'],
    searchKeywords: ['students', 'learners', 'class list']
  },
  {
    id: 'teacher-attendance',
    label: 'Attendance & Roll Call',
    route: '/teacher/attendance',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-fingerprint',
    permissionKey: PERMISSIONS.STUDENT_LIFE_CLOCK_LOGS,
    portalVisibility: ['teacher'],
    searchKeywords: ['roll call', 'register', 'attendance', 'clock-in']
  },
  {
    id: 'teacher-prefects',
    label: 'Prefects Board',
    route: '/teacher/prefects',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-user-tie',
    permissionKey: PERMISSIONS.STUDENT_LIFE_PREFECTS,
    portalVisibility: ['teacher'],
    searchKeywords: ['prefects', 'student leaders', 'src']
  },
  {
    id: 'teacher-classes',
    label: 'Clubs & Classes',
    route: '/teacher/classes',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-chalkboard',
    permissionKey: PERMISSIONS.STUDENT_LIFE_CLUBS,
    portalVisibility: ['teacher'],
    searchKeywords: ['clubs', 'societies', 'class groups']
  },
  {
    id: 'teacher-sports',
    label: 'Sports Management',
    route: '/teacher/sports',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-running',
    permissionKey: PERMISSIONS.STUDENT_LIFE_SPORTS,
    portalVisibility: ['teacher'],
    searchKeywords: ['athletics', 'games', 'matches', 'sports']
  },
  {
    id: 'teacher-dining',
    label: 'Dining Hall (DH)',
    route: '/teacher/dining-hall',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-utensils',
    permissionKey: PERMISSIONS.STUDENT_LIFE_PREFECTS,
    portalVisibility: ['teacher'],
    searchKeywords: ['dining hall', 'meals', 'menu']
  },
  {
    id: 'teacher-chaplaincy',
    label: 'Chaplaincy Services',
    route: '/teacher/chaplaincy',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-church',
    permissionKey: PERMISSIONS.STUDENT_LIFE_CHAPLAINCY,
    portalVisibility: ['teacher'],
    searchKeywords: ['chapel', 'church', 'spiritual']
  },
  {
    id: 'teacher-library',
    label: 'Library & Resources',
    route: '/teacher/library',
    group: 'LIBRARY',
    icon: 'fas fa-book',
    permissionKey: PERMISSIONS.LIBRARY_CATALOG_VIEW,
    portalVisibility: ['teacher'],
    tabs: [
      { id: 'catalog', label: 'Book Catalog' },
      { id: 'loans', label: 'My Loans' },
      { id: 'digital', label: 'Digital Repository' }
    ],
    searchKeywords: ['books', 'library', 'loans', 'digital repository']
  },
  {
    id: 'teacher-clinic',
    label: 'Clinic Referrals',
    route: '/teacher/clinic',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-notes-medical',
    permissionKey: PERMISSIONS.CLINIC_TRIAGE_MANAGE,
    portalVisibility: ['teacher'],
    tabs: [
      { id: 'refer', label: 'Refer Student' },
      { id: 'my-referrals', label: 'My Referrals' }
    ],
    searchKeywords: ['clinic', 'referral', 'sick bay', 'nurse']
  },
  {
    id: 'teacher-procurement',
    label: 'Procurement & Requisitions',
    route: '/teacher/procurement',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-shopping-cart',
    permissionKey: PERMISSIONS.PROCUREMENT_REQUISITIONS,
    portalVisibility: ['teacher'],
    searchKeywords: ['requisitions', 'department orders', 'stationery']
  },
  {
    id: 'teacher-assets',
    label: 'Asset Custody',
    route: '/teacher/assets',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-boxes',
    permissionKey: PERMISSIONS.ASSETS_REGISTER_VIEW,
    portalVisibility: ['teacher'],
    searchKeywords: ['classroom assets', 'lab equipment']
  },
  {
    id: 'teacher-farm',
    label: 'School Farm',
    route: '/teacher/farm',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-tractor',
    permissionKey: PERMISSIONS.FARM_PROJECTS_MANAGE,
    portalVisibility: ['teacher'],
    searchKeywords: ['agriculture', 'school farm', 'projects']
  },
  {
    id: 'teacher-leave',
    label: 'Leave & Cover',
    route: '/teacher/leave',
    group: 'HR_PAYROLL',
    icon: 'fas fa-calendar-minus',
    permissionKey: PERMISSIONS.HR_LEAVE_APPLY,
    portalVisibility: ['teacher'],
    tabs: [
      { id: 'my', label: 'My Leave' },
      { id: 'cover', label: 'Cover Arrangements' },
      { id: 'department', label: 'Department Approvals' }
    ],
    searchKeywords: ['leave', 'time off', 'cover teacher', 'substitute']
  },
  {
    id: 'teacher-payslips',
    label: 'My Payslips',
    route: '/teacher/payslips',
    group: 'HR_PAYROLL',
    icon: 'fas fa-file-invoice-dollar',
    permissionKey: PERMISSIONS.HR_PAYROLL_MANAGE,
    portalVisibility: ['teacher'],
    searchKeywords: ['payslips', 'salary', 'payroll', 'remuneration', 'earnings']
  },

  // =========================================================================
  // 4. ANCILLARY PORTAL PAGES
  // =========================================================================
  {
    id: 'ancillary-dashboard',
    label: 'Clock-In & Attendance',
    route: '/ancillary/dashboard',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-fingerprint',
    permissionKey: PERMISSIONS.STUDENT_LIFE_CLOCK_LOGS,
    portalVisibility: ['ancillary'],
    searchKeywords: ['attendance', 'clock-in', 'staff roll call']
  },
  {
    id: 'ancillary-boarding',
    label: 'Boarding & Hostels',
    route: '/ancillary/boarding',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-hotel',
    permissionKey: PERMISSIONS.PEOPLE_HOUSES_MANAGE,
    portalVisibility: ['ancillary'],
    tabs: [
      { id: 'occupancy', label: 'Occupancy' },
      { id: 'rollcall', label: 'Roll Call' },
      { id: 'exeat', label: 'Exeat Passes' },
      { id: 'approvals', label: 'Approvals' },
      { id: 'requests', label: 'Cleaning Requests' },
      { id: 'clinic', label: 'Sick Bay' }
    ],
    searchKeywords: ['hostels', 'dorms', 'boarders', 'roll call', 'exeat', 'cleaning requests']
  },
  {
    id: 'ancillary-dining',
    label: 'Dining Hall & Kitchen',
    route: '/ancillary/dining-hall',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-utensils',
    permissionKey: PERMISSIONS.STUDENT_LIFE_PREFECTS,
    portalVisibility: ['ancillary'],
    searchKeywords: ['kitchen', 'meals', 'dining hall', 'catering']
  },
  {
    id: 'ancillary-sports',
    label: 'Sports & Grounds',
    route: '/ancillary/sports',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-running',
    permissionKey: PERMISSIONS.STUDENT_LIFE_SPORTS,
    portalVisibility: ['ancillary'],
    searchKeywords: ['grounds', 'pitches', 'maintenance', 'sports']
  },
  {
    id: 'ancillary-transport',
    label: 'Transport & Fleet',
    route: '/ancillary/transportation/vehicles',
    group: 'TRANSPORT',
    icon: 'fas fa-bus',
    permissionKey: PERMISSIONS.TRANSPORT_VEHICLES_MANAGE,
    portalVisibility: ['ancillary'],
    searchKeywords: ['fleet', 'buses', 'transport', 'vehicles']
  },
  {
    id: 'ancillary-procurement',
    label: 'Procurement & Requisitions',
    route: '/ancillary/procurement',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-shopping-cart',
    permissionKey: PERMISSIONS.PROCUREMENT_REQUISITIONS,
    portalVisibility: ['ancillary'],
    searchKeywords: ['supplies', 'tools', 'cleaning materials', 'requisitions']
  },
  {
    id: 'ancillary-assets',
    label: 'Asset Register & Maintenance',
    route: '/ancillary/assets',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-tools',
    permissionKey: PERMISSIONS.ASSETS_MAINTENANCE,
    portalVisibility: ['ancillary'],
    searchKeywords: ['repairs', 'maintenance', 'assets', 'equipment']
  },
  {
    id: 'ancillary-farm',
    label: 'School Farm Projects',
    route: '/ancillary/farm',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-tractor',
    permissionKey: PERMISSIONS.FARM_PROJECTS_MANAGE,
    portalVisibility: ['ancillary'],
    searchKeywords: ['farm', 'agriculture', 'livestock', 'crops']
  },
  {
    id: 'ancillary-schedules',
    label: 'Shift Roster & Schedules',
    route: '/ancillary/schedules',
    group: 'HR_PAYROLL',
    icon: 'fas fa-clock',
    permissionKey: PERMISSIONS.ACADEMICS_WORK_SCHEDULE,
    portalVisibility: ['ancillary', 'librarian'],
    searchKeywords: ['shifts', 'roster', 'working hours']
  },

  // =========================================================================
  // 5. LIBRARIAN PORTAL PAGES
  // =========================================================================
  {
    id: 'librarian-dashboard',
    label: 'Library Dashboard',
    route: '/librarian/dashboard',
    group: 'LIBRARY',
    icon: 'fas fa-tachometer-alt',
    permissionKey: PERMISSIONS.LIBRARY_DASHBOARD_VIEW,
    portalVisibility: ['librarian'],
    searchKeywords: ['library overview', 'books statistics']
  },
  {
    id: 'librarian-books',
    label: 'Book Catalog',
    route: '/librarian/books',
    group: 'LIBRARY',
    icon: 'fas fa-book',
    permissionKey: PERMISSIONS.LIBRARY_CATALOG_VIEW,
    portalVisibility: ['librarian'],
    searchKeywords: ['catalog', 'isbn', 'titles', 'authors']
  },
  {
    id: 'librarian-categories',
    label: 'Resource Categories',
    route: '/librarian/categories',
    group: 'LIBRARY',
    icon: 'fas fa-tags',
    permissionKey: PERMISSIONS.LIBRARY_CATALOG_MANAGE,
    portalVisibility: ['librarian'],
    searchKeywords: ['genres', 'classifications', 'dewey']
  },
  {
    id: 'librarian-loans',
    label: 'Active Loans',
    route: '/librarian/loans',
    group: 'LIBRARY',
    icon: 'fas fa-handshake',
    permissionKey: PERMISSIONS.LIBRARY_CIRCULATION_MANAGE,
    portalVisibility: ['librarian'],
    searchKeywords: ['issue', 'return', 'circulation', 'borrowed']
  },
  {
    id: 'librarian-overdue',
    label: 'Overdue Books & Fines',
    route: '/librarian/overdue',
    group: 'LIBRARY',
    icon: 'fas fa-exclamation-circle',
    permissionKey: PERMISSIONS.LIBRARY_OVERDUE_MANAGE,
    portalVisibility: ['librarian'],
    searchKeywords: ['fines', 'overdue', 'late returns', 'penalties']
  },
  {
    id: 'librarian-reservations',
    label: 'Reservations & Holds',
    route: '/librarian/reservations',
    group: 'LIBRARY',
    icon: 'fas fa-bookmark',
    permissionKey: PERMISSIONS.LIBRARY_CIRCULATION_MANAGE,
    portalVisibility: ['librarian'],
    searchKeywords: ['reservations', 'holds', 'requests']
  },
  {
    id: 'librarian-digital',
    label: 'Digital Repository',
    route: '/librarian/digital',
    group: 'LIBRARY',
    icon: 'fas fa-cloud-download-alt',
    permissionKey: PERMISSIONS.LIBRARY_CATALOG_VIEW,
    portalVisibility: ['librarian'],
    searchKeywords: ['ebooks', 'pdf', 'online repository']
  },
  {
    id: 'librarian-reports',
    label: 'Library Reports',
    route: '/librarian/reports',
    group: 'LIBRARY',
    icon: 'fas fa-chart-pie',
    permissionKey: PERMISSIONS.LIBRARY_REPORTS_VIEW,
    portalVisibility: ['librarian'],
    searchKeywords: ['statistics', 'circulation reports', 'usage']
  },
  {
    id: 'librarian-assets',
    label: 'Library Assets',
    route: '/librarian/assets',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-boxes',
    permissionKey: PERMISSIONS.ASSETS_REGISTER_VIEW,
    portalVisibility: ['librarian'],
    searchKeywords: ['computers', 'furniture', 'scanners']
  },

  // =========================================================================
  // 6. CLINIC PORTAL PAGES (8 Canonical Pages)
  // =========================================================================
  {
    id: 'clinic-dashboard',
    label: 'Clinic Dashboard',
    route: '/clinic/dashboard',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-stethoscope',
    permissionKey: PERMISSIONS.CLINIC_DASHBOARD_VIEW,
    portalVisibility: ['clinic'],
    tabs: [
      { id: 'active', label: 'Active Patients' },
      { id: 'triage-queue', label: 'Triage Queue' },
      { id: 'consults', label: "Today's Consults" },
      { id: 'critical', label: 'Critical Alerts' },
      { id: 'stock', label: 'Low Stock' }
    ],
    searchKeywords: ['clinic', 'overview', 'vitals', 'active patients', 'emergencies']
  },
  {
    id: 'clinic-triage',
    label: 'Triage & Vitals',
    route: '/clinic/triage',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-heartbeat',
    permissionKey: PERMISSIONS.CLINIC_TRIAGE_MANAGE,
    portalVisibility: ['clinic'],
    searchKeywords: ['triage', 'vitals', 'temperature', 'blood pressure', 'spo2', 'intake']
  },
  {
    id: 'clinic-consultations',
    label: 'Consultations',
    route: '/clinic/consultations',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-user-md',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['clinic'],
    tabs: [
      { id: 'queue', label: 'Waiting Queue' },
      { id: 'notes', label: 'Clinical Notes' },
      { id: 'icd10', label: 'ICD-10 Diagnoses' }
    ],
    searchKeywords: ['doctor', 'nurse', 'exam', 'icd-10', 'prescription', 'referral']
  },
  {
    id: 'clinic-hospitalization',
    label: 'Hospitalisation & Wards',
    route: '/clinic/hospitalization',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-bed',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['clinic'],
    tabs: [
      { id: 'admitted', label: 'Admitted Inpatients' },
      { id: 'beds', label: 'Sick Bay Beds' },
      { id: 'rounds', label: 'Doctor Rounds' }
    ],
    searchKeywords: ['sick bay', 'admissions', 'beds', 'hospital', 'discharge']
  },
  {
    id: 'clinic-pharmacy',
    label: 'Pharmacy & Dispensary',
    route: '/clinic/pharmacy',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-pills',
    permissionKey: PERMISSIONS.CLINIC_PHARMACY_MANAGE,
    portalVisibility: ['clinic'],
    tabs: [
      { id: 'inventory', label: 'Drug Inventory' },
      { id: 'dispense', label: 'Dispense Prescriptions' },
      { id: 'expiries', label: 'Expiry & Alerts' }
    ],
    searchKeywords: ['drugs', 'medicines', 'pharmacy', 'stock', 'dispense', 'fefo']
  },
  {
    id: 'clinic-wellness',
    label: 'Wellness & Vaccines',
    route: '/clinic/wellness',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-syringe',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['clinic'],
    tabs: [
      { id: 'vaccines', label: 'Immunization Tracker' },
      { id: 'wellness', label: 'Routine Screenings' },
      { id: 'appointments', label: 'Appointments' }
    ],
    searchKeywords: ['vaccines', 'immunizations', 'wellness', 'routine checkups']
  },
  {
    id: 'clinic-emergency',
    label: 'Emergencies & Referrals',
    route: '/clinic/emergency',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-ambulance',
    permissionKey: PERMISSIONS.CLINIC_TRIAGE_MANAGE,
    portalVisibility: ['clinic'],
    tabs: [
      { id: 'emergency-log', label: 'Emergency Incidents' },
      { id: 'referrals', label: 'External Hospital Referrals' }
    ],
    searchKeywords: ['ambulance', 'emergencies', 'hospital transfers', 'critical incidents']
  },
  {
    id: 'clinic-reports',
    label: 'Reports & Medical Files',
    route: '/clinic/reports',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-chart-line',
    permissionKey: PERMISSIONS.CLINIC_REPORTS_VIEW,
    portalVisibility: ['clinic'],
    tabs: [
      { id: 'records', label: 'Student Health Profiles' },
      { id: 'trends', label: 'Epidemiological Trends' },
      { id: 'billing', label: 'Rebillable Consumables' }
    ],
    searchKeywords: ['medical reports', 'health summaries', 'consumption billing']
  },

  // =========================================================================
  // 7. SHARED CROSS-PORTAL UTILITY PAGES
  // =========================================================================
  {
    id: 'admin-my-leave',
    label: 'My Leave Application',
    route: '/admin/leave',
    group: 'HR_PAYROLL',
    icon: 'fas fa-calendar-minus',
    permissionKey: PERMISSIONS.HR_LEAVE_APPLY,
    portalVisibility: ['teacher', 'bursar', 'librarian', 'ancillary'],
    searchKeywords: ['vacation', 'sick leave', 'time off', 'application']
  },
  {
    id: 'admin-my-awards',
    label: 'My Awards',
    route: '/admin/awards',
    group: 'HR_PAYROLL',
    icon: 'fas fa-medal',
    permissionKey: PERMISSIONS.HR_LEAVE_APPLY,
    portalVisibility: ['teacher', 'bursar', 'librarian', 'ancillary'],
    searchKeywords: ['awards', 'recognition', 'certificates', 'achievements']
  },
  {
    id: 'admin-messages',
    label: 'Messages',
    route: '/admin/messages',
    group: 'COMMUNICATION_PORTAL',
    icon: 'fas fa-envelope',
    permissionKey: PERMISSIONS.COMMUNICATION_MESSAGES,
    portalVisibility: ['teacher', 'bursar', 'librarian', 'ancillary', 'clinic', 'student', 'parent'],
    searchKeywords: ['chat', 'inbox', 'messages', 'communication']
  },
  {
    id: 'admin-helpdesk',
    label: 'IT Help Desk',
    route: '/admin/helpdesk',
    group: 'SYSTEM',
    icon: 'fas fa-headset',
    permissionKey: PERMISSIONS.SYSTEM_HELPDESK,
    portalVisibility: ['admin', 'teacher', 'bursar', 'librarian', 'ancillary', 'clinic', 'student', 'parent'],
    searchKeywords: ['support', 'tickets', 'it help', 'assistance']
  },
  {
    id: 'admin-settings',
    label: 'Settings',
    route: '/admin/settings',
    group: 'SYSTEM',
    icon: 'fas fa-cog',
    permissionKey: PERMISSIONS.SETTINGS_PERSONAL,
    portalVisibility: ['admin', 'bursar', 'librarian', 'teacher', 'ancillary', 'clinic', 'student', 'parent'],
    searchKeywords: ['preferences', 'password', 'configuration']
  },
  {
    id: 'admin-my-profile',
    label: 'My Profile',
    route: '/admin/profile',
    group: 'SYSTEM',
    icon: 'fas fa-user-circle',
    permissionKey: PERMISSIONS.SETTINGS_PERSONAL,
    portalVisibility: ['admin', 'teacher', 'bursar', 'librarian', 'ancillary', 'clinic', 'student', 'parent'],
    searchKeywords: ['profile', 'account', 'bio', 'contact info']
  },

  // =========================================================================
  // 8. STUDENT / PARENT REGISTERED ITEMS
  // =========================================================================
  {
    id: 'student-cleaning-requests',
    label: 'Cleaning Requests',
    route: '/student/cleaning-requests',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-broom',
    permissionKey: PERMISSIONS.STUDENT_CLEANING_REQUESTS,
    portalVisibility: ['student'],
    badge: 'Leader',
    department: 'boarding',
    approvalChain: ['HOD_BOARDING', 'ADMIN', 'BURSAR', 'STORE'],
    condition: (user: any) => !!user?.isLeader,
    tabs: [
      { id: 'request', label: 'Request' },
      { id: 'my-requests', label: 'My Requests' },
      { id: 'stock', label: 'Hostel Stock' }
    ],
    searchKeywords: ['cleaning', 'supplies', 'hostel', 'prefect', 'request', 'mop', 'broom', 'soap', 'detergent']
  },
  {
    id: 'parent-academics',
    label: 'Academics',
    route: '/parent/academics',
    group: 'ACADEMICS',
    icon: 'fas fa-graduation-cap',
    permissionKey: PERMISSIONS.ACADEMICS_REPORTS_VIEW,
    portalVisibility: ['parent'],
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'subject-breakdown', label: 'Subject Breakdown' },
      { id: 'report-cards', label: 'Report Cards' },
      { id: 'history', label: 'History' }
    ],
    searchKeywords: ['grades', 'marks', 'performance', 'report cards', 'reports', 'pdf', 'subject breakdown', 'history', 'transcripts', 'results']
  },
  {
    id: 'parent-fees',
    label: 'Fees & Invoices',
    route: '/parent/fees',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-file-invoice-dollar',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['parent'],
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'invoices', label: 'Invoices & Receipts' },
      { id: 'statement', label: 'Statement' },
      { id: 'payment-plan', label: 'Payment Plan' }
    ],
    searchKeywords: ['fees', 'billing', 'invoices', 'receipts', 'statement', 'ledger', 'payment plans', 'tuition', 'zig']
  },
  {
    id: 'parent-wallet',
    label: 'Tuckshop & Dining',
    route: '/parent/wallet',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-utensils',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['parent'],
    searchKeywords: ['tuckshop', 'dining', 'wallet', 'pocket money', 'canteen', 'allowance', 'topup']
  },
  {
    id: 'parent-uniforms',
    label: 'Uniforms',
    route: '/parent/uniforms',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-tshirt',
    permissionKey: PERMISSIONS.PEOPLE_UNIFORMS_MANAGE,
    portalVisibility: ['parent'],
    searchKeywords: ['uniforms', 'blazer', 'shirts', 'stationery', 'books', 'order', 'clothing']
  },
  {
    id: 'parent-transport',
    label: 'Transport',
    route: '/parent/transport',
    group: 'TRANSPORT',
    icon: 'fas fa-bus',
    permissionKey: PERMISSIONS.TRANSPORT_ROUTES_MANAGE,
    portalVisibility: ['parent'],
    searchKeywords: ['transport', 'bus', 'route', 'driver', 'pickup', 'tracking', 'drop-off']
  },
  {
    id: 'parent-clinic',
    label: 'Clinic & Wellbeing',
    route: '/parent/clinic',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-notes-medical',
    permissionKey: PERMISSIONS.CLINIC_DASHBOARD_VIEW,
    portalVisibility: ['parent'],
    tabs: [
      { id: 'visits', label: 'Clinic Visits' },
      { id: 'profile', label: 'Health Profile' },
      { id: 'wellbeing', label: 'Wellbeing & Conduct' }
    ],
    searchKeywords: ['health', 'clinic', 'visits', 'allergies', 'profile', 'blood group', 'nurse', 'wellbeing', 'conduct', 'merits', 'counselor']
  },
  {
    id: 'parent-approvals',
    label: 'Approvals & Consents',
    route: '/parent/approvals',
    group: 'COMMUNICATION_PORTAL',
    icon: 'fas fa-file-signature',
    permissionKey: PERMISSIONS.COMMUNICATION_ANNOUNCEMENTS,
    portalVisibility: ['parent'],
    searchKeywords: ['approvals', 'consent', 'excursions', 'trips', 'permissions', 'sign-off']
  }
];
