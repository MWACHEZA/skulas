"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get lesson plan breakdowns
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { classId, subjectId, week, session } = req.query;
        const lessonPlans = await prisma_1.default.lessonPlan.findMany({
            where: {
                schoolId: req.user.schoolId,
                ...(classId ? { classId: classId } : {}),
                ...(subjectId ? { subjectId: subjectId } : {}),
                ...(week ? { week: week } : {}),
                ...(session ? { session: session } : {})
            },
            include: {
                class: true,
                subject: true,
                syllabus: true
            },
            orderBy: { createdAt: 'asc' }
        });
        res.json(lessonPlans);
    }
    catch (error) {
        console.error('Error fetching lesson plans:', error);
        res.status(500).json({ error: 'Failed to fetch lesson plans' });
    }
});
// Create a lesson plan breakdown
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { classId, subjectId, syllabusId, week, session, content } = req.body;
        if (!classId || !subjectId || !syllabusId || !week || !session || !content) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        let teacherId = '';
        if (req.user.role === 'TEACHER') {
            const teacher = await prisma_1.default.teacher.findFirst({ where: { userId: req.user.id } });
            if (!teacher)
                return res.status(404).json({ error: 'Teacher record not found for this user' });
            teacherId = teacher.id;
        }
        else {
            const schoolClass = await prisma_1.default.schoolClass.findFirst({ where: { id: classId } });
            if (schoolClass && schoolClass.teacherId) {
                teacherId = schoolClass.teacherId;
            }
            else {
                const teacher = await prisma_1.default.teacher.findFirst({ where: { schoolId: req.user.schoolId } });
                if (!teacher)
                    return res.status(400).json({ error: 'No teachers found in the school to assign to this lesson plan.' });
                teacherId = teacher.id;
            }
        }
        const lessonPlan = await prisma_1.default.lessonPlan.create({
            data: {
                classId,
                subjectId,
                syllabusId,
                week,
                session,
                content,
                schoolId: req.user.schoolId,
                teacherId
            }
        });
        res.json({ success: true, lessonPlan });
    }
    catch (error) {
        console.error('Error creating lesson plan:', error);
        res.status(500).json({ error: 'Failed to create lesson plan breakdown' });
    }
});
// Update a lesson plan breakdown
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { classId, subjectId, syllabusId, week, session, content } = req.body;
        const schoolId = req.user.schoolId;
        const existing = await prisma_1.default.lessonPlan.findFirst({
            where: { id: id, schoolId }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Lesson plan not found' });
        }
        if (req.user.role === 'TEACHER') {
            const teacher = await prisma_1.default.teacher.findFirst({ where: { userId: req.user.id } });
            if (!teacher || existing.teacherId !== teacher.id) {
                return res.status(403).json({ error: 'You can only edit your own lesson plans' });
            }
        }
        const updated = await prisma_1.default.lessonPlan.update({
            where: { id: id },
            data: {
                ...(classId ? { classId } : {}),
                ...(subjectId ? { subjectId } : {}),
                ...(syllabusId ? { syllabusId } : {}),
                ...(week ? { week } : {}),
                ...(session ? { session } : {}),
                ...(content ? { content } : {})
            },
            include: {
                class: true,
                subject: true,
                syllabus: true
            }
        });
        res.json({ success: true, lessonPlan: updated });
    }
    catch (error) {
        console.error('Error updating lesson plan:', error);
        res.status(500).json({ error: 'Failed to update lesson plan breakdown' });
    }
});
// Delete a lesson plan breakdown
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const existing = await prisma_1.default.lessonPlan.findFirst({ where: { id: req.params.id } });
        if (!existing || existing.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Lesson plan not found' });
        }
        // Only admins or the teacher who created it can delete it
        if (req.user.role === 'TEACHER') {
            const teacher = await prisma_1.default.teacher.findFirst({ where: { userId: req.user.id } });
            if (!teacher || existing.teacherId !== teacher.id) {
                return res.status(403).json({ error: 'You can only delete your own lesson plans' });
            }
        }
        await prisma_1.default.lessonPlan.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting lesson plan:', error);
        res.status(500).json({ error: 'Failed to delete lesson plan' });
    }
});
exports.default = router;
//# sourceMappingURL=lesson-plan.js.map