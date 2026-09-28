"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceTenantIsolation = exports.tenantContext = void 0;
const security_logger_1 = require("../lib/security-logger");
/**
 * Extracts school/tenant context from headers or URL parameters.
 * For authenticated requests, JWT user school is authoritative.
 */
const tenantContext = (req, res, next) => {
    const tenantCode = req.headers['x-school-code'] || req.query.schoolCode;
    if (tenantCode) {
        req.tenantCode = tenantCode.toUpperCase();
    }
    if (req.user?.schoolId) {
        req.tenantId = req.user.schoolId;
        if (req.user.schoolCode) {
            req.tenantCode = req.user.schoolCode.toUpperCase();
        }
    }
    next();
};
exports.tenantContext = tenantContext;
/**
 * Strict Tenant Boundary Enforcement Guard.
 * Rejects any request where a non-SUPER_ADMIN client attempts to query,
 * manipulate, or access data belonging to a different schoolId/schoolCode.
 */
const enforceTenantIsolation = (req, res, next) => {
    if (!req.user || req.user.role === 'SUPER_ADMIN') {
        return next();
    }
    const userSchoolId = req.user.schoolId;
    const userSchoolCode = req.user.schoolCode?.toUpperCase();
    // Inspect query, body, and params for conflicting tenant identifiers
    const targetSchoolId = (req.params?.schoolId || req.query.schoolId || req.body?.schoolId);
    const targetSchoolCode = (req.params?.schoolCode || req.query.schoolCode || req.body?.schoolCode || req.headers['x-school-code']);
    if (targetSchoolId && userSchoolId && targetSchoolId !== userSchoolId) {
        (0, security_logger_1.logSecurityViolation)({
            userId: req.user.id,
            targetId: targetSchoolId,
            resource: req.originalUrl,
            action: req.method,
            schoolId: userSchoolId,
            reason: `Cross-tenant violation: attempted to access schoolId '${targetSchoolId}' while bound to '${userSchoolId}'`,
            ipAddress: req.ip
        });
        res.status(403).json({ error: 'Access denied: Cross-tenant boundary violation' });
        return;
    }
    if (targetSchoolCode && userSchoolCode && targetSchoolCode.toUpperCase() !== userSchoolCode && targetSchoolCode.toUpperCase() !== 'GLOBAL') {
        (0, security_logger_1.logSecurityViolation)({
            userId: req.user.id,
            targetId: targetSchoolCode,
            resource: req.originalUrl,
            action: req.method,
            schoolId: userSchoolId || 'unknown',
            reason: `Cross-tenant violation: attempted to access schoolCode '${targetSchoolCode}' while bound to '${userSchoolCode}'`,
            ipAddress: req.ip
        });
        res.status(403).json({ error: 'Access denied: Cross-tenant boundary violation' });
        return;
    }
    next();
};
exports.enforceTenantIsolation = enforceTenantIsolation;
//# sourceMappingURL=tenant.js.map