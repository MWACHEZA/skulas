"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/cbt
 * @desc    Fetch active and scheduled CBT exams for current student/school
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const isStudent = req.user.role === 'STUDENT';
        let studentClassId = null;
        let studentId = null;
        if (isStudent) {
            const student = await prisma_1.default.student.findFirst({
                where: { userId: req.user.id, schoolId }
            });
            if (student) {
                studentClassId = student.classId;
                studentId = student.id;
            }
        }
        // Query standard CBTExam table
        const exams = await prisma_1.default.cBTExam.findMany({
            where: {
                schoolId,
                ...(studentClassId ? {
                    OR: [
                        { classId: studentClassId },
                        { classId: null }
                    ]
                } : {})
            },
            include: {
                subject: { select: { id: true, name: true, code: true } },
                class: { select: { id: true, name: true } },
                _count: { select: { questions: true } }
            },
            orderBy: { date: 'desc' }
        });
        // If CBTExam is empty, also check fallback CbtExam (phase 6 schema)
        if (exams.length === 0) {
            const fallbackExams = await prisma_1.default.cbtExam.findMany({
                where: {
                    schoolId,
                    ...(studentClassId ? {
                        OR: [
                            { classId: studentClassId },
                            { classId: null }
                        ]
                    } : {})
                },
                include: {
                    subject: { select: { id: true, name: true, code: true } },
                    schoolClass: { select: { id: true, name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            const mappedFallback = fallbackExams.map(ex => {
                const qCount = Array.isArray(ex.questions) ? ex.questions.length : 0;
                return {
                    id: ex.id,
                    title: ex.title,
                    description: ex.description,
                    instruction: ex.instructions,
                    date: ex.startTime || ex.createdAt,
                    time: ex.startTime ? new Date(ex.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00',
                    duration: ex.durationMinutes || 60,
                    passingPercent: ex.passingPercentage || 50,
                    status: ex.status || 'Active',
                    subjectId: ex.subjectId,
                    subject: ex.subject,
                    classId: ex.classId,
                    class: ex.schoolClass,
                    _count: { questions: qCount },
                    questions: ex.questions || []
                };
            });
            return res.json(mappedFallback);
        }
        res.json(exams);
    }
    catch (error) {
        console.error('Failed to fetch CBT exams:', error);
        res.status(500).json({ error: 'Failed to fetch CBT exams' });
    }
});
/**
 * @route   GET /api/cbt/my-results
 * @desc    Fetch CBT test results for the current logged-in student
 */
router.get('/my-results', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const student = await prisma_1.default.student.findFirst({
            where: { userId: req.user.id, schoolId }
        });
        if (!student) {
            return res.json([]);
        }
        // 1. Fetch from CBTResult table
        const results = await prisma_1.default.cBTResult.findMany({
            where: { studentId: student.id },
            include: {
                exam: {
                    include: {
                        subject: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // 2. Fetch from fallback CbtAttempt table
        const attempts = await prisma_1.default.cbtAttempt.findMany({
            where: { studentId: student.id, submitTime: { not: null } },
            include: {
                exam: {
                    include: {
                        subject: { select: { name: true } }
                    }
                }
            },
            orderBy: { submitTime: 'desc' }
        });
        // Format consistent response
        const combined = [
            ...results.map(r => ({
                id: r.id,
                examId: r.examId,
                examTitle: r.exam?.title,
                subjectName: r.exam?.subject?.name,
                score: r.score,
                totalMarks: r.totalMarks,
                percentage: r.totalMarks > 0 ? Math.round((r.score / r.totalMarks) * 100) : 0,
                status: r.status,
                submittedAt: r.createdAt
            })),
            ...attempts
                .filter(a => !results.some(r => r.examId === a.examId))
                .map(a => {
                const pass = (a.score || 0) >= (a.exam.passingPercentage || 50);
                return {
                    id: a.id,
                    examId: a.examId,
                    examTitle: a.exam?.title,
                    subjectName: a.exam?.subject?.name,
                    score: a.score || 0,
                    totalMarks: 100,
                    percentage: a.score || 0,
                    status: pass ? 'Pass' : 'Fail',
                    submittedAt: a.submitTime
                };
            })
        ];
        res.json(combined);
    }
    catch (error) {
        console.error('Failed to fetch my CBT results:', error);
        res.json([]);
    }
});
/**
 * @route   GET /api/cbt/:id
 * @desc    Fetch exam details and questions for taking the test
 */
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const examId = String(req.params.id);
        // First try CBTExam table
        let exam = await prisma_1.default.cBTExam.findFirst({
            where: { id: examId, schoolId },
            include: {
                subject: { select: { name: true, code: true } },
                class: { select: { name: true } },
                questions: {
                    orderBy: [{ page: 'asc' }, { createdAt: 'asc' }],
                    select: {
                        id: true,
                        question: true,
                        type: true,
                        options: true,
                        mark: true,
                        section: true,
                        page: true
                        // omit answer for security!
                    }
                }
            }
        });
        if (exam) {
            return res.json(exam);
        }
        // Fallback: check CbtExam table
        const fallback = await prisma_1.default.cbtExam.findFirst({
            where: { id: examId, schoolId },
            include: {
                subject: { select: { name: true, code: true } },
                schoolClass: { select: { name: true } }
            }
        });
        if (!fallback) {
            return res.status(404).json({ error: 'CBT Exam not found' });
        }
        const rawQuestions = Array.isArray(fallback.questions) ? fallback.questions : [];
        const sanitizedQuestions = rawQuestions.map((q, idx) => ({
            id: q.id || `q-${idx}`,
            question: q.question || q.title,
            type: q.type || 'Single choice',
            options: q.options || [],
            mark: q.mark || 1,
            section: q.section || 'General',
            page: q.page || 1
        }));
        res.json({
            id: fallback.id,
            title: fallback.title,
            description: fallback.description,
            instruction: fallback.instructions,
            date: fallback.startTime || fallback.createdAt,
            time: '09:00',
            duration: fallback.durationMinutes || 60,
            passingPercent: fallback.passingPercentage || 50,
            subject: fallback.subject,
            class: fallback.schoolClass,
            questions: sanitizedQuestions
        });
    }
    catch (error) {
        console.error('Failed to load CBT exam:', error);
        res.status(500).json({ error: 'Failed to load exam details' });
    }
});
/**
 * @route   POST /api/cbt/:id/submit
 * @desc    Submit CBT responses, compute score, and record result
 */
router.post('/:id/submit', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const examId = String(req.params.id);
        const { responses } = req.body; // { [qId]: answer }
        const student = await prisma_1.default.student.findFirst({
            where: { userId: req.user.id, schoolId }
        });
        if (!student) {
            return res.status(403).json({ error: 'Only registered students can take CBT exams' });
        }
        // Check CBTExam model
        const exam = await prisma_1.default.cBTExam.findFirst({
            where: { id: examId, schoolId },
            include: { questions: true }
        });
        if (exam) {
            let totalMarks = 0;
            let earnedMarks = 0;
            const questions = exam.questions || [];
            for (const q of questions) {
                const mark = q.mark || 1;
                totalMarks += mark;
                const studentAns = responses ? responses[q.id] : undefined;
                if (studentAns !== undefined && studentAns !== null) {
                    const correctAns = q.answer;
                    const isCorrect = String(studentAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
                    if (isCorrect) {
                        earnedMarks += mark;
                    }
                }
            }
            totalMarks = totalMarks || 1;
            const scorePct = Math.round((earnedMarks / totalMarks) * 100);
            const isPass = scorePct >= (exam.passingPercent || 50);
            const status = isPass ? 'Pass' : 'Fail';
            // Record result
            const result = await prisma_1.default.cBTResult.upsert({
                where: {
                    examId_studentId: {
                        examId: examId,
                        studentId: student.id
                    }
                },
                create: {
                    examId: examId,
                    studentId: student.id,
                    score: earnedMarks,
                    totalMarks,
                    status,
                    responses
                },
                update: {
                    score: earnedMarks,
                    totalMarks,
                    status,
                    responses
                }
            });
            return res.json({
                success: true,
                score: earnedMarks,
                totalMarks,
                percentage: scorePct,
                status,
                resultId: result.id
            });
        }
        // Fallback: check CbtExam model
        const fallback = await prisma_1.default.cbtExam.findFirst({
            where: { id: examId, schoolId }
        });
        if (!fallback) {
            return res.status(404).json({ error: 'Exam not found' });
        }
        const rawQuestions = Array.isArray(fallback.questions) ? fallback.questions : [];
        let totalMarks = rawQuestions.length || 1;
        let earnedMarks = 0;
        rawQuestions.forEach((q, idx) => {
            const qId = q.id || `q-${idx}`;
            const studentAns = responses ? responses[qId] : undefined;
            if (studentAns && q.answer && String(studentAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase()) {
                earnedMarks += (q.mark || 1);
            }
        });
        const scorePct = Math.round((earnedMarks / totalMarks) * 100);
        const pass = scorePct >= (fallback.passingPercentage || 50);
        const attempt = await prisma_1.default.cbtAttempt.create({
            data: {
                examId: examId,
                studentId: student.id,
                submitTime: new Date(),
                score: scorePct
            }
        });
        res.json({
            success: true,
            score: earnedMarks,
            totalMarks,
            percentage: scorePct,
            status: pass ? 'Pass' : 'Fail',
            attemptId: attempt.id
        });
    }
    catch (error) {
        console.error('Failed to submit CBT exam:', error);
        res.status(500).json({ error: 'Failed to submit exam' });
    }
});
exports.default = router;
//# sourceMappingURL=cbt.js.map