"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSecurityEvent = exports.logSecurityViolation = void 0;
const prisma_1 = __importDefault(require("./prisma"));
/**
 * Log unauthorized access attempts (BOLA/IDOR) to the database audit log
 */
const logSecurityViolation = async (details) => {
    console.warn(`[SECURITY VIOLATION] User ${details.userId} attempted unauthorized ${details.action} on ${details.resource} (${details.targetId}). Reason: ${details.reason}`);
    try {
        // Record into the existing AuditLog model
        await prisma_1.default.auditLog.create({
            data: {
                actorId: details.userId,
                schoolId: details.schoolId,
                action: `SECURITY_VIOLATION_${details.action.toUpperCase()}`,
                entityType: 'Security',
                entityId: details.resource,
                details: {
                    targetId: details.targetId,
                    reason: details.reason,
                    severity: 'HIGH',
                    timestamp: new Date().toISOString()
                },
                ipAddress: details.ipAddress
            }
        });
    }
    catch (error) {
        console.error('Failed to write to security audit log:', error);
    }
};
exports.logSecurityViolation = logSecurityViolation;
/**
 * Log standard security and audit events
 */
const logSecurityEvent = async (params) => {
    try {
        await prisma_1.default.auditLog.create({
            data: {
                actorId: params.actorId,
                schoolId: params.schoolId,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                details: params.details || {},
                ipAddress: params.ipAddress
            }
        });
    }
    catch (error) {
        console.error('Failed to write to standard audit log:', error);
    }
};
exports.logSecurityEvent = logSecurityEvent;
//# sourceMappingURL=security-logger.js.map