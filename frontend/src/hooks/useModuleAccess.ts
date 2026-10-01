import { useAuth } from '../contexts/AuthContext';

export type ModuleAccessLevel = 'full' | 'scoped' | 'request_only' | 'none';

const MODULE_ACCESS_MAP: Record<string, {
  fullRoles: string[];
  secondaryFullRoles: string[];
  secondaryScopedRoles: string[];
  secondaryRequestRoles: string[];
}> = {
  library: {
    fullRoles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
    secondaryFullRoles: ['librarian', 'LIBRARY_HEAD', 'LIBRARY_MANAGER'],
    secondaryScopedRoles: [],
    secondaryRequestRoles: []
  },
  farm: {
    fullRoles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
    secondaryFullRoles: ['farm_manager', 'FARM_MANAGER', 'FARM_MGT'],
    secondaryScopedRoles: ['agric_teacher', 'AGRIC_TEACHER', 'AGRI_ACADEMIC'],
    secondaryRequestRoles: []
  },
  dining: {
    fullRoles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
    secondaryFullRoles: ['catering_manager', 'CATERING_MANAGER', 'KITCHEN'],
    secondaryScopedRoles: ['matron', 'MATRON', 'BOARDING'],
    secondaryRequestRoles: []
  },
  sports: {
    fullRoles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
    secondaryFullRoles: ['sports_master', 'SPORTS_MASTER', 'SPORTS'],
    secondaryScopedRoles: ['pe_teacher', 'PE_TEACHER', 'house_master', 'HOUSE_MASTER', 'HOUSE', 'hod_sports', 'HOD_SPORTS', 'sports_tech', 'SPORTS_TECH'],
    secondaryRequestRoles: []
  }
};

export function useModuleAccess(module: string) {
  const { user } = useAuth();
  
  const map = MODULE_ACCESS_MAP[module];
  if (!map || !user) return { level: 'none' as ModuleAccessLevel, actingAs: undefined };

  const primaryRole = (user as any).role || '';
  const secondaryRoles: string[] = (user as any).secondaryRoles || [];

  if (map.fullRoles.includes(primaryRole)) return { level: 'full' as ModuleAccessLevel, actingAs: undefined };
  
  const fullSecondary = secondaryRoles.find(r => map.secondaryFullRoles.includes(r));
  if (fullSecondary) return { level: 'full' as ModuleAccessLevel, actingAs: fullSecondary };
  
  const scopedSecondary = secondaryRoles.find(r => map.secondaryScopedRoles.includes(r));
  if (scopedSecondary) return { level: 'scoped' as ModuleAccessLevel, actingAs: scopedSecondary };

  return { level: 'none' as ModuleAccessLevel, actingAs: undefined };
}
