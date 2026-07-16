import prisma from './prisma';
/**
 * Log unauthorized access attempts (BOLA/IDOR) to the database audit log
 */
export const logSecurityViolation = async (details) => {
    console.warn(`[SECURITY VIOLATION] User ${details.userId} attempted unauthorized ${details.action} on ${details.resource} (${details.targetId}). Reason: ${details.reason}`);
    try {
        // Record into the existing AuditLog model
        await prisma.auditLog.create({
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
/**
 * Log standard security and audit events
 */
export const logSecurityEvent = async (params) => {
    try {
        await prisma.auditLog.create({
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
//# sourceMappingURL=security-logger.js.map