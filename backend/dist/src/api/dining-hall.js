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
// All dining hall routes require authentication
router.use(auth_1.requireAuth);
/**
 * Helper to check if user has menu management access
 */
const canManageMenu = (user) => {
    return user.role === 'SCHOOL_ADMIN' ||
        user.role === 'BURSAR' ||
        user.role === 'ANCILLARY' ||
        user.secondaryRoles.includes('Kitchen Manager') ||
        user.secondaryRoles.includes('Cook');
};
/**
 * Helper to check if user can view student service reports
 */
const canViewReports = (user) => {
    return user.role === 'SCHOOL_ADMIN' ||
        user.role === 'TEACHER' ||
        user.role === 'ANCILLARY' ||
        user.secondaryRoles.includes('Kitchen Manager');
};
/**
 * @route   GET /api/dining-hall/menu
 * @desc    Fetch the current week's published menu
 */
router.get('/menu', async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const menu = await prisma_1.default.weeklyMenu.findFirst({
            where: { schoolId, published: true },
            orderBy: { weekStarting: 'desc' }
        });
        res.json(menu);
    }
    catch (error) {
        console.error('Fetch menu error:', error);
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
});
/**
 * @route   POST /api/dining-hall/menu
 * @desc    Create/Update a weekly menu
 */
router.post('/menu', async (req, res) => {
    if (!canManageMenu(req.user)) {
        return res.status(403).json({ error: 'Unauthorized to publish menu' });
    }
    const { weekStarting, menuData, published } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const menu = await prisma_1.default.weeklyMenu.create({
            data: {
                weekStarting: new Date(weekStarting),
                menuData,
                published: published !== undefined ? published : true,
                schoolId
            }
        });
        await (0, audit_1.logAction)(req, 'CREATE_MENU', 'WeeklyMenu', menu.id, { weekStarting });
        res.json(menu);
    }
    catch (error) {
        console.error('Save menu error:', error);
        res.status(500).json({ error: 'Failed to save menu' });
    }
});
/**
 * @route   GET /api/dining-hall/reports
 * @desc    Fetch submitted dining hall service reports
 */
router.get('/reports', async (req, res) => {
    if (!canViewReports(req.user)) {
        return res.status(403).json({ error: 'Unauthorized to view service reports' });
    }
    const schoolId = req.user.schoolId;
    try {
        const reports = await prisma_1.default.diningHallReport.findMany({
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
        res.status(500).json({ error: 'Failed to fetch dining hall reports' });
    }
});
/**
 * @route   POST /api/dining-hall/reports
 * @desc    Submit a new dining hall service report
 */
router.post('/reports', async (req, res) => {
    const { category, rating, feedback } = req.body;
    const schoolId = req.user.schoolId;
    const userId = req.user.id;
    if (!category || rating === undefined || !feedback) {
        return res.status(400).json({ error: 'Missing required report fields' });
    }
    try {
        const report = await prisma_1.default.diningHallReport.create({
            data: {
                category,
                rating: parseInt(rating),
                feedback,
                reportedById: userId,
                schoolId
            }
        });
        await (0, audit_1.logAction)(req, 'SUBMIT_DINING_HALL_REPORT', 'DiningHallReport', report.id, { category });
        res.json(report);
    }
    catch (error) {
        console.error('Submit report error:', error);
        res.status(500).json({ error: 'Failed to submit dining hall report' });
    }
});
exports.default = router;
//# sourceMappingURL=dining-hall.js.map