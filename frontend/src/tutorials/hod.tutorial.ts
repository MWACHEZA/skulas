import type { RoleTutorial } from './types';
import { TOUR_TARGETS } from './tourTargets';

export const hodTutorial: RoleTutorial = {
  role: 'HOD',
  landingRoute: '/teacher/dashboard',
  welcomeTitle: 'Welcome, Department Head! (2 min)',
  steps: [
    {
      id: 'hod-step-1',
      title: 'Review departmental schemes of work',
      description: 'Audit syllabus coverage, weekly schemes, and pedagogical execution plans.',
      route: '/teacher/curriculum',
      target: TOUR_TARGETS.HOD_CURRICULUM_LINK
    },
    {
      id: 'hod-step-2',
      title: 'Record lesson observations',
      description: 'Conduct peer reviews and formally evaluate teachers on curriculum delivery.',
      route: '/teacher/curriculum',
      target: TOUR_TARGETS.HOD_OBSERVATION_BTN
    },
    {
      id: 'hod-step-3',
      title: 'Sign off submitted marks & assessments',
      description: 'Review teacher marksheet submissions and authorize terminal examination results.',
      route: '/admin/academics/marks',
      target: TOUR_TARGETS.HOD_MARKS_APPROVE_BTN
    }
  ]
};
