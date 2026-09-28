"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../utils/audit");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.use((0, auth_1.requireRole)('SCHOOL_ADMIN'));
/**
 * @route GET /api/admin/leadership/assignments
 * @desc List all leadership assignments for current school
 */
router.get('/assignments', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const assignments = await prisma_1.default.leadershipAssignment.findMany({
            where: { schoolId },
            include: {
                student: {
                    select: {
                        id: true,
                        studentId: true,
                        name: true,
                        class: { select: { id: true, name: true } }
                    }
                },
                hostel: { select: { id: true, name: true } },
                assignedBy: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assignments);
    }
    catch (err) {
        console.error('Fetch assignments error:', err);
        res.status(500).json({ error: 'Failed to fetch leadership assignments' });
    }
});
/**
 * @route POST /api/admin/leadership/assignments
 * @desc Assign a leadership role to a student
 */
router.post('/assignments', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { studentId, leadershipRole, hostelId, term, academicYear } = req.body;
        if (!studentId || !leadershipRole || !term || !academicYear) {
            res.status(400).json({ error: 'Student, role, term, and academic year are required' });
            return;
        }
        if (leadershipRole === 'HOSTEL_PREFECT' && !hostelId) {
            res.status(400).json({ error: 'Hostel assignment is required for Hostel Prefects' });
            return;
        }
        // Verify student belongs to this school
        const student = await prisma_1.default.student.findFirst({
            where: { id: studentId, schoolId }
        });
        if (!student) {
            res.status(404).json({ error: 'Student not found in your school' });
            return;
        }
        // Deactivate previous active assignment for this student if any
        await prisma_1.default.leadershipAssignment.updateMany({
            where: {
                schoolId,
                studentId,
                isActive: true
            },
            data: { isActive: false }
        });
        const newAssignment = await prisma_1.default.leadershipAssignment.create({
            data: {
                schoolId,
                studentId,
                leadershipRole,
                hostelId: leadershipRole === 'HOSTEL_PREFECT' ? hostelId : (hostelId || null),
                term: term.trim(),
                academicYear: academicYear.trim(),
                isActive: true,
                assignedById: req.user.id
            },
            include: {
                student: { select: { id: true, name: true, studentId: true } },
                hostel: { select: { id: true, name: true } }
            }
        });
        await (0, audit_1.logAction)(req, 'ASSIGN_STUDENT_LEADERSHIP', 'LeadershipAssignment', newAssignment.id, {
            student: student.name,
            role: leadershipRole,
            term,
            year: academicYear
        });
        res.status(201).json(newAssignment);
    }
    catch (err) {
        console.error('Assign leadership error:', err);
        res.status(500).json({ error: 'Failed to create leadership assignment' });
    }
});
/**
 * @route PATCH /api/admin/leadership/assignments/:id/deactivate
 * @desc Deactivate a leadership assignment early
 */
router.patch('/assignments/:id/deactivate', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const id = req.params.id;
        const assignment = await prisma_1.default.leadershipAssignment.findFirst({
            where: { id, schoolId }
        });
        if (!assignment) {
            res.status(404).json({ error: 'Leadership assignment not found' });
            return;
        }
        const updated = await prisma_1.default.leadershipAssignment.update({
            where: { id },
            data: { isActive: false }
        });
        await (0, audit_1.logAction)(req, 'DEACTIVATE_STUDENT_LEADERSHIP', 'LeadershipAssignment', id);
        res.json({ success: true, assignment: updated });
    }
    catch (err) {
        console.error('Deactivate assignment error:', err);
        res.status(500).json({ error: 'Failed to deactivate assignment' });
    }
});
/**
 * @route GET /api/admin/leadership/allowed-items
 * @desc List allowed cleaning supplies for this school
 */
router.get('/allowed-items', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const items = await prisma_1.default.studentAllowedItem.findMany({
            where: { schoolId },
            orderBy: { itemName: 'asc' }
        });
        res.json(items);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch allowed supplies' });
    }
});
/**
 * @route POST /api/admin/leadership/allowed-items
 * @desc Add a custom allowed item
 */
