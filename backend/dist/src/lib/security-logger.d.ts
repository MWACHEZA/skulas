/**
 * Log unauthorized access attempts (BOLA/IDOR) to the database audit log
 */
export declare const logSecurityViolation: (details: {
    userId: string;
    targetId: string;
    resource: string;
    action: string;
    schoolId: string;
    reason: string;
    ipAddress?: string;
}) => Promise<void>;
/**
 * Log standard security and audit events
 */
export declare const logSecurityEvent: (params: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: any;
    schoolId: string;
    ipAddress?: string;
}) => Promise<void>;
