import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
const router = Router();
// Get the logged in user's awards
router.get('/my', requireAuth, async (req, res) => {
    try {
        const awards = await prisma.award.findMany({
            where: {
                schoolId: req.user.schoolId,
                userId: req.user.id
            },
            orderBy: { date: 'desc' }
        });
        res.json(awards);
    }
    catch (error) {
        console.error('Error fetching awards:', error);
        res.status(500).json({ error: 'Failed to fetch awards' });
    }
});
// Admin/Teacher/Ancillary endpoint to give an award
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER', 'ANCILLARY'), async (req, res) => {
    try {
        const { userId, awardName, gift, amount, date } = req.body;
        if (!userId || !awardName || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const award = await prisma.award.create({
            data: {
                schoolId: req.user.schoolId,
                userId,
                awardName,
                gift: gift || '',
                amount: amount || 0,
                date: new Date(date)
            }
        });
        res.json(award);
    }
    catch (error) {
        console.error('Error creating award:', error);
        res.status(500).json({ error: 'Failed to create award' });
    }
});
export default router;
//# sourceMappingURL=awards.js.map