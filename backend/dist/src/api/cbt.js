"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all CBT exams for a school
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const exams = await prisma_1.default.cBTExam.findMany({
            where: { schoolId: req.user.schoolId },
            include: {
                class: true,
                section: true,
                subject: true,
                _count: {
                    select: { questions: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(exams);
    }
    catch (error) {
        console.error('Error fetching CBT exams:', error);
        res.status(500).json({ error: 'Failed to fetch exams' });
    }
});
// Create a new CBT exam
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { title, description, instructions, date, time, passingPercent, classId, sectionId, subjectId } = req.body;
        const exam = await prisma_1.default.cBTExam.create({
            data: {
                title,
                description,
                instructions,
                date: new Date(date),
                time,
                passingPercent: Number(passingPercent),
                classId,
                sectionId,
                subjectId,
                schoolId: req.user.schoolId,
                teacherId: req.user.staffId
            }
        });
        res.json({ success: true, exam });
    }
    catch (error) {
        console.error('Error creating CBT exam:', error);
        res.status(500).json({ error: 'Failed to create exam' });
    }
});
// Get a specific exam with questions
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const exam = await prisma_1.default.cBTExam.findFirst({
            where: { id: req.params.id },
            include: {
                class: true,
                section: true,
                subject: true,
                school: true,
                questions: {
                    orderBy: [
                        { page: 'asc' },
                        { section: 'asc' },
                        { createdAt: 'asc' }
                    ]
                }
            }
        });
        if (!exam || exam.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        res.json(exam);
    }
    catch (error) {
        console.error('Error fetching CBT exam:', error);
        res.status(500).json({ error: 'Failed to fetch exam' });
    }
});
// Update exam status (Publish)
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { status, title, description, instructions, date, time, passingPercent, classId, sectionId, subjectId } = req.body;
        // First verify ownership or admin
        const existing = await prisma_1.default.cBTExam.findFirst({ where: { id: req.params.id } });
        if (!existing || existing.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        const data = {};
        if (status !== undefined)
            data.status = status;
        if (title !== undefined)
            data.title = title;
        if (description !== undefined)
            data.description = description;
        if (instructions !== undefined)
            data.instructions = instructions;
        if (date !== undefined)
            data.date = new Date(date);
        if (time !== undefined)
            data.time = time;
        if (passingPercent !== undefined)
            data.passingPercent = Number(passingPercent);
        if (classId !== undefined)
            data.classId = classId;
        if (sectionId !== undefined)
            data.sectionId = sectionId;
        if (subjectId !== undefined)
            data.subjectId = subjectId;
        const exam = await prisma_1.default.cBTExam.update({
            where: { id: req.params.id },
            data
        });
        res.json({ success: true, exam });
    }
    catch (error) {
        console.error('Error updating CBT exam:', error);
        res.status(500).json({ error: 'Failed to update exam' });
    }
});
// Delete an exam
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const existing = await prisma_1.default.cBTExam.findFirst({ where: { id: req.params.id } });
        if (!existing || existing.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        await prisma_1.default.cBTExam.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting exam:', error);
        res.status(500).json({ error: 'Failed to delete exam' });
    }
});
// Add a question to an exam
router.post('/:id/questions', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const examId = req.params.id;
        const { type, mark, question, options, answer, section, page } = req.body;
        const exam = await prisma_1.default.cBTExam.findFirst({ where: { id: examId } });
        if (!exam || exam.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        const newQuestion = await prisma_1.default.cBTQuestion.create({
            data: {
                examId,
                type,
                mark: Number(mark),
                question,
                options: options || [],
                answer,
                section: section || null,
                page: page ? Number(page) : 1
            }
        });
        // Update total marks of the exam
        await prisma_1.default.cBTExam.update({
            where: { id: examId },
            data: {
                totalMarks: { increment: Number(mark) }
            }
        });
        res.json({ success: true, question: newQuestion });
    }
    catch (error) {
        console.error('Error adding question:', error);
        res.status(500).json({ error: 'Failed to add question' });
    }
});
// Delete a question
router.delete('/:examId/questions/:questionId', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const examId = req.params.examId;
        const questionId = req.params.questionId;
        const exam = await prisma_1.default.cBTExam.findFirst({ where: { id: examId } });
        if (!exam || exam.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        const question = await prisma_1.default.cBTQuestion.findUnique({ where: { id: questionId } });
        if (!question || question.examId !== examId) {
            return res.status(404).json({ error: 'Question not found' });
        }
        await prisma_1.default.cBTQuestion.delete({ where: { id: questionId } });
        // Update total marks of the exam
        await prisma_1.default.cBTExam.update({
            where: { id: examId },
            data: {
                totalMarks: { decrement: question.mark }
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ error: 'Failed to delete question' });
    }
});
// Submit an exam (Auto-grade)
router.post('/:id/submit', auth_1.requireAuth, async (req, res) => {
    try {
        const examId = req.params.id;
        const { responses } = req.body;
        const existingResult = await prisma_1.default.cBTResult.findUnique({
            where: { examId_studentId: { examId, studentId: req.user.id } }
        });
        if (existingResult) {
            return res.status(400).json({ error: 'You have already submitted this exam.' });
        }
        const exam = await prisma_1.default.cBTExam.findUnique({
            where: { id: examId },
            include: { questions: true }
        });
        if (!exam || exam.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        let score = 0;
        const totalMarks = exam.totalMarks;
        exam.questions.forEach((q) => {
            const studentAns = responses[q.id];
            const correctAns = q.answer;
            if (studentAns === undefined || studentAns === null)
                return;
            if (q.type === 'Single choice') {
                if (studentAns === correctAns)
                    score += q.mark;
            }
            else if (q.type === 'Multiple choice') {
                if (Array.isArray(studentAns) && Array.isArray(correctAns)) {
                    const isCorrect = studentAns.length === correctAns.length &&
                        studentAns.every(val => correctAns.includes(val));
                    if (isCorrect)
                        score += q.mark;
                }
            }
            else if (q.type === 'True or false') {
                if (studentAns === correctAns)
                    score += q.mark;
            }
            else if (q.type === 'Fill in the blanks') {
                if (typeof studentAns === 'string' && typeof correctAns === 'string') {
                    if (studentAns.trim().toLowerCase() === correctAns.trim().toLowerCase()) {
                        score += q.mark;
                    }
                }
            }
        });
        const percent = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
        const status = percent >= exam.passingPercent ? 'Pass' : 'Fail';
        const result = await prisma_1.default.cBTResult.create({
            data: {
                examId,
                studentId: req.user.id,
                score,
                totalMarks,
                status,
                responses
            }
        });
        res.json({ success: true, result });
    }
    catch (error) {
        console.error('Error submitting exam:', error);
        res.status(500).json({ error: 'Failed to submit exam' });
    }
});
// Get all results for an exam
router.get('/:id/results', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const examId = req.params.id;
        const exam = await prisma_1.default.cBTExam.findUnique({ where: { id: examId } });
        if (!exam || exam.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        const results = await prisma_1.default.cBTResult.findMany({
            where: { examId },
            orderBy: { createdAt: 'desc' }
        });
        const studentIds = results.map(r => r.studentId);
        // In skulas, a logged-in student uses User model. Sometimes User.student is linked. Let's fetch Users.
        const users = await prisma_1.default.user.findMany({
            where: { id: { in: studentIds } },
            include: { student: { include: { class: true } } }
        });
        const userMap = new Map();
        users.forEach(u => userMap.set(u.id, u));
        const enrichedResults = results.map(r => {
            const u = userMap.get(r.studentId);
            return {
                ...r,
                student: u ? {
                    firstName: u.firstName,
                    lastName: u.lastName,
                    class: u.student?.class ? { name: u.student.class.name } : null
                } : null
            };
        });
        res.json(enrichedResults);
    }
    catch (error) {
        console.error('Error fetching exam results:', error);
        res.status(500).json({ error: 'Failed to fetch exam results' });
    }
});
// Remark a student's result
router.put('/results/:resultId', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const resultId = req.params.resultId;
        const { score, status } = req.body;
        const result = await prisma_1.default.cBTResult.findUnique({
            where: { id: resultId },
            include: { exam: true }
        });
        if (!result || result.exam.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Result not found' });
        }
        const updated = await prisma_1.default.cBTResult.update({
            where: { id: resultId },
            data: { score: Number(score), status }
        });
        res.json({ success: true, result: updated });
    }
    catch (error) {
        console.error('Error updating exam result:', error);
        res.status(500).json({ error: 'Failed to update result' });
    }
});
exports.default = router;
//# sourceMappingURL=cbt.js.map