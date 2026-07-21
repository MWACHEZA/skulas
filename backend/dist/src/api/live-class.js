"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get live classes
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { platform } = req.query;
        const where = { schoolId: req.user.schoolId };
        if (platform) {
            where.platform = platform;
        }
        // Teachers only see their own or classes for their students
        // For simplicity, teachers see what they created
        if (req.user.role === 'TEACHER') {
            where.teacherId = req.user.id;
        }
        const liveClasses = await prisma_1.default.liveClass.findMany({
            where,
            include: {
                class: true,
                teacher: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'desc' }
        });
        res.json(liveClasses);
    }
    catch (error) {
        console.error('Error fetching live classes:', error);
        res.status(500).json({ error: 'Failed to fetch live classes' });
    }
});
// Create live class
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { title, classId, section, platform, meetingId, meetingPassword, date, timeStart, timeEnd, remarks, sendSms } = req.body;
        if (!title || !classId || !meetingId || !date || !timeStart || !timeEnd) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const liveClass = await prisma_1.default.liveClass.create({
            data: {
                schoolId: req.user.schoolId,
                teacherId: req.user.id,
                classId,
                section,
                title,
                platform: platform || 'Zoom',
                meetingId,
                meetingPassword,
                date: new Date(date),
                timeStart,
                timeEnd,
                remarks,
                sendSms: !!sendSms
            },
            include: {
                class: true,
                teacher: { select: { name: true } }
            }
        });
        res.json(liveClass);
    }
    catch (error) {
        console.error('Error creating live class:', error);
        res.status(500).json({ error: 'Failed to create live class' });
    }
});
// Delete live class
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        // Check if it belongs to the user or is admin
        const existing = await prisma_1.default.liveClass.findFirst({ where: { id: id } });
        if (!existing || existing.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Not found' });
        }
        if (req.user.role === 'TEACHER' && existing.teacherId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to delete this class' });
        }
        await prisma_1.default.liveClass.delete({ where: { id: id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting live class:', error);
        res.status(500).json({ error: 'Failed to delete live class' });
    }
});
exports.default = router;
//# sourceMappingURL=live-class.js.map