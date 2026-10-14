import type { RoleTutorial } from './types';
import { TOUR_TARGETS } from './tourTargets';

export const adminTutorial: RoleTutorial = {
  role: 'ADMIN',
  landingRoute: '/admin/dashboard',
  welcomeTitle: 'Welcome to ACADEX Admin Command Center! (2 min)',
  steps: [
    {
      id: 'admin-step-1',
      title: 'Review School Structure & Classes',
      description: 'Check active academic departments, grade levels, and assigned classroom streams.',
      route: '/admin/departments',
      target: TOUR_TARGETS.ADMIN_ACADEMIC_LINK
    },
    {
      id: 'admin-step-2',
      title: 'Daily Attendance & Operational Clock',
      description: 'Audit live student attendance, staff clock-in compliance, and daily absences.',
      route: '/admin/attendance',
      target: TOUR_TARGETS.ADMIN_ATTENDANCE_LINK
    },
    {
      id: 'admin-step-3',
      title: 'Configure Fee Groups & Structures',
      description: 'Review tuition rates, billing cycles, class pricing overrides, and GL accounting accounts.',
      route: '/admin/fee-groups',
      target: TOUR_TARGETS.ADMIN_FEES_LINK
    },
    {
      id: 'admin-step-4',
      title: 'Campus Security & Gate Scanning',
      description: 'Supervise real-time gate entry/exit logs, generate student QR cards, and terminal devices.',
      route: '/admin/gate-dashboard',
      target: TOUR_TARGETS.ADMIN_GATE_LINK
    }
  ]
};
