"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const ledger_service_1 = require("../services/ledger.service");
const security_logger_1 = require("../lib/security-logger");
const router = (0, express_1.Router)();
// ============================================================================
// STUDENT AWARDS
// ============================================================================
// Nominate Student
router.post('/nominate', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER'), async (req, res) => {
    const schoolId = req.user.schoolId;
    const nominatedById = req.user.id;
    const { studentId, category, title, reason, evidenceUrl, rewardType, amount } = req.body;
    try {
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId }
        });
        if (!student)
            return res.status(404).json({ message: 'Student not found' });
        // Enforce limit: 3 awards per teacher per class per week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (student.classId) {
            const recentAwardsInClass = await prisma_1.default.studentAward.count({
                where: {
                    schoolId,
                    nominatedById,
                    student: { classId: student.classId },
                    createdAt: { gte: weekAgo }
                }
            });
            if (recentAwardsInClass >= 3) {
                return res.status(400).json({ message: 'Limit reached: 3 awards per class per week' });
            }
        }
        const config = await prisma_1.default.awardConfig.findFirst({
            where: { schoolId, category }
        });
        const award = await prisma_1.default.studentAward.create({
            data: {
                schoolId,
                studentId,
                nominatedById,
                category,
                title,
                reason,
                evidenceUrl,
                points: config?.points || 0,
                rewardType: rewardType || 'CERTIFICATE',
                amount: parseFloat(amount) || 0,
                status: config?.requiresApprovalBy ? 'pending' : 'approved',
                approvedById: config?.requiresApprovalBy ? null : nominatedById
            }
        });
        if (award.status === 'approved') {
            await handleAwardApproval(award);
        }
        res.status(201).json(award);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});
// Approve Student Award
router.post('/:id/approve', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const schoolId = req.user.schoolId;
    const id = req.params.id;
    try {
        const award = await prisma_1.default.studentAward.findFirst({
            where: { id, schoolId, status: 'pending' },
            include: { student: true }
        });
        if (!award)
            return res.status(404).json({ message: 'Award not found or already processed' });
        const updated = await prisma_1.default.studentAward.update({
            where: { id },
            data: { status: 'approved', approvedById: req.user.id }
        });
        await handleAwardApproval(updated);
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});
async function handleAwardApproval(award) {
    try {
        const config = await prisma_1.default.awardConfig.findFirst({
            where: { schoolId: award.schoolId, category: award.category }
        });
        if (config?.autoAddsToHousePoints && award.points > 0) {
            const student = await prisma_1.default.student.findUnique({ where: { id: award.studentId } });
            if (student?.houseId) {
                await prisma_1.default.studentHouse.update({
                    where: { id: student.houseId },
                    data: { points: { increment: award.points } }
                });
            }
        }
        // Cross-module hook: Bursary Suggestion
        if (award.category === "Head's Award") {
            const bType = await prisma_1.default.bursaryType.findFirst({
                where: { schoolId: award.schoolId, type: 'merit' }
            });
            await prisma_1.default.studentBursary.create({
                data: {
                    schoolId: award.schoolId,
                    studentId: award.studentId,
                    type: bType ? bType.type : 'merit',
                    percentage: bType ? bType.defaultPercentage : 10,
                    validFrom: new Date(),
                    status: 'suggested',
                    suggestedFromAwardId: award.id
                }
            });
        }
        // Accounting Integration: Double-entry GL posting for awards with monetary benefits
        const awardAmt = Number(award.amount) || 0;
        if (awardAmt > 0) {
            if (award.rewardType === 'FEES_CREDIT') {
                // DR 5066 (Awards and Prizes Expense) / CR 1100 (Student Debtors Control / Accounts Receivable)
                await ledger_service_1.LedgerService.postDoubleEntry({
                    tenantId: award.schoolId,
                    debitCode: '5066',
                    creditCode: '1100',
                    amount: Math.round(awardAmt * 100) / 100,
                    description: `Student Award Fees Credit: ${award.title} (Student: ${award.studentId})`,
                    sourceModule: 'student_awards',
                    reference: award.id,
                    bypassApprovalCheck: true
                });
            }
            else if (award.rewardType === 'CASH_PRIZE') {
                // DR 5066 (Awards and Prizes Expense) / CR 1020 (Cash in Vault)
                await ledger_service_1.LedgerService.postDoubleEntry({
                    tenantId: award.schoolId,
                    debitCode: '5066',
                    creditCode: '1020',
                    amount: Math.round(awardAmt * 100) / 100,
                    description: `Student Award Cash Prize: ${award.title} (Student: ${award.studentId})`,
                    sourceModule: 'student_awards',
                    reference: award.id,
                    bypassApprovalCheck: true
                });
            }
        }
    }
    catch (err) {
        console.error('[Awards] Error during award approval cross-module handling:', err);
    }
}
// Hall of Fame
router.get('/hall-of-fame', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const awards = await prisma_1.default.studentAward.findMany({
            where: { schoolId, status: 'approved' },
            include: { student: true },
            orderBy: { points: 'desc' },
            take: 10
        });
        res.json(awards);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});
