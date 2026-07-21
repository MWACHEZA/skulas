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
 * @route   POST /api/transfers/request
 * @desc    Initiate a transfer authorization (Student or Target Admin)
 */
router.post('/request', auth_1.requireAuth, async (req, res) => {
    const { studentEmail, originSchoolCode, targetSchoolCode } = req.body;
    try {
        const student = await prisma_1.default.user.findFirst({ where: { email: studentEmail } });
        if (!student)
            return res.status(404).json({ error: 'Student account not found' });
        const origin = await prisma_1.default.school.findUnique({ where: { code: originSchoolCode } });
        const target = await prisma_1.default.school.findUnique({ where: { code: targetSchoolCode } });
        if (!origin || !target)
            return res.status(404).json({ error: 'One or both schools not found' });
        // Ensure student actually belongs to origin (or has a history there)
        const studentAtOrigin = await prisma_1.default.student.findFirst({
            where: { userId: student.id, schoolId: origin.id }
        });
        if (!studentAtOrigin)
            return res.status(400).json({ error: 'Student is not recognized by the origin school' });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiry
        const transfer = await prisma_1.default.transferAuthorization.upsert({
            where: {
                studentUserId_originSchoolId_targetSchoolId: {
                    studentUserId: student.id,
                    originSchoolId: origin.id,
                    targetSchoolId: target.id
                }
            },
            update: { expiresAt, status: 'PENDING' },
            create: {
                studentUserId: student.id,
                originSchoolId: origin.id,
                targetSchoolId: target.id,
                expiresAt,
                // If student initiates, set studentConsent to true
                studentConsent: req.user.id === student.id,
                // If target admin initiates, set targetConsent to true
                targetConsent: req.user.schoolId === target.id && req.user.role === 'SCHOOL_ADMIN'
            }
        });
        res.json({ success: true, transfer });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to initiate transfer request' });
    }
});
/**
 * @route   POST /api/transfers/:id/consent
 * @desc    Provide consent for a transfer (Origin Admin, Target Admin, or Student)
 */
router.post('/:id/consent', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userSchoolId = req.user.schoolId;
    const userRole = req.user.role.toUpperCase();
    try {
        const result = await prisma_1.default.$transaction(async (tx) => {
            const transfer = await tx.transferAuthorization.findUnique({
                where: { id: id },
                include: { studentUser: true }
            });
            if (!transfer)
                throw new Error('NOT_FOUND');
            if (transfer.status === 'EXPIRED' || new Date() > transfer.expiresAt) {
                await tx.transferAuthorization.update({ where: { id: id }, data: { status: 'EXPIRED' } });
                throw new Error('EXPIRED');
            }
            const updates = {};
            if (userId === transfer.studentUserId)
                updates.studentConsent = true;
            if (userSchoolId === transfer.originSchoolId && userRole === 'SCHOOL_ADMIN')
                updates.originConsent = true;
            if (userSchoolId === transfer.targetSchoolId && userRole === 'SCHOOL_ADMIN')
                updates.targetConsent = true;
            if (Object.keys(updates).length === 0)
                throw new Error('UNAUTHORIZED');
            const updated = await tx.transferAuthorization.update({
                where: { id: id },
                data: updates
            });
            // Consolidate approval into the same transaction
            const fullyApproved = updated.studentConsent && updated.originConsent && updated.targetConsent;
            if (fullyApproved) {
                return tx.transferAuthorization.update({
                    where: { id: id },
                    data: { status: 'APPROVED' }
                });
            }
            return updated;
        });
        res.json({ success: true, transfer: result });
    }
    catch (error) {
        if (error.message === 'NOT_FOUND')
            return res.status(404).json({ error: 'Transfer request not found' });
        if (error.message === 'EXPIRED')
            return res.status(400).json({ error: 'This request has expired' });
        if (error.message === 'UNAUTHORIZED')
            return res.status(403).json({ error: 'You are not authorized to consent to this transfer' });
        console.error(error);
        res.status(500).json({ error: 'Failed to record consent' });
    }
});
/**
 * @route   GET /api/transfers/my-requests
 * @desc    List transfer requests for the logged-in user
 */
router.get('/my-requests', auth_1.requireAuth, async (req, res) => {
    try {
        const requests = await prisma_1.default.transferAuthorization.findMany({
            where: {
                OR: [
                    { studentUserId: req.user.id },
                    { originSchoolId: req.user.schoolId },
                    { targetSchoolId: req.user.schoolId }
                ]
            },
            include: {
                originSchool: { select: { name: true, code: true } },
                targetSchool: { select: { name: true, code: true } },
                studentUser: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch transfer requests' });
    }
});
exports.default = router;
//# sourceMappingURL=transfers.js.map