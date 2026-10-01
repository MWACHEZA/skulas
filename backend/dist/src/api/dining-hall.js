"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../utils/audit");
const ledger_service_1 = require("../services/ledger.service");
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
/**
 * @route   POST /api/dining-hall/meal-deduction
 * @desc    Record meal deduction from inventory (1220 -> 5030) and record variance against roll call
 */
router.post('/meal-deduction', async (req, res) => {
    if (!canManageMenu(req.user)) {
        return res.status(403).json({ error: 'Unauthorized to post meal deductions' });
    }
    const schoolId = req.user.schoolId;
    const { mealType, date, rollCallCount, actualServedCount, costPerMeal = 1.5, notes } = req.body;
    if (!mealType || rollCallCount === undefined || actualServedCount === undefined) {
        return res.status(400).json({ error: 'mealType, rollCallCount, and actualServedCount are required' });
    }
    const rollCall = parseInt(rollCallCount);
    const served = parseInt(actualServedCount);
    const unitCost = parseFloat(costPerMeal);
    const variance = served - rollCall; // positive means more served than counted
    const totalCost = Math.round(served * unitCost * 100) / 100;
    try {
        // Post double entry: DR 5030 (Food Provisions Expense) / CR 1220 (Inventory - Dining Hall Provisions)
        const journalEntry = await ledger_service_1.LedgerService.postDoubleEntry({
            tenantId: schoolId,
            debitCode: '5030', // Food Provisions & Kitchen Groceries
            creditCode: '1220', // Inventory - Dining Hall Provisions
            amount: totalCost,
            description: `Dining meal inventory deduction: ${mealType} on ${date || new Date().toISOString().split('T')[0]} (${served} meals served, roll call: ${rollCall}, variance: ${variance > 0 ? '+' : ''}${variance})`,
            sourceModule: 'dining_deduction',
            reference: `MEAL-${mealType.toUpperCase()}-${Date.now()}`,
            userId: req.user.id,
            ipAddress: req.ip
        });
        await (0, audit_1.logAction)(req, 'MEAL_DEDUCTION_POSTED', 'JournalEntry', journalEntry.id, {
            mealType,
            rollCall,
            served,
            variance,
            totalCost,
            notes
        });
        res.json({
            success: true,
            journalEntryId: journalEntry.id,
            entryNumber: journalEntry.entryNumber,
            mealType,
            rollCallCount: rollCall,
            actualServedCount: served,
            variance,
            varianceFlag: variance !== 0,
            totalCost,
            postedAt: journalEntry.entryDate
        });
    }
    catch (error) {
        console.error('Meal deduction error:', error);
        res.status(500).json({ error: error.message || 'Failed to post meal deduction' });
    }
});
/**
 * @route   GET /api/dining-hall/meal-deductions
 * @desc    Fetch recent meal deductions posted to the general ledger
 */
router.get('/meal-deductions', async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const deductions = await prisma_1.default.journalEntry.findMany({
            where: {
                schoolId,
                sourceModule: 'dining_deduction'
            },
            include: {
                lines: {
                    include: {
                        account: true
                    }
                },
                postedBy: {
                    select: { name: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(deductions);
    }
    catch (error) {
        console.error('Fetch meal deductions error:', error);
        res.status(500).json({ error: 'Failed to fetch meal deductions' });
    }
});
exports.default = router;
//# sourceMappingURL=dining-hall.js.map