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
    '/admin/leave': '/teacher/leave',
    '/admin/awards': '/teacher/awards',
    '/admin/messages': '/teacher/messages',
    '/admin/helpdesk': '/teacher/support',
    '/admin/settings': '/teacher/settings',
    '/admin/profile': '/teacher/profile'
  },
  bursar: {
    '/admin/leave': '/bursar/leave',
    '/admin/awards': '/bursar/awards',
    '/admin/messages': '/bursar/messages',
    '/admin/helpdesk': '/bursar/support',
    '/admin/settings': '/bursar/settings',
    '/admin/profile': '/bursar/profile'
  },
  librarian: {
    '/admin/leave': '/librarian/leave',
    '/admin/awards': '/librarian/awards',
    '/admin/messages': '/librarian/messages',
    '/admin/helpdesk': '/librarian/support',
    '/admin/settings': '/librarian/settings',
    '/admin/profile': '/librarian/profile'
  },
  ancillary: {
    '/admin/leave': '/ancillary/leave',
    '/admin/awards': '/ancillary/awards',
    '/admin/messages': '/ancillary/messages',
    '/admin/helpdesk': '/ancillary/it-support',
    '/admin/settings': '/ancillary/settings',
    '/admin/profile': '/ancillary/profile'
  },
  clinic: {
    '/admin/messages': '/clinic/messages',
    '/admin/helpdesk': '/clinic/support',
    '/admin/settings': '/clinic/settings',
    '/admin/profile': '/clinic/profile'
  },
  sdc: {
    '/admin/messages': '/bursar/messages',
    '/admin/settings': '/bursar/settings',
    '/admin/profile': '/bursar/profile'
  },
  student: {
    '/admin/timetable': '/student/timetable',
    '/admin/study-materials': '/student/study-materials',
    '/admin/prefects': '/student/prefects',
    '/admin/library/digital': '/student/library',
    '/admin/announcements': '/student/events',
    '/admin/messages': '/student/messages',
    '/admin/helpdesk': '/student/support',
    '/admin/settings': '/student/settings',
    '/admin/profile': '/student/profile'
  },
  parent: {
    '/admin/timetable': '/parent/timetable',
    '/admin/announcements': '/parent/notices',
    '/admin/messages': '/parent/messages',
    '/admin/helpdesk': '/parent/support',
    '/admin/settings': '/parent/settings',
    '/admin/profile': '/parent/profile'
  }
};

