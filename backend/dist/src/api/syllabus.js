"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get syllabus items (Scheme of Work)
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { classId, subjectId } = req.query;
        const syllabuses = await prisma_1.default.syllabus.findMany({
            where: {
                schoolId: req.user.schoolId,
                ...(classId ? { classId: classId } : {}),
                ...(subjectId ? { subjectId: subjectId } : {})
            },
            include: {
                class: true,
                subject: true
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(syllabuses);
    }
    catch (error) {
        console.error('Error fetching syllabus:', error);
        res.status(500).json({ error: 'Failed to fetch syllabus' });
    }
});
// Create a syllabus item
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { classId, subjectId, topic, content, week } = req.body;
        if (!classId || !subjectId || !topic || !content || !week) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const syllabus = await prisma_1.default.syllabus.create({
            data: {
                classId,
                subjectId,
                topic,
                content,
                week,
                schoolId: req.user.schoolId
            }
        });
        res.json({ success: true, syllabus });
    }
    catch (error) {
        console.error('Error creating syllabus:', error);
        res.status(500).json({ error: 'Failed to create syllabus item' });
    }
});
// Bulk create syllabus items (Weeks -> Topic + Content)
router.post('/bulk', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { classId, subjectId, weeks } = req.body;
        const schoolId = req.user.schoolId;
        if (!classId || !subjectId || !Array.isArray(weeks) || weeks.length === 0) {
            return res.status(400).json({ error: 'Class, subject, and at least one week entry are required' });
        }
        // Filter valid week items with topic & content
        const validWeeks = weeks.filter(w => w.week && (w.topic || w.content));
        if (validWeeks.length === 0) {
            return res.status(400).json({ error: 'Please provide topic and content for the defined weeks' });
        }
        const created = await prisma_1.default.$transaction(validWeeks.map(w => prisma_1.default.syllabus.create({
            data: {
                classId,
                subjectId,
                week: w.week,
                topic: w.topic || 'Untitled Topic',
                content: w.content || '',
                schoolId
            }
        })));
        res.json({ success: true, count: created.length, syllabuses: created });
    }
    catch (error) {
        console.error('Error bulk creating syllabus:', error);
        res.status(500).json({ error: 'Failed to bulk create syllabus items' });
    }
});
// Update a syllabus item
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { topic, content, week } = req.body;
        const schoolId = req.user.schoolId;
        const existing = await prisma_1.default.syllabus.findFirst({
            where: { id: id, schoolId }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Syllabus item not found' });
        }
        const updated = await prisma_1.default.syllabus.update({
            where: { id: id },
            data: {
                topic: topic !== undefined ? topic : existing.topic,
                content: content !== undefined ? content : existing.content,
                week: week !== undefined ? week : existing.week
            }
        });
        res.json({ success: true, syllabus: updated });
    }
    catch (error) {
        console.error('Error updating syllabus:', error);
        res.status(500).json({ error: 'Failed to update syllabus item' });
    }
});
// Delete a syllabus item
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const existing = await prisma_1.default.syllabus.findFirst({ where: { id: req.params.id } });
        if (!existing || existing.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Syllabus item not found' });
        }
        await prisma_1.default.syllabus.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting syllabus:', error);
        res.status(500).json({ error: 'Failed to delete syllabus item' });
    }
});
exports.default = router;
//# sourceMappingURL=syllabus.js.map