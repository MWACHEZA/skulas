import { Request, Response, NextFunction } from 'express';

export type ModuleAccessLevel = 'full' | 'scoped' | 'request_only' | 'none';

export interface ModuleAccessResult {
  level: ModuleAccessLevel;
  actingAs?: string; // the secondary role being used
  scopedContext?: string; // department/house/hostel ID if scoped
}

// Module access matrix
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
    fullRoles: ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'FARM_MANAGER', 'ANCILLARY', 'STAFF'],
    secondaryFullRoles: ['farm_manager', 'Farm Manager', 'FARM_MANAGER', 'FARM_MGT', 'Agriculture Teacher', 'Farm Assistant', 'agric_teacher', 'AGRIC_TEACHER', 'ancillary', 'ANCILLARY', 'staff', 'STAFF', 'groundsman', 'GROUNDSMAN'],
    secondaryScopedRoles: ['farm_manager', 'Farm Manager', 'agric_teacher', 'AGRIC_TEACHER', 'AGRI_ACADEMIC', 'Agriculture Teacher', 'Farm Assistant', 'teacher', 'TEACHER', 'ancillary', 'ANCILLARY', 'staff', 'STAFF'],
    secondaryRequestRoles: []
  },
  prefects: {
    fullRoles: ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'ADMIN', 'HEADMASTER', 'PRINCIPAL'],
    secondaryFullRoles: ['prefect_master', 'DISCIPLINE_MASTER', 'head_prefect', 'PREFECT', 'HEAD_BOY', 'HEAD_GIRL', 'SENIOR_PREFECT'],
    secondaryScopedRoles: ['house_master', 'HOUSE_MASTER', 'teacher', 'TEACHER', 'CLASS_MONITOR'],
    secondaryRequestRoles: ['student', 'STUDENT']
  },
  dining: {
    fullRoles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
    secondaryFullRoles: ['catering_manager', 'CATERING_MANAGER', 'KITCHEN', 'Head Chef', 'Cook', 'Catering Supervisor', 'Kitchen Assistant'],
    secondaryScopedRoles: ['matron', 'MATRON', 'BOARDING', 'Hostel Matron', 'Hostel Supervisor'],
    secondaryRequestRoles: []
  },
  sports: {
    fullRoles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
    secondaryFullRoles: ['sports_master', 'SPORTS_MASTER', 'SPORTS', 'Sports Coordinator'],
    secondaryScopedRoles: ['pe_teacher', 'PE_TEACHER', 'house_master', 'HOUSE_MASTER', 'HOUSE', 'hod_sports', 'HOD_SPORTS', 'sports_tech', 'SPORTS_TECH', 'Sports Captain'],
    secondaryRequestRoles: []
  }
};

export function getModuleAccess(user: any, module: string): ModuleAccessResult {
  const map = MODULE_ACCESS_MAP[module];
  if (!map || !user) return { level: 'none' };

  const primaryRole = (user.role || '').toUpperCase();
  const secondaryRoles: string[] = Array.isArray(user.secondaryRoles) ? user.secondaryRoles : [];
  const normalize = (str: string) => (str || '').toLowerCase().replace(/[\s_-]+/g, '');

  // Full access via primary role
  if (map.fullRoles.some(r => normalize(r) === normalize(primaryRole))) {
    return { level: 'full' };
  }

  // Full access via secondary role (case/spacing/underscore agnostic)
  const fullSecondary = secondaryRoles.find((r: string) => 
    map.secondaryFullRoles.some(s => normalize(s) === normalize(r))
  );
  if (fullSecondary) {
    return { level: 'full', actingAs: fullSecondary };
  }

  // Scoped access via secondary role
  const scopedSecondary = secondaryRoles.find((r: string) => 
    map.secondaryScopedRoles.some(s => normalize(s) === normalize(r))
  );
  if (scopedSecondary) {
    return { level: 'scoped', actingAs: scopedSecondary };
  }

  // Request-only access via secondary role
  const requestSecondary = secondaryRoles.find((r: string) => 
    map.secondaryRequestRoles.some(s => normalize(s) === normalize(r))
  );
  if (requestSecondary) {
    return { level: 'request_only', actingAs: requestSecondary };
  }

  // Default library access: Teachers, Students, Parents, Bursar, Ancillary get request_only
  if (module === 'library') {
    if (['TEACHER', 'STUDENT', 'PARENT', 'BURSAR', 'ANCILLARY'].includes(primaryRole)) {
      return { level: 'request_only', actingAs: primaryRole };
    }
  }

  // Default prefects access: Teachers, Students, Admins get access
  if (module === 'prefects') {
    if (['ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT'].includes(primaryRole)) {
      return { level: 'full', actingAs: primaryRole };
    }
  }

  return { level: 'none' };
}

// Express middleware factory — returns 403 if user doesn't have at least minLevel
export function requireModuleAccess(module: string, minLevel: ModuleAccessLevel = 'request_only') {
  const levels: ModuleAccessLevel[] = ['none', 'request_only', 'scoped', 'full'];
  return (req: any, res: any, next: NextFunction) => {
    const result = getModuleAccess(req.user, module);
    const userLevelIndex = levels.indexOf(result.level);
    const minLevelIndex = levels.indexOf(minLevel);
    if (userLevelIndex >= minLevelIndex) {
      req.moduleAccess = result;
      return next();
    }
    return res.status(403).json({ 
      error: 'Access denied',
      module,
      required: minLevel,
      current: result.level
    });
  };
}
