"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const security_logger_1 = require("../lib/security-logger");
const payroll_schema_1 = require("../schemas/payroll.schema");
const router = (0, express_1.Router)();
// â•â•â•â•â•â•â•â•â•â•â• ALLOWANCES â•â•â•â•â•â•â•â•â•â•â•
router.get('/allowances', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const allowances = await prisma_1.default.payrollAllowance.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' }
        });
        res.json(allowances);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch allowances' });
    }
});
router.post('/allowances', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = payroll_schema_1.PayrollAllowanceSchema.parse(req.body);
        const allowance = await prisma_1.default.payrollAllowance.create({
            data: {
                ...validatedData,
                schoolId
            }
        });
        await (0, security_logger_1.logSecurityEvent)({
            actorId: req.user.id,
            action: 'CREATE_PAYROLL_ALLOWANCE',
            entityType: 'PayrollAllowance',
            entityId: allowance.id,
            details: { name: allowance.name },
            schoolId,
            ipAddress: req.ip
        });
        res.status(201).json(allowance);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Allowance already exists' });
        }
        res.status(400).json({ error: error.message || 'Failed to create allowance' });
    }
});
router.delete('/allowances/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = req.params.id;
        const schoolId = req.user.schoolId;
        const allowance = await prisma_1.default.payrollAllowance.delete({
            where: { id, schoolId }
        });
        await (0, security_logger_1.logSecurityEvent)({
            actorId: req.user.id,
            action: 'DELETE_PAYROLL_ALLOWANCE',
            entityType: 'PayrollAllowance',
            entityId: id,
            details: { name: allowance.name },
            schoolId,
            ipAddress: req.ip
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete allowance' });
    }
});
// â•â•â•â•â•â•â•â•â•â•â• DEDUCTIONS â•â•â•â•â•â•â•â•â•â•â•
router.get('/deductions', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const deductions = await prisma_1.default.payrollDeduction.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' }
        });
        res.json(deductions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch deductions' });
    }
});
router.post('/deductions', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = payroll_schema_1.PayrollDeductionSchema.parse(req.body);
        const deduction = await prisma_1.default.payrollDeduction.create({
            data: {
                ...validatedData,
                schoolId
            }
        });
        await (0, security_logger_1.logSecurityEvent)({
            actorId: req.user.id,
            action: 'CREATE_PAYROLL_DEDUCTION',
            entityType: 'PayrollDeduction',
            entityId: deduction.id,
            details: { name: deduction.name },
            schoolId,
            ipAddress: req.ip
        });
        res.status(201).json(deduction);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Deduction already exists' });
        }
        res.status(400).json({ error: error.message || 'Failed to create deduction' });
    }
});
router.delete('/deductions/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = req.params.id;
        const schoolId = req.user.schoolId;
        const deduction = await prisma_1.default.payrollDeduction.delete({
            where: { id, schoolId }
        });
        await (0, security_logger_1.logSecurityEvent)({
            actorId: req.user.id,
            action: 'DELETE_PAYROLL_DEDUCTION',
            entityType: 'PayrollDeduction',
            entityId: id,
            details: { name: deduction.name },
            schoolId,
            ipAddress: req.ip
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete deduction' });
    }
});
// â•â•â•â•â•â•â•â•â•â•â• TAX TABLES â•â•â•â•â•â•â•â•â•â•â•
router.get('/tax-tables', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const tables = await prisma_1.default.taxTable.findMany({
            where: { schoolId },
            include: {
                bands: { orderBy: { minIncome: 'asc' } }
            },
            orderBy: { effectiveFrom: 'desc' }
        });
        res.json(tables);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch tax tables' });
    }
});
router.post('/tax-tables', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { bands, ...tableData } = payroll_schema_1.TaxTableSchema.parse(req.body);
        const table = await prisma_1.default.taxTable.create({
            data: {
                ...tableData,
                schoolId,
                bands: {
                    create: bands.map(b => ({
                        schoolId,
                        minIncome: b.minIncome,
                        maxIncome: b.maxIncome,
                        rate: b.rate,
                        fixedAmount: b.fixedAmount
                    }))
                }
            },
            include: { bands: true }
        });
        await (0, security_logger_1.logSecurityEvent)({
            actorId: req.user.id,
            action: 'CREATE_TAX_TABLE',
            entityType: 'TaxTable',
            entityId: table.id,
            details: { name: table.name },
            schoolId,
            ipAddress: req.ip
        });
        res.status(201).json(table);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to create tax table' });
    }
});
router.delete('/tax-tables/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = req.params.id;
        const schoolId = req.user.schoolId;
        // Deleting the tax table will cascade delete the bands due to schema setup
        const table = await prisma_1.default.taxTable.delete({
            where: { id, schoolId }
        });
        await (0, security_logger_1.logSecurityEvent)({
            actorId: req.user.id,
            action: 'DELETE_TAX_TABLE',
            entityType: 'TaxTable',
            entityId: id,
            details: { name: table.name },
            schoolId,
            ipAddress: req.ip
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete tax table' });
    }
});
// â•â•â•â•â•â•â•â•â•â•â• EMPLOYEE PROFILES â•â•â•â•â•â•â•â•â•â•â•
router.get('/employees', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN', 'TEACHER', 'ANCILLARY', 'LIBRARIAN', 'CLINIC'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        // Fetch all users that constitute "staff" (excluding students, parents, alumni, applicants)
        const staffRoles = ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'];
        const employees = await prisma_1.default.user.findMany({
            where: {
                schoolId,
                role: { in: staffRoles }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                employeeProfile: true
            },
            orderBy: { name: 'asc' }
        });
        res.json(employees);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});
