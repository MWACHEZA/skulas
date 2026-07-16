import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
const router = Router();
// Get the logged in user's leave applications
router.get('/my', requireAuth, async (req, res) => {
    try {
        const leaves = await prisma.staffLeave.findMany({
            where: {
                schoolId: req.user.schoolId,
                userId: req.user.id
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(leaves);
    }
    catch (error) {
        console.error('Error fetching leaves:', error);
        res.status(500).json({ error: 'Failed to fetch leave applications' });
    }
});
// Submit a new leave application
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    try {
        const { startDate, endDate, reason } = req.body;
        if (!startDate || !endDate || !reason) {
            return res.status(400).json({ error: 'Start date, end date, and reason are required' });
        }
        const leave = await prisma.staffLeave.create({
            data: {
                schoolId: req.user.schoolId,
                userId: req.user.id,
                leaveType: 'annual', // default, can be expanded later
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                status: 'Pending'
            }
        });
        res.json(leave);
    }
    catch (error) {
        console.error('Error submitting leave application:', error);
        res.status(500).json({ error: 'Failed to submit leave application' });
    }
});
export default router;
//# sourceMappingURL=leave.js.map