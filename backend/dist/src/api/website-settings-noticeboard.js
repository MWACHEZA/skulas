import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import prisma from '../lib/prisma';
const router = express.Router();
router.get('/', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'STUDENT', 'TEACHER', 'PARENT'), async (req, res) => {
    try {
        const noticeboards = await prisma.noticeboard.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { date: 'desc' }
        });
        res.json(noticeboards);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch noticeboard' });
    }
});
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { title, content, date } = req.body;
        const noticeboard = await prisma.noticeboard.create({
            data: {
                title,
                content,
                date: new Date(date),
                schoolId: req.user.schoolId
            }
        });
        res.json(noticeboard);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create noticeboard event' });
    }
});
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma.noticeboard.delete({
            where: {
                id: req.params.id,
                schoolId: req.user.schoolId
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete noticeboard event' });
    }
});
export default router;
//# sourceMappingURL=website-settings-noticeboard.js.map