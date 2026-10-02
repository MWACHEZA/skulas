"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModuleAccess = getModuleAccess;
exports.requireModuleAccess = requireModuleAccess;
// Module access matrix
const MODULE_ACCESS_MAP = {
    library: {
        fullRoles: ['SCHOOL_ADMIN', 'SUPER_ADMIN'],
        secondaryFullRoles: ['librarian', 'LIBRARY_HEAD', 'LIBRARY_MANAGER'],
        secondaryScopedRoles: [],
        secondaryRequestRoles: [] // teachers get request-only by DEFAULT (handled in route)
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
function getModuleAccess(user, module) {
    const map = MODULE_ACCESS_MAP[module];
    if (!map)
        return { level: 'none' };
    const primaryRole = user.role || '';
    const secondaryRoles = user.secondaryRoles || [];
    // Full access via primary role
    if (map.fullRoles.includes(primaryRole)) {
        return { level: 'full' };
    }
    // Full access via secondary role
    const fullSecondary = secondaryRoles.find((r) => map.secondaryFullRoles.includes(r));
    if (fullSecondary) {
        return { level: 'full', actingAs: fullSecondary };
    }
    // Scoped access via secondary role
    const scopedSecondary = secondaryRoles.find((r) => map.secondaryScopedRoles.includes(r));
    if (scopedSecondary) {
        return { level: 'scoped', actingAs: scopedSecondary };
    }
    // Request-only access via secondary role
    const requestSecondary = secondaryRoles.find((r) => map.secondaryRequestRoles.includes(r));
    if (requestSecondary) {
        return { level: 'request_only', actingAs: requestSecondary };
    }
    // Teachers get request-only by DEFAULT for library
    if (module === 'library' && primaryRole === 'TEACHER') {
        return { level: 'request_only', actingAs: 'TEACHER' };
    }
    return { level: 'none' };
}
// Express middleware factory — returns 403 if user doesn't have at least minLevel
function requireModuleAccess(module, minLevel = 'request_only') {
    const levels = ['none', 'request_only', 'scoped', 'full'];
    return (req, res, next) => {
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
//# sourceMappingURL=moduleAccess.js.map