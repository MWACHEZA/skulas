import { PAGE_REGISTRY, CANONICAL_GROUPS, type CanonicalGroupId, type PageDefinition } from './pageRegistry';
import { hasPermission, type UserContext } from './permissions';

export interface NavLeafItem {
  id: string;
  label: string;
  to: string;
  icon: string;
  permissionKey?: string;
  badge?: string;
  searchKeywords?: string[];
  tabs?: { id: string; label: string; route?: string }[];
}

export interface NavGroup {
  id: CanonicalGroupId;
  label: string;
  icon: string;
  order: number;
  defaultExpanded?: boolean;
  items: NavLeafItem[];
}

/**
 * Portal Route Map: maps admin-based registry routes to portal-specific paths
 */
const PORTAL_ROUTE_REWRITES: Record<string, Record<string, string>> = {
  teacher: {
    '/admin/syllabus': '/teacher/syllabus',
    '/admin/lesson-plan': '/teacher/planner',
    '/admin/timetable': '/teacher/timetable',
    '/admin/study-materials': '/teacher/study-materials',
    '/admin/assessments/marks-entry': '/teacher/assessments/marks-entry',
    '/admin/cbt/manage': '/teacher/cbt/manage',
    '/admin/reports': '/teacher/reports',
    '/admin/students': '/teacher/students',
    '/admin/assessments/question-papers': '/teacher/question-papers',
    '/admin/prefects': '/teacher/prefects',
    '/admin/chaplaincy': '/teacher/chaplaincy',
    '/admin/student-club': '/teacher/classes',
    '/admin/sports-management': '/teacher/sports',
    '/admin/hr/attendance': '/teacher/attendance-logs',
    '/admin/procurement': '/teacher/procurement',
    '/admin/assets': '/teacher/assets',
    '/admin/farm': '/teacher/farm',
    '/admin/dining-hall': '/teacher/dining-hall',
    '/admin/leave': '/teacher/leave',
    '/admin/awards': '/teacher/awards',
    '/admin/library/books': '/teacher/library/books',
    '/admin/library/loans': '/teacher/library/loans',
    '/admin/library/digital': '/teacher/library/digital',
    '/admin/library/reports': '/teacher/library/reports',
    '/admin/clinic/complaints': '/teacher/clinic/complaints',
    '/admin/clinic/appointments': '/teacher/clinic/appointments',
    '/admin/clinic/emergencies': '/teacher/clinic/emergencies',
    '/admin/announcements': '/teacher/dashboard',
    '/admin/messages': '/teacher/messages',
    '/admin/helpdesk': '/teacher/support',
    '/admin/settings': '/teacher/settings',
    '/admin/profile': '/teacher/profile'
  },
  bursar: {
    '/admin/students': '/bursar/students',
    '/admin/class-migration': '/bursar/class-migration',
    '/admin/accounts/uniforms': '/bursar/accounts/uniforms',
    '/admin/fees': '/bursar/fees-management/billing',
    '/admin/fee-groups': '/bursar/fees-management/groups',
    '/admin/fees-management/billing': '/bursar/fees-management/billing',
    '/admin/fees-management/invoices': '/bursar/fees-management/invoices',
    '/admin/fees-management/bulk-invoices': '/bursar/fees-management/bulk-invoices',
    '/admin/fees-management/payment-history': '/bursar/fees-management/payment-history',
    '/admin/fees-management/ledgers': '/bursar/fees-management/ledgers',
    '/admin/payment-plans': '/bursar/payment-plans',
    '/admin/fees-management/reminder-logs': '/bursar/fees-management/reminder-logs',
    '/admin/payment-methods': '/bursar/payment-methods',
    '/admin/fees-management/groceries': '/bursar/fees-management/groceries',
    '/admin/revenue-allocation': '/bursar/revenue-allocation',
    '/admin/accounts/coa': '/bursar/accounts/coa',
    '/admin/accounts/income': '/bursar/accounts/income',
    '/admin/accounts/expenses': '/bursar/accounts/expenses',
    '/admin/accounts/liabilities': '/bursar/accounts/liabilities',
    '/admin/accounts/bank-reconciliation': '/bursar/accounts/bank-reconciliation',
    '/admin/accounts/financial-reports': '/bursar/accounts/financial-reports',
    '/admin/procurement': '/bursar/procurement',
    '/admin/suppliers': '/bursar/procurement',
    '/admin/assets': '/bursar/assets',
    '/admin/hr/payroll/list': '/bursar/payroll',
    '/admin/leave': '/bursar/leave',
    '/admin/awards': '/bursar/awards',
    '/admin/transportation/routes': '/bursar/transportation/routes',
    '/admin/transportation/vehicles': '/bursar/transportation/vehicles',
    '/admin/transportation/assignments': '/bursar/transportation/assignments',
    '/admin/library/reports': '/bursar/library/reports',
    '/admin/messages': '/bursar/messages',
    '/admin/sdc-minutes': '/bursar/sdc/minutes',
    '/admin/sdc-funding': '/bursar/sdc/funding',
    '/admin/helpdesk': '/bursar/support',
    '/admin/settings': '/bursar/website-settings',
    '/admin/profile': '/bursar/profile'
  },
  librarian: {
    '/admin/library/dashboard': '/librarian/dashboard',
    '/admin/library/books': '/librarian/books',
    '/admin/library/categories': '/librarian/categories',
    '/admin/library/loans': '/librarian/loans',
    '/admin/library/overdue': '/librarian/overdue',
    '/admin/library/reservations': '/librarian/reservations',
    '/admin/library/digital': '/librarian/digital',
    '/admin/library/reports': '/librarian/reports',
    '/admin/assets': '/librarian/assets',
    '/admin/schedules': '/librarian/schedules',
    '/admin/leave': '/librarian/leave',
    '/admin/awards': '/librarian/awards',
    '/admin/messages': '/librarian/messages',
    '/admin/helpdesk': '/librarian/support',
    '/admin/settings': '/librarian/settings',
    '/admin/profile': '/librarian/profile'
  },
  ancillary: {
    '/admin/house': '/ancillary/house',
    '/admin/schedules': '/ancillary/schedules',
    '/admin/sports-management': '/ancillary/sports',
    '/admin/hr/attendance': '/ancillary/dashboard',
    '/admin/dining-hall': '/ancillary/dining-hall',
    '/admin/procurement': '/ancillary/procurement',
    '/admin/assets': '/ancillary/assets',
    '/admin/asset-maintenance': '/ancillary/assets',
    '/admin/farm': '/ancillary/farm',
    '/admin/leave': '/ancillary/leave',
    '/admin/awards': '/ancillary/awards',
    '/admin/transportation/routes': '/ancillary/transportation/routes',
    '/admin/transportation/vehicles': '/ancillary/transportation/vehicles',
    '/admin/transportation/assignments': '/ancillary/transportation/assignments',
    '/admin/library/dashboard': '/ancillary/library/dashboard',
    '/admin/library/books': '/ancillary/library/books',
    '/admin/library/loans': '/ancillary/library/loans',
    '/admin/library/overdue': '/ancillary/library/overdue',
    '/admin/library/reservations': '/ancillary/library/reservations',
    '/admin/library/reports': '/ancillary/library/reports',
    '/admin/clinic/complaints': '/ancillary/clinic/complaints',
    '/admin/messages': '/ancillary/messages',
    '/admin/helpdesk': '/ancillary/it-support',
    '/admin/settings': '/ancillary/settings',
    '/admin/profile': '/ancillary/profile'
  },
  clinic: {
    '/admin/clinic/dashboard': '/clinic/dashboard',
    '/admin/clinic/patients': '/clinic/patients',
    '/admin/clinic/hospitalization': '/clinic/hospitalization',
    '/admin/clinic/triage': '/clinic/triage',
    '/admin/clinic/appointments': '/clinic/appointments',
    '/admin/clinic/emergencies': '/clinic/emergencies',
    '/admin/clinic/referrals': '/clinic/referrals',
    '/admin/clinic/pharmacy': '/clinic/pharmacy',
    '/admin/clinic/immunization': '/clinic/immunization',
    '/admin/clinic/billing': '/clinic/billing',
    '/admin/clinic/reports': '/clinic/reports',
    '/admin/clinic/complaints': '/clinic/complaints',
    '/admin/clinic/icd10': '/clinic/icd10',
    '/admin/messages': '/clinic/messages',
    '/admin/helpdesk': '/clinic/support',
    '/admin/settings': '/clinic/settings',
    '/admin/profile': '/clinic/profile'
  },
  student: {
    '/admin/timetable': '/student/timetable',
    '/admin/study-materials': '/student/study-materials',
    '/admin/prefects': '/student/prefects',
    '/admin/library/digital': '/student/library',
    '/admin/clinic/appointments': '/student/clinic/appointments',
    '/admin/clinic/emergencies': '/student/clinic/emergencies',
    '/admin/clinic/complaints': '/student/clinic/complaints',
    '/admin/announcements': '/student/events',
    '/admin/messages': '/student/messages',
    '/admin/helpdesk': '/student/support',
    '/admin/settings': '/student/settings',
    '/admin/profile': '/student/profile'
  },
  parent: {
    '/admin/timetable': '/parent/timetable',
    '/admin/payment-plans': '/parent/payment-plans',
    '/admin/clinic/appointments': '/parent/clinic?tab=appointments',
    '/admin/clinic/emergencies': '/parent/clinic?tab=emergencies',
    '/admin/clinic/complaints': '/parent/clinic?tab=complaints',
    '/admin/announcements': '/parent/notices',
    '/admin/messages': '/parent/messages',
    '/admin/helpdesk': '/parent/support',
    '/admin/settings': '/parent/settings',
    '/admin/profile': '/parent/profile'
  }
};

