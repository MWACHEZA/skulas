"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../generated/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/', async (req, res) => {
    try {
        const exams = await prisma.cbtExam.findMany({
            include: { subject: true, schoolClass: true }
        });
        res.json(exams);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch CBT exams' });
    }
});
router.post('/:id/attempts', async (req, res) => {
    try {
        const { id } = req.params;
        const { studentId } = req.body;
        const attempt = await prisma.cbtAttempt.create({
            data: {
                examId: id,
                studentId
            }
        });
        res.json(attempt);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to start attempt' });
    }
});
router.post('/:id/attempts/:attemptId/submit', async (req, res) => {
    try {
        const { attemptId } = req.params;
        const { score, isFlagged } = req.body;
        const attempt = await prisma.cbtAttempt.update({
            where: { id: attemptId },
            data: {
                submitTime: new Date(),
                score,
                isFlagged
            }
        });
        res.json(attempt);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to submit attempt' });
    }
});
router.post('/:id/push-marks', async (req, res) => {
    try {
        const { id } = req.params;
        const exam = await prisma.cbtExam.findUnique({
            where: { id },
            include: { attempts: true }
        });
        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        // Pseudo-logic to push marks to Grades (Assessment table equivalent)
        // Normally we map attempts to grades
        for (const attempt of exam.attempts) {
            if (attempt.score !== null) {
                await prisma.grade.create({
                    data: {
                        studentId: attempt.studentId,
                        subjectId: exam.subjectId,
                        score: attempt.score,
                        schoolId: exam.schoolId,
                        teacherId: exam.createdById,
                        term: 'Term 1', // Placeholder
                        year: new Date().getFullYear(),
                        grade: 'CBT'
                    }
                });
            }
        }
        res.json({ success: true, message: 'Marks pushed to grades successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to push marks' });
    }
});
exports.default = router;
//# sourceMappingURL=cbt.js.map