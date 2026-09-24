import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const logAction = async (
  req: AuthRequest,
  action: string,
  entityType: string,
  entityId?: string,
  details?: any,
  status: 'SUCCESS' | 'WARNING' | 'ERROR' = 'SUCCESS',
  targetSchoolId?: string
) => {
  try {
    if (!req.user) return;

    const schoolId = targetSchoolId || req.user.schoolId || null;

    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        details: details || {},
        actorId: req.user.id,
        schoolId,
        status,
        ipAddress: req.ip || req.socket?.remoteAddress || 'Internal'
      }
    });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
};
