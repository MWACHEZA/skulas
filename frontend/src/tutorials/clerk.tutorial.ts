import type { RoleTutorial } from './types';
import { TOUR_TARGETS } from './tourTargets';

export const clerkTutorial: RoleTutorial = {
  role: 'CLERK',
  landingRoute: '/admin/reception',
  welcomeTitle: 'Welcome to the Front Office Desk! (1 min)',
  steps: [
    {
      id: 'clerk-step-1',
      title: 'Front office visitor check-in',
      description: 'Register incoming campus guests, capture vehicle registration, and issue gate passes.',
      route: '/admin/reception',
      target: TOUR_TARGETS.CLERK_RECEPTION_LINK
    },
    {
      id: 'clerk-step-2',
      title: 'Process applicant admissions',
      description: 'Review prospective student entrance applications and verify required documents.',
      route: '/admin/admissions',
      target: TOUR_TARGETS.CLERK_ADMISSIONS_BTN
    },
    {
      id: 'clerk-step-3',
      title: 'Generate official school documents',
      description: 'Print standardized acceptance letters, transfer certificates, and clearance vouchers.',
      route: '/admin/document-templates',
      target: TOUR_TARGETS.CLERK_DOCUMENTS_LINK
    }
  ]
};
