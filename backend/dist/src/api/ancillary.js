import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
const router = Router();
// ═══════════ HOSTELS & BOARDING ═══════════
router.get('/hostel-categories', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const categories = await prisma.hostelCategory.findMany({ where: { schoolId: req.user.schoolId } });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch hostel categories' });
    }
});
router.post('/hostel-categories', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const category = await prisma.hostelCategory.create({
            data: { ...req.body, schoolId: req.user.schoolId }
        });
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create hostel category' });
    }
});
router.delete('/hostel-categories/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma.hostelCategory.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete hostel category' });
    }
});
router.get('/hostel-rooms', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const rooms = await prisma.hostelRoom.findMany({ where: { schoolId: req.user.schoolId } });
        res.json(rooms);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch hostel rooms' });
    }
});
router.post('/hostel-rooms', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const room = await prisma.hostelRoom.create({
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
router.delete('/hostel-rooms/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma.hostelRoom.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete hostel room' });
    }
});
router.get('/hostels', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req, res) => {
    try {
        const hostels = await prisma.hostel.findMany({
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
router.post('/hostels', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const hostel = await prisma.hostel.create({
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
router.delete('/hostels/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma.hostel.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete hostel' });
    }
});
// Boarding Assignments
router.post('/boarding/assign', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { studentId, hostelId } = req.body;
        await prisma.student.update({
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
router.post('/boarding/log', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req, res) => {
    const { studentId, type, reason } = req.body;
    const schoolId = req.user.schoolId;
    const userId = req.user.id;
    try {
        const log = await prisma.boardingLog.create({
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
router.get('/visitors', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const visitors = await prisma.visitorLog.findMany({
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
router.post('/visitors', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    const { name, phone, purpose, vehicleReg } = req.body;
    const schoolId = req.user.schoolId;
    const guardId = req.user.id;
    try {
        const visitor = await prisma.visitorLog.create({
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
router.get('/menu/current', requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const menu = await prisma.weeklyMenu.findFirst({
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
router.post('/menu', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req, res) => {
    const { weekStarting, menuData, published } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const menu = await prisma.weeklyMenu.create({
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
export default router;
//# sourceMappingURL=ancillary.js.map