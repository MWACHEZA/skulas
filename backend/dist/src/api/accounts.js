"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const accounts_schema_1 = require("../schemas/accounts.schema");
const router = (0, express_1.Router)();
// ═══════════ CATEGORIES ═══════════
router.get('/categories', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const categories = await prisma_1.default.accountCategory.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
router.post('/categories', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = accounts_schema_1.AccountCategorySchema.parse(req.body);
        const category = await prisma_1.default.accountCategory.create({
            data: {
                ...validatedData,
                schoolId
            }
        });
        res.status(201).json(category);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Category already exists for this type' });
        }
        res.status(400).json({ error: error.message || 'Failed to create category' });
    }
});
router.delete('/categories/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        await prisma_1.default.accountCategory.deleteMany({
            where: { id: id, schoolId }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete category. Ensure no records are linked to it.' });
    }
});
// ═══════════ LIABILITIES ═══════════
router.get('/liabilities', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const liabilities = await prisma_1.default.liability.findMany({
            where: { schoolId },
            include: { category: true },
            orderBy: { date: 'desc' }
        });
        res.json(liabilities);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch liabilities' });
    }
});
router.post('/liabilities', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = accounts_schema_1.LiabilitySchema.parse(req.body);
        const liability = await prisma_1.default.liability.create({
            data: {
                ...validatedData,
                schoolId
            }
        });
        res.status(201).json(liability);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to create liability' });
    }
});
router.patch('/liabilities/:id/settle', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        const schoolId = req.user.schoolId;
        const liability = await prisma_1.default.liability.findFirst({
            where: { id: id, schoolId }
        });
        if (!liability)
            return res.status(404).json({ error: 'Liability not found' });
        const newSettled = liability.settled + amount;
        let status = 'Partially Settled';
        if (newSettled >= liability.amount)
            status = 'Settled';
        const updated = await prisma_1.default.liability.updateMany({
            where: { id: id, schoolId },
            data: {
                settled: newSettled,
                status
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to settle liability' });
    }
});
router.patch('/liabilities/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        const validatedData = accounts_schema_1.LiabilitySchema.partial().parse(req.body);
        const liability = await prisma_1.default.liability.updateMany({
            where: { id: id, schoolId },
            data: validatedData
        });
        res.json(liability);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to update liability' });
    }
});
router.delete('/liabilities/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        await prisma_1.default.liability.deleteMany({ where: { id: id, schoolId } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete liability' });
    }
});
// ═══════════ INCOME ═══════════
router.get('/income', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const incomes = await prisma_1.default.income.findMany({
            where: { schoolId },
            include: { category: true },
            orderBy: { date: 'desc' }
        });
        res.json(incomes);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch income' });
    }
});
router.post('/income', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = accounts_schema_1.IncomeSchema.parse(req.body);
        const income = await prisma_1.default.income.create({
            data: {
                ...validatedData,
                schoolId
            }
        });
        res.status(201).json(income);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to record income' });
    }
});
router.patch('/income/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        const validatedData = accounts_schema_1.IncomeSchema.partial().parse(req.body);
        const income = await prisma_1.default.income.updateMany({
            where: { id: id, schoolId },
            data: validatedData
        });
        res.json(income);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to update income' });
    }
});
router.delete('/income/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        await prisma_1.default.income.deleteMany({ where: { id: id, schoolId } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete income' });
    }
});
// ═══════════ EXPENSES ═══════════
router.get('/expenses', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const expenses = await prisma_1.default.expense.findMany({
            where: { schoolId },
            include: { category: true },
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});
router.post('/expenses', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = accounts_schema_1.ExpenseSchema.parse(req.body);
        const expense = await prisma_1.default.expense.create({
            data: {
                ...validatedData,
                schoolId
            }
        });
        res.status(201).json(expense);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to record expense' });
    }
});
router.patch('/expenses/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        const validatedData = accounts_schema_1.ExpenseSchema.partial().parse(req.body);
        const expense = await prisma_1.default.expense.updateMany({
            where: { id: id, schoolId },
            data: validatedData
        });
        res.json(expense);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to update expense' });
    }
});
router.delete('/expenses/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        await prisma_1.default.expense.deleteMany({ where: { id: id, schoolId } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});
// ═══════════ PAYMENT METHODS (BANKING/MOBILE) ═══════════
router.get('/payment-methods', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const methods = await prisma_1.default.paymentMethod.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' }
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
        const validatedData = accounts_schema_1.PaymentMethodSchema.parse(req.body);
        const method = await prisma_1.default.paymentMethod.create({
            data: {
                ...validatedData,
                schoolId
            }
        });
        res.status(201).json(method);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to create payment method' });
    }
});
router.patch('/payment-methods/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        const validatedData = accounts_schema_1.PaymentMethodSchema.partial().parse(req.body);
        const method = await prisma_1.default.paymentMethod.updateMany({
            where: { id: id, schoolId },
            data: validatedData
        });
        res.json(method);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to update payment method' });
    }
});
router.delete('/payment-methods/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.schoolId;
        await prisma_1.default.paymentMethod.deleteMany({ where: { id: id, schoolId } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete payment method' });
    }
});
exports.default = router;
//# sourceMappingURL=accounts.js.map