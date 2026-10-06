"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateWorkingDays = void 0;
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../utils/audit");
const router = (0, express_1.Router)();
// Zimbabwe statutory public holidays defaults
const getZimbabwePublicHolidays = (year) => {
    return new Set([
        `${year}-01-01`, // New Year's Day
        `${year}-02-21`, // Robert Gabriel Mugabe National Youth Day
        `${year}-04-18`, // Independence Day
        `${year}-05-01`, // Workers' Day
        `${year}-05-25`, // Africa Day
        `${year}-08-10`, // Heroes' Day
        `${year}-08-11`, // Defense Forces Day
        `${year}-12-22`, // National Unity Day
        `${year}-12-25`, // Christmas Day
        `${year}-12-26`, // Boxing Day
    ]);
};
// Working-day calculator: auto-computes leave days excluding weekends and public holidays
const calculateWorkingDays = (start, end, customHolidays) => {
    const year = start.getFullYear();
    const holidays = customHolidays || getZimbabwePublicHolidays(year);
    let count = 0;
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const finish = new Date(end);
    finish.setHours(0, 0, 0, 0);
    while (cur <= finish) {
        const dayOfWeek = cur.getDay(); // 0 = Sun, 6 = Sat
        const dateStr = cur.toISOString().split('T')[0];
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
            count++;
        }
        cur.setDate(cur.getDate() + 1);
    }
    return count > 0 ? count : 1;
};
exports.calculateWorkingDays = calculateWorkingDays;
// Ensure default balance exists
const ensureBalance = async (schoolId, userId, academicYear) => {
    let balance = await prisma_1.default.leaveBalance.findUnique({
        where: { schoolId_userId_academicYear: { schoolId, userId, academicYear } }
    });
    if (!balance) {
        balance = await prisma_1.default.leaveBalance.create({
            data: { schoolId, userId, academicYear }
        });
    }
    return balance;
};
/**
 * GET /api/leave/types
 * Tenant-configurable leave-type catalog with editable defaults
 */
