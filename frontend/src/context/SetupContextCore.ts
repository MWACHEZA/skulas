import { createContext } from 'react';

export interface EnabledModules {
  academic: boolean;
  accounting: boolean;
  fees: boolean;
  branding?: boolean;
  website?: boolean;
  id_cards?: boolean;
  document_branding?: boolean;
  grading?: boolean;
  transportation?: boolean;
  boarding?: boolean;
  assets?: boolean;
  clubs?: boolean;
  uniforms: boolean;
  clinic: boolean;
}

export interface SetupStatus {
  schoolId: string;
  schoolName: string;
  schoolType: string;
  isComplete: boolean;
  currentStep: number;
  progressPercentage: number;
  completedStages: Record<string, boolean>;
  enabledModules: EnabledModules;
  activeStages: string[];
  counts: {
    coa: number;
    classes: number;
    students: number;
    fees: number;
    uniforms: number;
    clinic: number;
    staff: number;
    departments: number;
    subjects: number;
    sports: number;
    houses: number;
    routes?: number;
    vehicles?: number;
    hostels?: number;
    assets?: number;
    grading?: number;
    clubs?: number;
  };
}

export interface RoleOrientation {
  title: string;
  description: string;
  icon: string;
  actions: { label: string; link: string }[];
  dismissed?: boolean;
}

export interface SetupContextType {
  setupStatus: SetupStatus | null;
  loading: boolean;
  offline: boolean;
  roleOrientation: RoleOrientation | null;
  refreshSetupStatus: () => Promise<void>;
  updateStage: (stageKey: string, completed?: boolean, stepNumber?: number) => Promise<void>;
  updateModules: (modules: Partial<EnabledModules>) => Promise<void>;
  seedCOA: () => Promise<boolean>;
  dismissRoleOrientation: () => Promise<void>;
}

export const SetupContext = createContext<SetupContextType | undefined>(undefined);
