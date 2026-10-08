import type { RoleTutorial } from './types';
import { TOUR_TARGETS } from './tourTargets';

export const teacherTutorial: RoleTutorial = {
  role: 'TEACHER',
  landingRoute: '/teacher/dashboard',
  welcomeTitle: "Welcome! Let's set you up (2 min)",
  steps: [
    {
      id: 'teacher-step-1',
      title: 'View your assigned classes',
      description: 'Check your assigned classroom streams, student rosters, and subject allocations.',
      route: '/teacher/classes',
      target: TOUR_TARGETS.TEACHER_CLASSES_LINK
    },
    {
      id: 'teacher-step-2',
      title: 'Take attendance for today',
      description: 'Mark student presence, tardiness, or excused absences for your first period.',
      route: '/teacher/attendance',
      target: TOUR_TARGETS.ATTENDANCE_TAKE_BTN,
      autoCompleteOn: 'attendance.submitted'
    },
    {
      id: 'teacher-step-3',
      title: 'Enter first marks',
      description: 'Score assignments, continuous assessment tasks, and examination marks in the grading grid.',
      route: '/teacher/marks',
      target: TOUR_TARGETS.MARKS_ADD_BTN,
      autoCompleteOn: 'marks.saved'
    }
  ]
};
