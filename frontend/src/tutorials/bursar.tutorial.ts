import type { RoleTutorial } from './types';
import { TOUR_TARGETS } from './tourTargets';

export const bursarTutorial: RoleTutorial = {
  role: 'BURSAR',
  landingRoute: '/bursar/dashboard',
  welcomeTitle: "Welcome! Bursar Financial Desk (2 min)",
  steps: [
    {
      id: 'bursar-step-1',
      title: 'Check fee structure from Admin',
      description: 'Review active term tuition fees, boarding packages, levies, and currency conversions.',
      route: '/bursar/fees?tab=billing',
      target: TOUR_TARGETS.BURSAR_FEES_LINK
    },
    {
      id: 'bursar-step-2',
      title: 'Make a test receipt',
      description: 'Practice multi-currency counter collections in isolated test simulation.',
      route: '/bursar/fees?tab=collection',
      target: TOUR_TARGETS.BURSAR_RECEIPT_NEW_BTN,
      // TODO: Connect to dedicated simulated sandbox receipt mode.
      // Must NOT post real accounting journals or fiscal transactions to the general ledger.
      skipIf: () => true
    },
    {
      id: 'bursar-step-3',
      title: 'View daily collection report',
      description: 'Audit counter till reconciliation, currency breakdowns, and banking deposits.',
      route: '/bursar/fees?tab=collection',
      target: TOUR_TARGETS.REPORTS_COLLECTION_LINK
    }
  ]
};
