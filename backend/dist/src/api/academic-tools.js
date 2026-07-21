"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const academic_schema_1 = require("../schemas/academic.schema");
const router = (0, express_1.Router)();
// ═══════════ QUESTION PAPERS ═══════════
/**
 * @route   GET /api/academic-tools/question-papers
 * @desc    Get all question papers for the school
 */
router.get('/question-papers', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const papers = await prisma_1.default.questionPaper.findMany({
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
 * @route   GET /api/academic-tools/question-papers/:id
 * @desc    Get a single question paper by ID
 */
router.get('/question-papers/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        const paper = await prisma_1.default.questionPaper.findUnique({
            where: { id: id, schoolId },
            include: {
                subject: { select: { id: true, name: true, code: true } },
                teacher: { select: { id: true, user: { select: { name: true } } } },
                school: { include: { websiteSettings: true } }
            }
        });
        if (!paper) {
            return res.status(404).json({ error: 'Question paper not found' });
        }
        res.json(paper);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch question paper' });
    }
});
/**
 * @route   POST /api/academic-tools/question-papers
 * @desc    Create a new question paper
 */
router.post('/question-papers', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = academic_schema_1.QuestionPaperSchema.parse(req.body);
        // Find teacher record for the current user
        const teacher = await prisma_1.default.teacher.findFirst({
            where: { userId: req.user.id, schoolId }
        });
        if (!teacher && req.user.role === 'TEACHER') {
            return res.status(400).json({ error: 'Teacher profile not found' });
        }
        const paper = await prisma_1.default.questionPaper.create({
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
router.put('/question-papers/:id', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        const validatedData = academic_schema_1.QuestionPaperSchema.parse(req.body);
        const paper = await prisma_1.default.questionPaper.update({
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
router.delete('/question-papers/:id', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        await prisma_1.default.questionPaper.deleteMany({ where: { id: id, schoolId } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete question paper' });
    }
});
exports.default = router;
//# sourceMappingURL=academic-tools.js.map