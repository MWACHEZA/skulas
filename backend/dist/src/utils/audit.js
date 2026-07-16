import prisma from '../lib/prisma';
export const logAction = async (req, action, entityType, entityId, details) => {
    try {
        if (!req.user || !req.user.schoolId)
            return;
        await prisma.auditLog.create({
            data: {
                action,
                entityType,
                entityId,
                details: details || {},
                actorId: req.user.id,
                schoolId: req.user.schoolId,
                ipAddress: req.ip || req.socket.remoteAddress
            }
        });
    }
    catch (err) {
        console.error('Audit Log Error:', err);
    }
};
//# sourceMappingURL=audit.js.map