router.put('/employees/:userId', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const userId = req.params.userId;
        // Verify the user belongs to the school
        const user = await prisma_1.default.user.findFirst({
            where: { id: userId, schoolId }
        });
        if (!user) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        const validatedData = payroll_schema_1.EmployeeProfileSchema.parse(req.body);
        const profile = await prisma_1.default.employeeProfile.upsert({
            where: { userId },
            update: {
                jobTitle: validatedData.jobTitle,
                basePay: validatedData.basePay,
                payFrequency: validatedData.payFrequency,
                contractType: validatedData.contractType,
                hireDate: validatedData.hireDate,
                status: validatedData.status,
                bloodGroup: validatedData.bloodGroup,
                designation: validatedData.designation,
                // USD Account
                accountNumber: validatedData.accountNumber,
                accountHolderName: validatedData.accountHolderName,
                bankName: validatedData.bankName,
                bankBranch: validatedData.bankBranch,
                branchCode: validatedData.branchCode,
                accountType: validatedData.accountType,
                // ZiG Account
                accountNumberZig: validatedData.accountNumberZig,
                accountHolderNameZig: validatedData.accountHolderNameZig,
                bankNameZig: validatedData.bankNameZig,
                bankBranchZig: validatedData.bankBranchZig,
                branchCodeZig: validatedData.branchCodeZig,
                accountTypeZig: validatedData.accountTypeZig,
                facebookLink: validatedData.facebookLink,
                linkedinLink: validatedData.linkedinLink,
                twitterLink: validatedData.twitterLink,
            },
            create: {
                userId,
                schoolId,
                jobTitle: validatedData.jobTitle,
                basePay: validatedData.basePay,
                payFrequency: validatedData.payFrequency,
                contractType: validatedData.contractType,
                hireDate: validatedData.hireDate,
                status: validatedData.status,
                bloodGroup: validatedData.bloodGroup,
                designation: validatedData.designation,
                // USD Account
                accountNumber: validatedData.accountNumber,
                accountHolderName: validatedData.accountHolderName,
                bankName: validatedData.bankName,
                bankBranch: validatedData.bankBranch,
                branchCode: validatedData.branchCode,
                accountType: validatedData.accountType,
                // ZiG Account
                accountNumberZig: validatedData.accountNumberZig,
                accountHolderNameZig: validatedData.accountHolderNameZig,
                bankNameZig: validatedData.bankNameZig,
                bankBranchZig: validatedData.bankBranchZig,
                branchCodeZig: validatedData.branchCodeZig,
                accountTypeZig: validatedData.accountTypeZig,
                facebookLink: validatedData.facebookLink,
                linkedinLink: validatedData.linkedinLink,
                twitterLink: validatedData.twitterLink,
            }
        });
        await (0, security_logger_1.logSecurityEvent)({
            actorId: req.user.id,
            action: 'UPDATE_EMPLOYEE_PROFILE',
            entityType: 'EmployeeProfile',
            entityId: profile.id,
            details: { userId },
            schoolId,
            ipAddress: req.ip
        });
        res.json(profile);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to update employee profile' });
    }
});
// ═══════════ PAYROLL ENTRIES (PAYSLIPS) ═══════════
router.get('/entries', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);
        let whereClause = { schoolId };
        if (!isNaN(month) && !isNaN(year)) {
            whereClause.payrollRun = {
                month,
                year
            };
        }
        const entries = await prisma_1.default.payrollEntry.findMany({
            where: whereClause,
            include: {
                payrollRun: true,
                user: {
                    include: {
                        employeeProfile: true
                    }
                }
            },
            orderBy: { employeeName: 'asc' }
        });
        res.json(entries);
    }
    catch (error) {
        console.error('Error fetching payroll entries', error);
        res.status(500).json({ error: 'Failed to fetch payroll entries' });
    }
});
router.post('/generate', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { month, year } = req.body;
        if (!month || !year) {
            return res.status(400).json({ error: 'Month and year are required' });
        }
        // Check if payroll run already exists
        const existingRun = await prisma_1.default.payrollRun.findUnique({
            where: { schoolId_month_year: { schoolId, month, year } }
        });
        if (existingRun) {
            return res.status(400).json({ error: 'Payroll has already been generated for this period' });
        }
        const staffRoles = ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'];
        const employees = await prisma_1.default.user.findMany({
            where: {
                schoolId,
                role: { in: staffRoles },
                isLocked: false
            },
            include: {
                employeeProfile: true
            }
        });
        if (employees.length === 0) {
            return res.status(404).json({ error: 'No active employees found to generate payroll for' });
        }
        const payrollRun = await prisma_1.default.payrollRun.create({
            data: {
                schoolId,
                month,
                year,
                status: 'Completed',
                employeesCount: 0,
                totalGross: 0,
                totalDeductions: 0,
                totalNet: 0
            }
        });
        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        const entries = [];
        for (const emp of employees) {
            const basicSalary = emp.employeeProfile?.basePay || 0;
            // In a real application, we would calculate specific allowances and deductions
            const allowances = 0;
            const deductions = 0;
            const netSalary = basicSalary + allowances - deductions;
            entries.push({
                payrollRunId: payrollRun.id,
                schoolId,
                userId: emp.id,
                employeeName: emp.name,
                jobTitle: emp.employeeProfile?.jobTitle || emp.role,
                grossSalary: basicSalary,
                totalAllowances: allowances,
                totalDeductions: deductions,
                taxAmount: 0,
                netSalary: netSalary,
                isPaid: false
            });
            totalGross += basicSalary + allowances;
            totalDeductions += deductions;
            totalNet += netSalary;
        }
        await prisma_1.default.payrollEntry.createMany({
            data: entries
        });
        await prisma_1.default.payrollRun.update({
            where: { id: payrollRun.id },
            data: {
                employeesCount: entries.length,
                totalGross,
                totalDeductions,
                totalNet
            }
        });
        res.status(201).json({ message: 'Payroll generated successfully', count: entries.length });
    }
    catch (error) {
        console.error('Error generating payroll', error);
        res.status(500).json({ error: 'Failed to generate payroll' });
    }
});
exports.default = router;
//# sourceMappingURL=payroll.js.map