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
    '/admin/clinic/appointments': '/parent/clinic/appointments',
    '/admin/clinic/emergencies': '/parent/clinic/emergencies',
    '/admin/clinic/complaints': '/parent/clinic/complaints',
    '/admin/announcements': '/parent/notices',
    '/admin/messages': '/parent/messages',
    '/admin/helpdesk': '/parent/support',
    '/admin/settings': '/parent/settings',
    '/admin/profile': '/parent/profile'
  }
};

/**
 * Generates the role-scoped, grouped navigation structure from the Master Page Registry.
 */
export function generatePortalNavigation(
  portal: 'admin' | 'teacher' | 'bursar' | 'librarian' | 'ancillary' | 'clinic' | 'student' | 'parent' | 'sdc',
  user: UserContext | null | undefined,
  currentPath: string = ''
): NavGroup[] {
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