function generateParentPortalNavigation(user: UserContext | null | undefined, currentPath: string = ''): NavGroup[] {
  const groups: NavGroup[] = [
    {
      id: 'ACADEMICS',
      label: 'Academics & Performance',
      icon: 'fas fa-graduation-cap',
      order: 1,
      defaultExpanded: true,
      items: [
        { id: 'parent-dashboard', label: 'Dashboard', to: '/parent/dashboard', icon: 'fas fa-th-large', searchKeywords: ['home', 'overview'] },
        { id: 'parent-profile', label: 'Child Profile', to: '/parent/profile', icon: 'fas fa-user-graduate', searchKeywords: ['child', 'student', 'details', 'bio'] },
        { 
          id: 'parent-academics', 
          label: 'Academics', 
          to: '/parent/academics', 
          icon: 'fas fa-graduation-cap', 
          tabs: [
            { id: 'current-term', label: 'Current Term' },
            { id: 'report-cards', label: 'Report Cards (PDF)' },
            { id: 'subject-breakdown', label: 'Subject Breakdown' },
            { id: 'history', label: 'History' }
          ],
          searchKeywords: ['grades', 'marks', 'performance', 'report cards', 'reports', 'pdf', 'subject breakdown', 'history', 'transcripts', 'results'] 
        },
        { id: 'parent-attendance', label: 'Attendance', to: '/parent/attendance', icon: 'fas fa-calendar-check', searchKeywords: ['present', 'absent', 'punctuality', 'roll call'] },
        { id: 'parent-timetable', label: 'Timetable', to: '/parent/timetable', icon: 'fas fa-clock', searchKeywords: ['schedule', 'periods', 'classes'] },
        { id: 'parent-calendar', label: 'Calendar', to: '/parent/calendar', icon: 'fas fa-calendar-alt', searchKeywords: ['events', 'terms', 'holidays'] }
      ]
    },
    {
      id: 'FINANCE_BILLING',
      label: 'Finance & Logistics',
      icon: 'fas fa-receipt',
      order: 2,
      defaultExpanded: true,
      items: [
        { id: 'parent-fees', label: 'Fees & Invoices', to: '/parent/fees', icon: 'fas fa-file-invoice-dollar', searchKeywords: ['billing', 'payments', 'statements', 'receipts'] },
        { id: 'parent-payment-plans', label: 'Payment Plans', to: '/parent/payment-plans', icon: 'fas fa-hand-holding-usd', searchKeywords: ['installments', 'plans', 'agreements'] },
        { id: 'parent-wallet', label: 'Tuckshop & Dining', to: '/parent/wallet', icon: 'fas fa-utensils', searchKeywords: ['pocket money', 'canteen', 'topup', 'tuckshop', 'dining', 'food', 'meals'] },
        { id: 'parent-uniforms', label: 'Uniforms', to: '/parent/uniforms', icon: 'fas fa-tshirt', searchKeywords: ['clothing', 'shop', 'books', 'supplies'] },
        { id: 'parent-transport', label: 'Transport', to: '/parent/transport', icon: 'fas fa-bus', searchKeywords: ['bus', 'route', 'tracking', 'pickup'] }
      ]
    },
    {
      id: 'COMMUNICATION_PORTAL',
      label: 'Communication',
      icon: 'fas fa-bullhorn',
      order: 3,
      items: [
        { id: 'parent-messages', label: 'Messages', to: '/parent/messages', icon: 'fas fa-envelope', searchKeywords: ['chat', 'inbox', 'teachers'] },
        { id: 'parent-notices', label: 'Notices', to: '/parent/notices', icon: 'fas fa-bullhorn', searchKeywords: ['announcements', 'circulars', 'news'] },
        { id: 'parent-approvals', label: 'Approvals', to: '/parent/approvals', icon: 'fas fa-file-signature', searchKeywords: ['permission', 'consent', 'excursions'] }
      ]
    },
    {
      id: 'CLINIC_HEALTH',
      label: 'Clinic & Wellbeing',
      icon: 'fas fa-notes-medical',
      order: 4,
      items: [
        { 
          id: 'parent-clinic', 
          label: 'Clinic & Wellbeing', 
          to: '/parent/clinic', 
          icon: 'fas fa-heartbeat', 
          tabs: [
            { id: 'visits', label: 'Visits' },
            { id: 'complaints', label: 'Complaints Log' },
            { id: 'appointments', label: 'Appointments' },
            { id: 'wellbeing', label: 'Wellbeing/Conduct' },
            { id: 'emergencies', label: 'Emergencies' }
          ],
          searchKeywords: ['health', 'clinic', 'visits', 'vitals', 'complaints', 'appointments', 'doctor', 'nurse', 'wellbeing', 'conduct', 'merits', 'emergencies'] 
        }
      ]
    },
    {
      id: 'SYSTEM',
      label: 'Settings',
      icon: 'fas fa-cog',
      order: 5,
      items: [
        { id: 'parent-settings', label: 'Settings', to: '/parent/settings', icon: 'fas fa-cog', searchKeywords: ['password', 'notifications', 'preferences'] },
        { id: 'parent-support', label: 'Support', to: '/parent/support', icon: 'fas fa-headset', searchKeywords: ['helpdesk', 'tickets', 'help'] }
      ]
    }
  ];

  return groups.map(group => ({
    ...group,
    defaultExpanded: group.defaultExpanded || group.items.some(item => currentPath.startsWith(item.to) || currentPath === item.to)
  }));
}

