import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/audit
 * @desc    Get system audit logs for the current school
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { schoolId: req.user!.schoolId! },
      include: {
        actor: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * @route   GET /api/audit/platform
 * @desc    [SUPER_ADMIN] Get platform-level and multi-tenant audit logs
 */
router.get('/platform', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, limit } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status).toUpperCase();
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
        { actor: { name: { contains: q, mode: 'insensitive' } } },
        { school: { name: { contains: q, mode: 'insensitive' } } },
        { school: { code: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const takeLimit = limit ? Math.min(parseInt(String(limit)), 500) : 200;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { name: true, email: true, role: true } },
        school: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: takeLimit
    });

    const formatted = logs.map(l => ({
      id: l.id,
      timestamp: l.createdAt.toISOString().replace('T', ' ').substring(0, 19),
      event: l.action.replace(/_/g, ' '),
      rawAction: l.action,
      entityType: l.entityType,
      actor: l.actor ? `${l.actor.name} (${l.actor.role})` : 'Platform System',
      ipAddress: l.ipAddress || 'Internal',
      targetSchool: l.school ? l.school.code : 'GLOBAL',
      schoolName: l.school?.name,
      status: (l.status || 'SUCCESS').toUpperCase() as 'SUCCESS' | 'WARNING' | 'ERROR',
      details: l.details
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch platform logs error:', err);
    res.status(500).json({ error: 'Failed to fetch platform audit logs' });
  }
});

export default router;
