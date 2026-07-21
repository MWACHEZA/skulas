"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const features_1 = require("../middleware/features");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/extensions
 * @desc    Get all extension requests (Admin) or my requests (Student)
 */
router.get('/', auth_1.requireAuth, (0, features_1.requireFeature)('Postgraduate Regulation Engine'), async (req, res) => {
    const userRole = req.user.role.toUpperCase();
    try {
        if (userRole === 'SCHOOL_ADMIN') {
            const requests = await prisma_1.default.extensionRequest.findMany({
                where: { student: { schoolId: req.user.schoolId } },
                include: { student: true },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(requests);
        }
        if (userRole === 'STUDENT') {
            const student = await prisma_1.default.student.findFirst({
                where: { userId: req.user.id }
            });
            // Fallback if compound index not available or using userId
            const studentFallback = await prisma_1.default.student.findFirst({
                where: { userId: req.user.id, schoolId: req.user.schoolId }
            });
            const targetStudent = studentFallback;
            if (!targetStudent)
                return res.status(404).json({ error: 'Student record not found' });
            const requests = await prisma_1.default.extensionRequest.findMany({
                where: {
                    studentId: targetStudent.id,
                    schoolId: req.user.schoolId
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(requests);
        }
        res.status(403).json({ error: 'Unauthorized' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch extension requests' });
    }
});
/**
 * @route   POST /api/extensions
 * @desc    Submit a new extension request (Student)
 */
router.post('/', auth_1.requireAuth, (0, features_1.requireFeature)('Postgraduate Regulation Engine'), async (req, res) => {
    if (req.user.role !== 'STUDENT')
        return res.status(403).json({ error: 'Only students can request extensions' });
    const { reason, durationRequested, justificationUrl } = req.body;
    try {
        const student = await prisma_1.default.student.findFirst({
            where: { userId: req.user.id, schoolId: req.user.schoolId }
        });
        if (!student)
            return res.status(404).json({ error: 'Student record not found' });
        const request = await prisma_1.default.extensionRequest.create({
            data: {
                studentId: student.id,
                reason,
                durationRequested,
                justificationUrl,
                schoolId: req.user.schoolId,
                status: 'PENDING'
            }
        });
        res.status(201).json(request);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to submit extension request' });
    }
});
/**
 * @route   PATCH /api/extensions/:id
 * @desc    Approve or Reject extension request (Admin)
 */
router.patch('/:id', auth_1.requireAuth, (0, features_1.requireFeature)('Postgraduate Regulation Engine'), async (req, res) => {
    if (req.user.role !== 'SCHOOL_ADMIN')
        return res.status(403).json({ error: 'Unauthorized' });
    const id = req.params.id;
    const { status, adminComment } = req.body; // APPROVED or REJECTED
    try {
        const request = await prisma_1.default.extensionRequest.findFirst({
            where: {
                id,
                schoolId: req.user.schoolId
            },
            include: { student: true }
        });
        if (!request)
            return res.status(404).json({ error: 'Request not found' });
        const result = await prisma_1.default.$transaction(async (tx) => {
            // 1. Update Request
            const updatedRequest = await tx.extensionRequest.update({
                where: {
                    id,
                    schoolId: req.user.schoolId
                },
                data: { status, adminComment, updatedAt: new Date() }
            });
            // 2. If approved, update student timeline
            if (status === 'APPROVED') {
                const student = await tx.student.findFirst({ where: { id: request.studentId } });
                if (student && student.maxCompletionDate) {
                    const newMaxDate = new Date(student.maxCompletionDate);
                    newMaxDate.setMonth(newMaxDate.getMonth() + request.durationRequested);
                    await tx.student.update({
                        where: { id: request.studentId },
                        data: {
                            maxCompletionDate: newMaxDate,
                            extensionMonths: { increment: request.durationRequested }
                        }
                    });
                }
            }
            return updatedRequest;
        });
        res.json(result);
    }
    catch (error) {
        console.error('Extension approval error:', error);
        res.status(500).json({ error: 'Failed to process extension request' });
    }
});
exports.default = router;
//# sourceMappingURL=extensions.js.map