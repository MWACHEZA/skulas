import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
const router = Router();
/**
 * @route   POST /api/transfers/request
 * @desc    Initiate a transfer authorization (Student or Target Admin)
 */
router.post('/request', requireAuth, async (req, res) => {
    const { studentEmail, originSchoolCode, targetSchoolCode } = req.body;
    try {
        const student = await prisma.user.findUnique({ where: { email: studentEmail } });
        if (!student)
            return res.status(404).json({ error: 'Student account not found' });
        const origin = await prisma.school.findUnique({ where: { code: originSchoolCode } });
        const target = await prisma.school.findUnique({ where: { code: targetSchoolCode } });
        if (!origin || !target)
            return res.status(404).json({ error: 'One or both schools not found' });
        // Ensure student actually belongs to origin (or has a history there)
        const studentAtOrigin = await prisma.student.findFirst({
            where: { userId: student.id, schoolId: origin.id }
        });
        if (!studentAtOrigin)
            return res.status(400).json({ error: 'Student is not recognized by the origin school' });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiry
        const transfer = await prisma.transferAuthorization.upsert({
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
router.post('/:id/consent', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userSchoolId = req.user.schoolId;
    const userRole = req.user.role.toUpperCase();
    try {
        const transfer = await prisma.transferAuthorization.findUnique({
            where: { id: id },
            include: { studentUser: true }
        });
        if (!transfer)
            return res.status(404).json({ error: 'Transfer request not found' });
        if (transfer.status === 'EXPIRED' || new Date() > transfer.expiresAt) {
            await prisma.transferAuthorization.update({ where: { id: id }, data: { status: 'EXPIRED' } });
            return res.status(400).json({ error: 'This request has expired' });
        }
        const updates = {};
        // 1. Check Student Consent
        if (userId === transfer.studentUserId) {
            updates.studentConsent = true;
        }
        // 2. Check Origin Admin Consent
        if (userSchoolId === transfer.originSchoolId && userRole === 'SCHOOL_ADMIN') {
            updates.originConsent = true;
        }
        // 3. Check Target Admin Consent
        if (userSchoolId === transfer.targetSchoolId && userRole === 'SCHOOL_ADMIN') {
            updates.targetConsent = true;
        }
        if (Object.keys(updates).length === 0) {
            return res.status(403).json({ error: 'You are not authorized to consent to this transfer' });
        }
        const updated = await prisma.transferAuthorization.update({
            where: { id: id },
            data: updates
        });
        // 4. Check if fully approved
        if (updated.studentConsent && updated.originConsent && updated.targetConsent) {
            await prisma.transferAuthorization.update({
                where: { id: id },
                data: { status: 'APPROVED' }
            });
        }
        res.json({ success: true, transfer: updated });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to record consent' });
    }
});
/**
 * @route   GET /api/transfers/my-requests
 * @desc    List transfer requests for the logged-in user
 */
router.get('/my-requests', requireAuth, async (req, res) => {
    try {
        const requests = await prisma.transferAuthorization.findMany({
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
export default router;
//# sourceMappingURL=transfers.js.map