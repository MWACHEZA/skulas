import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { QuestionPaperSchema } from '../schemas/academic.schema';
const router = Router();
// ═══════════ QUESTION PAPERS ═══════════
/**
 * @route   GET /api/academic-tools/question-papers
 * @desc    Get all question papers for the school
 */
router.get('/question-papers', requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const papers = await prisma.questionPaper.findMany({
            where: { schoolId },
            include: {
                subject: { select: { id: true, name: true, code: true } },
                teacher: {
                    select: {
                        id: true,
                        user: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Flatten teacher name for the frontend
        const flattenedPapers = papers.map(paper => ({
            ...paper,
            teacher: {
                id: paper.teacher?.id,
                name: paper.teacher?.user?.name || 'Academic Admin'
            }
        }));
        res.json(flattenedPapers);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch question papers' });
    }
});
/**
 * @route   POST /api/academic-tools/question-papers
 * @desc    Create a new question paper
 */
router.post('/question-papers', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = QuestionPaperSchema.parse(req.body);
        // Find teacher record for the current user
        const teacher = await prisma.teacher.findFirst({
            where: { userId: req.user.id, schoolId }
        });
        if (!teacher && req.user.role === 'TEACHER') {
            return res.status(400).json({ error: 'Teacher profile not found' });
        }
        const paper = await prisma.questionPaper.create({
            data: {
                ...validatedData,
                schoolId,
                teacherId: (teacher?.id || undefined) // Bypass out-of-sync types until generate is run
            }
        });
        res.status(201).json(paper);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to create question paper' });
    }
});
/**
 * @route   PUT /api/academic-tools/question-papers/:id
 * @desc    Full update of a question paper
 */
router.put('/question-papers/:id', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        const validatedData = QuestionPaperSchema.parse(req.body);
        const paper = await prisma.questionPaper.update({
            where: { id: id, schoolId },
            data: validatedData
        });
        res.json(paper);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to update question paper' });
    }
});
/**
 * @route   DELETE /api/academic-tools/question-papers/:id
 * @desc    Delete a question paper
 */
router.delete('/question-papers/:id', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        await prisma.questionPaper.deleteMany({ where: { id: id, schoolId } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete question paper' });
    }
});
export default router;
//# sourceMappingURL=academic-tools.js.map