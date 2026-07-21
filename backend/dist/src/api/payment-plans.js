"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Submit a new payment plan (Parent)
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('PARENT'), async (req, res) => {
    try {
        const { studentId, amount, dueDate, notes, isPredefined } = req.body;
        if (!studentId || !amount || !dueDate) {
            return res.status(400).json({ error: 'Student ID, amount, and due date are required' });
        }
        // Verify parent is linked to this student
        const connection = await prisma_1.default.parentStudent.findFirst({
            where: {
                studentId,
                parent: { userId: req.user.id }
            }
        });
        if (!connection) {
            return res.status(403).json({ error: 'You are not authorized to create a payment plan for this student' });
        }
        const plan = await prisma_1.default.paymentPlan.create({
            data: {
                schoolId: req.user.schoolId,
                studentId,
                parentUserId: req.user.id,
                amount: parseFloat(amount),
                dueDate: new Date(dueDate),
                status: isPredefined ? 'APPROVED' : 'PENDING',
                notes: notes || ''
            },
            include: {
                student: true
            }
        });
        res.json(plan);
    }
    catch (error) {
        console.error('Error creating payment plan:', error);
        res.status(500).json({ error: 'Failed to create payment plan' });
    }
});
// Get payment plans for logged-in parent
router.get('/my', auth_1.requireAuth, (0, auth_1.requireRole)('PARENT'), async (req, res) => {
    try {
        const plans = await prisma_1.default.paymentPlan.findMany({
            where: {
                parentUserId: req.user.id,
                schoolId: req.user.schoolId
            },
            include: {
                student: {
                    select: {
                        name: true,
                        studentId: true,
                        class: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(plans);
    }
    catch (error) {
        console.error('Error fetching parent payment plans:', error);
        res.status(500).json({ error: 'Failed to fetch payment plans' });
    }
});
// Admin get all payment plans for the school
router.get('/admin', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const plans = await prisma_1.default.paymentPlan.findMany({
            where: {
                schoolId: req.user.schoolId
            },
            include: {
                student: {
                    select: {
                        name: true,
                        studentId: true,
                        class: true
                    }
                },
                parentUser: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Check and flag overdue plans dynamically
        const today = new Date();
        const updatedPlans = await Promise.all(plans.map(async (plan) => {
            if (plan.status === 'APPROVED' && today > new Date(plan.dueDate)) {
                // Check outstanding fee balance
                const fees = await prisma_1.default.fee.findMany({
                    where: { studentId: plan.studentId }
                });
                const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
                const totalPaid = fees.reduce((sum, f) => sum + f.paid, 0);
                const balance = totalFees - totalPaid;
                if (balance > 0) {
                    // Update db status to OVERDUE
                    const updated = await prisma_1.default.paymentPlan.update({
                        where: { id: plan.id },
                        data: { status: 'OVERDUE' },
                        include: {
                            student: { select: { name: true, studentId: true, class: true } },
                            parentUser: { select: { name: true, email: true } }
                        }
                    });
                    return updated;
                }
            }
            return plan;
        }));
        res.json(updatedPlans);
    }
    catch (error) {
        console.error('Error fetching admin payment plans:', error);
        res.status(500).json({ error: 'Failed to fetch payment plans' });
    }
});
// Approve / Reject payment plans (Admin)
router.patch('/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const { status, notes } = req.body;
        const { id } = req.params;
        if (!['APPROVED', 'REJECTED', 'PAID', 'PENDING'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const plan = await prisma_1.default.paymentPlan.findFirst({
            where: { id: id }
        });
        if (!plan || plan.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Payment plan not found' });
        }
        const updated = await prisma_1.default.paymentPlan.update({
            where: { id: id },
            data: {
                status,
                notes: notes || plan.notes
            },
            include: {
                student: {
                    select: { name: true, studentId: true }
                }
            }
        });
        res.json({ success: true, plan: updated });
    }
    catch (error) {
        console.error('Error updating payment plan status:', error);
        res.status(500).json({ error: 'Failed to update payment plan status' });
    }
});
// Fetch all predefined templates
router.get('/templates', auth_1.requireAuth, async (req, res) => {
    try {
        const school = await prisma_1.default.school.findUnique({
            where: { id: req.user.schoolId },
            select: { settings: true }
        });
        const settings = school?.settings || {};
        const templates = settings.predefinedPlans || [];
        res.json(templates);
    }
    catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch payment plan templates' });
    }
});
// Create/Update predefined template
router.post('/templates', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const { id, name, amount, notes, dueDate } = req.body;
        if (!name || !amount) {
            return res.status(400).json({ error: 'Name and amount are required' });
        }
        const school = await prisma_1.default.school.findUnique({
            where: { id: req.user.schoolId }
        });
        if (!school) {
            return res.status(404).json({ error: 'School not found' });
        }
        const settings = school.settings || {};
        const templates = settings.predefinedPlans || [];
        if (id) {
            const index = templates.findIndex((t) => t.id === id);
            if (index > -1) {
                templates[index] = { id, name, amount: parseFloat(amount), notes, dueDate };
            }
            else {
                templates.push({ id, name, amount: parseFloat(amount), notes, dueDate });
            }
        }
        else {
            const newPlan = {
                id: 'tmpl_' + Math.random().toString(36).substring(2, 9),
                name,
                amount: parseFloat(amount),
                notes,
                dueDate
            };
            templates.push(newPlan);
        }
        settings.predefinedPlans = templates;
        await prisma_1.default.school.update({
            where: { id: req.user.schoolId },
            data: { settings }
        });
        res.json({ success: true, templates });
    }
    catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to save template' });
    }
});
// Delete predefined template
router.delete('/templates/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const { id } = req.params;
        const school = await prisma_1.default.school.findUnique({
            where: { id: req.user.schoolId }
        });
        if (!school) {
            return res.status(404).json({ error: 'School not found' });
        }
        const settings = school.settings || {};
        let templates = settings.predefinedPlans || [];
        templates = templates.filter((t) => t.id !== id);
        settings.predefinedPlans = templates;
        await prisma_1.default.school.update({
            where: { id: req.user.schoolId },
            data: { settings }
        });
        res.json({ success: true, templates });
    }
    catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});
exports.default = router;
//# sourceMappingURL=payment-plans.js.map