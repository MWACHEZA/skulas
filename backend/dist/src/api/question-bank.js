"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/questions', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user?.schoolId;
    try {
        const questions = await prisma_1.default.question.findMany({
            where: schoolId ? { schoolId } : undefined,
            include: {
                subject: { select: { id: true, name: true, code: true } },
                createdBy: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(questions);
    }
    catch (error) {
        console.error('Failed to fetch questions:', error);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
});
router.post('/questions', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user?.schoolId || req.body.schoolId;
    const createdById = req.user?.id || req.body.createdById;
    if (!schoolId || !createdById) {
        return res.status(400).json({ error: 'Authentication required' });
    }
    try {
        let { type, text, form, subjectId, syllabusTopicId, difficulty, marks, options, explanation, isShared } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Question text is required' });
        }
        if (!subjectId) {
            const firstSubject = await prisma_1.default.subject.findFirst({ where: { schoolId } });
            if (firstSubject) {
                subjectId = firstSubject.id;
            }
            else {
                return res.status(400).json({ error: 'Subject is required. Please create a subject first.' });
            }
        }
        const question = await prisma_1.default.question.create({
            data: {
                type: type || 'MULTIPLE_CHOICE',
                text,
                form: form || null,
                subjectId,
                syllabusTopicId: syllabusTopicId || null,
                difficulty: difficulty || 'MEDIUM',
                marks: marks ? parseFloat(marks) : 1,
                options: options || null,
                explanation: explanation || null,
                isShared: Boolean(isShared),
                schoolId,
                createdById
            },
            include: {
                subject: { select: { id: true, name: true, code: true } }
            }
        });
        res.status(201).json(question);
    }
    catch (error) {
        console.error('Failed to create question:', error);
        res.status(500).json({ error: 'Failed to create question' });
    }
});
router.get('/papers', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user?.schoolId;
    try {
        const papers = await prisma_1.default.questionPaper.findMany({
            where: schoolId ? { schoolId } : undefined,
            include: {
                subject: { select: { id: true, name: true, code: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(papers);
    }
    catch (error) {
        console.error('Failed to fetch papers:', error);
        res.status(500).json({ error: 'Failed to fetch papers' });
    }
});
router.post('/papers', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user?.schoolId || req.body.schoolId;
    if (!schoolId) {
        return res.status(400).json({ error: 'School ID missing from user session' });
    }
    try {
        let { title, totalMarks, sections, subjectId, duration, description, instructions } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Paper title is required' });
        }
        if (!subjectId) {
            const firstSubject = await prisma_1.default.subject.findFirst({ where: { schoolId } });
            if (firstSubject) {
                subjectId = firstSubject.id;
            }
            else {
                return res.status(400).json({ error: 'Subject is required. Please create a subject first.' });
            }
        }
        const paper = await prisma_1.default.questionPaper.create({
            data: {
                title,
                description: description || null,
                instructions: instructions || null,
                duration: duration ? parseInt(duration) : 60,
                totalMarks: totalMarks ? parseInt(totalMarks) : 100,
                schoolId,
                subjectId,
                sections: sections || []
            },
            include: {
                subject: { select: { id: true, name: true, code: true } }
            }
        });
        res.status(201).json(paper);
    }
    catch (error) {
        console.error('Failed to create paper:', error);
        res.status(500).json({ error: 'Failed to create paper' });
    }
});
router.post('/papers/:id/convert-to-cbt', auth_1.requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const paper = await prisma_1.default.questionPaper.findUnique({
            where: { id }
        });
        if (!paper) {
            return res.status(404).json({ error: 'Paper not found' });
        }
        const { classId, startTime, endTime, durationMinutes, passingPercentage } = req.body;
        const cbt = await prisma_1.default.cbtExam.create({
            data: {
                title: paper.title,
                classId: classId || null,
                subjectId: paper.subjectId,
                description: paper.description,
                instructions: paper.instructions,
                startTime: startTime ? new Date(startTime) : null,
                endTime: endTime ? new Date(endTime) : null,
                durationMinutes: durationMinutes || paper.duration || 60,
                passingPercentage: passingPercentage || 50,
                createdById: req.user?.id || '',
                schoolId: paper.schoolId,
                status: 'Pending',
                questions: paper.sections || []
            }
        });
        res.json(cbt);
    }
    catch (error) {
        console.error('Failed to convert to CBT:', error);
        res.status(500).json({ error: 'Failed to convert to CBT' });
    }
});
exports.default = router;
//# sourceMappingURL=question-bank.js.map