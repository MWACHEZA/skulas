"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const bursar_service_1 = require("../services/bursar.service");
const credit_note_service_1 = require("../services/credit-note.service");
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
                name: req.body.name || req.body.hostelName || 'Hostel',
                categoryId: req.body.categoryId,
                roomId: req.body.roomId,
                capacity: parseInt(req.body.capacity || req.body.intake) || 0,
                location: req.body.location || req.body.address,
                description: req.body.description,
                schoolId: req.user.schoolId
            }
        });
        res.json(hostel);
    }
    catch (error) {
        console.error('Failed to create hostel:', error);
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
// ═══════════ BOARDING & BED ALLOCATIONS (BURSAR INTEGRATION) ═══════════
/**
 * GET /api/ancillary/boarding/allocations
 * List all bed allocations
 */
router.get('/boarding/allocations', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY', 'BURSAR'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const allocations = await prisma_1.default.hostelBedAllocation.findMany({
            where: { schoolId },
            include: {
                student: { select: { id: true, studentId: true, name: true, class: true } },
                hostel: { select: { id: true, name: true, type: true } },
                room: { select: { id: true, name: true } }
            },
            orderBy: { allocatedAt: 'desc' }
        });
        res.json(allocations);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch bed allocations' });
    }
});
/**
 * POST /api/ancillary/boarding/assign
 * Allocate a student to a hostel bed, auto-invoicing via BursarService
 * Idempotency Key: board_{allocation_id}
 * Revenue Account: 4020 (Boarding & Hostel Accommodation)
 */
router.post('/boarding/assign', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY', 'BURSAR'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { studentId, hostelId, roomId, termId, term, feeAmount } = req.body;
        if (!studentId || !hostelId) {
            return res.status(400).json({ error: 'studentId and hostelId are required' });
        }
        const [student, hostel] = await Promise.all([
            prisma_1.default.student.findFirst({ where: { id: studentId, schoolId } }),
            prisma_1.default.hostel.findFirst({
                where: { id: hostelId, schoolId },
                include: { roomType: true }
            })
        ]);
        if (!student)
            return res.status(404).json({ error: 'Student not found in this school' });
        if (!hostel)
            return res.status(404).json({ error: 'Hostel not found in this school' });
        // Determine boarding fee from roomType cost, request body, or default
        let resolvedFee = 0;
        if (feeAmount !== undefined && feeAmount !== null && parseFloat(feeAmount) >= 0) {
            resolvedFee = parseFloat(feeAmount);
        }
        else if (hostel.roomType?.cost) {
            resolvedFee = hostel.roomType.cost;
        }
        // 1. Create Allocation Record
        const allocation = await prisma_1.default.hostelBedAllocation.create({
            data: {
                schoolId,
                studentId,
                hostelId,
                roomId: roomId || null,
                termId: termId || 'term_1',
                term: term || 'Term 1',
                feeAmount: resolvedFee,
                status: 'ACTIVE'
            }
        });
        // 2. Update Student status
        await prisma_1.default.student.update({
            where: { id: studentId },
            data: {
                hostelId,
                roomId: roomId || null,
                boardingStatus: 'Boarder'
            }
        });
        // 3. Post Invoice to Bursar if fee > 0
        let invoiceResult = null;
        if (resolvedFee > 0) {
            const idempotencyKey = `board_${allocation.id}`;
            invoiceResult = await bursar_service_1.BursarService.createStudentInvoice({
                schoolId,
                idempotencyKey,
                studentId,
                termId: termId || 'term_1',
                term: term || 'Term 1',
                sourceModule: 'boarding',
                sourceId: allocation.id,
                items: [
                    {
                        billingItemCode: 'BOARD',
                        description: `Boarding & Hostel Accommodation — ${hostel.name}${roomId ? ` (Room ${roomId})` : ''}`,
                        quantity: 1,
                        unitPrice: resolvedFee,
                        totalAmount: resolvedFee,
                        revenueAccountCode: '4020'
                    }
                ],
                createdBy: req.user.id
            });
            await prisma_1.default.hostelBedAllocation.update({
                where: { id: allocation.id },
                data: { invoiceId: invoiceResult.invoice.id }
            });
        }
        res.json({
            success: true,
            allocation,
            invoice: invoiceResult?.invoice || null
        });
    }
    catch (error) {
        console.error('Failed to assign boarding bed:', error);
        res.status(500).json({ error: error.message || 'Failed to assign student to hostel' });
    }
});
/**
 * POST /api/ancillary/boarding/vacate
 * Vacate a bed with optional pro-rata credit note reversal
 */
