import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';
const router = Router();
const GradingScaleSchema = z.array(z.object({
    id: z.string().optional(),
    grade: z.string().min(1),
    minScore: z.number().min(0).max(100),
    maxScore: z.number().min(0).max(100),
    status: z.string().min(1),
}));
/**
 * @route   GET /api/academic-tools/grading
 * @desc    Get the grading scale for the school
 */
router.get('/grading', requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const scale = await prisma.gradingScale.findMany({
            where: { schoolId },
            orderBy: { maxScore: 'desc' }
        });
        res.json(scale);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch grading scale' });
    }
});
/**
 * @route   POST /api/academic-tools/grading
 * @desc    Bulk save grading scale
 */
router.post('/grading', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = GradingScaleSchema.parse(req.body);
        // We use a transaction to clear old scales and insert new ones to keep it simple
        // but in a production app with history we might want to update.
        // For now, let's just delete and recreate to match the UI behavior.
        await prisma.$transaction([
            prisma.gradingScale.deleteMany({ where: { schoolId } }),
            prisma.gradingScale.createMany({
                data: validatedData.map(item => ({
                    grade: item.grade,
                    minScore: item.minScore,
                    maxScore: item.maxScore,
                    status: item.status,
                    schoolId
                }))
            })
        ]);
        const newScale = await prisma.gradingScale.findMany({
            where: { schoolId },
            orderBy: { maxScore: 'desc' }
        });
        res.json(newScale);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to save grading scale' });
    }
});
export default router;
//# sourceMappingURL=grading.js.map