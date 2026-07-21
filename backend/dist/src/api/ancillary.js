"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ═══════════ HOSTELS & BOARDING ═══════════
router.get('/hostel-categories', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const categories = await prisma_1.default.hostelCategory.findMany({ where: { schoolId: req.user.schoolId } });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch hostel categories' });
    }
});
router.post('/hostel-categories', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const category = await prisma_1.default.hostelCategory.create({
            data: { ...req.body, schoolId: req.user.schoolId }
        });
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create hostel category' });
    }
});
router.delete('/hostel-categories/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma_1.default.hostelCategory.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete hostel category' });
    }
});
router.get('/hostel-rooms', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const rooms = await prisma_1.default.hostelRoom.findMany({ where: { schoolId: req.user.schoolId } });
        res.json(rooms);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch hostel rooms' });
    }
});
router.post('/hostel-rooms', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const room = await prisma_1.default.hostelRoom.create({
            data: {
                ...req.body,
                numberOfBeds: parseInt(req.body.numberOfBeds) || 0,
                cost: parseFloat(req.body.cost) || 0,
                schoolId: req.user.schoolId
            }
        });
        res.json(room);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create hostel room' });
    }
});
router.delete('/hostel-rooms/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma_1.default.hostelRoom.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete hostel room' });
    }
});
router.get('/hostels', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req, res) => {
    try {
        const hostels = await prisma_1.default.hostel.findMany({
            where: { schoolId: req.user.schoolId },
            include: {
                category: true,
                roomType: true,
                _count: { select: { students: true } }
            }
        });
        res.json(hostels);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch hostels' });
    }
});
router.post('/hostels', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const hostel = await prisma_1.default.hostel.create({
            data: {
                name: req.body.name,
                categoryId: req.body.categoryId,
                roomId: req.body.roomId,
                capacity: parseInt(req.body.capacity) || 0,
                location: req.body.location,
                description: req.body.description,
                schoolId: req.user.schoolId
            }
        });
        res.json(hostel);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create hostel' });
    }
});
router.delete('/hostels/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma_1.default.hostel.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete hostel' });
    }
});
// Boarding Assignments
router.post('/boarding/assign', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { studentId, hostelId } = req.body;
        await prisma_1.default.student.update({
            where: { id: studentId },
            data: { hostelId, boardingStatus: 'Boarder' }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to assign student' });
    }
});
// ═══════════ BOARDING LOGS ═══════════
/**
 * @route   POST /api/ancillary/boarding/log
 * @desc    Record a boarding movement (Sign-out, Sign-in, etc)
 */
router.post('/boarding/log', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req, res) => {
    const { studentId, type, reason } = req.body;
    const schoolId = req.user.schoolId;
    const userId = req.user.id;
    try {
        const log = await prisma_1.default.boardingLog.create({
            data: {
                studentId,
                type,
                reason,
                authorizedById: userId,
                schoolId
            }
        });
        // If it's a sign-out, maybe update student status? 
        // For now we just log it.
        res.json(log);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to record boarding log' });
    }
});
// ═══════════ VISITOR TRACKING ═══════════
/**
 * @route   GET /api/ancillary/visitors
 * @desc    Get current day's visitors
 */
router.get('/visitors', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const visitors = await prisma_1.default.visitorLog.findMany({
            where: { schoolId },
            orderBy: { entryTime: 'desc' }
        });
        res.json(visitors);
    }
    catch (error) {
        // Note: Prisma might have named it VisitorLog or visitorLog based on schema
        res.status(500).json({ error: 'Failed to fetch visitors' });
    }
});
/**
 * @route   POST /api/ancillary/visitors
 * @desc    Record a new visitor entry
 */
router.post('/visitors', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    const { name, phone, purpose, vehicleReg } = req.body;
    const schoolId = req.user.schoolId;
    const guardId = req.user.id;
    try {
        const visitor = await prisma_1.default.visitorLog.create({
            data: { name, phone, purpose, vehicleReg, guardId, schoolId }
        });
        res.json(visitor);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to record visitor' });
    }
});
// ═══════════ MEAL PLANNING ═══════════
/**
 * @route   GET /api/ancillary/menu/current
 * @desc    Get the menu starting this week
 */
router.get('/menu/current', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const menu = await prisma_1.default.weeklyMenu.findFirst({
            where: { schoolId, published: true },
            orderBy: { weekStarting: 'desc' }
        });
        res.json(menu);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
});
/**
 * @route   POST /api/ancillary/menu
 * @desc    Create/Update a weekly menu
 */
router.post('/menu', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    const { weekStarting, menuData, published } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const menu = await prisma_1.default.weeklyMenu.create({
            data: {
                weekStarting: new Date(weekStarting),
                menuData,
                published,
                schoolId
            }
        });
        res.json(menu);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to save menu' });
    }
});
exports.default = router;
//# sourceMappingURL=ancillary.js.map