function generateStudentPortalNavigation(user: UserContext | null | undefined, currentPath: string = ''): NavGroup[] {
  const userSecRoles = user?.secondaryRoles || [];
  const isStudentLibrarian = userSecRoles.includes('Student Librarian');
  const isClassMonitor = userSecRoles.includes('Class Monitor');
  const isSportsCaptain = userSecRoles.includes('Sports Captain');
  const isHouseCaptain = userSecRoles.includes('House Captain');
  const isChurchPrefect = userSecRoles.includes('Church Prefect');

  const groups: NavGroup[] = [
    {
      id: 'ACADEMICS',
      label: 'Academics',
      icon: 'fas fa-graduation-cap',
      order: 1,
      defaultExpanded: true,
      items: [
        { id: 'student-dashboard', label: 'Dashboard', to: '/student/dashboard', icon: 'fas fa-tachometer-alt', searchKeywords: ['home'] },
        { id: 'student-profile', label: 'My Profile', to: '/student/profile', icon: 'fas fa-user', searchKeywords: ['details', 'bio'] },
        { id: 'student-grades', label: 'Grades & Reports', to: '/student/grades', icon: 'fas fa-chart-line', searchKeywords: ['scores', 'report cards', 'marks'] },
        { id: 'student-timetable', label: 'Timetable', to: '/student/timetable', icon: 'fas fa-calendar-alt', searchKeywords: ['schedule', 'periods'] },
        { id: 'student-assignments', label: 'Assignments', to: '/student/assignments', icon: 'fas fa-tasks', searchKeywords: ['homework', 'tasks', 'submissions'] },
        { id: 'student-cbt', label: 'Online Exams (CBT)', to: '/student/cbt', icon: 'fas fa-laptop-code', searchKeywords: ['exams', 'tests', 'quizzes'] },
        { id: 'student-attendance', label: 'Attendance', to: '/student/attendance', icon: 'fas fa-clipboard-check', searchKeywords: ['roll call', 'presence'] },
        { id: 'student-materials', label: 'Study Materials', to: '/student/study-materials', icon: 'fas fa-book-reader', searchKeywords: ['notes', 'documents', 'slides'] },
        { id: 'student-awards', label: 'Awards & Certificates', to: '/student/awards', icon: 'fas fa-award', searchKeywords: ['merits', 'certificates', 'honors'] }
      ]
    },
    {
      id: 'LIBRARY',
      label: 'Library & Resources',
      icon: 'fas fa-book',
      order: 2,
      items: [
        { id: 'student-my-books', label: 'My Books & Loans', to: '/student/my-books', icon: 'fas fa-book-open', searchKeywords: ['borrowed', 'due', 'reading'] },
        { id: 'student-library-catalog', label: 'Library Catalog', to: '/student/library', icon: 'fas fa-book', searchKeywords: ['search books', 'catalog', 'reservations'] },
        ...(isStudentLibrarian ? [
          { id: 'student-library-staff', label: 'Library Desk (Staff)', to: '/student/library-staff', icon: 'fas fa-book-reader', badge: 'Librarian', searchKeywords: ['checkout', 'circulation', 'barcode'] }
        ] : [])
      ]
    },
    {
      id: 'STUDENT_LIFE',
      label: 'Student Life & Leadership',
      icon: 'fas fa-user-shield',
      order: 3,
      items: [
        { id: 'student-events', label: 'Events & Calendar', to: '/student/events', icon: 'fas fa-calendar-day', searchKeywords: ['activities', 'calendar'] },
        { id: 'student-prefects', label: 'Prefects Board / SRC', to: '/student/prefects', icon: 'fas fa-user-tie', searchKeywords: ['leadership', 'council'] },
        ...(isClassMonitor ? [
          { id: 'student-class-monitor', label: 'Class Monitor Tool', to: '/student/class-monitor', icon: 'fas fa-clipboard-check', badge: 'Monitor', searchKeywords: ['register', 'attendance'] }
        ] : []),
        ...(isSportsCaptain ? [
          { id: 'student-sports', label: 'Sports & Fixtures', to: '/student/sports', icon: 'fas fa-trophy', badge: 'Captain', searchKeywords: ['athletics', 'matches', 'games'] }
        ] : []),
        ...(isHouseCaptain ? [
          { id: 'student-house', label: 'My House', to: '/student/house', icon: 'fas fa-house-user', badge: 'House', searchKeywords: ['dorm', 'points', 'hostel'] }
        ] : []),
        { id: 'student-dining-hall', label: 'Dining Hall (DH)', to: '/student/dining-hall', icon: 'fas fa-utensils', searchKeywords: ['meals', 'menu', 'food'] },
        ...(isChurchPrefect ? [
          { id: 'student-chaplaincy', label: 'Church & Chaplaincy', to: '/student/chaplaincy', icon: 'fas fa-church', badge: 'Prefect', searchKeywords: ['service', 'spiritual'] }
        ] : [])
      ]
    },
    {
      id: 'FINANCE_BILLING',
      label: 'Fees & Uniforms',
      icon: 'fas fa-receipt',
      order: 4,
      items: [
        { id: 'student-fees', label: 'Fees & Payments', to: '/student/fees', icon: 'fas fa-money-bill-wave', searchKeywords: ['tuition', 'receipts', 'billing'] },
        { id: 'student-uniforms', label: 'Uniforms', to: '/student/uniforms', icon: 'fas fa-tshirt', searchKeywords: ['attire', 'store'] }
      ]
    },
    {
      id: 'CLINIC_HEALTH',
      label: 'Health & Clinic',
      icon: 'fas fa-notes-medical',
      order: 5,
      items: [
        { id: 'student-complaints', label: 'Health Complaints', to: '/student/clinic/complaints', icon: 'fas fa-stethoscope', searchKeywords: ['sick', 'nurse', 'symptoms'] },
        { id: 'student-appointments', label: 'Clinic Appointments', to: '/student/clinic/appointments', icon: 'fas fa-calendar-check', searchKeywords: ['visit', 'doctor'] },
        { id: 'student-emergencies', label: 'Emergencies', to: '/student/clinic/emergencies', icon: 'fas fa-ambulance', searchKeywords: ['urgent', 'ambulance'] }
      ]
    },
    {
      id: 'SYSTEM',
      label: 'Messages & Support',
      icon: 'fas fa-cog',
      order: 6,
      items: [
        { id: 'student-messages', label: 'Messages', to: '/student/messages', icon: 'fas fa-envelope', searchKeywords: ['chat', 'inbox'] },
        { id: 'student-settings', label: 'Settings', to: '/student/settings', icon: 'fas fa-cog', searchKeywords: ['password', 'profile'] },
        { id: 'student-support', label: 'IT Support', to: '/student/support', icon: 'fas fa-headset', searchKeywords: ['help', 'technical'] }
      ]
    }
  ];

  return groups.map(group => ({
    ...group,
    defaultExpanded: group.defaultExpanded || group.items.some(item => currentPath.startsWith(item.to) || currentPath === item.to)
  }));
}