router.get('/types', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    const school = await prisma_1.default.school.findUnique({
        where: { id: schoolId },
        select: { customContent: true, type: true }
    });
    const customTypes = school?.customContent?.leaveTypes;
    if (customTypes && Array.isArray(customTypes)) {
        return res.json(customTypes);
    }
    // Default statutory & institutional catalog
    const defaults = [
        { code: 'annual', name: 'Annual Leave', defaultDays: 30, paid: true, requiresAttachment: false, description: 'Statutory annual leave (school holidays for teaching staff, 30 days for others)' },
        { code: 'sick', name: 'Sick Leave', defaultDays: 90, paid: true, requiresAttachment: true, attachmentThresholdDays: 2, description: 'Medical recovery (up to 30 days full pay, 60 days half pay)' },
        { code: 'maternity', name: 'Maternity Leave', defaultDays: 98, paid: true, requiresAttachment: true, attachmentThresholdDays: 0, description: '98 days fully paid with minimum 1-year service' },
        { code: 'paternity', name: 'Paternity Leave', defaultDays: 5, paid: true, requiresAttachment: false, description: '5 days paternity leave upon birth of child' },
        { code: 'compassionate', name: 'Compassionate Leave', defaultDays: 5, paid: true, requiresAttachment: false, description: 'Bereavement or critical family emergency' },
        { code: 'study', name: 'Study & Exam Leave', defaultDays: 14, paid: true, requiresAttachment: true, attachmentThresholdDays: 0, description: 'Professional development, degree exams, or academic workshops' },
        { code: 'unpaid', name: 'Unpaid Leave', defaultDays: 365, paid: false, requiresAttachment: false, description: 'Approved leave of absence with pro-rated payroll deduction' },
        { code: 'in_lieu', name: 'Day-Off-in-Lieu', defaultDays: 5, paid: true, requiresAttachment: false, description: 'Compensatory day off for weekend duty or tour oversight' },
        { code: 'special', name: 'Special Leave', defaultDays: 10, paid: true, requiresAttachment: false, description: 'Court witness, sports national representation, or governance duty' }
    ];
    res.json(defaults);
});
router.get('/my', auth_1.requireAuth, async (req, res) => {
    try {
        const leaves = await prisma_1.default.staffLeave.findMany({
            where: { schoolId: req.user.schoolId, userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(leaves);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaves' });
    }
});
router.get('/balance', auth_1.requireAuth, async (req, res) => {
    try {
        const balance = await ensureBalance(req.user.schoolId, req.user.id, new Date().getFullYear().toString());
        res.json(balance);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
});
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason, coverTeacherId, attachmentUrl, department, dutiesAffected } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = (0, exports.calculateWorkingDays)(start, end);
        const year = start.getFullYear().toString();
        const balance = await ensureBalance(req.user.schoolId, req.user.id, year);
        // Balance check
        const typeKey = `${leaveType.toLowerCase()}Total`;
        const usedKey = `${leaveType.toLowerCase()}Used`;
        if (balance[typeKey] !== undefined) {
            const remaining = balance[typeKey] - balance[usedKey];
            if (remaining < days) {
                return res.status(400).json({ error: `Insufficient ${leaveType} balance. You need ${days} working day(s) but have ${remaining} left.` });
            }
        }
        // Attachment requirement rules:
        const typeLower = (leaveType || '').toLowerCase();
        if (typeLower === 'sick' && days > 2 && !attachmentUrl) {
            return res.status(400).json({ error: 'Medical certificate/document attachment is mandatory for sick leave exceeding 2 days.' });
        }
        if (typeLower === 'maternity' && !attachmentUrl) {
            return res.status(400).json({ error: 'Expected delivery date confirmation / medical scan attachment is required for maternity leave.' });
        }
        if (typeLower === 'study' && !attachmentUrl) {
            return res.status(400).json({ error: 'Enrollment letter or examination schedule attachment is required for study leave.' });
        }
        const formattedReason = dutiesAffected ? `[Duties/Classes Affected: ${dutiesAffected}] ${reason || ''}`.trim() : reason;
        const leave = await prisma_1.default.staffLeave.create({
            data: {
                schoolId: req.user.schoolId,
                userId: req.user.id,
                leaveType,
                startDate: start,
                endDate: end,
                reason: formattedReason,
                coverTeacherId: coverTeacherId || null,
                attachmentUrl: attachmentUrl || null,
                department,
                days,
                status: 'pending_hod'
            }
        });
        await (0, audit_1.logAction)(req, 'APPLY_LEAVE', 'StaffLeave', leave.id, { leaveType, days });
        res.status(201).json(leave);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to apply for leave' });
    }
});
router.get('/department', auth_1.requireAuth, async (req, res) => {
    try {
        const isHod = req.user.secondaryRoles?.some(r => ['HOD', 'DEPARTMENT_HEAD', 'HOD'].includes(r.toUpperCase())) || req.user.role === 'SCHOOL_ADMIN';
        if (!isHod)
            return res.status(403).json({ error: 'Not authorized' });
        // For non-admin HODs, filter by a department query param or their teacher record
        let departmentFilter;
        if (req.user.role !== 'SCHOOL_ADMIN') {
            // Try to get department from Teacher record
            const teacher = await prisma_1.default.teacher.findFirst({
                where: { userId: req.user.id, schoolId: req.user.schoolId },
                select: { department: true }
            });
            departmentFilter = teacher?.department || undefined;
        }
        const leaves = await prisma_1.default.staffLeave.findMany({
            where: {
                schoolId: req.user.schoolId,
                status: 'pending_hod',
                ...(departmentFilter && { department: departmentFilter })
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(leaves);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch department leaves' });
    }
});
router.patch('/:id/hod-approve', auth_1.requireAuth, async (req, res) => {
    try {
        const isHod = req.user.secondaryRoles?.some(r => ['HOD', 'DEPARTMENT_HEAD', 'HOD'].includes(r.toUpperCase())) || req.user.role === 'SCHOOL_ADMIN';
        if (!isHod)
            return res.status(403).json({ error: 'Not authorized' });
        const id = req.params.id;
        const leave = await prisma_1.default.staffLeave.findUnique({ where: { id } });
        if (!leave)
            return res.status(404).json({ error: 'Leave not found' });
        if (leave.userId === req.user.id)
            return res.status(403).json({ error: 'Cannot approve own leave' });
        // Clash detection
        const clashes = await prisma_1.default.staffLeave.findMany({
            where: {
                schoolId: req.user.schoolId,
                department: leave.department,
                status: 'approved',
                startDate: { lte: leave.endDate },
                endDate: { gte: leave.startDate },
                id: { not: leave.id }
            }
        });
        const updated = await prisma_1.default.staffLeave.update({
            where: { id, schoolId: req.user.schoolId },
            data: {
                status: 'pending_head',
                hodApprovedAt: new Date(),
                hodApprovedById: req.user.id
            }
        });
        res.json({ leave: updated, clashes });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to approve leave' });
    }
});
router.patch('/:id/hod-reject', auth_1.requireAuth, async (req, res) => {
    try {
        const isHod = req.user.secondaryRoles?.some(r => ['HOD', 'DEPARTMENT_HEAD', 'HOD'].includes(r.toUpperCase())) || req.user.role === 'SCHOOL_ADMIN';
        if (!isHod)
            return res.status(403).json({ error: 'Not authorized' });
        const id = req.params.id;
        const updated = await prisma_1.default.staffLeave.update({
            where: { id, schoolId: req.user.schoolId },
            data: {
                status: 'rejected',
                rejectionReason: req.body.reason
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reject leave' });
    }
});
router.get('/all', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'SUPER_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const leaves = await prisma_1.default.staffLeave.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { createdAt: 'desc' }
        });
        const userIds = [...new Set(leaves.map(l => l.userId))];
        const users = await prisma_1.default.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true, role: true }
        });
        const userMap = new Map(users.map(u => [u.id, u]));
        const leavesWithStaff = leaves.map(leave => ({
            ...leave,
            staff: userMap.get(leave.userId) || null
        }));
        res.json(leavesWithStaff);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch all leaves' });
    }
});
router.patch('/:id/approve', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const id = req.params.id;
        const leave = await prisma_1.default.staffLeave.findUnique({ where: { id } });
        if (!leave)
            return res.status(404).json({ error: 'Leave not found' });
        // Check if governance approval is required for long leaves
        const school = await prisma_1.default.school.findUnique({
            where: { id: req.user.schoolId },
            select: { customContent: true, type: true }
        });
        const govThreshold = school?.customContent?.governanceLeaveThreshold ?? 14;
        const requiresGovernance = Boolean(school?.customContent?.requireGovernanceLeaveApproval);
        if (requiresGovernance && (leave.days || 1) > govThreshold) {
            const updated = await prisma_1.default.staffLeave.update({
                where: { id, schoolId: req.user.schoolId },
                data: {
                    status: 'pending_governance',
                    headApprovedAt: new Date(),
                    approvedBy: req.user.id
                }
            });
            await (0, audit_1.logAction)(req, 'HEAD_APPROVE_LEAVE_PENDING_GOVERNANCE', 'StaffLeave', leave.id, { days: leave.days, threshold: govThreshold });
            return res.json({ leave: updated, pendingGovernance: true });
        }
        const updated = await prisma_1.default.staffLeave.update({
            where: { id, schoolId: req.user.schoolId },
            data: { status: 'approved', approvedBy: req.user.id, headApprovedAt: new Date() }
        });
        // Update balance
        const year = leave.startDate.getFullYear().toString();
        const usedKey = `${(leave.leaveType || 'annual').toLowerCase()}Used`;
        await prisma_1.default.leaveBalance.updateMany({
            where: { schoolId: req.user.schoolId, userId: leave.userId, academicYear: year },
            data: { [usedKey]: { increment: leave.days || 1 } }
        });
        await (0, audit_1.logAction)(req, 'HEAD_APPROVE_LEAVE', 'StaffLeave', leave.id, { days: leave.days });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to approve leave' });
    }
});
router.patch('/:id/governance-approve', auth_1.requireAuth, async (req, res) => {
    try {
        const isGov = req.user.role === 'SCHOOL_ADMIN' || req.user.role === 'SUPER_ADMIN' ||
            req.user.secondaryRoles?.some(r => ['SDC_CHAIR', 'BOARD_CHAIR', 'COUNCIL_CHAIR', 'BURSAR'].includes(r.toUpperCase()));
        if (!isGov)
            return res.status(403).json({ error: 'Not authorized for governance signoff' });
        const id = req.params.id;
        const leave = await prisma_1.default.staffLeave.findUnique({ where: { id } });
        if (!leave)
            return res.status(404).json({ error: 'Leave not found' });
        if (leave.status !== 'pending_governance') {
            return res.status(400).json({ error: 'Leave application is not awaiting governance approval' });
        }
        const updated = await prisma_1.default.staffLeave.update({
            where: { id, schoolId: req.user.schoolId },
            data: { status: 'approved', approvedBy: req.user.id }
        });
        // Update balance
        const year = leave.startDate.getFullYear().toString();
        const usedKey = `${(leave.leaveType || 'annual').toLowerCase()}Used`;
        await prisma_1.default.leaveBalance.updateMany({
            where: { schoolId: req.user.schoolId, userId: leave.userId, academicYear: year },
            data: { [usedKey]: { increment: leave.days || 1 } }
        });
        await (0, audit_1.logAction)(req, 'GOVERNANCE_APPROVE_LEAVE', 'StaffLeave', leave.id, { days: leave.days });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to complete governance approval' });
    }
});
router.get('/:id/print-data', auth_1.requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        const leave = await prisma_1.default.staffLeave.findFirst({
            where: { id, schoolId: req.user.schoolId }
        });
        if (!leave)
            return res.status(404).json({ error: 'Leave not found' });
        const [applicant, coverTeacher, hodApprover, school] = await Promise.all([
            prisma_1.default.user.findUnique({ where: { id: leave.userId }, select: { name: true, email: true, role: true } }),
            leave.coverTeacherId ? prisma_1.default.user.findUnique({ where: { id: leave.coverTeacherId }, select: { name: true, email: true } }) : null,
            leave.hodApprovedById ? prisma_1.default.user.findUnique({ where: { id: leave.hodApprovedById }, select: { name: true } }) : null,
            prisma_1.default.school.findUnique({ where: { id: req.user.schoolId }, select: { name: true, address: true, phone: true } })
        ]);
        res.json({
            leave,
            applicant,
            coverTeacher,
            hodApprover,
            school
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch print data' });
    }
});
router.patch('/:id/reject', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const id = req.params.id;
        const leave = await prisma_1.default.staffLeave.update({
            where: { id, schoolId: req.user.schoolId },
            data: { status: 'rejected', rejectionReason: req.body.reason }
        });
        res.json(leave);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reject leave' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// Cover-teacher Suggestion based on Shared Timetable
// ─────────────────────────────────────────────────────────────────────────────
router.get('/suggest-cover', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { startDate, endDate, department } = req.query;
        // Find teachers in the same school/department
        const teachers = await prisma_1.default.user.findMany({
            where: {
                schoolId,
                role: 'TEACHER',
                isLocked: false,
                id: { not: req.user.id }
            },
            select: {
                id: true,
                name: true,
                email: true,
                teacher: { select: { id: true, department: true } }
            }
        });
        // Also check teachers who already have approved leaves overlapping these dates
        const busyTeachers = await prisma_1.default.staffLeave.findMany({
            where: {
                schoolId,
                status: 'approved',
                ...(startDate && endDate ? {
                    startDate: { lte: new Date(endDate) },
                    endDate: { gte: new Date(startDate) }
                } : {})
            },
            select: { userId: true }
        });
        const busyIds = new Set(busyTeachers.map(b => b.userId));
        const suggestions = teachers.map(t => ({
            userId: t.id,
            name: t.name,
            department: t.teacher?.department || 'General',
            isAvailable: !busyIds.has(t.id)
        })).sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable));
        res.json(suggestions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to suggest cover teachers' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// Bursar / Head Payroll Consequences View (Phase 3)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/payroll-consequences', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const approvedLeaves = await prisma_1.default.staffLeave.findMany({
            where: {
                schoolId,
                status: 'approved'
            },
            orderBy: { startDate: 'desc' }
        });
        // Map each approved leave with computed salary impact
        // Policy defaults:
        //  - 'unpaid': Full pro-rated deduction (unpaid days * (basePay / 30))
        //  - 'sick': If days > 14 (configurable threshold, default 14), half-pay for days beyond 14
        //  - 'annual', 'maternity', 'study', etc.: Fully paid within policy
        const enrichedLeaves = await Promise.all(approvedLeaves.map(async (leave) => {
            const user = await prisma_1.default.user.findUnique({
                where: { id: leave.userId },
                select: {
                    name: true,
                    email: true,
                    role: true,
                    employeeProfile: { select: { basePay: true } }
                }
            });
            const basePay = user?.employeeProfile?.basePay || 0;
            const dailyRate = basePay > 0 ? basePay / 30 : 0;
            const days = leave.days || (0, exports.calculateWorkingDays)(leave.startDate, leave.endDate);
            let impactType = 'PAID';
            let estimatedDeduction = 0;
            const type = (leave.leaveType || '').toLowerCase();
            if (type === 'unpaid') {
                impactType = 'UNPAID_DEDUCTION';
                estimatedDeduction = days * dailyRate;
            }
            else if (type === 'sick' && days > 14) {
                impactType = 'HALF_PAY';
                const halfPayDays = days - 14;
                estimatedDeduction = halfPayDays * (dailyRate * 0.5);
            }
            return {
                ...leave,
                employeeName: user?.name || 'Staff Member',
                employeeEmail: user?.email,
                employeeRole: user?.role,
                basePay,
                days,
                impactType,
                estimatedDeduction: Math.round(estimatedDeduction * 100) / 100
            };
        }));
        res.json(enrichedLeaves);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch leave payroll consequences' });
    }
});
// Leave Calendar View for Head / Bursar to spot risky clustering
router.get('/calendar-view', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const leaves = await prisma_1.default.staffLeave.findMany({
            where: {
                schoolId,
                status: 'approved'
            },
            select: {
                id: true,
                userId: true,
                leaveType: true,
                startDate: true,
                endDate: true,
                department: true,
                days: true
            }
        });
        const userIds = [...new Set(leaves.map(l => l.userId))];
        const users = await prisma_1.default.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true }
        });
        const userMap = new Map(users.map(u => [u.id, u.name]));
        const events = leaves.map(l => ({
            id: l.id,
            title: `${userMap.get(l.userId) || 'Staff'} (${l.leaveType})`,
            start: l.startDate,
            end: l.endDate,
            department: l.department,
            days: l.days
        }));
        res.json(events);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch leave calendar' });
    }
});
exports.default = router;
//# sourceMappingURL=leave.js.map