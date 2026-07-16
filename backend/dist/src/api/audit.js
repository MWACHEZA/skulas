import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
const router = Router();
/**
 * @route   GET /api/audit
 * @desc    Get system audit logs for the current school
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            where: { schoolId: req.user.schoolId },
            include: {
                actor: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to last 100 logs for performance
        });
        res.json(logs);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});
export default router;
//# sourceMappingURL=audit.js.map