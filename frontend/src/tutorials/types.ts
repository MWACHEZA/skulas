import type { TourTargetId } from './tourTargets';

export type RoleId = 
  | 'TEACHER' 
  | 'BURSAR' 
  | 'STUDENT' 
  | 'PARENT' 
  | 'HOD' 
  | 'CLERK' 
  | 'LIBRARIAN' 
  | 'ANCILLARY' 
  | 'CLINIC'
  | 'SCHOOL_ADMIN';

export type TutorialStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed';

export interface TutorialContext {
  user: any;
  school?: any;
  role: string;
}

export interface TutorialStep {
  id: string;
  title: string;
  description?: string;
  route: string;
  target?: TourTargetId;
  autoCompleteOn?: string;
  skipIf?: (ctx?: TutorialContext) => boolean;
}

export interface RoleTutorial {
  role: RoleId;
  landingRoute: string;
  welcomeTitle: string;
  steps: TutorialStep[];
}

export interface UserTutorialState {
  userId: string;
  role: string;
  status: TutorialStatus;
  completedStepIds: string[];
  updatedAt: string;
}
