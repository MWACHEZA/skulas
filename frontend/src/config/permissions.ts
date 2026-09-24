/**
 * ACADEX ERP - Granular Role-Based Permission Matrix
 * Defines standard permission keys and role assignments across all ERP modules.
 */

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export interface UserContext {
  id?: string;
  role?: string;
  secondaryRoles?: string[];
  schoolId?: string;
}

export const PERMISSIONS = {
  // 1. People & Enrollment
  PEOPLE_STUDENTS_VIEW: 'people.students:view',
  PEOPLE_STUDENTS_MANAGE: 'people.students:manage',
  PEOPLE_TEACHERS_VIEW: 'people.teachers:view',
  PEOPLE_TEACHERS_MANAGE: 'people.teachers:manage',
  PEOPLE_STAFF_VIEW: 'people.staff:view',
  PEOPLE_STAFF_MANAGE: 'people.staff:manage',
  PEOPLE_ALUMNI_VIEW: 'people.alumni:view',
  PEOPLE_ALUMNI_MANAGE: 'people.alumni:manage',
  PEOPLE_USERS_MANAGE: 'people.users:manage',
  PEOPLE_CLASSES_MANAGE: 'people.classes:manage',
  PEOPLE_HOUSES_MANAGE: 'people.houses:manage',
  PEOPLE_UNIFORMS_MANAGE: 'people.uniforms:manage',

  // 2. Academics
  ACADEMICS_SUBJECTS_VIEW: 'academics.subjects:view',
  ACADEMICS_SUBJECTS_MANAGE: 'academics.subjects:manage',
  ACADEMICS_SYLLABUS_MANAGE: 'academics.syllabus:manage',
  ACADEMICS_LESSON_PLAN: 'academics.lesson_plan:manage',
  ACADEMICS_TIMETABLE_VIEW: 'academics.timetable:view',
  ACADEMICS_TIMETABLE_MANAGE: 'academics.timetable:manage',
  ACADEMICS_STUDY_MATERIAL: 'academics.study_material:manage',
  ACADEMICS_MARKS_ENTRY: 'academics.marks:entry',
  ACADEMICS_PRINCIPAL_COMMENTS: 'academics.principal_comments:manage',
  ACADEMICS_CBT_MANAGE: 'academics.cbt:manage',
  ACADEMICS_REPORTS_VIEW: 'academics.reports:view',
  ACADEMICS_WORK_SCHEDULE: 'academics.work_schedule:view',

  // 3. Student Life & Discipline
  STUDENT_LIFE_PREFECTS: 'student_life.prefects:manage',
  STUDENT_LIFE_CHAPLAINCY: 'student_life.chaplaincy:manage',
  STUDENT_LIFE_CLUBS: 'student_life.clubs:manage',
  STUDENT_LIFE_SPORTS: 'student_life.sports:manage',
  STUDENT_LIFE_CLOCK_LOGS: 'student_life.clock_logs:view',

  // 4. Finance & Billing
  FINANCE_FEES_VIEW: 'finance.fees:view',
  FINANCE_FEES_BILLING: 'finance.fees:billing',
  FINANCE_INVOICES_MANAGE: 'finance.invoices:manage',
  FINANCE_PAYMENTS_VIEW: 'finance.payments:view',
  FINANCE_LEDGERS_VIEW: 'finance.ledgers:view',
  FINANCE_COA_MANAGE: 'finance.coa:manage',
  FINANCE_INCOME_EXPENSES: 'finance.income_expenses:manage',
  FINANCE_RECONCILIATION: 'finance.reconciliation:manage',
  FINANCE_REPORTS_VIEW: 'finance.reports:view',

  // 5. Procurement & Assets
  PROCUREMENT_REQUISITIONS: 'procurement.requisitions:manage',
  PROCUREMENT_SUPPLIERS: 'procurement.suppliers:manage',
  ASSETS_REGISTER_VIEW: 'assets.register:view',
  ASSETS_REGISTER_MANAGE: 'assets.register:manage',
  ASSETS_MAINTENANCE: 'assets.maintenance:manage',
  FARM_PROJECTS_MANAGE: 'farm.projects:manage',

  // 6. HR & Payroll
  HR_RECRUITMENT_MANAGE: 'hr.recruitment:manage',
  HR_PAYROLL_MANAGE: 'hr.payroll:manage',
  HR_AWARDS_MANAGE: 'hr.awards:manage',
  HR_LEAVE_MANAGE: 'hr.leave:manage',
  HR_LEAVE_APPLY: 'hr.leave:apply',

  // 7. Transport
  TRANSPORT_ROUTES_MANAGE: 'transport.routes:manage',
  TRANSPORT_VEHICLES_MANAGE: 'transport.vehicles:manage',

  // 8. Library
  LIBRARY_DASHBOARD_VIEW: 'library.dashboard:view',
  LIBRARY_CATALOG_VIEW: 'library.catalog:view',
  LIBRARY_CATALOG_MANAGE: 'library.catalog:manage',
  LIBRARY_CIRCULATION_MANAGE: 'library.circulation:manage',
  LIBRARY_OVERDUE_MANAGE: 'library.overdue:manage',
  LIBRARY_REPORTS_VIEW: 'library.reports:view',

  // 9. Clinic & Health
  CLINIC_DASHBOARD_VIEW: 'clinic.dashboard:view',
  CLINIC_PATIENTS_MANAGE: 'clinic.patients:manage',
  CLINIC_TRIAGE_MANAGE: 'clinic.triage:manage',
  CLINIC_PHARMACY_MANAGE: 'clinic.pharmacy:manage',
  CLINIC_REPORTS_VIEW: 'clinic.reports:view',

  // 10. Communication & Portal
  COMMUNICATION_ANNOUNCEMENTS: 'communication.announcements:manage',
  COMMUNICATION_MESSAGES: 'communication.messages:use',
  COMMUNICATION_WEBSITE_CMS: 'communication.website_cms:manage',
  COMMUNICATION_TEMPLATES: 'communication.templates:manage',

  // 11. SDC & Governance
  GOVERNANCE_MINUTES: 'governance.minutes:manage',
  GOVERNANCE_FUNDING: 'governance.funding:manage',
  SYSTEM_SUBSCRIPTION: 'system.subscription:view',

  // 12. System & Settings
  SYSTEM_HELPDESK: 'system.helpdesk:use',
  SETTINGS_INSTITUTIONAL: 'settings.institutional:manage',
  SETTINGS_FINANCE: 'settings.finance:manage',
  SETTINGS_LIBRARY: 'settings.library:manage',
  SETTINGS_PERSONAL: 'settings.personal:manage'
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Role to Permissions Mapping
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),

  SCHOOL_ADMIN: Object.values(PERMISSIONS),

  BURSAR: [
    PERMISSIONS.FINANCE_FEES_VIEW,
    PERMISSIONS.FINANCE_FEES_BILLING,
    PERMISSIONS.FINANCE_INVOICES_MANAGE,
    PERMISSIONS.FINANCE_PAYMENTS_VIEW,
    PERMISSIONS.FINANCE_LEDGERS_VIEW,
    PERMISSIONS.FINANCE_COA_MANAGE,
    PERMISSIONS.FINANCE_INCOME_EXPENSES,
    PERMISSIONS.FINANCE_RECONCILIATION,
    PERMISSIONS.FINANCE_REPORTS_VIEW,
    PERMISSIONS.PEOPLE_STUDENTS_VIEW,
    PERMISSIONS.PEOPLE_UNIFORMS_MANAGE,
    PERMISSIONS.PROCUREMENT_REQUISITIONS,
    PERMISSIONS.ASSETS_REGISTER_VIEW,
    PERMISSIONS.HR_PAYROLL_MANAGE,
    PERMISSIONS.HR_LEAVE_APPLY,
    PERMISSIONS.LIBRARY_REPORTS_VIEW,
    PERMISSIONS.COMMUNICATION_MESSAGES,
    PERMISSIONS.GOVERNANCE_FUNDING,
    PERMISSIONS.GOVERNANCE_MINUTES,
    PERMISSIONS.SYSTEM_HELPDESK,
    PERMISSIONS.SETTINGS_FINANCE,
    PERMISSIONS.SETTINGS_PERSONAL
  ],

  TEACHER: [
    PERMISSIONS.ACADEMICS_SUBJECTS_VIEW,
    PERMISSIONS.ACADEMICS_SYLLABUS_MANAGE,
    PERMISSIONS.ACADEMICS_LESSON_PLAN,
    PERMISSIONS.ACADEMICS_TIMETABLE_VIEW,
    PERMISSIONS.ACADEMICS_STUDY_MATERIAL,
    PERMISSIONS.ACADEMICS_MARKS_ENTRY,
    PERMISSIONS.ACADEMICS_CBT_MANAGE,
    PERMISSIONS.ACADEMICS_REPORTS_VIEW,
    PERMISSIONS.PEOPLE_STUDENTS_VIEW,
    PERMISSIONS.STUDENT_LIFE_CLOCK_LOGS,
    PERMISSIONS.LIBRARY_CATALOG_VIEW,
    PERMISSIONS.LIBRARY_REPORTS_VIEW,
    PERMISSIONS.COMMUNICATION_MESSAGES,
    PERMISSIONS.HR_LEAVE_APPLY,
    PERMISSIONS.SYSTEM_HELPDESK,
    PERMISSIONS.SETTINGS_PERSONAL
  ],

  LIBRARIAN: [
    PERMISSIONS.LIBRARY_DASHBOARD_VIEW,
    PERMISSIONS.LIBRARY_CATALOG_VIEW,
    PERMISSIONS.LIBRARY_CATALOG_MANAGE,
    PERMISSIONS.LIBRARY_CIRCULATION_MANAGE,
    PERMISSIONS.LIBRARY_OVERDUE_MANAGE,
    PERMISSIONS.LIBRARY_REPORTS_VIEW,
    PERMISSIONS.ASSETS_REGISTER_VIEW,
    PERMISSIONS.COMMUNICATION_MESSAGES,
    PERMISSIONS.HR_LEAVE_APPLY,
    PERMISSIONS.SYSTEM_HELPDESK,
    PERMISSIONS.SETTINGS_LIBRARY,
    PERMISSIONS.SETTINGS_PERSONAL
  ],

  CLINIC: [
    PERMISSIONS.CLINIC_DASHBOARD_VIEW,
    PERMISSIONS.CLINIC_PATIENTS_MANAGE,
    PERMISSIONS.CLINIC_TRIAGE_MANAGE,
    PERMISSIONS.CLINIC_PHARMACY_MANAGE,
    PERMISSIONS.CLINIC_REPORTS_VIEW,
    PERMISSIONS.PEOPLE_STUDENTS_VIEW,
    PERMISSIONS.COMMUNICATION_MESSAGES,
    PERMISSIONS.HR_LEAVE_APPLY,
    PERMISSIONS.SYSTEM_HELPDESK,
    PERMISSIONS.SETTINGS_PERSONAL
  ],

  ANCILLARY: [
    PERMISSIONS.ASSETS_REGISTER_VIEW,
    PERMISSIONS.PROCUREMENT_REQUISITIONS,
    PERMISSIONS.TRANSPORT_ROUTES_MANAGE,
    PERMISSIONS.STUDENT_LIFE_CLOCK_LOGS,
    PERMISSIONS.COMMUNICATION_MESSAGES,
    PERMISSIONS.HR_LEAVE_APPLY,
    PERMISSIONS.SYSTEM_HELPDESK,
    PERMISSIONS.SETTINGS_PERSONAL
  ],

  STUDENT: [
    PERMISSIONS.ACADEMICS_TIMETABLE_VIEW,
    PERMISSIONS.ACADEMICS_STUDY_MATERIAL,
    PERMISSIONS.ACADEMICS_REPORTS_VIEW,
    PERMISSIONS.FINANCE_FEES_VIEW,
    PERMISSIONS.LIBRARY_CATALOG_VIEW,
    PERMISSIONS.COMMUNICATION_MESSAGES,
    PERMISSIONS.SETTINGS_PERSONAL
  ],

  PARENT: [
    PERMISSIONS.ACADEMICS_TIMETABLE_VIEW,
    PERMISSIONS.ACADEMICS_REPORTS_VIEW,
    PERMISSIONS.FINANCE_FEES_VIEW,
    PERMISSIONS.FINANCE_PAYMENTS_VIEW,
    PERMISSIONS.COMMUNICATION_MESSAGES,
    PERMISSIONS.SETTINGS_PERSONAL
  ]
};