router.post('/boarding/vacate', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY', 'BURSAR'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { allocationId, studentId, reason = 'Vacated hostel bed', proRataRatio } = req.body;
        const allocation = await prisma_1.default.hostelBedAllocation.findFirst({
            where: {
                schoolId,
                status: 'ACTIVE',
                ...(allocationId ? { id: allocationId } : { studentId })
            }
        });
        if (!allocation) {
            return res.status(404).json({ error: 'No active bed allocation found for student' });
        }
        let creditNoteResult = null;
        const ratio = proRataRatio !== undefined ? parseFloat(proRataRatio) : 0;
        // If pro-rata ratio > 0 and invoice exists, issue credit note
        if (ratio > 0 && allocation.invoiceId) {
            creditNoteResult = await credit_note_service_1.CreditNoteService.createCreditNoteForInvoice({
                schoolId,
                invoiceId: allocation.invoiceId,
                reason: `${reason} (Pro-rata ${Math.round(ratio * 100)}%)`,
                proRataRatio: ratio,
                issuedByUserId: req.user.id
            });
        }
        // Update allocation
        const updatedAllocation = await prisma_1.default.hostelBedAllocation.update({
            where: { id: allocation.id },
            data: {
                status: 'VACATED',
                vacatedAt: new Date(),
                vacatedReason: reason,
                creditNoteId: creditNoteResult?.creditNote?.id || null
            }
        });
        // Reset student status to Day scholar
        await prisma_1.default.student.update({
            where: { id: allocation.studentId },
            data: {
                hostelId: null,
                roomId: null,
                boardingStatus: 'Day'
            }
        });
        res.json({
            success: true,
            allocation: updatedAllocation,
            creditNote: creditNoteResult?.creditNote || null
        });
    }
    catch (error) {
        console.error('Failed to vacate hostel bed:', error);
        res.status(500).json({ error: error.message || 'Failed to vacate hostel bed' });
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
/**
 * @route   GET /api/ancillary/boarding/logs
 * @desc    Fetch recent boarding movement logs & exeat records
 */
router.get('/boarding/logs', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const logs = await prisma_1.default.boardingLog.findMany({
            where: { schoolId },
            include: {
                student: {
                    select: { id: true, name: true, studentId: true, hostel: { select: { name: true } } }
                },
                authorizedBy: {
                    select: { id: true, name: true, role: true }
                }
            },
            orderBy: { timestamp: 'desc' },
            take: 100
        });
        res.json(logs);
    }
    catch (error) {
        console.error('Fetch boarding logs error:', error);
        res.status(500).json({ error: 'Failed to fetch boarding logs' });
    }
});
/**
 * @route   PATCH /api/ancillary/boarding/logs/:id/return
 * @desc    Mark a student as returned from exeat / sign-out
 */
router.patch('/boarding/logs/:id/return', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER'), async (req, res) => {
    const schoolId = req.user.schoolId;
    const id = req.params.id;
    try {
        const log = await prisma_1.default.boardingLog.findFirst({
            where: { id, schoolId }
        });
        if (!log)
            return res.status(404).json({ error: 'Boarding log not found' });
        const updated = await prisma_1.default.boardingLog.update({
            where: { id },
            data: { returnedAt: new Date() }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Update boarding return error:', error);
        res.status(500).json({ error: 'Failed to update boarding return' });
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