// ============================================================================
// STAFF AWARDS
// ============================================================================
// List Awards (Student and Staff)
router.get('/', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    const { type } = req.query;
    try {
        const [staffAwards, studentAwards] = await Promise.all([
            type === 'student' ? [] : prisma_1.default.staffAward.findMany({
                where: { schoolId },
                orderBy: { createdAt: 'desc' }
            }),
            type === 'staff' ? [] : prisma_1.default.studentAward.findMany({
                where: { schoolId },
                include: {
                    student: { select: { id: true, name: true, studentId: true, class: { select: { name: true } } } }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);
        const employeeIds = [...new Set(staffAwards.map(a => a.employeeId))];
        const users = employeeIds.length > 0 ? await prisma_1.default.user.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, name: true, email: true, role: true }
        }) : [];
        const userMap = new Map(users.map(u => [u.id, u]));
        const staffMapped = staffAwards.map(a => ({
            id: a.id,
            awardName: a.title,
            title: a.title,
            awardType: a.awardType,
            gift: a.rewardType === 'Gift' ? (a.reason || 'Gift') : a.rewardType,
            rewardType: a.rewardType,
            amount: a.amount,
            fundingSource: a.fundingSource,
            status: a.status,
            complianceOverrideReason: a.complianceOverrideReason,
            payrollAllowanceCreated: a.payrollAllowanceCreated,
            date: a.createdAt.toISOString(),
            createdAt: a.createdAt,
            user: userMap.get(a.employeeId) || { name: 'Unknown Staff' },
            employee: userMap.get(a.employeeId) || { name: 'Unknown Staff' }
        }));
        const studentMapped = studentAwards.map(sa => ({
            id: sa.id,
            awardName: sa.title,
            title: sa.title,
            awardType: 'Student Merit',
            gift: sa.rewardType || 'Certificate',
            rewardType: sa.rewardType,
            amount: sa.amount || 0,
            fundingSource: 'School',
            status: sa.status,
            date: sa.createdAt.toISOString(),
            createdAt: sa.createdAt,
            user: {
                id: sa.student.id,
                name: sa.student.name,
                studentId: sa.student.studentId,
                class: sa.student.class
            },
            student: sa.student
        }));
        const combined = [...studentMapped, ...staffMapped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json(combined);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch awards', error });
    }
});
router.get('/staff', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const staffAwards = await prisma_1.default.staffAward.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' }
        });
        const employeeIds = [...new Set(staffAwards.map(a => a.employeeId))];
        const users = await prisma_1.default.user.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, name: true, email: true, role: true }
        });
        const userMap = new Map(users.map(u => [u.id, u]));
        const response = staffAwards.map(a => ({
            id: a.id,
            awardName: a.title,
            title: a.title,
            awardType: a.awardType,
            gift: a.rewardType === 'Gift' ? (a.reason || 'Gift') : a.rewardType,
            rewardType: a.rewardType,
            amount: a.amount,
            fundingSource: a.fundingSource,
            status: a.status,
            complianceOverrideReason: a.complianceOverrideReason,
            payrollAllowanceCreated: a.payrollAllowanceCreated,
            date: a.createdAt.toISOString(),
            createdAt: a.createdAt,
            user: userMap.get(a.employeeId) || { name: 'Unknown Staff' },
            employee: userMap.get(a.employeeId) || { name: 'Unknown Staff' }
        }));
        res.json(response);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch staff awards', error });
    }
});
// Create Staff Award
router.post(['/', '/staff'], auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const schoolId = req.user.schoolId;
    const awardedById = req.user.id;
    const { employeeId, userId, awardType = 'Recognition', title, awardName, gift, reason, rewardType = 'Certificate Only', amount = 0, fundingSource = 'School Income', complianceOverrideReason, addToPayroll = true } = req.body;
    const empId = employeeId || userId;
    const awardTitle = title || awardName;
    const numAmount = parseFloat(amount) || 0;
    if (!empId || !awardTitle) {
        return res.status(400).json({ message: 'Employee and Award title are required' });
    }
    // Gate 4 / Compliance Rule: Non-blocking warning requiring justification when paying cash bonus from Governance Fund
    if (fundingSource === 'Governance Fund' && rewardType === 'Cash Bonus' && numAmount > 0) {
        if (!complianceOverrideReason || complianceOverrideReason.trim().length === 0) {
            return res.status(400).json({
                message: 'Compliance Warning: Distributing cash bonuses from the Governance Fund requires an explicit justification override reason.'
            });
        }
        await (0, security_logger_1.logSecurityEvent)({
            actorId: req.user.id,
            action: 'GOVERNANCE_FUND_STAFF_BONUS_OVERRIDE',
            entityType: 'StaffAward',
            entityId: empId,
            details: {
                amount: numAmount,
                fundingSource,
                complianceOverrideReason,
                employeeId: empId,
                awardTitle
            },
            schoolId,
            ipAddress: req.ip
        });
    }
    try {
        const student = await prisma_1.default.student.findUnique({ where: { id: empId } });
        if (student) {
            const newStudentAward = await prisma_1.default.studentAward.create({
                data: {
                    schoolId,
                    studentId: empId,
                    nominatedById: awardedById,
                    category: 'General Merit',
                    title: awardTitle,
                    reason: reason || gift || '',
                    rewardType: rewardType || 'CERTIFICATE',
                    amount: numAmount,
                    status: 'approved',
                    approvedById: awardedById
                }
            });
            return res.status(201).json(newStudentAward);
        }
        const newAward = await prisma_1.default.staffAward.create({
            data: {
                schoolId,
                employeeId: empId,
                awardedById,
                awardType,
                title: awardTitle,
                reason: reason || gift || '',
                rewardType,
                amount: numAmount,
                fundingSource,
                status: 'approved',
                complianceOverrideReason: complianceOverrideReason || null,
                // If addToPayroll is true, payrollAllowanceCreated is false so next payroll run picks it up as taxable bonus
                payrollAllowanceCreated: !addToPayroll
            }
        });
        // If paid immediately outside payroll, post double entry right away
        if (rewardType === 'Cash Bonus' && numAmount > 0 && !addToPayroll) {
            await ledger_service_1.LedgerService.postDoubleEntry({
                tenantId: schoolId,
                debitCode: '5066', // Awards and Prizes Expense
                creditCode: '1010', // Bank Account
                amount: Math.round(numAmount * 100) / 100,
                description: `Staff Award Cash Bonus: ${awardTitle}`,
                sourceModule: 'staff_awards',
                reference: newAward.id,
                userId: req.user?.id,
                ipAddress: req.ip,
                bypassApprovalCheck: true
            });
        }
        res.status(201).json(newAward);
    }
    catch (error) {
        console.error('Error creating staff award:', error);
        res.status(500).json({ message: 'Failed to create staff award', error });
    }
});
// Update Staff Award
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const schoolId = req.user.schoolId;
    const id = req.params.id;
    const { employeeId, userId, awardType, title, awardName, reason, gift, rewardType, amount, fundingSource, complianceOverrideReason } = req.body;
    try {
        const existing = await prisma_1.default.staffAward.findFirst({
            where: { id, schoolId }
        });
        if (!existing)
            return res.status(404).json({ message: 'Award not found' });
        const updated = await prisma_1.default.staffAward.update({
            where: { id },
            data: {
                employeeId: employeeId || userId || existing.employeeId,
                awardType: awardType || existing.awardType,
                title: title || awardName || existing.title,
                reason: reason !== undefined ? reason : (gift !== undefined ? gift : existing.reason),
                rewardType: rewardType || existing.rewardType,
                amount: amount !== undefined ? parseFloat(amount) : existing.amount,
                fundingSource: fundingSource || existing.fundingSource,
                complianceOverrideReason: complianceOverrideReason !== undefined ? complianceOverrideReason : existing.complianceOverrideReason
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update award', error });
    }
});
// Delete Staff Award
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const schoolId = req.user.schoolId;
    const id = req.params.id;
    try {
        const existing = await prisma_1.default.staffAward.findFirst({
            where: { id, schoolId }
        });
        if (!existing)
            return res.status(404).json({ message: 'Award not found' });
        await prisma_1.default.staffAward.delete({
            where: { id }
        });
        res.json({ success: true, message: 'Award deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to delete award', error });
    }
});
exports.default = router;
//# sourceMappingURL=awards.js.map