/**
 * Secondary Role Permissions Overrides
 */
export const SECONDARY_ROLE_PERMISSIONS: Record<string, string[]> = {
  'Student Librarian': [
    PERMISSIONS.LIBRARY_CATALOG_VIEW,
    PERMISSIONS.LIBRARY_CIRCULATION_MANAGE
  ],
  'Library Assistant': [
    PERMISSIONS.LIBRARY_DASHBOARD_VIEW,
    PERMISSIONS.LIBRARY_CATALOG_VIEW,
    PERMISSIONS.LIBRARY_CATALOG_MANAGE,
    PERMISSIONS.LIBRARY_CIRCULATION_MANAGE,
    PERMISSIONS.LIBRARY_OVERDUE_MANAGE,
    PERMISSIONS.LIBRARY_REPORTS_VIEW
  ],
  'House Master': [
    PERMISSIONS.PEOPLE_HOUSES_MANAGE
  ],
  'Sports Coordinator': [
    PERMISSIONS.STUDENT_LIFE_SPORTS
  ],
  'School Chaplain': [
    PERMISSIONS.STUDENT_LIFE_CHAPLAINCY
  ],
  'Receptionist': [
    PERMISSIONS.COMMUNICATION_ANNOUNCEMENTS
  ]
};

/**
 * Evaluates whether a user has a given permission
 */
export function hasPermission(user: UserContext | null | undefined, permissionKey?: string): boolean {
  if (!permissionKey) return true;
  if (!user || !user.role) return false;

  const role = user.role.toUpperCase();
  if (role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN') return true;

  const rolePerms = ROLE_PERMISSIONS[role] || [];
  if (rolePerms.includes(permissionKey)) return true;

  if (Array.isArray(user.secondaryRoles)) {
    for (const secRole of user.secondaryRoles) {
      const secPerms = SECONDARY_ROLE_PERMISSIONS[secRole] || [];
      if (secPerms.includes(permissionKey)) return true;
    }
  }

  return false;
}