function generateParentPortalNavigation(_user: UserContext | null | undefined, currentPath: string = ''): NavGroup[] {
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
            { id: 'overview', label: 'Overview' },
            { id: 'subject-breakdown', label: 'Subject Breakdown' },
            { id: 'report-cards', label: 'Report Cards' },
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
        { 
          id: 'parent-fees', 
          label: 'Fees & Invoices', 
          to: '/parent/fees', 
          icon: 'fas fa-file-invoice-dollar', 
          tabs: [
            { id: 'overview', label: 'Overview' },
            { id: 'invoices', label: 'Invoices & Receipts' },
            { id: 'statement', label: 'Statement' },
            { id: 'payment-plan', label: 'Payment Plan' }
          ],
          searchKeywords: ['billing', 'payments', 'statements', 'receipts', 'invoices', 'payment plans', 'installments', 'tuition', 'zig'] 
        },
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
            { id: 'visits', label: 'Clinic Visits' },
            { id: 'profile', label: 'Health Profile' },
            { id: 'wellbeing', label: 'Wellbeing & Conduct' }
          ],
          searchKeywords: ['health', 'clinic', 'visits', 'allergies', 'profile', 'blood group', 'nurse', 'wellbeing', 'conduct', 'merits', 'counselor'] 
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

  const isLeader = !!user?.isLeader;

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
        { 
          id: 'student-library-catalog', 
          label: 'Library & Loans', 
          to: '/student/library', 
          icon: 'fas fa-book', 
          tabs: [
            { id: 'catalog', label: 'Catalog' },
            { id: 'loans', label: 'My Loans' },
            { id: 'reservations', label: 'Reserve' }
          ],
          searchKeywords: ['search books', 'catalog', 'reservations', 'my books', 'borrowed'] 
        }
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
        ...(isLeader ? [
          { 
            id: 'student-cleaning-requests', 
            label: 'Cleaning Requests', 
            to: '/student/cleaning-requests', 
            icon: 'fas fa-broom', 
            badge: 'Leader', 
            searchKeywords: ['cleaning', 'supplies', 'hostel', 'prefect', 'request', 'mop', 'broom', 'soap', 'detergent'] 
          }
        ] : []),
        ...(isClassMonitor ? [
          { id: 'student-class-monitor', label: 'Class Monitor Tool', to: '/student/class-monitor', icon: 'fas fa-clipboard-check', badge: 'Monitor', searchKeywords: ['register', 'attendance'] }
        ] : []),
        ...(isSportsCaptain ? [
          { id: 'student-sports', label: 'Sports & Fixtures', to: '/student/sports', icon: 'fas fa-trophy', badge: 'Captain', searchKeywords: ['athletics', 'matches', 'games'] }
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
        { 
          id: 'student-clinic', 
          label: 'Health & Clinic', 
          to: '/student/clinic', 
          icon: 'fas fa-notes-medical', 
          tabs: [
            { id: 'visits', label: 'My Visits' },
            { id: 'book', label: 'Book Appointment' }
          ],
          searchKeywords: ['clinic', 'doctor', 'nurse', 'visits', 'appointments', 'sick'] 
        }
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
  // Fallback to local storage or portal default role if user is temporarily null/unhydrated
  let effectiveUser = user;
  if (!effectiveUser || !effectiveUser.role) {
    try {
      const stored = localStorage.getItem('acadex_user') || localStorage.getItem('user');
      if (stored) {
        effectiveUser = JSON.parse(stored);
      }
    } catch (e) {
      // ignore
    }
  }

  if (!effectiveUser?.role) {
    const portalRoleMap: Record<string, string> = {
      admin: 'ADMIN',
      teacher: 'TEACHER',
      bursar: 'BURSAR',
      librarian: 'LIBRARIAN',
      ancillary: 'ANCILLARY',
      clinic: 'NURSE',
      sdc: 'SDC',
      student: 'STUDENT',
      parent: 'PARENT'
    };
    effectiveUser = {
      role: portalRoleMap[portal] || 'ADMIN',
      secondaryRoles: effectiveUser?.secondaryRoles || []
    } as UserContext;
  }

  if (portal === 'parent') {
    return generateParentPortalNavigation(effectiveUser, currentPath);
  }
  if (portal === 'student') {
    return generateStudentPortalNavigation(effectiveUser, currentPath);
  }

  // 1. Filter raw registry pages
  const allowedPages = PAGE_REGISTRY.filter((page: PageDefinition) => {
    // Portal visibility check
    if (!page.portalVisibility.includes(portal)) {
      return false;
    }

    // Role check
    if (page.requiredRoles && page.requiredRoles.length > 0) {
      if (!effectiveUser?.role || !page.requiredRoles.includes(effectiveUser.role)) {
        return false;
      }
    }

    // Secondary roles check
    if (page.requiredSecondaryRoles && page.requiredSecondaryRoles.length > 0) {
      const userSecRoles = effectiveUser?.secondaryRoles || [];
      const hasSecRole = page.requiredSecondaryRoles.some(r => userSecRoles.includes(r));
      if (!hasSecRole) {
        return false;
      }
    }

    // Granular permission check
    if (page.permissionKey && !hasPermission(effectiveUser, page.permissionKey)) {
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

    const groupList = groupedMap.get(page.group)!;
    // Deduplicate by base route to guarantee no duplicate links appear in any sidebar
    const baseTarget = targetRoute.split('?')[0];
    const isDuplicate = groupList.some(item => item.to.split('?')[0] === baseTarget || item.to === targetRoute);
    if (!isDuplicate) {
      groupList.push({
        id: page.id,
        label: page.label,
        to: targetRoute,
        icon: page.icon,
        permissionKey: page.permissionKey,
        badge: page.badge,
        searchKeywords: page.searchKeywords,
        tabs: page.tabs
      });
    }
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
