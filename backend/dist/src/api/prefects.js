"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../utils/audit");
const router = (0, express_1.Router)();
// All prefect council routes require authentication
router.use(auth_1.requireAuth);
/**
 * Helper to check if user has leadership council rights (modify duties/meetings)
 */
const canManageCouncil = (user) => {
    return user.role === 'SCHOOL_ADMIN' ||
        user.secondaryRoles.includes('Head Boy') ||
        user.secondaryRoles.includes('Head Girl') ||
        user.secondaryRoles.includes('Vice Head Boy') ||
        user.secondaryRoles.includes('Vice Head Girl') ||
        user.secondaryRoles.includes('Senior Prefect') ||
        user.secondaryRoles.includes('Senior Teacher');
};
/**
 * Helper to check if user can view student conduct reports
 */
const canViewConductReports = (user) => {
    return user.role === 'SCHOOL_ADMIN' ||
        user.secondaryRoles.includes('Senior Teacher');
};
/**
 * Helper to check if user is allowed to file conduct reports
 */
const canFileConductReport = (user) => {
    return user.role === 'SCHOOL_ADMIN' ||
        user.secondaryRoles.includes('Prefect') ||
        user.secondaryRoles.includes('Head Boy') ||
        user.secondaryRoles.includes('Head Girl') ||
        user.secondaryRoles.includes('Vice Head Boy') ||
        user.secondaryRoles.includes('Vice Head Girl') ||
        user.secondaryRoles.includes('Senior Prefect') ||
        user.secondaryRoles.includes('Class Monitor') ||
        user.secondaryRoles.includes('Student Librarian');
};
// ── DUTY ASSIGNMENTS ──
/**
 * @route   GET /api/prefects/duties
 * @desc    Fetch scheduled duty assignments
 */
router.get('/duties', async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const duties = await prisma_1.default.prefectDuty.findMany({
            where: { schoolId },
            orderBy: { day: 'asc' }
        });
        res.json(duties);
    }
    catch (error) {
        console.error('Fetch duties error:', error);
        res.status(500).json({ error: 'Failed to fetch duty assignments' });
    }
});
/**
 * @route   POST /api/prefects/duties
 * @desc    Create a new duty assignment
 */
router.post('/duties', async (req, res) => {
    if (!canManageCouncil(req.user)) {
        return res.status(403).json({ error: 'Unauthorized to manage duty assignments' });
    }
    const { prefectName, zone, timeSlot, day } = req.body;
    if (!prefectName || !zone || !timeSlot || !day) {
        return res.status(400).json({ error: 'Missing required duty fields' });
    }
    const schoolId = req.user.schoolId;
    try {
        const duty = await prisma_1.default.prefectDuty.create({
            data: { prefectName, zone, timeSlot, day, schoolId }
        });
        await (0, audit_1.logAction)(req, 'CREATE_DUTY_ASSIGNMENT', 'PrefectDuty', duty.id, { prefectName, zone });
        res.json(duty);
    }
    catch (error) {
        console.error('Create duty error:', error);
        res.status(500).json({ error: 'Failed to create duty assignment' });
    }
});
// ── COUNCIL MEETINGS ──
/**
 * @route   GET /api/prefects/meetings
 * @desc    Fetch scheduled council meetings
 */
router.get('/meetings', async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const meetings = await prisma_1.default.prefectMeeting.findMany({
            where: { schoolId },
            orderBy: { date: 'desc' }
        });
        res.json(meetings);
    }
    catch (error) {
        console.error('Fetch meetings error:', error);
        res.status(500).json({ error: 'Failed to fetch council meetings' });
    }
});
/**
 * @route   POST /api/prefects/meetings
 * @desc    Record new council meeting minutes
 */
router.post('/meetings', async (req, res) => {
    if (!canManageCouncil(req.user)) {
        return res.status(403).json({ error: 'Unauthorized to publish meeting minutes' });
    }
    const { title, date, chair, recordsText } = req.body;
    if (!title || !date || !chair || !recordsText) {
        return res.status(400).json({ error: 'Missing required meeting fields' });
    }
    const schoolId = req.user.schoolId;
    try {
        const meeting = await prisma_1.default.prefectMeeting.create({
            data: {
                title,
                date: new Date(date),
                chair,
                recordsText,
                schoolId
            }
        });
        await (0, audit_1.logAction)(req, 'CREATE_COUNCIL_MEETING', 'PrefectMeeting', meeting.id, { title });
        res.json(meeting);
    }
    catch (error) {
        console.error('Create meeting error:', error);
        res.status(500).json({ error: 'Failed to create council meeting minutes' });
    }
});
// ── CONDUCT REPORTS ──
/**
 * @route   GET /api/prefects/reports
 * @desc    Fetch student conduct reports
 */
router.get('/reports', async (req, res) => {
    if (!canViewConductReports(req.user)) {
        return res.status(403).json({ error: 'Unauthorized to view conduct reports' });
    }
    const schoolId = req.user.schoolId;
    try {
        const reports = await prisma_1.default.prefectReport.findMany({
            where: { schoolId },
            include: {
                reportedBy: {
                    select: { name: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reports);
    }
    catch (error) {
        console.error('Fetch reports error:', error);
        res.status(500).json({ error: 'Failed to fetch conduct reports' });
    }
});
/**
 * @route   POST /api/prefects/reports
 * @desc    File a new conduct report
 */
router.post('/reports', async (req, res) => {
    if (!canFileConductReport(req.user)) {
        return res.status(403).json({ error: 'Unauthorized to file conduct reports' });
    }
    const { studentName, category, narrative } = req.body;
    if (!studentName || !category || !narrative) {
        return res.status(400).json({ error: 'Missing required report fields' });
    }
    const schoolId = req.user.schoolId;
    const userId = req.user.id;
    try {
        const report = await prisma_1.default.prefectReport.create({
            data: {
                studentName,
                category,
                narrative,
                reportedById: userId,
                schoolId
            }
        });
        await (0, audit_1.logAction)(req, 'CREATE_CONDUCT_REPORT', 'PrefectReport', report.id, { studentName, category });
        res.json(report);
    }
    catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ error: 'Failed to file conduct report' });
    }
});
exports.default = router;
//# sourceMappingURL=prefects.js.map