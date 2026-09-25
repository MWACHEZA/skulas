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
 * Maps every single ERP page to its canonical group, icon, route, permission, and role visibility.
 */
export const PAGE_REGISTRY: PageDefinition[] = [
  // ==========================================
  // 1. PEOPLE & ENROLLMENT
  // ==========================================
  {
    id: 'admin-students',
    label: 'Students',
    route: '/admin/students',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-user-graduate',
    permissionKey: PERMISSIONS.PEOPLE_STUDENTS_VIEW,
    portalVisibility: ['admin', 'bursar'],
    searchKeywords: ['pupils', 'learners', 'admission', 'enrollment']
  },
  {
    id: 'admin-teachers',
    label: 'Teachers',
    route: '/admin/teachers',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-chalkboard-teacher',
    permissionKey: PERMISSIONS.PEOPLE_TEACHERS_VIEW,
    portalVisibility: ['admin'],
    searchKeywords: ['faculty', 'instructors', 'tutors']
  },
  {
    id: 'admin-staff-admins',
    label: 'Staff Admins',
    route: '/admin/staff-admins',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-user-shield',
    permissionKey: PERMISSIONS.PEOPLE_STAFF_VIEW,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-bursars',
    label: 'Bursars',
    route: '/admin/bursars',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-money-check-alt',
    permissionKey: PERMISSIONS.PEOPLE_STAFF_VIEW,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-librarians',
    label: 'Librarians',
    route: '/admin/librarians',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-book',
    permissionKey: PERMISSIONS.PEOPLE_STAFF_VIEW,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-ancillary',
    label: 'Ancillary Staff',
    route: '/admin/ancillary',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-hands-helping',
    permissionKey: PERMISSIONS.PEOPLE_STAFF_VIEW,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-parents',
    label: 'Parents',
    route: '/admin/parents',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-user-friends',
    permissionKey: PERMISSIONS.PEOPLE_STAFF_VIEW,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-alumni',
    label: 'Alumni',
    route: '/admin/alumni',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-user-tie',
    permissionKey: PERMISSIONS.PEOPLE_ALUMNI_VIEW,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-users',
    label: 'Users & Roles',
    route: '/admin/users',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-users-cog',
    permissionKey: PERMISSIONS.PEOPLE_USERS_MANAGE,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-classes',
    label: 'Classes',
    route: '/admin/classes',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-chalkboard',
    permissionKey: PERMISSIONS.PEOPLE_CLASSES_MANAGE,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-class-migration',
    label: 'Class Migration',
    route: '/admin/class-migration',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-exchange-alt',
    permissionKey: PERMISSIONS.PEOPLE_CLASSES_MANAGE,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-departments',
    label: 'Departments',
    route: '/admin/departments',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-sitemap',
    permissionKey: PERMISSIONS.PEOPLE_CLASSES_MANAGE,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-house',
    label: 'Houses Management',
    route: '/admin/house',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-house-user',
    permissionKey: PERMISSIONS.PEOPLE_HOUSES_MANAGE,
    portalVisibility: ['admin', 'ancillary']
  },
  {
    id: 'admin-uniforms',
    label: 'Uniforms Management',
    route: '/admin/accounts/uniforms',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-tshirt',
    permissionKey: PERMISSIONS.PEOPLE_UNIFORMS_MANAGE,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-applications',
    label: 'Admissions & Inquiries',
    route: '/admin/applications',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-id-card',
    permissionKey: PERMISSIONS.PEOPLE_STUDENTS_MANAGE,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-student-profile',
    label: 'Student Profile Lookup',
    route: '/admin/student-profile',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-id-badge',
    permissionKey: PERMISSIONS.PEOPLE_STUDENTS_VIEW,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-student-history',
    label: 'Academic History',
    route: '/admin/student-history',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-history',
    permissionKey: PERMISSIONS.PEOPLE_STUDENTS_VIEW,
    portalVisibility: ['admin']
  },

  // ==========================================
  // 2. ACADEMICS
  // ==========================================
  {
    id: 'admin-subjects',
    label: 'Subjects',
    route: '/admin/subjects',
    group: 'ACADEMICS',
    icon: 'fas fa-book-open',
    permissionKey: PERMISSIONS.ACADEMICS_SUBJECTS_VIEW,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-syllabus',
    label: 'Syllabus Manager',
    route: '/admin/syllabus',
    group: 'ACADEMICS',
    icon: 'fas fa-scroll',
    permissionKey: PERMISSIONS.ACADEMICS_SYLLABUS_MANAGE,
    portalVisibility: ['admin', 'teacher']
  },
  {
    id: 'admin-lesson-plan',
    label: 'Lesson Planner',
    route: '/admin/lesson-plan',
    group: 'ACADEMICS',
    icon: 'fas fa-calendar-check',
    permissionKey: PERMISSIONS.ACADEMICS_LESSON_PLAN,
    portalVisibility: ['admin', 'teacher']
  },
  {
    id: 'admin-timetable',
    label: 'Timetable',
    route: '/admin/timetable',
    group: 'ACADEMICS',
    icon: 'fas fa-calendar-alt',
    permissionKey: PERMISSIONS.ACADEMICS_TIMETABLE_VIEW,
    portalVisibility: ['admin', 'teacher', 'student', 'parent']
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
    id: 'admin-study-materials',
    label: 'Study Material',
    route: '/admin/study-materials',
    group: 'ACADEMICS',
    icon: 'fas fa-file-pdf',
    permissionKey: PERMISSIONS.ACADEMICS_STUDY_MATERIAL,
    portalVisibility: ['admin', 'teacher', 'student']
  },
  {
    id: 'admin-marks-entry',
    label: 'Marks Entry',
    route: '/admin/assessments/marks-entry',
    group: 'ACADEMICS',
    icon: 'fas fa-pen-alt',
    permissionKey: PERMISSIONS.ACADEMICS_MARKS_ENTRY,
    portalVisibility: ['admin', 'teacher']
  },
  {
    id: 'admin-principal-comments',
    label: 'Principal Comments',
    route: '/admin/assessments/principal-comments',
    group: 'ACADEMICS',
    icon: 'fas fa-comment-alt',
    permissionKey: PERMISSIONS.ACADEMICS_PRINCIPAL_COMMENTS,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-question-papers',
    label: 'Question Papers',
    route: '/admin/assessments/question-papers',
    group: 'ACADEMICS',
    icon: 'fas fa-file-signature',
    permissionKey: PERMISSIONS.ACADEMICS_MARKS_ENTRY,
    portalVisibility: ['admin', 'teacher']
  },
  {
    id: 'admin-grading',
    label: 'Grading Settings',
    route: '/admin/assessments/grading',
    group: 'ACADEMICS',
    icon: 'fas fa-sliders-h',
    permissionKey: PERMISSIONS.ACADEMICS_MARKS_ENTRY,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-cbt-manage',
    label: 'Manage CBT',
    route: '/admin/cbt/manage',
    group: 'ACADEMICS',
    icon: 'fas fa-laptop-code',
    permissionKey: PERMISSIONS.ACADEMICS_CBT_MANAGE,
    portalVisibility: ['admin', 'teacher']
  },
  {
    id: 'admin-academic-reports',
    label: 'Academic Reports',
    route: '/admin/reports',
    group: 'ACADEMICS',
    icon: 'fas fa-chart-bar',
    permissionKey: PERMISSIONS.ACADEMICS_REPORTS_VIEW,
    portalVisibility: ['admin', 'teacher']
  },
  {
    id: 'admin-schedules',
    label: 'Staff Work Schedule',
    route: '/admin/schedules',
    group: 'ACADEMICS',
    icon: 'fas fa-clock',
    permissionKey: PERMISSIONS.ACADEMICS_WORK_SCHEDULE,
    portalVisibility: ['admin', 'ancillary', 'librarian']
  },

  // ==========================================
  // 3. STUDENT LIFE & DISCIPLINE
  // ==========================================
  {
    id: 'admin-prefects',
    label: 'Prefects Board',
    route: '/admin/prefects',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-user-tie',
    permissionKey: PERMISSIONS.STUDENT_LIFE_PREFECTS,
    portalVisibility: ['admin', 'teacher', 'student']
  },
  {
    id: 'admin-chaplaincy',
    label: 'Chaplaincy Services',
    route: '/admin/chaplaincy',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-church',
    permissionKey: PERMISSIONS.STUDENT_LIFE_CHAPLAINCY,
    portalVisibility: ['admin', 'teacher']
  },
  {
    id: 'admin-student-club',
    label: 'Student Clubs',
    route: '/admin/student-club',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-users',
    permissionKey: PERMISSIONS.STUDENT_LIFE_CLUBS,
    portalVisibility: ['admin', 'teacher']
  },
  {
    id: 'admin-sports-management',
    label: 'Sports Management',
    route: '/admin/sports-management',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-running',
    permissionKey: PERMISSIONS.STUDENT_LIFE_SPORTS,
    portalVisibility: ['admin', 'teacher', 'ancillary']
  },
  {
    id: 'admin-attendance-logs',
    label: 'Student & Staff Clock In Logs',
    route: '/admin/hr/attendance',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-fingerprint',
    permissionKey: PERMISSIONS.STUDENT_LIFE_CLOCK_LOGS,
    portalVisibility: ['admin', 'teacher', 'ancillary']
  },
  {
    id: 'admin-dining-hall',
    label: 'Dining Hall (DH)',
    route: '/admin/dining-hall',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-utensils',
    permissionKey: PERMISSIONS.STUDENT_LIFE_PREFECTS,
    portalVisibility: ['admin', 'ancillary', 'teacher']
  },

  // ==========================================
  // 4. FINANCE & BILLING
  // ==========================================
  {
    id: 'admin-fees-overview',
    label: 'Fees Overview',
    route: '/admin/fees',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-money-bill-wave',
    permissionKey: PERMISSIONS.FINANCE_FEES_VIEW,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-fee-groups',
    label: 'Fee Groups',
    route: '/admin/fee-groups',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-tags',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-fees-billing',
    label: 'Fees Billing',
    route: '/admin/fees-management/billing',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-receipt',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-manage-invoices',
    label: 'Manage Invoices',
    route: '/admin/fees-management/invoices',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-file-invoice',
    permissionKey: PERMISSIONS.FINANCE_INVOICES_MANAGE,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-bulk-invoices',
    label: 'Bulk Invoices',
    route: '/admin/fees-management/bulk-invoices',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-mail-bulk',
    permissionKey: PERMISSIONS.FINANCE_INVOICES_MANAGE,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-payment-history',
    label: 'Payment History',
    route: '/admin/fees-management/payment-history',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-history',
    permissionKey: PERMISSIONS.FINANCE_PAYMENTS_VIEW,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-student-ledgers',
    label: 'Student Ledgers',
    route: '/admin/fees-management/ledgers',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-book',
    permissionKey: PERMISSIONS.FINANCE_LEDGERS_VIEW,
    portalVisibility: ['admin', 'bursar']
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
    id: 'admin-payment-plans',
    label: 'Payment Plans',
    route: '/admin/payment-plans',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-calendar-check',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-reminder-logs',
    label: 'Fee Reminder Logs',
    route: '/admin/fees-management/reminder-logs',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-bell',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-payment-methods',
    label: 'Payment Methods',
    route: '/admin/payment-methods',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-credit-card',
    permissionKey: PERMISSIONS.FINANCE_COA_MANAGE,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-groceries',
    label: 'Groceries & Dining Store',
    route: '/admin/fees-management/groceries',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-shopping-basket',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-revenue-allocation',
    label: 'Revenue Allocation',
    route: '/admin/revenue-allocation',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-chart-pie',
    permissionKey: PERMISSIONS.FINANCE_COA_MANAGE,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-coa',
    label: 'Chart of Accounts',
    route: '/admin/accounts/coa',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-sitemap',
    permissionKey: PERMISSIONS.FINANCE_COA_MANAGE,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-income',
    label: 'Income Tracker',
    route: '/admin/accounts/income',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-hand-holding-usd',
    permissionKey: PERMISSIONS.FINANCE_INCOME_EXPENSES,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-expenses',
    label: 'Expenses Ledger',
    route: '/admin/accounts/expenses',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-file-invoice-dollar',
    permissionKey: PERMISSIONS.FINANCE_INCOME_EXPENSES,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-liabilities',
    label: 'Liabilities Ledger',
    route: '/admin/accounts/liabilities',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-balance-scale-right',
    permissionKey: PERMISSIONS.FINANCE_INCOME_EXPENSES,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-bank-reconciliation',
    label: 'Bank Reconciliation',
    route: '/admin/accounts/bank-reconciliation',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-university',
    permissionKey: PERMISSIONS.FINANCE_RECONCILIATION,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-financial-reports',
    label: 'Financial Reports (P&L)',
    route: '/admin/accounts/financial-reports',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-chart-line',
    permissionKey: PERMISSIONS.FINANCE_REPORTS_VIEW,
    portalVisibility: ['admin', 'bursar']
  },

  // ==========================================
  // 5. PROCUREMENT & ASSETS
  // ==========================================
  {
    id: 'admin-procurement',
    label: 'Procurement & Requisitions',
    route: '/admin/procurement',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-shopping-cart',
    permissionKey: PERMISSIONS.PROCUREMENT_REQUISITIONS,
    portalVisibility: ['admin', 'bursar', 'ancillary', 'teacher']
  },
  {
    id: 'admin-suppliers',
    label: 'Suppliers',
    route: '/admin/suppliers',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-truck',
    permissionKey: PERMISSIONS.PROCUREMENT_SUPPLIERS,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-assets',
    label: 'Asset Register',
    route: '/admin/assets',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-boxes',
    permissionKey: PERMISSIONS.ASSETS_REGISTER_VIEW,
    portalVisibility: ['admin', 'bursar', 'ancillary', 'teacher', 'librarian']
  },
  {
    id: 'admin-asset-maintenance',
    label: 'Asset Maintenance',
    route: '/admin/asset-maintenance',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-tools',
    permissionKey: PERMISSIONS.ASSETS_MAINTENANCE,
    portalVisibility: ['admin', 'ancillary']
  },
  {
    id: 'admin-farm',
    label: 'School Farm Projects',
    route: '/admin/farm',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-tractor',
    permissionKey: PERMISSIONS.FARM_PROJECTS_MANAGE,
    portalVisibility: ['admin', 'ancillary', 'teacher']
  },

  // ==========================================
  // 6. HR & PAYROLL
  // ==========================================
  {
    id: 'admin-hr-vacancies',
    label: 'Recruitment - Vacancies',
    route: '/admin/hr/vacancies',
    group: 'HR_PAYROLL',
    icon: 'fas fa-briefcase',
    permissionKey: PERMISSIONS.HR_RECRUITMENT_MANAGE,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-hr-applications',
    label: 'Recruitment - Applications',
    route: '/admin/hr/applications',
    group: 'HR_PAYROLL',
    icon: 'fas fa-file-signature',
    permissionKey: PERMISSIONS.HR_RECRUITMENT_MANAGE,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-payroll-list',
    label: 'Manage Payroll',
    route: '/admin/hr/payroll/list',
    group: 'HR_PAYROLL',
    icon: 'fas fa-money-check-alt',
    permissionKey: PERMISSIONS.HR_PAYROLL_MANAGE,
    portalVisibility: ['admin', 'bursar']
  },
  {
    id: 'admin-hr-awards',
    label: 'Manage Awards',
    route: '/admin/hr/awards',
    group: 'HR_PAYROLL',
    icon: 'fas fa-award',
    permissionKey: PERMISSIONS.HR_AWARDS_MANAGE,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-hr-leaves',
    label: 'Leave Management',
    route: '/admin/hr/leaves',
    group: 'HR_PAYROLL',
    icon: 'fas fa-calendar-times',
    permissionKey: PERMISSIONS.HR_LEAVE_MANAGE,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-my-leave',
    label: 'My Leave Application',
    route: '/admin/leave',
    group: 'HR_PAYROLL',
    icon: 'fas fa-calendar-minus',
    permissionKey: PERMISSIONS.HR_LEAVE_APPLY,
    portalVisibility: ['admin', 'teacher', 'bursar', 'librarian', 'ancillary']
  },
  {
    id: 'admin-my-awards',
    label: 'My Awards',
    route: '/admin/awards',
    group: 'HR_PAYROLL',
    icon: 'fas fa-medal',
    permissionKey: PERMISSIONS.HR_LEAVE_APPLY,
    portalVisibility: ['admin', 'teacher', 'bursar', 'librarian', 'ancillary']
  },

  // ==========================================
  // 7. TRANSPORT
  // ==========================================
  {
    id: 'admin-transport-routes',
    label: 'Routes',
    route: '/admin/transportation/routes',
    group: 'TRANSPORT',
    icon: 'fas fa-route',
    permissionKey: PERMISSIONS.TRANSPORT_ROUTES_MANAGE,
    portalVisibility: ['admin', 'ancillary', 'bursar']
  },
  {
    id: 'admin-transport-vehicles',
    label: 'Vehicles',
    route: '/admin/transportation/vehicles',
    group: 'TRANSPORT',
    icon: 'fas fa-bus',
    permissionKey: PERMISSIONS.TRANSPORT_VEHICLES_MANAGE,
    portalVisibility: ['admin', 'ancillary', 'bursar']
  },
  {
    id: 'admin-transport-assignments',
    label: 'Vehicle Assignments',
    route: '/admin/transportation/assignments',
    group: 'TRANSPORT',
    icon: 'fas fa-shuttle-van',
    permissionKey: PERMISSIONS.TRANSPORT_VEHICLES_MANAGE,
    portalVisibility: ['admin', 'ancillary', 'bursar']
  },

  // ==========================================
  // 8. LIBRARY
  // ==========================================
  {
    id: 'admin-library-dashboard',
    label: 'Library Dashboard',
    route: '/admin/library/dashboard',
    group: 'LIBRARY',
    icon: 'fas fa-tachometer-alt',
    permissionKey: PERMISSIONS.LIBRARY_DASHBOARD_VIEW,
    portalVisibility: ['admin', 'librarian', 'ancillary']
  },
  {
    id: 'admin-library-books',
    label: 'Book Catalog',
    route: '/admin/library/books',
    group: 'LIBRARY',
    icon: 'fas fa-book',
    permissionKey: PERMISSIONS.LIBRARY_CATALOG_VIEW,
    portalVisibility: ['admin', 'librarian', 'teacher', 'ancillary']
  },
  {
    id: 'admin-library-categories',
    label: 'Resource Categories',
    route: '/admin/library/categories',
    group: 'LIBRARY',
    icon: 'fas fa-tags',
    permissionKey: PERMISSIONS.LIBRARY_CATALOG_MANAGE,
    portalVisibility: ['admin', 'librarian', 'ancillary']
  },
  {
    id: 'admin-library-loans',
    label: 'Active Loans',
    route: '/admin/library/loans',
    group: 'LIBRARY',
    icon: 'fas fa-handshake',
    permissionKey: PERMISSIONS.LIBRARY_CIRCULATION_MANAGE,
    portalVisibility: ['admin', 'librarian', 'ancillary', 'teacher']
  },
  {
    id: 'admin-library-overdue',
    label: 'Overdue Books',
    route: '/admin/library/overdue',
    group: 'LIBRARY',
    icon: 'fas fa-exclamation-circle',
    permissionKey: PERMISSIONS.LIBRARY_OVERDUE_MANAGE,
    portalVisibility: ['admin', 'librarian', 'ancillary']
  },
  {
    id: 'admin-library-reservations',
    label: 'Reservations & Holds',
    route: '/admin/library/reservations',
    group: 'LIBRARY',
    icon: 'fas fa-bookmark',
    permissionKey: PERMISSIONS.LIBRARY_CIRCULATION_MANAGE,
    portalVisibility: ['admin', 'librarian', 'ancillary']
  },
  {
    id: 'admin-library-digital',
    label: 'Digital Repository',
    route: '/admin/library/digital',
    group: 'LIBRARY',
    icon: 'fas fa-cloud-download-alt',
    permissionKey: PERMISSIONS.LIBRARY_CATALOG_VIEW,
    portalVisibility: ['admin', 'librarian', 'teacher', 'ancillary', 'student']
  },
  {
    id: 'admin-library-reports',
    label: 'Library Reports',
    route: '/admin/library/reports',
    group: 'LIBRARY',
    icon: 'fas fa-chart-pie',
    permissionKey: PERMISSIONS.LIBRARY_REPORTS_VIEW,
    portalVisibility: ['admin', 'librarian', 'bursar', 'ancillary']
  },

  // ==========================================
  // 9. CLINIC & HEALTH
  // ==========================================
  {
    id: 'admin-clinic-dashboard',
    label: 'Clinic Dashboard',
    route: '/admin/clinic/dashboard',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-notes-medical',
    permissionKey: PERMISSIONS.CLINIC_DASHBOARD_VIEW,
    portalVisibility: ['admin', 'clinic']
  },
  {
    id: 'admin-clinic-patients',
    label: 'Patient Management',
    route: '/admin/clinic/patients',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-user-injured',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['admin', 'clinic']
  },
  {
    id: 'admin-clinic-hospitalization',
    label: 'Hospitalisation & Wards',
    route: '/admin/clinic/hospitalization',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-bed',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['admin', 'clinic']
  },
  {
    id: 'admin-clinic-triage',
    label: 'Triage & Vitals',
    route: '/admin/clinic/triage',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-heartbeat',
    permissionKey: PERMISSIONS.CLINIC_TRIAGE_MANAGE,
    portalVisibility: ['admin', 'clinic']
  },
  {
    id: 'parent-clinic',
    label: 'Clinic & Wellbeing',
    route: '/parent/clinic',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-notes-medical',
    permissionKey: PERMISSIONS.CLINIC_APPOINTMENTS,
    portalVisibility: ['parent'],
    tabs: [
      { id: 'visits', label: 'Clinic Visits' },
      { id: 'profile', label: 'Health Profile' },
      { id: 'wellbeing', label: 'Wellbeing & Conduct' }
    ],
    searchKeywords: ['health', 'clinic', 'visits', 'allergies', 'profile', 'blood group', 'nurse', 'wellbeing', 'conduct', 'merits', 'counselor']
  },
  {
    id: 'admin-clinic-appointments',
    label: 'Appointments',
    route: '/admin/clinic/appointments',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-calendar-check',
    permissionKey: PERMISSIONS.CLINIC_TRIAGE_MANAGE,
    portalVisibility: ['admin', 'clinic', 'teacher', 'student']
  },
  {
    id: 'admin-clinic-emergencies',
    label: 'Emergencies',
    route: '/admin/clinic/emergencies',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-ambulance',
    permissionKey: PERMISSIONS.CLINIC_TRIAGE_MANAGE,
    portalVisibility: ['admin', 'clinic', 'teacher', 'student']
  },
  {
    id: 'admin-clinic-referrals',
    label: 'Referrals',
    route: '/admin/clinic/referrals',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-file-medical',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['admin', 'clinic']
  },
  {
    id: 'admin-clinic-pharmacy',
    label: 'Pharmacy & Dispensing',
    route: '/admin/clinic/pharmacy',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-pills',
    permissionKey: PERMISSIONS.CLINIC_PHARMACY_MANAGE,
    portalVisibility: ['admin', 'clinic']
  },
  {
    id: 'admin-clinic-immunization',
    label: 'Immunisation',
    route: '/admin/clinic/immunization',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-syringe',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['admin', 'clinic']
  },
  {
    id: 'admin-clinic-billing',
    label: 'Clinic Billing',
    route: '/admin/clinic/billing',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-file-invoice-dollar',
    permissionKey: PERMISSIONS.CLINIC_REPORTS_VIEW,
    portalVisibility: ['admin', 'clinic']
  },
  {
    id: 'admin-clinic-reports',
    label: 'Clinical Reports',
    route: '/admin/clinic/reports',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-chart-bar',
    permissionKey: PERMISSIONS.CLINIC_REPORTS_VIEW,
    portalVisibility: ['admin', 'clinic']
  },
  {
    id: 'admin-clinic-complaints',
    label: 'Health Complaints',
    route: '/admin/clinic/complaints',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-stethoscope',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['admin', 'clinic', 'teacher', 'student', 'ancillary']
  },
  {
    id: 'admin-clinic-icd10',
    label: 'ICD10 Disease Codes',
    route: '/admin/clinic/icd10',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-notes-medical',
    permissionKey: PERMISSIONS.CLINIC_REPORTS_VIEW,
    portalVisibility: ['admin', 'clinic']
  },

  // ==========================================
  // 10. COMMUNICATION & PORTAL
  // ==========================================
  {
    id: 'admin-announcements',
    label: 'Announcements',
    route: '/admin/announcements',
    group: 'COMMUNICATION_PORTAL',
    icon: 'fas fa-bullhorn',
    permissionKey: PERMISSIONS.COMMUNICATION_ANNOUNCEMENTS,
    portalVisibility: ['admin', 'teacher', 'parent', 'student']
  },
  {
    id: 'admin-messages',
    label: 'Messages',
    route: '/admin/messages',
    group: 'COMMUNICATION_PORTAL',
    icon: 'fas fa-envelope',
    permissionKey: PERMISSIONS.COMMUNICATION_MESSAGES,
    portalVisibility: ['admin', 'teacher', 'bursar', 'librarian', 'ancillary', 'clinic', 'student', 'parent']
  },
  {
    id: 'admin-website-settings',
    label: 'Website Settings (CMS)',
    route: '/admin/website-settings',
    group: 'COMMUNICATION_PORTAL',
    icon: 'fas fa-globe',
    permissionKey: PERMISSIONS.COMMUNICATION_WEBSITE_CMS,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-document-templates',
    label: 'Design and Templates',
    route: '/admin/document-templates',
    group: 'COMMUNICATION_PORTAL',
    icon: 'fas fa-palette',
    permissionKey: PERMISSIONS.COMMUNICATION_TEMPLATES,
    portalVisibility: ['admin']
  },

  // ==========================================
  // 11. SDC & GOVERNANCE
  // ==========================================
  {
    id: 'admin-sdc-minutes',
    label: 'SDC Meeting Minutes',
    route: '/admin/sdc-minutes',
    group: 'SDC_GOVERNANCE',
    icon: 'fas fa-file-signature',
    permissionKey: PERMISSIONS.GOVERNANCE_MINUTES,
    portalVisibility: ['admin', 'bursar', 'sdc']
  },
  {
    id: 'admin-sdc-funding',
    label: 'SDC Project Funding',
    route: '/admin/sdc-funding',
    group: 'SDC_GOVERNANCE',
    icon: 'fas fa-chart-line',
    permissionKey: PERMISSIONS.GOVERNANCE_FUNDING,
    portalVisibility: ['admin', 'bursar', 'sdc']
  },
  {
    id: 'admin-subscription',
    label: 'Subscription',
    route: '/admin/subscription',
    group: 'SDC_GOVERNANCE',
    icon: 'fas fa-credit-card',
    permissionKey: PERMISSIONS.SYSTEM_SUBSCRIPTION,
    portalVisibility: ['admin']
  },

  // ==========================================
  // 12. SYSTEM
  // ==========================================
  {
    id: 'admin-helpdesk',
    label: 'IT Help Desk',
    route: '/admin/helpdesk',
    group: 'SYSTEM',
    icon: 'fas fa-headset',
    permissionKey: PERMISSIONS.SYSTEM_HELPDESK,
    portalVisibility: ['admin', 'teacher', 'bursar', 'librarian', 'ancillary', 'clinic', 'student', 'parent']
  },
  {
    id: 'admin-setup-wizard',
    label: 'Setup Wizard',
    route: '/admin/setup',
    group: 'SYSTEM',
    icon: 'fas fa-magic',
    permissionKey: PERMISSIONS.SETTINGS_INSTITUTIONAL,
    portalVisibility: ['admin']
  },
  {
    id: 'admin-institutional-settings',
    label: 'Institutional Settings',
    route: '/admin/settings',
    group: 'SYSTEM',
    icon: 'fas fa-cog',
    permissionKey: PERMISSIONS.SETTINGS_INSTITUTIONAL,
    portalVisibility: ['admin', 'bursar', 'librarian', 'teacher', 'ancillary', 'clinic', 'student', 'parent']
  },
  {
    id: 'admin-my-profile',
    label: 'My Profile',
    route: '/admin/profile',
    group: 'SYSTEM',
    icon: 'fas fa-user-circle',
    permissionKey: PERMISSIONS.SETTINGS_PERSONAL,
    portalVisibility: ['admin', 'teacher', 'bursar', 'librarian', 'ancillary', 'clinic', 'student', 'parent']
  }
];
