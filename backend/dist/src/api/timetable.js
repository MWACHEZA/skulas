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
 * @route   GET /api/timetable/class/:classId
 * @desc    Get published timetable for a specific class
 */
router.get('/class/:classId', auth_1.requireAuth, async (req, res) => {
    const { classId } = req.params;
    const schoolId = req.user.schoolId;
    try {
        const slots = await prisma_1.default.timetableSlot.findMany({
            where: {
                classId: classId,
                schoolId,
                // Show even if not published if the user is admin/teacher
                ...(req.user.role === 'STUDENT' ? { isPublished: true } : {})
            },
            include: {
                subject: { select: { name: true, code: true } }
            }
        });
        res.json(slots);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch class timetable' });
    }
});
/**
 * @route   GET /api/timetable/my
 * @desc    Get personalized timetable for current student, teacher, or parent (for a child)
 */
router.get('/my', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    const userId = req.user.id;
    const role = req.user.role;
    const { studentId: requestedStudentId } = req.query;
    try {
        if (role === 'STUDENT') {
            const student = await prisma_1.default.student.findFirst({ where: { userId } });
            if (!student || !student.classId)
                return res.json([]);
            const slots = await prisma_1.default.timetableSlot.findMany({
                where: { classId: student.classId, isPublished: true, schoolId },
                include: { subject: { select: { name: true, code: true } } }
            });
            return res.json(slots);
        }
        if (role === 'PARENT') {
            if (!requestedStudentId) {
                return res.status(400).json({ error: 'studentId is required for parents' });
            }
            // Security: Verify parent-student linkage
            const parent = await prisma_1.default.parent.findUnique({ where: { userId } });
            if (!parent)
                return res.status(404).json({ error: 'Parent record not found' });
            const link = await prisma_1.default.parentStudent.findFirst({
                where: { parentId: parent.id, studentId: requestedStudentId }
            });
            if (!link) {
                return res.status(403).json({ error: 'Access denied. You are not linked to this student.' });
            }
            // Fetch student's class
            const student = await prisma_1.default.student.findFirst({
                where: { id: requestedStudentId },
                select: { classId: true }
            });
            if (!student || !student.classId)
                return res.json([]);
            const slots = await prisma_1.default.timetableSlot.findMany({
                where: { classId: student.classId, isPublished: true }, // Timetables are school-agnostic in the query if classId is unique
                include: { subject: { select: { name: true, code: true } } }
            });
            return res.json(slots);
        }
        if (role === 'TEACHER') {
            const teacher = await prisma_1.default.teacher.findFirst({ where: { userId } });
            if (!teacher)
                return res.json([]);
            // In this system, teachers are assigned to slots via class teacher assignment 
            // or we can assume for now they want to see all classes where their subjects are taught
            // For precision, let's allow finding slots where the subject belongs to the teacher
            const teacherSubjects = await prisma_1.default.teacherSubject.findMany({
                where: { teacherId: teacher.id },
                select: { subjectId: true }
            });
            const subjectIds = teacherSubjects.map(ts => ts.subjectId);
            const slots = await prisma_1.default.timetableSlot.findMany({
                where: { subjectId: { in: subjectIds }, schoolId },
                include: {
                    subject: { select: { name: true, code: true } },
                    class: { select: { name: true } }
                }
            });
            return res.json(slots);
        }
        res.json([]);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch personalized timetable' });
    }
});
/**
 * @route   POST /api/timetable/save
 * @desc    Bulk save timetable slots for a class
 */
router.post('/save', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { classId, slots, term, year } = req.body;
    const schoolId = req.user.schoolId;
    try {
        await prisma_1.default.$transaction([
            // Delete existing slots for this class/term/year to prevent duplication
            prisma_1.default.timetableSlot.deleteMany({
                where: { classId, term, year, schoolId }
            }),
            // Create new slots
            prisma_1.default.timetableSlot.createMany({
                data: slots.map((s) => ({
                    ...s,
                    classId,
                    schoolId,
                    term,
                    year: parseInt(year)
                }))
            })
        ]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Timetable Save Error:', error);
        res.status(500).json({ error: 'Failed to save timetable' });
    }
});
/**
 * @route   POST /api/timetable/publish
 * @desc    Toggle published status for a specific timetable
 */
router.post('/publish', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { classId, term, year, isPublished } = req.body;
    const schoolId = req.user.schoolId;
    try {
        // Verify slots exist first
        const count = await prisma_1.default.timetableSlot.count({
            where: { classId, term, year, schoolId }
        });
        if (count === 0 && isPublished) {
            return res.status(400).json({
                error: 'Cannot publish an empty timetable. Please add and save slots first.'
            });
        }
        await prisma_1.default.timetableSlot.updateMany({
            where: { classId, term, year, schoolId },
            data: { isPublished }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to publish timetable' });
    }
});
exports.default = router;
//# sourceMappingURL=timetable.js.map