/**
 * Generates the role-scoped, grouped navigation structure from the Master Page Registry.
 */
export function generatePortalNavigation(
  portal: 'admin' | 'teacher' | 'bursar' | 'librarian' | 'ancillary' | 'clinic' | 'student' | 'parent' | 'sdc',
  user: UserContext | null | undefined,
  currentPath: string = ''
): NavGroup[] {
  if (portal === 'parent') {
    return generateParentPortalNavigation(user, currentPath);
  }
  if (portal === 'student') {
    return generateStudentPortalNavigation(user, currentPath);
  }

  // 1. Filter raw registry pages
  const allowedPages = PAGE_REGISTRY.filter((page: PageDefinition) => {
    // Portal visibility check
    if (!page.portalVisibility.includes(portal)) {
      return false;
    }

    // Role check
    if (page.requiredRoles && page.requiredRoles.length > 0) {
      if (!user?.role || !page.requiredRoles.includes(user.role)) {
        return false;
      }
    }

    // Secondary roles check
    if (page.requiredSecondaryRoles && page.requiredSecondaryRoles.length > 0) {
      const userSecRoles = user?.secondaryRoles || [];
      const hasSecRole = page.requiredSecondaryRoles.some(r => userSecRoles.includes(r));
      if (!hasSecRole) {
        return false;
      }
    }

    // Granular permission check
    if (page.permissionKey && !hasPermission(user, page.permissionKey)) {
      return false;
    }

    return true;
  });

  // 2. Group pages into canonical categories
  const groupedMap = new Map<CanonicalGroupId, NavLeafItem[]>();

  for (const page of allowedPages) {
    if (!groupedMap.has(page.group)) {
      groupedMap.set(page.group, []);
    }

    // Resolve rewritten route for non-admin portals if defined
    let targetRoute = page.route;
    const portalRewrites = PORTAL_ROUTE_REWRITES[portal];
    if (portalRewrites && portalRewrites[page.route]) {
      targetRoute = portalRewrites[page.route];
    }

    groupedMap.get(page.group)!.push({
      id: page.id,
      label: page.label,
      to: targetRoute,
      icon: page.icon,
      permissionKey: page.permissionKey,
      badge: page.badge,
      searchKeywords: page.searchKeywords
    });
  }

  // 3. Assemble and sort groups in canonical order (1 to 12)
  const result: NavGroup[] = [];

  const groupKeys = Object.keys(CANONICAL_GROUPS) as CanonicalGroupId[];
  groupKeys.sort((a, b) => CANONICAL_GROUPS[a].order - CANONICAL_GROUPS[b].order);

  for (const groupId of groupKeys) {
    const items = groupedMap.get(groupId);
    if (items && items.length > 0) {
      const groupConfig = CANONICAL_GROUPS[groupId];
      
      // Auto-expand group if current path matches one of its items
      const isCurrentActive = items.some(item => 
        currentPath.startsWith(item.to) || currentPath === item.to
      );

      result.push({
        id: groupId,
        label: groupConfig.label,
        icon: groupConfig.icon,
        order: groupConfig.order,
        defaultExpanded: isCurrentActive || groupId === 'PEOPLE_ENROLLMENT' || groupId === 'ACADEMICS',
        items
      });
    }
  }

  return result;
}
