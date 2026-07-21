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