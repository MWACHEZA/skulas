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
  // CORE ADMIN CONSOLIDATED PAGES (16 PAGES + TENANT CONDITIONALS)
  // ==========================================
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
    portalVisibility: ['admin', 'bursar'],
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
    portalVisibility: ['admin', 'bursar'],
    searchKeywords: ['finance dashboard', 'collections', 'overdue', 'total billed']
  },
  {
    id: 'admin-finance-billing',
    label: 'Fees & Billing',
    route: '/admin/finance/billing',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-receipt',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['admin', 'bursar'],
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
    portalVisibility: ['admin', 'bursar'],
    searchKeywords: ['payment agreements', 'milestones', 'installments']
  },
  {
    id: 'admin-finance-wallets',
    label: 'Wallets & Tuckshop',
    route: '/admin/finance/wallets',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-wallet',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['admin', 'bursar'],
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
    portalVisibility: ['admin', 'bursar'],
    tabs: [
      { id: 'uniforms', label: 'Uniforms Stock' },
      { id: 'bookstore', label: 'Bookstore' },
      { id: 'library', label: 'Library Catalog' }
    ],
    searchKeywords: ['uniforms', 'blazers', 'books', 'stationery', 'library catalog', 'stock inventory']
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
    searchKeywords: ['hostels', 'dorms', 'boarders', 'residential']
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
    portalVisibility: ['bursar'],
    searchKeywords: ['pupils', 'learners', 'admission', 'enrollment']
  },
  {
    id: 'admin-teachers',
    label: 'Teachers',
    route: '/admin/teachers',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-chalkboard-teacher',
    permissionKey: PERMISSIONS.PEOPLE_TEACHERS_VIEW,
    portalVisibility: [],
    searchKeywords: ['faculty', 'instructors', 'tutors']
  },
  {
    id: 'admin-staff-admins',
    label: 'Staff Admins',
    route: '/admin/staff-admins',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-user-shield',
    permissionKey: PERMISSIONS.PEOPLE_STAFF_VIEW,
    portalVisibility: []
  },
  {
    id: 'admin-bursars',
    label: 'Bursars',
    route: '/admin/bursars',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-money-check-alt',
    permissionKey: PERMISSIONS.PEOPLE_STAFF_VIEW,
    portalVisibility: []
  },
  {
    id: 'admin-librarians',
    label: 'Librarians',
    route: '/admin/librarians',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-book',
    permissionKey: PERMISSIONS.PEOPLE_STAFF_VIEW,
    portalVisibility: []
  },
  {
    id: 'admin-ancillary',
    label: 'Ancillary Staff',
    route: '/admin/ancillary',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-hands-helping',
    permissionKey: PERMISSIONS.PEOPLE_STAFF_VIEW,
    portalVisibility: []
  },
  {
    id: 'admin-parents',
    label: 'Parents',
    route: '/admin/parents',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-user-friends',
    permissionKey: PERMISSIONS.PEOPLE_STAFF_VIEW,
    portalVisibility: []
  },
  {
    id: 'admin-alumni',
    label: 'Alumni',
    route: '/admin/alumni',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-user-tie',
    permissionKey: PERMISSIONS.PEOPLE_ALUMNI_VIEW,
    portalVisibility: []
  },
  {
    id: 'admin-users',
    label: 'Users & Roles',
    route: '/admin/users',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-users-cog',
    permissionKey: PERMISSIONS.PEOPLE_USERS_MANAGE,
    portalVisibility: []
  },
  {
    id: 'admin-classes',
    label: 'Classes',
    route: '/admin/classes',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-chalkboard',
    permissionKey: PERMISSIONS.PEOPLE_CLASSES_MANAGE,
    portalVisibility: []
  },
  {
    id: 'admin-class-migration',
    label: 'Class Migration',
    route: '/admin/class-migration',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-exchange-alt',
    permissionKey: PERMISSIONS.PEOPLE_CLASSES_MANAGE,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-departments',
    label: 'Departments',
    route: '/admin/departments',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-sitemap',
    permissionKey: PERMISSIONS.PEOPLE_CLASSES_MANAGE,
    portalVisibility: []
  },
  {
    id: 'admin-house',
    label: 'Houses Management',
    route: '/admin/house',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-house-user',
    permissionKey: PERMISSIONS.PEOPLE_HOUSES_MANAGE,
    portalVisibility: ['ancillary']
  },
  {
    id: 'admin-uniforms',
    label: 'Uniforms Management',
    route: '/admin/accounts/uniforms',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-tshirt',
    permissionKey: PERMISSIONS.PEOPLE_UNIFORMS_MANAGE,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-applications',
    label: 'Admissions & Inquiries',
    route: '/admin/applications',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-id-card',
    permissionKey: PERMISSIONS.PEOPLE_STUDENTS_MANAGE,
    portalVisibility: []
  },
  {
    id: 'admin-student-profile',
    label: 'Student Profile Lookup',
    route: '/admin/student-profile',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-id-badge',
    permissionKey: PERMISSIONS.PEOPLE_STUDENTS_VIEW,
    portalVisibility: []
  },
  {
    id: 'admin-student-history',
    label: 'Academic History',
    route: '/admin/student-history',
    group: 'PEOPLE_ENROLLMENT',
    icon: 'fas fa-history',
    permissionKey: PERMISSIONS.PEOPLE_STUDENTS_VIEW,
    portalVisibility: []
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
    portalVisibility: []
  },
  {
    id: 'admin-syllabus',
    label: 'Syllabus Manager',
    route: '/admin/syllabus',
    group: 'ACADEMICS',
    icon: 'fas fa-scroll',
    permissionKey: PERMISSIONS.ACADEMICS_SYLLABUS_MANAGE,
    portalVisibility: ['teacher']
  },
  {
    id: 'admin-lesson-plan',
    label: 'Lesson Planner',
    route: '/admin/lesson-plan',
    group: 'ACADEMICS',
    icon: 'fas fa-calendar-check',
    permissionKey: PERMISSIONS.ACADEMICS_LESSON_PLAN,
    portalVisibility: ['teacher']
  },
  {
    id: 'admin-timetable',
    label: 'Timetable',
    route: '/admin/timetable',
    group: 'ACADEMICS',
    icon: 'fas fa-calendar-alt',
    permissionKey: PERMISSIONS.ACADEMICS_TIMETABLE_VIEW,
    portalVisibility: ['teacher', 'student', 'parent']
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
    portalVisibility: ['teacher', 'student']
  },
  {
    id: 'admin-marks-entry',
    label: 'Marks Entry',
    route: '/admin/assessments/marks-entry',
    group: 'ACADEMICS',
    icon: 'fas fa-pen-alt',
    permissionKey: PERMISSIONS.ACADEMICS_MARKS_ENTRY,
    portalVisibility: ['teacher']
  },
  {
    id: 'admin-principal-comments',
    label: 'Principal Comments',
    route: '/admin/assessments/principal-comments',
    group: 'ACADEMICS',
    icon: 'fas fa-comment-alt',
    permissionKey: PERMISSIONS.ACADEMICS_PRINCIPAL_COMMENTS,
    portalVisibility: []
  },
  {
    id: 'admin-question-papers',
    label: 'Question Papers',
    route: '/admin/assessments/question-papers',
    group: 'ACADEMICS',
    icon: 'fas fa-file-signature',
    permissionKey: PERMISSIONS.ACADEMICS_MARKS_ENTRY,
    portalVisibility: ['teacher']
  },
  {
    id: 'admin-grading',
    label: 'Grading Settings',
    route: '/admin/assessments/grading',
    group: 'ACADEMICS',
    icon: 'fas fa-sliders-h',
    permissionKey: PERMISSIONS.ACADEMICS_MARKS_ENTRY,
    portalVisibility: []
  },
  {
    id: 'admin-cbt-manage',
    label: 'Manage CBT',
    route: '/admin/cbt/manage',
    group: 'ACADEMICS',
    icon: 'fas fa-laptop-code',
    permissionKey: PERMISSIONS.ACADEMICS_CBT_MANAGE,
    portalVisibility: ['teacher']
  },
  {
    id: 'admin-academic-reports',
    label: 'Academic Reports',
    route: '/admin/reports',
    group: 'ACADEMICS',
    icon: 'fas fa-chart-bar',
    permissionKey: PERMISSIONS.ACADEMICS_REPORTS_VIEW,
    portalVisibility: ['teacher']
  },
  {
    id: 'admin-schedules',
    label: 'Staff Work Schedule',
    route: '/admin/schedules',
    group: 'ACADEMICS',
    icon: 'fas fa-clock',
    permissionKey: PERMISSIONS.ACADEMICS_WORK_SCHEDULE,
    portalVisibility: ['ancillary', 'librarian']
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
    portalVisibility: ['teacher', 'student']
  },
  {
    id: 'admin-chaplaincy',
    label: 'Chaplaincy Services',
    route: '/admin/chaplaincy',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-church',
    permissionKey: PERMISSIONS.STUDENT_LIFE_CHAPLAINCY,
    portalVisibility: ['teacher']
  },
  {
    id: 'admin-student-club',
    label: 'Student Clubs',
    route: '/admin/student-club',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-users',
    permissionKey: PERMISSIONS.STUDENT_LIFE_CLUBS,
    portalVisibility: ['teacher']
  },
  {
    id: 'admin-sports-management',
    label: 'Sports Management',
    route: '/admin/sports-management',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-running',
    permissionKey: PERMISSIONS.STUDENT_LIFE_SPORTS,
    portalVisibility: ['teacher', 'ancillary']
  },
  {
    id: 'admin-attendance-logs',
    label: 'Student & Staff Clock In Logs',
    route: '/admin/hr/attendance',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-fingerprint',
    permissionKey: PERMISSIONS.STUDENT_LIFE_CLOCK_LOGS,
    portalVisibility: ['teacher', 'ancillary']
  },
  {
    id: 'admin-dining-hall',
    label: 'Dining Hall (DH)',
    route: '/admin/dining-hall',
    group: 'STUDENT_LIFE',
    icon: 'fas fa-utensils',
    permissionKey: PERMISSIONS.STUDENT_LIFE_PREFECTS,
    portalVisibility: ['ancillary', 'teacher']
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
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-fee-groups',
    label: 'Fee Groups',
    route: '/admin/fee-groups',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-tags',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-fees-billing',
    label: 'Fees Billing',
    route: '/admin/fees-management/billing',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-receipt',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-manage-invoices',
    label: 'Manage Invoices',
    route: '/admin/fees-management/invoices',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-file-invoice',
    permissionKey: PERMISSIONS.FINANCE_INVOICES_MANAGE,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-bulk-invoices',
    label: 'Bulk Invoices',
    route: '/admin/fees-management/bulk-invoices',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-mail-bulk',
    permissionKey: PERMISSIONS.FINANCE_INVOICES_MANAGE,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-payment-history',
    label: 'Payment History',
    route: '/admin/fees-management/payment-history',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-history',
    permissionKey: PERMISSIONS.FINANCE_PAYMENTS_VIEW,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-student-ledgers',
    label: 'Student Ledgers',
    route: '/admin/fees-management/ledgers',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-book',
    permissionKey: PERMISSIONS.FINANCE_LEDGERS_VIEW,
    portalVisibility: ['bursar']
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
    group: 'FINANCE_BILLING',
    icon: 'fas fa-bus',
    permissionKey: PERMISSIONS.ANCILLARY_TRANSPORT,
    portalVisibility: ['parent'],
    searchKeywords: ['transport', 'bus', 'route', 'driver', 'pickup', 'tracking', 'drop-off']
  },
  {
    id: 'admin-payment-plans',
    label: 'Payment Plans',
    route: '/admin/payment-plans',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-calendar-check',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-reminder-logs',
    label: 'Fee Reminder Logs',
    route: '/admin/fees-management/reminder-logs',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-bell',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-payment-methods',
    label: 'Payment Methods',
    route: '/admin/payment-methods',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-credit-card',
    permissionKey: PERMISSIONS.FINANCE_COA_MANAGE,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-groceries',
    label: 'Groceries & Dining Store',
    route: '/admin/fees-management/groceries',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-shopping-basket',
    permissionKey: PERMISSIONS.FINANCE_FEES_BILLING,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-revenue-allocation',
    label: 'Revenue Allocation',
    route: '/admin/revenue-allocation',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-chart-pie',
    permissionKey: PERMISSIONS.FINANCE_COA_MANAGE,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-coa',
    label: 'Chart of Accounts',
    route: '/admin/accounts/coa',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-sitemap',
    permissionKey: PERMISSIONS.FINANCE_COA_MANAGE,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-income',
    label: 'Income Tracker',
    route: '/admin/accounts/income',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-hand-holding-usd',
    permissionKey: PERMISSIONS.FINANCE_INCOME_EXPENSES,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-expenses',
    label: 'Expenses Ledger',
    route: '/admin/accounts/expenses',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-file-invoice-dollar',
    permissionKey: PERMISSIONS.FINANCE_INCOME_EXPENSES,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-liabilities',
    label: 'Liabilities Ledger',
    route: '/admin/accounts/liabilities',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-balance-scale-right',
    permissionKey: PERMISSIONS.FINANCE_INCOME_EXPENSES,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-bank-reconciliation',
    label: 'Bank Reconciliation',
    route: '/admin/accounts/bank-reconciliation',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-university',
    permissionKey: PERMISSIONS.FINANCE_RECONCILIATION,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-financial-reports',
    label: 'Financial Reports (P&L)',
    route: '/admin/accounts/financial-reports',
    group: 'FINANCE_BILLING',
    icon: 'fas fa-chart-line',
    permissionKey: PERMISSIONS.FINANCE_REPORTS_VIEW,
    portalVisibility: ['bursar']
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
    portalVisibility: ['bursar', 'ancillary', 'teacher']
  },
  {
    id: 'admin-suppliers',
    label: 'Suppliers',
    route: '/admin/suppliers',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-truck',
    permissionKey: PERMISSIONS.PROCUREMENT_SUPPLIERS,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-assets',
    label: 'Asset Register',
    route: '/admin/assets',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-boxes',
    permissionKey: PERMISSIONS.ASSETS_REGISTER_VIEW,
    portalVisibility: ['bursar', 'ancillary', 'teacher', 'librarian']
  },
  {
    id: 'admin-asset-maintenance',
    label: 'Asset Maintenance',
    route: '/admin/asset-maintenance',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-tools',
    permissionKey: PERMISSIONS.ASSETS_MAINTENANCE,
    portalVisibility: ['ancillary']
  },
  {
    id: 'admin-farm',
    label: 'School Farm Projects',
    route: '/admin/farm',
    group: 'PROCUREMENT_ASSETS',
    icon: 'fas fa-tractor',
    permissionKey: PERMISSIONS.FARM_PROJECTS_MANAGE,
    portalVisibility: ['ancillary', 'teacher']
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
    portalVisibility: []
  },
  {
    id: 'admin-hr-applications',
    label: 'Recruitment - Applications',
    route: '/admin/hr/applications',
    group: 'HR_PAYROLL',
    icon: 'fas fa-file-signature',
    permissionKey: PERMISSIONS.HR_RECRUITMENT_MANAGE,
    portalVisibility: []
  },
  {
    id: 'admin-payroll-list',
    label: 'Manage Payroll',
    route: '/admin/hr/payroll/list',
    group: 'HR_PAYROLL',
    icon: 'fas fa-money-check-alt',
    permissionKey: PERMISSIONS.HR_PAYROLL_MANAGE,
    portalVisibility: ['bursar']
  },
  {
    id: 'admin-hr-awards',
    label: 'Manage Awards',
    route: '/admin/hr/awards',
    group: 'HR_PAYROLL',
    icon: 'fas fa-award',
    permissionKey: PERMISSIONS.HR_AWARDS_MANAGE,
    portalVisibility: []
  },
  {
    id: 'admin-hr-leaves',
    label: 'Leave Management',
    route: '/admin/hr/leaves',
    group: 'HR_PAYROLL',
    icon: 'fas fa-calendar-times',
    permissionKey: PERMISSIONS.HR_LEAVE_MANAGE,
    portalVisibility: []
  },
  {
    id: 'admin-my-leave',
    label: 'My Leave Application',
    route: '/admin/leave',
    group: 'HR_PAYROLL',
    icon: 'fas fa-calendar-minus',
    permissionKey: PERMISSIONS.HR_LEAVE_APPLY,
    portalVisibility: ['teacher', 'bursar', 'librarian', 'ancillary']
  },
  {
    id: 'admin-my-awards',
    label: 'My Awards',
    route: '/admin/awards',
    group: 'HR_PAYROLL',
    icon: 'fas fa-medal',
    permissionKey: PERMISSIONS.HR_LEAVE_APPLY,
    portalVisibility: ['teacher', 'bursar', 'librarian', 'ancillary']
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
    portalVisibility: ['ancillary', 'bursar']
  },
  {
    id: 'admin-transport-vehicles',
    label: 'Vehicles',
    route: '/admin/transportation/vehicles',
    group: 'TRANSPORT',
    icon: 'fas fa-bus',
    permissionKey: PERMISSIONS.TRANSPORT_VEHICLES_MANAGE,
    portalVisibility: ['ancillary', 'bursar']
  },
  {
    id: 'admin-transport-assignments',
    label: 'Vehicle Assignments',
    route: '/admin/transportation/assignments',
    group: 'TRANSPORT',
    icon: 'fas fa-shuttle-van',
    permissionKey: PERMISSIONS.TRANSPORT_VEHICLES_MANAGE,
    portalVisibility: ['ancillary', 'bursar']
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
    portalVisibility: ['librarian', 'ancillary']
  },
  {
    id: 'admin-library-books',
    label: 'Book Catalog',
    route: '/admin/library/books',
    group: 'LIBRARY',
    icon: 'fas fa-book',
    permissionKey: PERMISSIONS.LIBRARY_CATALOG_VIEW,
    portalVisibility: ['librarian', 'teacher', 'ancillary']
  },
  {
    id: 'admin-library-categories',
    label: 'Resource Categories',
    route: '/admin/library/categories',
    group: 'LIBRARY',
    icon: 'fas fa-tags',
    permissionKey: PERMISSIONS.LIBRARY_CATALOG_MANAGE,
    portalVisibility: ['librarian', 'ancillary']
  },
  {
    id: 'admin-library-loans',
    label: 'Active Loans',
    route: '/admin/library/loans',
    group: 'LIBRARY',
    icon: 'fas fa-handshake',
    permissionKey: PERMISSIONS.LIBRARY_CIRCULATION_MANAGE,
    portalVisibility: ['librarian', 'ancillary', 'teacher']
  },
  {
    id: 'admin-library-overdue',
    label: 'Overdue Books',
    route: '/admin/library/overdue',
    group: 'LIBRARY',
    icon: 'fas fa-exclamation-circle',
    permissionKey: PERMISSIONS.LIBRARY_OVERDUE_MANAGE,
    portalVisibility: ['librarian', 'ancillary']
  },
  {
    id: 'admin-library-reservations',
    label: 'Reservations & Holds',
    route: '/admin/library/reservations',
    group: 'LIBRARY',
    icon: 'fas fa-bookmark',
    permissionKey: PERMISSIONS.LIBRARY_CIRCULATION_MANAGE,
    portalVisibility: ['librarian', 'ancillary']
  },
  {
    id: 'admin-library-digital',
    label: 'Digital Repository',
    route: '/admin/library/digital',
    group: 'LIBRARY',
    icon: 'fas fa-cloud-download-alt',
    permissionKey: PERMISSIONS.LIBRARY_CATALOG_VIEW,
    portalVisibility: ['librarian', 'teacher', 'ancillary', 'student']
  },
  {
    id: 'admin-library-reports',
    label: 'Library Reports',
    route: '/admin/library/reports',
    group: 'LIBRARY',
    icon: 'fas fa-chart-pie',
    permissionKey: PERMISSIONS.LIBRARY_REPORTS_VIEW,
    portalVisibility: ['librarian', 'bursar', 'ancillary']
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
    portalVisibility: ['clinic']
  },
  {
    id: 'admin-clinic-patients',
    label: 'Patient Management',
    route: '/admin/clinic/patients',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-user-injured',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['clinic']
  },
  {
    id: 'admin-clinic-hospitalization',
    label: 'Hospitalisation & Wards',
    route: '/admin/clinic/hospitalization',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-bed',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['clinic']
  },
  {
    id: 'admin-clinic-triage',
    label: 'Triage & Vitals',
    route: '/admin/clinic/triage',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-heartbeat',
    permissionKey: PERMISSIONS.CLINIC_TRIAGE_MANAGE,
    portalVisibility: ['clinic']
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
    portalVisibility: ['clinic', 'teacher', 'student']
  },
  {
    id: 'admin-clinic-emergencies',
    label: 'Emergencies',
    route: '/admin/clinic/emergencies',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-ambulance',
    permissionKey: PERMISSIONS.CLINIC_TRIAGE_MANAGE,
    portalVisibility: ['clinic', 'teacher', 'student']
  },
  {
    id: 'admin-clinic-referrals',
    label: 'Referrals',
    route: '/admin/clinic/referrals',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-file-medical',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['clinic']
  },
  {
    id: 'admin-clinic-pharmacy',
    label: 'Pharmacy & Dispensing',
    route: '/admin/clinic/pharmacy',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-pills',
    permissionKey: PERMISSIONS.CLINIC_PHARMACY_MANAGE,
    portalVisibility: ['clinic']
  },
  {
    id: 'admin-clinic-immunization',
    label: 'Immunisation',
    route: '/admin/clinic/immunization',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-syringe',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['clinic']
  },
  {
    id: 'admin-clinic-billing',
    label: 'Clinic Billing',
    route: '/admin/clinic/billing',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-file-invoice-dollar',
    permissionKey: PERMISSIONS.CLINIC_REPORTS_VIEW,
    portalVisibility: ['clinic']
  },
  {
    id: 'admin-clinic-reports',
    label: 'Clinical Reports',
    route: '/admin/clinic/reports',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-chart-bar',
    permissionKey: PERMISSIONS.CLINIC_REPORTS_VIEW,
    portalVisibility: ['clinic']
  },
  {
    id: 'admin-clinic-complaints',
    label: 'Health Complaints',
    route: '/admin/clinic/complaints',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-stethoscope',
    permissionKey: PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    portalVisibility: ['clinic', 'teacher', 'student', 'ancillary']
  },
  {
    id: 'admin-clinic-icd10',
    label: 'ICD10 Disease Codes',
    route: '/admin/clinic/icd10',
    group: 'CLINIC_HEALTH',
    icon: 'fas fa-notes-medical',
    permissionKey: PERMISSIONS.CLINIC_REPORTS_VIEW,
    portalVisibility: ['clinic']
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
    portalVisibility: ['teacher', 'parent', 'student']
  },
  {
    id: 'admin-messages',
    label: 'Messages',
    route: '/admin/messages',
    group: 'COMMUNICATION_PORTAL',
    icon: 'fas fa-envelope',
    permissionKey: PERMISSIONS.COMMUNICATION_MESSAGES,
    portalVisibility: ['teacher', 'bursar', 'librarian', 'ancillary', 'clinic', 'student', 'parent']
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
  },
  {
    id: 'admin-website-settings',
    label: 'Website Settings (CMS)',
    route: '/admin/website-settings',
    group: 'COMMUNICATION_PORTAL',
    icon: 'fas fa-globe',
    permissionKey: PERMISSIONS.COMMUNICATION_WEBSITE_CMS,
    portalVisibility: []
  },
  {
    id: 'admin-document-templates',
    label: 'Design and Templates',
    route: '/admin/document-templates',
    group: 'COMMUNICATION_PORTAL',
    icon: 'fas fa-palette',
    permissionKey: PERMISSIONS.COMMUNICATION_TEMPLATES,
    portalVisibility: []
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
    portalVisibility: ['bursar', 'sdc']
  },
  {
    id: 'admin-sdc-funding',
    label: 'SDC Project Funding',
    route: '/admin/sdc-funding',
    group: 'SDC_GOVERNANCE',
    icon: 'fas fa-chart-line',
    permissionKey: PERMISSIONS.GOVERNANCE_FUNDING,
    portalVisibility: ['bursar', 'sdc']
  },
  {
    id: 'admin-subscription',
    label: 'Subscription',
    route: '/admin/subscription',
    group: 'SDC_GOVERNANCE',
    icon: 'fas fa-credit-card',
    permissionKey: PERMISSIONS.SYSTEM_SUBSCRIPTION,
    portalVisibility: []
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
    portalVisibility: ['teacher', 'bursar', 'librarian', 'ancillary', 'clinic', 'student', 'parent']
  },
  {
    id: 'admin-setup-wizard',
    label: 'Setup Wizard',
    route: '/admin/setup',
    group: 'SYSTEM',
    icon: 'fas fa-magic',
    permissionKey: PERMISSIONS.SETTINGS_INSTITUTIONAL,
    portalVisibility: []
  },
  {
    id: 'admin-institutional-settings',
    label: 'Institutional Settings',
    route: '/admin/settings',
    group: 'SYSTEM',
    icon: 'fas fa-cog',
    permissionKey: PERMISSIONS.SETTINGS_INSTITUTIONAL,
    portalVisibility: ['bursar', 'librarian', 'teacher', 'ancillary', 'clinic', 'student', 'parent']
  },
  {
    id: 'admin-my-profile',
    label: 'My Profile',
    route: '/admin/profile',
    group: 'SYSTEM',
    icon: 'fas fa-user-circle',
    permissionKey: PERMISSIONS.SETTINGS_PERSONAL,
    portalVisibility: ['teacher', 'bursar', 'librarian', 'ancillary', 'clinic', 'student', 'parent']
  }
];
