import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
const router = Router();
/**
 * @route   GET /api/grades/class/:classId
 * @desc    Get grades for all students in a class for a specific subject
 */
router.get('/class/:classId', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    const classId = req.params.classId;
    const { subjectId, term, year } = req.query;
    try {
        const grades = await prisma.grade.findMany({
            where: {
                student: { classId },
                subjectId: subjectId,
                term: term,
                year: parseInt(year)
            },
            include: {
                student: { select: { id: true, name: true, studentId: true } }
            }
        });
        res.json(grades);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch grades' });
    }
});
/**
 * @route   GET /api/grades/subject/:classId/:subjectId
 * @desc    Get students and their grades for a specific class subject
 */
router.get('/subject/:classId/:subjectId', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    const { classId, subjectId } = req.params;
    const { term, year } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const students = await prisma.student.findMany({
            where: { classId: String(classId), schoolId: String(schoolId) },
            include: {
                grades: {
                    where: {
                        subjectId: String(subjectId),
                        term: String(term),
                        year: parseInt(String(year))
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(students);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch subject grades' });
    }
});
/**
 * @route   POST /api/grades/bulk
 * @desc    Bulk save/update grades for a class
 */
router.post('/bulk', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    const { classId, subjectId, term, year, results } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const teacher = await prisma.teacher.findFirst({
            where: { userId: req.user.id, schoolId }
        });
        if (!teacher)
            return res.status(404).json({ error: 'Teacher record not found' });
        // Validate subject to get weights
        const subject = await prisma.subject.findFirst({
            where: { id: subjectId, schoolId }
        });
        if (!subject)
            return res.status(404).json({ error: 'Subject not found' });
        const operations = results.map((res) => {
            // Calculate total score based on weights
            let totalScore = 0;
            if (subject.isIndustrial) {
                const ind = res.industrialScores || {};
                const ca = ((ind.industrialSup || 0) + (ind.academicSup || 0)) / 2;
                totalScore = (ca * 0.5) + ((ind.report || 0) * 0.4) + ((ind.oral || 0) * 0.1);
            }
            else {
                const caScore = res.caScore || 0;
                const examScore = res.examScore || 0;
                const caWeight = subject.caWeight || 30;
                const examWeight = subject.examWeight || 70;
                totalScore = (caScore * (caWeight / 100)) + (examScore * (examWeight / 100));
            }
            // Determine division/grade (simplified standard logic)
            let division = 'Fail';
            if (totalScore >= 75)
                division = 'A';
            else if (totalScore >= 65)
                division = 'B';
            else if (totalScore >= 50)
                division = 'C';
            else if (totalScore >= 40)
                division = 'D';
            return prisma.grade.upsert({
                where: {
                    schoolId_studentId_subjectId_term_year: {
                        schoolId,
                        studentId: res.studentId,
                        subjectId,
                        term,
                        year: parseInt(year)
                    }
                },
                update: {
                    score: totalScore,
                    grade: division,
                    caScore: parseFloat(res.caScore) || 0,
                    examScore: parseFloat(res.examScore) || 0,
                    comment: res.comment,
                    teacherId: teacher.id
                },
                create: {
                    studentId: res.studentId,
                    subjectId,
                    term,
                    year: parseInt(year),
                    score: totalScore,
                    grade: division,
                    caScore: parseFloat(res.caScore) || 0,
                    examScore: parseFloat(res.examScore) || 0,
                    comment: res.comment,
                    teacherId: teacher.id,
                    schoolId
                }
            });
        });
        await prisma.$transaction(operations);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Bulk grade save error:', error);
        res.status(500).json({ error: 'Failed to save grades: ' + error.message });
    }
});
export default router;
//# sourceMappingURL=grades.js.map