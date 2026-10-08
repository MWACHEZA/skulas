import type { RoleTutorial, RoleId } from './types';
import { teacherTutorial } from './teacher.tutorial';
import { bursarTutorial } from './bursar.tutorial';
import { studentTutorial } from './student.tutorial';
import { parentTutorial } from './parent.tutorial';
import { hodTutorial } from './hod.tutorial';
import { clerkTutorial } from './clerk.tutorial';

export * from './types';
export * from './tourTargets';

export const ROLE_TUTORIALS: Record<string, RoleTutorial> = {
  TEACHER: teacherTutorial,
  BURSAR: bursarTutorial,
  STUDENT: studentTutorial,
  PARENT: parentTutorial,
  HOD: hodTutorial,
  CLERK: clerkTutorial,
  ANCILLARY: clerkTutorial, // Ancillary / front office shares clerk checklist
  LIBRARIAN: {
    role: 'LIBRARIAN',
    landingRoute: '/librarian/dashboard',
    welcomeTitle: 'Welcome to the Campus Library Suite! (1 min)',
    steps: [
      { id: 'lib-step-1', title: 'Search & browse catalog', route: '/library/catalog' },
      { id: 'lib-step-2', title: 'Issue or return a book', route: '/library/circulation' },
      { id: 'lib-step-3', title: 'Audit overdue loans & fines', route: '/library/fines' }
    ]
  },
  CLINIC: {
    role: 'CLINIC',
    landingRoute: '/clinic/dashboard',
    welcomeTitle: 'Welcome to Sick Bay & Health Suite! (1 min)',
    steps: [
      { id: 'clinic-step-1', title: 'Triage a patient & record vitals', route: '/clinic/triage' },
      { id: 'clinic-step-2', title: 'Consultation & prescription', route: '/clinic/consultations' },
      { id: 'clinic-step-3', title: 'Review sick-bay admissions', route: '/clinic/hospitalization' }
    ]
  }
};

export function getTutorialForRole(role?: string, secondaryRoles: string[] = []): RoleTutorial | null {
  if (!role) return null;
  const upperRole = role.toUpperCase();

  // Check if user has an HOD secondary role
  const isHod = secondaryRoles.some(r => ['HOD', 'DEPARTMENT_HEAD', 'HEAD OF DEPARTMENT'].includes(String(r).toUpperCase()));
  if (isHod && ROLE_TUTORIALS['HOD']) {
    return ROLE_TUTORIALS['HOD'];
  }

  return ROLE_TUTORIALS[upperRole] || null;
}
