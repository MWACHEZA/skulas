import type { RoleTutorial } from './types';
import { TOUR_TARGETS } from './tourTargets';

export const parentTutorial: RoleTutorial = {
  role: 'PARENT',
  landingRoute: '/parent/dashboard',
  welcomeTitle: 'Welcome to your Parent Portal! (1 min)',
  steps: [
    {
      id: 'parent-step-1',
      title: 'View your children’s academic progress',
      description: 'Review terminal grades, teacher remarks, and download termly report card PDFs.',
      route: '/parent/academics',
      target: TOUR_TARGETS.PARENT_REPORTS_LINK
    },
    {
      id: 'parent-step-2',
      title: 'Review fee statements & invoices',
      description: 'Check itemized school fees, balances, download receipts, and view payment plans.',
      route: '/parent/fees',
      target: TOUR_TARGETS.PARENT_FEES_LINK
    },
    {
      id: 'parent-step-3',
      title: 'Track daily attendance & wellness',
      description: 'Monitor daily attendance records, bus transport routes, and sick-bay clinic logs.',
      route: '/parent/attendance',
      target: TOUR_TARGETS.PARENT_STUDENTS_CARD
    }
  ]
};
