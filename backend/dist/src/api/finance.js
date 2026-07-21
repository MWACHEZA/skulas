"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const finance_schema_1 = require("../schemas/finance.schema");
const security_logger_1 = require("../lib/security-logger");
const router = (0, express_1.Router)();
// ═══════════ PAYMENT METHODS ═══════════
router.get('/payment-methods', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const methods = await prisma_1.default.paymentMethod.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' }
        });
        res.json(methods);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
});
router.post('/payment-methods', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = finance_schema_1.PaymentMethodSchema.parse(req.body);
        const method = await prisma_1.default.paymentMethod.create({
            data: {
                ...validatedData,
                schoolId
            }
        });
        await (0, security_logger_1.logSecurityEvent)({
            actorId: req.user.id,
            action: 'CREATE_PAYMENT_METHOD',
            entityType: 'PaymentMethod',
            entityId: method.id,
            details: { name: method.name },
            schoolId,
            ipAddress: req.ip
        });
        res.status(201).json(method);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Payment method already exists' });
        }
        res.status(400).json({ error: error.message || 'Failed to create payment method' });
    }
});
router.delete('/payment-methods/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = req.params.id;
        const schoolId = req.user.schoolId;
        const method = await prisma_1.default.paymentMethod.findFirst({
            where: { id, schoolId }
        });
        if (!method) {
            return res.status(404).json({ error: 'Payment method not found' });
        }
        await prisma_1.default.paymentMethod.deleteMany({
            where: { id, schoolId }
        });
        await (0, security_logger_1.logSecurityEvent)({
            actorId: req.user.id,
            action: 'DELETE_PAYMENT_METHOD',
            entityType: 'PaymentMethod',
            entityId: id,
            details: { name: method.name },
            schoolId,
            ipAddress: req.ip
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete payment method' });
    }
});
// ═══════════ REVENUE ALLOCATIONS ═══════════
router.get('/revenue-allocations', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const allocations = await prisma_1.default.revenueAllocation.findMany({
            where: { schoolId },
            include: {
                feeGroups: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(allocations);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch revenue allocations' });
    }
});
router.post('/revenue-allocations', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { feeGroupIds, ...rest } = finance_schema_1.RevenueAllocationSchema.parse(req.body);
        // If making this one active, deactivate others for the same period/year optionally
        // (User can manually toggle, but let's keep it simple for now)
        const allocation = await prisma_1.default.revenueAllocation.create({
            data: {
                ...rest,
                schoolId,
                feeGroups: {
                    connect: feeGroupIds.map(id => ({ id }))
                }
            },
            include: {
                feeGroups: true
            }
        });
        await (0, security_logger_1.logSecurityEvent)({
            actorId: req.user.id,
            action: 'CREATE_REVENUE_ALLOCATION',
            entityType: 'RevenueAllocation',
            entityId: allocation.id,
            details: { name: allocation.name },
            schoolId,
            ipAddress: req.ip
        });
        res.status(201).json(allocation);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to create allocation' });
    }
});
router.patch('/revenue-allocations/:id/toggle', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = req.params.id;
        const schoolId = req.user.schoolId;
        const { isActive } = req.body;
        const allocation = await prisma_1.default.revenueAllocation.update({
            where: { id, schoolId },
            data: { isActive }
        });
        res.json(allocation);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update allocation' });
    }
});
exports.default = router;
//# sourceMappingURL=finance.js.map