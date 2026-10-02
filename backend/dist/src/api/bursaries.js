"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const ledger_service_1 = require("../services/ledger.service");
const router = (0, express_1.Router)();
router.post('/apply', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    const schoolId = req.user.schoolId;
    const { studentId, type, sponsor, percentage, validFrom, validTo } = req.body;
    try {
        const bursary = await prisma_1.default.studentBursary.create({
            data: {
                schoolId,
                studentId,
                type,
                sponsor,
                percentage,
                validFrom: new Date(validFrom),
                validTo: validTo ? new Date(validTo) : null,
                status: 'pending'
            }
        });
        res.status(201).json(bursary);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});
router.post('/:id/approve', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    const schoolId = req.user.schoolId;
    const id = req.params.id;
    try {
        const bursary = await prisma_1.default.studentBursary.findFirst({
            where: { id, schoolId, status: { in: ['pending', 'suggested'] } }
        });
        if (!bursary)
            return res.status(404).json({ message: 'Bursary not found or already approved' });
        const student = await prisma_1.default.student.findUnique({ where: { id: bursary.studentId } });
        const updated = await prisma_1.default.studentBursary.update({
            where: { id },
            data: { status: 'approved', approvedById: req.user.id }
        });
        // Ledger post Double Entry
        // 1210: Student Accounts Receivable
        // 5100: Tuition/Discount Revenue (using as contra-revenue for example)
        const discountAmount = 0; // Requires fees info to compute actual discount amount
        if (discountAmount > 0 && student) {
            await ledger_service_1.LedgerService.postDoubleEntry({
                tenantId: schoolId,
                date: new Date(),
                description: `Bursary discount for ${student.name}`,
                amount: discountAmount,
                debitCode: '5100',
                creditCode: '1210',
                sourceModule: 'fees', // fees is expected
                studentId: student.id,
                currency: 'USD'
            });
        }
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const bursaries = await prisma_1.default.studentBursary.findMany({
            where: { schoolId },
            include: { student: true, approver: true }
        });
        res.json(bursaries);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});
exports.default = router;
//# sourceMappingURL=bursaries.js.map