router.post('/allowed-items', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { itemSku, itemName, category } = req.body;
        if (!itemSku || !itemName) {
            res.status(400).json({ error: 'Item SKU and name are required' });
            return;
        }
        const created = await prisma_1.default.studentAllowedItem.upsert({
            where: {
                schoolId_itemSku: { schoolId, itemSku: itemSku.trim() }
            },
            update: {
                itemName: itemName.trim(),
                category: category?.trim() || 'cleaning',
                isActive: true
            },
            create: {
                schoolId,
                itemSku: itemSku.trim(),
                itemName: itemName.trim(),
                category: category?.trim() || 'cleaning',
                isActive: true
            }
        });
        res.status(201).json(created);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to add allowed supply item' });
    }
});
/**
 * @route PATCH /api/admin/leadership/allowed-items/:id/toggle
 * @desc Toggle enable/disable on an allowed item
 */
router.patch('/allowed-items/:id/toggle', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const id = req.params.id;
        const item = await prisma_1.default.studentAllowedItem.findFirst({
            where: { id, schoolId }
        });
        if (!item) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        const updated = await prisma_1.default.studentAllowedItem.update({
            where: { id },
            data: { isActive: !item.isActive }
        });
        await (0, audit_1.logAction)(req, 'TOGGLE_ALLOWED_SUPPLY_ITEM', 'StudentAllowedItem', id, { item: item.itemName, active: updated.isActive });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to toggle item status' });
    }
});
/**
 * @route POST /api/admin/leadership/allowed-items/seed-defaults
 * @desc Seed default 7 cleaning supplies for this school
 */
router.post('/allowed-items/seed-defaults', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const defaults = [
            { itemSku: 'broom', itemName: 'Broom', category: 'cleaning' },
            { itemSku: 'mop', itemName: 'Mop', category: 'cleaning' },
            { itemSku: 'bucket', itemName: 'Bucket', category: 'cleaning' },
            { itemSku: 'detergent', itemName: 'Floor Detergent', category: 'cleaning' },
            { itemSku: 'toilet_paper', itemName: 'Toilet Paper Pack', category: 'cleaning' },
            { itemSku: 'bulb', itemName: 'Lighting Bulb', category: 'maintenance' },
            { itemSku: 'dustbin', itemName: 'Dustbin', category: 'cleaning' }
        ];
        const results = [];
        for (const item of defaults) {
            const entry = await prisma_1.default.studentAllowedItem.upsert({
                where: {
                    schoolId_itemSku: { schoolId, itemSku: item.itemSku }
                },
                update: {
                    itemName: item.itemName,
                    category: item.category,
                    isActive: true
                },
                create: {
                    schoolId,
                    itemSku: item.itemSku,
                    itemName: item.itemName,
                    category: item.category,
                    isActive: true
                }
            });
            results.push(entry);
        }
        await (0, audit_1.logAction)(req, 'SEED_DEFAULT_CLEANING_ITEMS', 'StudentAllowedItem', undefined, { count: results.length });
        res.json({ message: 'Default cleaning supplies seeded successfully', items: results });
    }
    catch (err) {
        console.error('Seed defaults error:', err);
        res.status(500).json({ error: 'Failed to seed default supplies' });
    }
});
/**
 * @route PATCH /api/admin/leadership/hostels/:id/assign-warden
 * @desc Link a Matron / Boarding Master (User) to a Hostel
 */
router.patch('/hostels/:id/assign-warden', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const id = req.params.id;
        const { wardenUserId } = req.body;
        const hostel = await prisma_1.default.hostel.findFirst({
            where: { id, schoolId }
        });
        if (!hostel) {
            res.status(404).json({ error: 'Hostel not found' });
            return;
        }
        if (wardenUserId) {
            const wardenUser = await prisma_1.default.user.findFirst({
                where: { id: wardenUserId, schoolId }
            });
            if (!wardenUser) {
                res.status(400).json({ error: 'Assigned staff user not found in this school' });
                return;
            }
        }
        const updated = await prisma_1.default.hostel.update({
            where: { id },
            data: { wardenUserId: wardenUserId || null },
            include: {
                warden: { select: { id: true, name: true, email: true, role: true } }
            }
        });
        await (0, audit_1.logAction)(req, 'ASSIGN_HOSTEL_WARDEN', 'Hostel', id, { hostel: hostel.name, wardenId: wardenUserId });
        res.json(updated);
    }
    catch (err) {
        console.error('Assign warden error:', err);
        res.status(500).json({ error: 'Failed to assign hostel warden' });
    }
});
exports.default = router;
//# sourceMappingURL=admin-leadership.js.map