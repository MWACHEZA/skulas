import type { RoleTutorial } from './types';
import { TOUR_TARGETS } from './tourTargets';

export const studentTutorial: RoleTutorial = {
  role: 'STUDENT',
  landingRoute: '/student/dashboard',
  welcomeTitle: 'Welcome to your Student Portal! (1 min)',
  steps: [
    {
      id: 'student-step-1',
      title: 'Check your class timetable',
      description: 'View today’s class schedule, teacher room allocations, and daily period breakdown.',
      route: '/student/timetable',
      target: TOUR_TARGETS.STUDENT_TIMETABLE_LINK
    },
    {
      id: 'student-step-2',
      title: 'View assignments & homework',
      description: 'Track due dates, download assignment files, and submit homework online.',
      route: '/student/assignments',
      target: TOUR_TARGETS.STUDENT_ASSIGNMENTS_LINK
    },
    {
      id: 'student-step-3',
      title: 'View grades and report cards',
      description: 'Check published term grades, test marks, and download official report cards.',
      route: '/student/grades',
      target: TOUR_TARGETS.STUDENT_GRADES_LINK
    }
  ]
};
