import { useAuth } from '../contexts/AuthContext';

export type ModuleAccessLevel = 'full' | 'scoped' | 'request_only' | 'none';

const MODULE_ACCESS_MAP: Record<string, {
  fullRoles: string[];
  secondaryFullRoles: string[];
  secondaryScopedRoles: string[];
  secondaryRequestRoles: string[];
}> = {
  library: {
    fullRoles: ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'LIBRARIAN'],
    secondaryFullRoles: ['librarian', 'LIBRARY_HEAD', 'LIBRARY_MANAGER', 'LIBRARIAN', 'student librarian', 'STUDENT_LIBRARIAN', 'library_assistant', 'LIBRARY_ASSISTANT'],
    secondaryScopedRoles: [],
    secondaryRequestRoles: ['teacher', 'TEACHER', 'student', 'STUDENT', 'parent', 'PARENT', 'bursar', 'BURSAR', 'ancillary', 'ANCILLARY']
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
  },
  leave: {
    fullRoles: ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'HR', 'BURSAR', 'FINANCE', 'HEADMASTER', 'DEPUTY_HEAD'],
    secondaryFullRoles: ['hr', 'HR', 'hr_manager', 'HR_MANAGER', 'headmaster', 'HEADMASTER', 'deputy_head', 'DEPUTY_HEAD'],
    secondaryScopedRoles: ['hod', 'HOD', 'hod_sports', 'HOD_SPORTS'],
    secondaryRequestRoles: ['teacher', 'TEACHER', 'librarian', 'LIBRARIAN', 'ancillary', 'ANCILLARY', 'driver', 'DRIVER', 'bursar', 'BURSAR', 'student', 'STUDENT']
  },
  awards: {
    fullRoles: ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'HEADMASTER', 'DEPUTY_HEAD', 'HR'],
    secondaryFullRoles: ['sports_master', 'SPORTS_MASTER', 'club_patron', 'CLUB_PATRON', 'house_master', 'HOUSE_MASTER', 'hod', 'HOD'],
    secondaryScopedRoles: ['teacher', 'TEACHER', 'prefect', 'PREFECT', 'student_leader', 'STUDENT_LEADER'],
    secondaryRequestRoles: ['student', 'STUDENT', 'parent', 'PARENT', 'ancillary', 'ANCILLARY', 'librarian', 'LIBRARIAN']
  }
};

export function useModuleAccess(module: string) {
  const { user } = useAuth();
  
  const map = MODULE_ACCESS_MAP[module];
  if (!map || !user) return { level: 'none' as ModuleAccessLevel, actingAs: undefined };

  const primaryRole = ((user as any).role || '').toUpperCase();
  const secondaryRoles: string[] = Array.isArray((user as any).secondaryRoles) ? (user as any).secondaryRoles : [];

  if (map.fullRoles.some(r => r.toUpperCase() === primaryRole)) return { level: 'full' as ModuleAccessLevel, actingAs: undefined };
  
  const fullSecondary = secondaryRoles.find(r => 
    map.secondaryFullRoles.some(s => s.toLowerCase() === (r || '').toLowerCase())
  );
  if (fullSecondary) return { level: 'full' as ModuleAccessLevel, actingAs: fullSecondary };
  
  const scopedSecondary = secondaryRoles.find(r => 
    map.secondaryScopedRoles.some(s => s.toLowerCase() === (r || '').toLowerCase())
  );
  if (scopedSecondary) return { level: 'scoped' as ModuleAccessLevel, actingAs: scopedSecondary };

  const requestSecondary = secondaryRoles.find(r => 
    map.secondaryRequestRoles.some(s => s.toLowerCase() === (r || '').toLowerCase())
  );
  if (requestSecondary) return { level: 'request_only' as ModuleAccessLevel, actingAs: requestSecondary };

  // Defaults by primary role:
  if (module === 'library') {
    if (['TEACHER', 'STUDENT', 'PARENT', 'BURSAR', 'ANCILLARY'].includes(primaryRole)) {
      return { level: 'request_only' as ModuleAccessLevel, actingAs: primaryRole };
    }
  }
  if (module === 'sports' && primaryRole === 'TEACHER') {
    return { level: 'request_only' as ModuleAccessLevel, actingAs: 'pe_teacher' };
  }
  if (module === 'leave') {
    if (['TEACHER', 'LIBRARIAN', 'ANCILLARY', 'STUDENT', 'PARENT', 'BURSAR'].includes(primaryRole)) {
      return { level: 'request_only' as ModuleAccessLevel, actingAs: primaryRole };
    }
  }
  if (module === 'awards') {
    if (['TEACHER', 'BURSAR', 'LIBRARIAN'].includes(primaryRole)) {
      return { level: 'scoped' as ModuleAccessLevel, actingAs: primaryRole };
    }
    if (['STUDENT', 'PARENT', 'ANCILLARY'].includes(primaryRole)) {
      return { level: 'request_only' as ModuleAccessLevel, actingAs: primaryRole };
    }
  }

  return { level: 'none' as ModuleAccessLevel, actingAs: undefined };
}
