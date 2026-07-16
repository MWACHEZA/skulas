/**
 * ACADEX Subscription Plans & Feature Flags
 */

const ACADEX_PLANS = {
  starter: {
    name: 'Starter',
    price: 29,
    currency: 'USD',
    billing: 'month',
    studentLimit: 200,
    tagline: 'Perfect for small primary schools',
    badge: '',
    color: '#64748b',
    features: [
      'Admin Portal',
      'Teacher Portal',
      'Student Portal',
      'Fees Management',
      'Basic Reports',
      'Attendance Tracking',
      'Announcements',
      'Classes & Timetables',
      'IT Support Hub',
      'Up to 200 Students',
      '5 GB Storage',
      'Email Support'
    ],
    portals: ['admin', 'teacher', 'student'],
    modules: ['fees', 'attendance', 'reports', 'announcements', 'timetable', 'classes']
  },

  professional: {
    name: 'Professional',
    price: 79,
    currency: 'USD',
    billing: 'month',
    studentLimit: 800,
    tagline: 'Ideal for secondary & high schools',
    badge: 'Most Popular',
    color: '#3b82f6',
    features: [
      'Everything in Starter',
      'Bursar / Finance Portal',
      'Library Portal',
      'Parent Portal',
      'Alumni Portal',
      'Applications Management',
      'Payroll Management',
      'Procurement Module',
      'Asset Management',
      'Audit Logs',
      'Up to 800 Students',
      '25 GB Storage',
      'Priority Email Support'
    ],
    portals: ['admin', 'teacher', 'student', 'bursar', 'library', 'parent', 'alumni', 'applicant'],
    modules: ['fees', 'attendance', 'reports', 'announcements', 'timetable', 'classes',
              'library', 'payroll', 'procurement', 'assets', 'audit', 'applications']
  },

  enterprise: {
    name: 'Enterprise',
    price: 199,
    currency: 'USD',
    billing: 'month',
    studentLimit: null, // unlimited
    tagline: 'For colleges, large schools & institutions',
    badge: 'Full Suite',
    color: '#f59e0b',
    features: [
      'Everything in Professional',
      'Ancillary Staff Portal',
      'Supplier Portal',
      'Advanced Analytics & BI',
      'Custom School Branding',
      'Multi-Campus Support',
      'SDC Portal',
      'Tuck Shop Management',
      'HR Services',
      'Unlimited Students',
      '100 GB Storage',
      '24/7 Phone & Chat Support',
      'Dedicated Account Manager',
      'Custom Integrations'
    ],
    portals: ['admin', 'teacher', 'student', 'bursar', 'library', 'parent', 'alumni',
              'applicant', 'ancillary', 'supplier'],
    modules: ['fees', 'attendance', 'reports', 'announcements', 'timetable', 'classes',
              'library', 'payroll', 'procurement', 'assets', 'audit', 'applications',
              'ancillary', 'supplier', 'analytics', 'branding', 'tuckshop', 'hr', 'sdc']
  }
};

const SCHOOL_TYPES = [
  { value: 'primary', label: 'Primary School', suggested: 'starter' },
  { value: 'secondary', label: 'Secondary / High School', suggested: 'professional' },
  { value: 'college', label: 'College / Tertiary', suggested: 'enterprise' },
  { value: 'private-day', label: 'Private Day School', suggested: 'professional' },
  { value: 'private-boarding', label: 'Private Boarding School', suggested: 'enterprise' },
  { value: 'public-day', label: 'Public Day School', suggested: 'professional' },
  { value: 'public-boarding', label: 'Public Boarding School', suggested: 'enterprise' },
  { value: 'combined', label: 'Combined School (Primary + Secondary)', suggested: 'professional' }
];

function hasFeature(plan, featureName) {
  const p = ACADEX_PLANS[plan];
  if (!p) return false;
  return p.modules.includes(featureName) || p.portals.includes(featureName);
}

function getPlanLabel(plan) {
  return ACADEX_PLANS[plan]?.name || 'Unknown';
}

function getPlanPrice(plan) {
  return ACADEX_PLANS[plan]?.price || 0;
}

function getSuggestedPlan(schoolType) {
  const type = SCHOOL_TYPES.find(t => t.value === schoolType);
  return type ? type.suggested : 'professional';
}

function getPortalUrl(role, schoolCode) {
  const rootPath = '../../'; // relative from acadex/
  const roleMap = {
    admin: `${rootPath}admin/login.html`,
    teacher: `${rootPath}teacher/login.html`,
    student: `${rootPath}student/login.html`,
    bursar: `${rootPath}bursar/login.html`,
    library: `${rootPath}library/login.html`,
    librarian: `${rootPath}library/login.html`,
    parent: `${rootPath}parent/login.html`,
    alumni: `${rootPath}alumni/login.html`,
    ancillary: `${rootPath}ancillary/login.html`,
    supplier: `${rootPath}supplier/login.html`,
    applicant: `${rootPath}applicant/`
  };
  return roleMap[role.toLowerCase()] || `${rootPath}admin/login.html`;
}

window.ACADEX_PLANS = ACADEX_PLANS;
window.SCHOOL_TYPES = SCHOOL_TYPES;
window.AcadexSubscription = { hasFeature, getPlanLabel, getPlanPrice, getSuggestedPlan, getPortalUrl };

