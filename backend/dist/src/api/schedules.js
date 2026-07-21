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
/**
 * Helper to check if a user is HOD or Admin and get their managed department IDs
 */
async function getManagedDepartments(req) {
    const user = req.user;
    if (user.role === 'SCHOOL_ADMIN' || user.role === 'SUPER_ADMIN') {
        return { isAdmin: true, isHOD: false, deptIds: [] };
    }
    // Find departments where this user is HOD
    const depts = await prisma_1.default.department.findMany({
        where: { headId: user.id }
    });
    return {
        isAdmin: false,
        isHOD: depts.length > 0,
        deptIds: depts.map(d => d.id)
    };
}
/**
 * @route   GET /api/schedules/my
 * @desc    Fetch shifts for the current logged-in user
 */
router.get('/my', async (req, res) => {
    try {
        const shifts = await prisma_1.default.shiftAssignment.findMany({
            where: { userId: req.user.id },
            orderBy: { dayOfWeek: 'asc' }
        });
        res.json(shifts);
    }
    catch (error) {
        console.error('Fetch my shifts error:', error);
        res.status(500).json({ error: 'Failed to fetch your schedules' });
    }
});
/**
 * @route   GET /api/schedules/staff
 * @desc    Fetch all shifts (Admin) or department-specific shifts (HOD)
 */
router.get('/staff', async (req, res) => {
    try {
        const { isAdmin, isHOD, deptIds } = await getManagedDepartments(req);
        if (!isAdmin && !isHOD) {
            return res.status(403).json({ error: 'Access denied. Admins and HODs only.' });
        }
        const schoolId = req.user.schoolId;
        const shifts = await prisma_1.default.shiftAssignment.findMany({
            where: {
                schoolId,
                ...(isAdmin ? {} : {
                    user: {
                        departmentId: { in: deptIds }
                    }
                })
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        secondaryRoles: true,
                        dept: { select: { id: true, name: true } }
                    }
                }
            },
            orderBy: [
                { user: { name: 'asc' } },
                { dayOfWeek: 'asc' }
            ]
        });
        res.json(shifts);
    }
    catch (error) {
        console.error('Fetch staff shifts error:', error);
        res.status(500).json({ error: 'Failed to fetch staff schedules' });
    }
});
/**
 * @route   POST /api/schedules
 * @desc    Create or update a shift assignment (Admin or HOD)
 */
router.post('/', async (req, res) => {
    const { userId, dayOfWeek, startTime, endTime, location, task } = req.body;
    if (!userId || dayOfWeek === undefined || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing required shift fields' });
    }
    try {
        const { isAdmin, isHOD, deptIds } = await getManagedDepartments(req);
        if (!isAdmin && !isHOD) {
            return res.status(403).json({ error: 'Unauthorized to assign schedules' });
        }
        // If HOD, target user must be in HOD's department
        if (!isAdmin) {
            const targetUser = await prisma_1.default.user.findFirst({
                where: { id: userId },
                select: { departmentId: true }
            });
            if (!targetUser || !targetUser.departmentId || !deptIds.includes(targetUser.departmentId)) {
                return res.status(403).json({ error: 'You can only assign shifts to members of your department' });
            }
        }
        const schoolId = req.user.schoolId;
        const shift = await prisma_1.default.shiftAssignment.create({
            data: {
                userId,
                dayOfWeek: parseInt(dayOfWeek),
                startTime,
                endTime,
                location,
                task,
                schoolId
            }
        });
        await (0, audit_1.logAction)(req, 'ASSIGN_SHIFT', 'ShiftAssignment', shift.id, { userId, task });
        res.json(shift);
    }
    catch (error) {
        console.error('Assign shift error:', error);
        res.status(500).json({ error: 'Failed to assign shift' });
    }
});
/**
 * @route   PUT /api/schedules/:id
 * @desc    Update a shift assignment (Admin or HOD)
 */
router.put('/:id', async (req, res) => {
    const { userId, dayOfWeek, startTime, endTime, location, task } = req.body;
    if (!userId || dayOfWeek === undefined || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing required shift fields' });
    }
    try {
        const { isAdmin, isHOD, deptIds } = await getManagedDepartments(req);
        if (!isAdmin && !isHOD) {
            return res.status(403).json({ error: 'Unauthorized to update schedules' });
        }
        const existingShift = (await prisma_1.default.shiftAssignment.findFirst({
            where: { id: String(req.params.id) },
            include: { user: { select: { departmentId: true } } }
        }));
        if (!existingShift) {
            return res.status(404).json({ error: 'Shift assignment not found' });
        }
        if (!isAdmin) {
            if (!existingShift.user.departmentId || !deptIds.includes(String(existingShift.user.departmentId))) {
                return res.status(403).json({ error: 'You can only update shifts for department members' });
            }
        }
        // Target user must also be in HOD's department (if they changed the user)
        if (!isAdmin && userId !== existingShift.userId) {
            const targetUser = await prisma_1.default.user.findFirst({
                where: { id: userId },
                select: { departmentId: true }
            });
            if (!targetUser || !targetUser.departmentId || !deptIds.includes(targetUser.departmentId)) {
                return res.status(403).json({ error: 'You can only assign shifts to members of your department' });
            }
        }
        const shift = await prisma_1.default.shiftAssignment.update({
            where: { id: String(req.params.id) },
            data: {
                userId,
                dayOfWeek: parseInt(dayOfWeek),
                startTime,
                endTime,
                location,
                task
            }
        });
        await (0, audit_1.logAction)(req, 'UPDATE_SHIFT', 'ShiftAssignment', shift.id, { userId, task });
        res.json(shift);
    }
    catch (error) {
        console.error('Update shift error:', error);
        res.status(500).json({ error: 'Failed to update shift assignment' });
    }
});
/**
 * @route   DELETE /api/schedules/:id
 * @desc    Delete a shift assignment
 */
router.delete('/:id', async (req, res) => {
    try {
        const { isAdmin, isHOD, deptIds } = await getManagedDepartments(req);
        if (!isAdmin && !isHOD) {
            return res.status(403).json({ error: 'Unauthorized to delete shift assignments' });
        }
        const shift = (await prisma_1.default.shiftAssignment.findFirst({
            where: { id: String(req.params.id) },
            include: { user: { select: { departmentId: true } } }
        }));
        if (!shift) {
            return res.status(404).json({ error: 'Shift assignment not found' });
        }
        if (!isAdmin) {
            if (!shift.user.departmentId || !deptIds.includes(String(shift.user.departmentId))) {
                return res.status(403).json({ error: 'You can only delete shifts for department members' });
            }
        }
        await prisma_1.default.shiftAssignment.delete({ where: { id: String(shift.id) } });
        await (0, audit_1.logAction)(req, 'DELETE_SHIFT', 'ShiftAssignment', shift.id, { task: shift.task });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete shift error:', error);
        res.status(500).json({ error: 'Failed to delete shift assignment' });
    }
});
exports.default = router;
//# sourceMappingURL=schedules.js.map