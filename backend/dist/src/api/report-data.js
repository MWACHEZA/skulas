import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
const router = Router();
/**
 * @route   GET /api/report-data/summary
 * @desc    [ADMIN/BURSAR] Get summary stats for the reports dashboard
 */
router.get('/summary', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const [studentCount, totalFees, totalPaid, expenseTotal, productCount] = await Promise.all([
            prisma.student.count({ where: { schoolId } }),
            prisma.fee.aggregate({ where: { schoolId }, _sum: { amount: true } }),
            prisma.fee.aggregate({ where: { schoolId }, _sum: { paid: true } }),
            prisma.expense.aggregate({ where: { schoolId }, _sum: { amount: true } }),
            prisma.physicalProduct.count({ where: { schoolId } })
        ]);
        res.json({
            students: studentCount,
            fees: {
                total: totalFees._sum.amount || 0,
                paid: totalPaid._sum.paid || 0,
                outstanding: (totalFees._sum.amount || 0) - (totalPaid._sum.paid || 0)
            },
            expenses: expenseTotal._sum.amount || 0,
            inventory: productCount
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch summary data' });
    }
});
/**
 * @route   GET /api/report-data/fees-balances
 * @desc    Get outstanding balances per student
 */
router.get('/fees-balances', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const students = await prisma.student.findMany({
            where: { schoolId },
            include: {
                fees: true
            }
        });
        const report = students.map(s => {
            const total = s.fees.reduce((acc, f) => acc + f.amount, 0);
            const paid = s.fees.reduce((acc, f) => acc + f.paid, 0);
            return {
                id: s.id,
                name: s.name,
                studentId: s.studentId,
                total,
                paid,
                balance: total - paid
            };
        }).filter(r => r.balance > 0);
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch balances' });
    }
});
// Additional endpoints would be added here for each card...
// For now, I'll provide the dashboard UI first.
/**
 * @route   GET /api/report-data/payroll-runs
 * @desc    Get summary of all payroll runs
 */
router.get('/payroll-runs', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const runs = await prisma.payrollRun.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { runDate: 'desc' }
        });
        res.json(runs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch payroll runs' });
    }
});
/**
 * @route   GET /api/report-data/payroll-run-details/:id
 * @desc    Get detailed entries for a payroll run
 */
router.get('/payroll-run-details/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const entries = await prisma.payrollEntry.findMany({
            where: {
                payrollRunId: req.params.id,
                schoolId: req.user.schoolId
            },
            orderBy: { employeeName: 'asc' }
        });
        res.json(entries);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch payroll entries' });
    }
});
/**
 * @route   GET /api/report-data/employee-payslips
 * @desc    Get all payslip records
 */
router.get('/employee-payslips', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const entries = await prisma.payrollEntry.findMany({
            where: { schoolId: req.user.schoolId },
            include: { payrollRun: { select: { month: true, year: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(entries);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch payslips' });
    }
});
/**
 * @route   GET /api/report-data/tax-contributions
 * @desc    Get aggregate tax and contributions per period
 */
router.get('/tax-contributions', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const runs = await prisma.payrollRun.findMany({
            where: { schoolId },
            include: {
                entries: {
                    select: {
                        taxAmount: true,
                        aidsLevy: true,
                        totalDeductions: true
                    }
                }
            },
            orderBy: { runDate: 'desc' }
        });
        const report = runs.map(run => {
            const totalTax = run.entries.reduce((sum, e) => sum + e.taxAmount, 0);
            const totalAids = run.entries.reduce((sum, e) => sum + e.aidsLevy, 0);
            const totalDeductions = run.entries.reduce((sum, e) => sum + e.totalDeductions, 0);
            return {
                period: `${run.month}/${run.year}`,
                employees: run.employeesCount,
                totalPAYE: totalTax,
                totalAidsLevy: totalAids,
                totalOtherDeductions: totalDeductions - (totalTax + totalAids),
                breakdown: `PAYE: $${totalTax.toFixed(2)}, AIDS Levy: $${totalAids.toFixed(2)}`
            };
        });
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch tax report' });
    }
});
/**
 * @route   GET /api/report-data/grocery-consumption
 * @desc    Get grocery consumption logs with filters
 */
router.get('/grocery-consumption', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { from, to } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const logs = await prisma.physicalProductConsumption.findMany({
            where: {
                schoolId,
                ...(from || to ? {
                    date: {
                        ...(from ? { gte: new Date(from) } : {}),
                        ...(to ? { lte: new Date(to) } : {})
                    }
                } : {})
            },
            include: {
                product: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch consumption logs' });
    }
});
/**
 * @route   GET /api/report-data/profit-loss
 * @desc    Get Profit & Loss summary and data for charting
 */
router.get('/profit-loss', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { from, to } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const dateFilter = (from || to) ? {
            date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {})
            }
        } : {};
        const createdAtFilter = (from || to) ? {
            createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {})
            }
        } : {};
        // 1. Income Sources
        const incomes = await prisma.income.findMany({ where: { schoolId, ...dateFilter } });
        const uniformSales = await prisma.uniformSale.findMany({ where: { schoolId, ...createdAtFilter } });
        const tuckshopSales = await prisma.tuckshopSale.findMany({ where: { schoolId, soldAt: createdAtFilter.createdAt } });
        // For Fees, we look at the paid amount in the Fee model or specific payment logs if they existed.
        // Since we don't have a specific Payment log for fees in the schema yet, we use the total paid on Fee records updated in this range.
        // NOTE: This is a simplified calculation for the MVP.
        const fees = await prisma.fee.findMany({ where: { schoolId, updatedAt: createdAtFilter.createdAt } });
        const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0) +
            uniformSales.reduce((sum, s) => sum + s.totalAmount, 0) +
            tuckshopSales.reduce((sum, s) => sum + s.totalAmount, 0) +
            fees.reduce((sum, f) => sum + f.paid, 0);
        // 2. Expense Sources
        const expenses = await prisma.expense.findMany({ where: { schoolId, ...dateFilter } });
        const payroll = await prisma.payrollEntry.findMany({ where: { schoolId, isPaid: true, updatedAt: createdAtFilter.createdAt } });
        const uniformPayments = await prisma.uniformSupplierPayment.findMany({ where: { schoolId, ...dateFilter } });
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0) +
            payroll.reduce((sum, p) => sum + p.netSalary, 0) +
            uniformPayments.reduce((sum, p) => sum + p.amount, 0);
        // 3. Student Credit (Excess payments)
        // We sum students with paid > amount on fees
        const creditFees = await prisma.fee.findMany({ where: { schoolId, paid: { gt: prisma.fee.fields.amount } } });
        const totalStudentCredit = creditFees.reduce((sum, f) => sum + (f.paid - f.amount), 0);
        // 4. Breakdown for Table
        const breakdown = [
            { description: 'Fees Takings', usd: fees.reduce((sum, f) => sum + f.paid, 0), zwg: 0 },
            { description: 'Uniform Sales', usd: uniformSales.reduce((sum, s) => sum + s.totalAmount, 0), zwg: 0 },
            { description: 'Tuckshop Sales', usd: tuckshopSales.reduce((sum, s) => sum + s.totalAmount, 0), zwg: 0 },
            { description: 'Other Income', usd: incomes.reduce((sum, i) => sum + i.amount, 0), zwg: 0 },
            { description: 'Staff Salaries', usd: payroll.reduce((sum, p) => sum + p.netSalary, 0), zwg: 0 },
            { description: 'General Expenses', usd: expenses.reduce((sum, e) => sum + e.amount, 0), zwg: 0 },
            { description: 'Uniform Procurement', usd: uniformPayments.reduce((sum, p) => sum + p.amount, 0), zwg: 0 },
        ];
        // 5. Chart Data (Last 6 months or filtered range)
        // Simple mock series for visualization if range is too small
        const chartData = [
            { name: 'Fees Income', value: fees.reduce((sum, f) => sum + f.paid, 0) },
            { name: 'Other Income', value: incomes.reduce((sum, i) => sum + i.amount, 0) + uniformSales.reduce((sum, s) => sum + s.totalAmount, 0) },
            { name: 'Total Expenses', value: totalExpenses }
        ];
        res.json({
            summary: {
                totalIncome,
                totalExpenses,
                netProfit: totalIncome - totalExpenses,
                totalStudentCredit
            },
            breakdown,
            chartData
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate P&L report' });
    }
});
/**
 * @route   GET /api/report-data/detailed-expenses
 * @desc    Get breakdown of expenses by type, group, and payment method
 */
router.get('/detailed-expenses', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { from, to, categoryId, paymentMode } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const expenses = await prisma.expense.findMany({
            where: {
                schoolId,
                ...(categoryId ? { categoryId: categoryId } : {}),
                ...(paymentMode ? { paymentMode: paymentMode } : {}),
                ...(from || to ? {
                    date: {
                        ...(from ? { gte: new Date(from) } : {}),
                        ...(to ? { lte: new Date(to) } : {})
                    }
                } : {})
            },
            include: { category: true },
            orderBy: { date: 'desc' }
        });
        // Grouping
        const byType = expenses.reduce((acc, e) => {
            acc[e.category.name] = (acc[e.category.name] || 0) + e.amount;
            return acc;
        }, {});
        const byMethod = expenses.reduce((acc, e) => {
            const mode = e.paymentMode || 'Not Specified';
            acc[mode] = (acc[mode] || 0) + e.amount;
            return acc;
        }, {});
        res.json({
            records: expenses,
            summary: {
                totalUSD: expenses.reduce((sum, e) => sum + e.amount, 0),
                totalZWG: 0,
                recordCount: expenses.length,
                typeCount: Object.keys(byType).length
            },
            groups: {
                byType: Object.entries(byType).map(([name, total]) => ({ name, total, count: expenses.filter(e => e.category.name === name).length })),
                byMethod: Object.entries(byMethod).map(([name, total]) => ({ name, total, count: expenses.filter(e => (e.paymentMode || 'Not Specified') === name).length }))
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch detailed expenses' });
    }
});
/**
 * @route   GET /api/report-data/revenue-allocation
 * @desc    Get revenue allocation breakdown
 */
router.get('/revenue-allocation', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { allocationId, classId } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const allocation = await prisma.revenueAllocation.findFirst({
            where: { id: allocationId, schoolId },
            include: { feeGroups: true }
        });
        if (!allocation)
            return res.status(404).json({ error: 'Allocation config not found' });
        // Sum fees for the groups in this allocation
        const feeGroupIds = allocation.feeGroups.map(fg => fg.id);
        const fees = await prisma.fee.findMany({
            where: {
                schoolId,
                feeGroupId: { in: feeGroupIds },
                // if classId filter student
                ...(classId ? { student: { classId: classId } } : {})
            }
        });
        const totalRevenue = fees.reduce((sum, f) => sum + f.paid, 0);
        const breakdown = allocation.breakdown.map(item => ({
            label: item.label,
            percentage: item.percentage,
            allocatedAmount: (item.percentage / 100) * totalRevenue
        }));
        res.json({
            configName: allocation.name,
            totalRevenue,
            breakdown
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch revenue allocation' });
    }
});
/**
 * @route   GET /api/report-data/enrollment-grouped
 * @desc    Get enrollment statistics grouped by class/gender
 */
router.get('/enrollment-grouped', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { groupName, studentCategory, classCategory, classIds } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const selectedClasses = classIds ? classIds.split(',') : [];
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                ...(selectedClasses.length > 0 ? { classId: { in: selectedClasses } } : {}),
                ...(studentCategory && studentCategory !== 'All' ? { boardingStatus: studentCategory } : {}),
                // GroupName can be mapped to year of enrollment or a custom metadata field
            },
            include: { class: { select: { name: true } } },
            orderBy: { name: 'asc' }
        });
        const total = students.length;
        const male = students.filter(s => s.gender === 'Male').length;
        const female = students.filter(s => s.gender === 'Female').length;
        res.json({
            summary: { total, male, female },
            records: students.map(s => ({
                name: s.name.split(' ')[0],
                surname: s.name.split(' ').slice(1).join(' '),
                gender: s.gender,
                group: groupName || '2024',
                category: s.boardingStatus,
                className: s.class?.name || 'Unassigned'
            }))
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch enrollment report' });
    }
});
/**
 * @route   GET /api/report-data/fees-takings
 * @desc    Get detailed school fees collection summary
 */
router.get('/fees-takings', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { from, to, classId, paymentMode } = req.query;
    const schoolId = req.user.schoolId;
    try {
        // Note: Since we don't have a separate Payment model for fees, we use the Fee records updated in this range
        // In a production app, there would be a FeePayment model. For now, we simulate with Fee.updatedAt
        const fees = await prisma.fee.findMany({
            where: {
                schoolId,
                paid: { gt: 0 },
                ...(classId ? { student: { classId: classId } } : {}),
                ...(from || to ? {
                    updatedAt: {
                        ...(from ? { gte: new Date(from) } : {}),
                        ...(to ? { lte: new Date(to) } : {})
                    }
                } : {})
            },
            include: {
                student: {
                    include: { class: { select: { name: true } } }
                }
            }
        });
        const totalUSD = fees.reduce((sum, f) => sum + f.paid, 0);
        const uniqueStudents = new Set(fees.map(f => f.studentId)).size;
        // Aggregations
        const perClass = {};
        const perStudent = {};
        fees.forEach(f => {
            const className = f.student.class?.name || 'Unassigned';
            if (!perClass[className])
                perClass[className] = { name: className, total: 0, studentCount: new Set() };
            perClass[className].total += f.paid;
            perClass[className].studentCount.add(f.studentId);
            const stuId = f.studentId;
            if (!perStudent[stuId])
                perStudent[stuId] = { admissionNo: f.student.studentId, name: f.student.name, className, receipts: 0, total: 0 };
            perStudent[stuId].receipts += 1;
            perStudent[stuId].total += f.paid;
        });
        res.json({
            summary: {
                totalUSD,
                totalZWG: 0,
                studentsPaid: uniqueStudents,
                receipts: fees.length
            },
            byClass: Object.values(perClass).map((c) => ({
                name: c.name,
                total: c.total,
                studentsPaid: c.studentCount.size
            })),
            byStudent: Object.values(perStudent),
            detailed: fees.map(f => ({
                id: f.id,
                date: f.updatedAt,
                studentName: f.student.name,
                className: f.student.class?.name || 'Unassigned',
                mode: 'ZB Bank', // Placeholder as Fee model doesn't store mode
                amount: f.paid,
                capturedBy: 'System'
            }))
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch fees takings' });
    }
});
/**
 * @route   GET /api/report-data/payments-analytics
 * @desc    Get detailed payments analytics for audit and reconciliation
 */
router.get('/payments-analytics', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { from, to, feeGroupId, paymentMode, receiptNo } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const fees = await prisma.fee.findMany({
            where: {
                schoolId,
                paid: { gt: 0 },
                ...(feeGroupId ? { feeGroupId: feeGroupId } : {}),
                // simulate receipt search with id suffix
                ...(receiptNo ? { id: { endsWith: receiptNo } } : {}),
                ...(from || to ? {
                    updatedAt: {
                        ...(from ? { gte: new Date(from) } : {}),
                        ...(to ? { lte: new Date(to) } : {})
                    }
                } : {})
            },
            include: { feeGroup: true }
        });
        const totalUSD = fees.reduce((sum, f) => sum + f.paid, 0);
        // Simulation of credit logic (paid > amount)
        const creditSaved = fees.reduce((sum, f) => sum + Math.max(0, f.paid - f.amount), 0);
        // Grouping for Charts
        const byDay = {};
        const byWeek = {};
        const byMode = { 'ZB Bank': 0, 'Cash': 0 };
        const byGroup = {};
        fees.forEach(f => {
            const day = f.updatedAt.toISOString().split('T')[0];
            byDay[day] = (byDay[day] || 0) + f.paid;
            // Simple week calc
            const week = `W${Math.ceil(f.updatedAt.getDate() / 7)}`;
            byWeek[week] = (byWeek[week] || 0) + f.paid;
            const groupName = f.feeGroup?.name || 'Other';
            byGroup[groupName] = (byGroup[groupName] || 0) + f.paid;
            // Mock mode distribution
            byMode['ZB Bank'] += f.paid;
        });
        // Reconciliation: Look for duplicate updated dates (mocking duplicate receipt detection)
        const dateCounts = fees.reduce((acc, f) => {
            const key = f.updatedAt.getTime();
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        const duplicates = Object.values(dateCounts).filter((c) => c > 1).length;
        res.json({
            summary: { totalUSD, totalZWG: 0, creditSaved, creditUsed: 0 },
            charts: {
                daily: Object.entries(byDay).map(([name, value]) => ({ name, value })),
                weekly: Object.entries(byWeek).map(([name, value]) => ({ name, value })),
                mode: Object.entries(byMode).map(([name, value]) => ({ name, value })),
                group: Object.entries(byGroup).map(([name, value]) => ({ name, value }))
            },
            records: fees.map(f => ({
                receipt: f.id.slice(-6).toUpperCase(),
                group: f.feeGroup?.name || 'General',
                date: f.updatedAt,
                mode: 'ZB Bank',
                usd: f.paid,
                zwg: 0,
                crSaved: Math.max(0, f.paid - f.amount),
                crUsed: 0
            })),
            audit: {
                duplicates,
                suspicious: 0,
                missingAlloc: 0
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch payments analytics' });
    }
});
/**
 * @route   GET /api/report-data/student-debtors
 * @desc    Get list of students with outstanding balances
 */
router.get('/student-debtors', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { year, term, status } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const fees = await prisma.fee.findMany({
            where: {
                schoolId,
                paid: { lt: prisma.fee.fields.amount },
                ...(year ? { year: parseInt(year) } : {}),
                ...(term && term !== 'All Terms' ? { term: term } : {}),
                ...(status && status !== 'All Statuses' ? { student: { status: status } } : {})
            },
            include: {
                student: {
                    include: { class: { select: { name: true } } }
                }
            }
        });
        const debtors = fees.map(f => ({
            name: f.student.name,
            className: f.student.class?.name || 'Unassigned',
            phone: f.student.phone || 'N/A',
            balance: f.amount - f.paid
        }));
        const totalDebt = debtors.reduce((sum, d) => sum + d.balance, 0);
        res.json({
            records: debtors,
            grandTotal: totalDebt
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch debtors report' });
    }
});
/**
 * @route   GET /api/report-data/balances-summary
 * @desc    Get total allocation and collection summary across fee groups
 */
router.get('/balances-summary', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { year, status, feeGroupIds } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const selectedIds = feeGroupIds ? feeGroupIds.split(',') : [];
        // 1. Get Fee Groups
        const feeGroups = await prisma.feeGroup.findMany({
            where: {
                schoolId,
                year: parseInt(year || '2024'),
                ...(selectedIds.length > 0 ? { id: { in: selectedIds } } : {})
            }
        });
        // 2. Fetch Fees for these groups
        const fees = await prisma.fee.findMany({
            where: {
                schoolId,
                feeGroupId: { in: feeGroups.map(fg => fg.id) },
                ...(status === 'Active Students Only' ? { student: { status: 'Active' } } : {})
            },
            include: { feeGroup: true }
        });
        // 3. Aggregate Data per Fee Group
        const groupStats = {};
        feeGroups.forEach(fg => {
            groupStats[fg.id] = {
                name: fg.name + (fg.billingType ? ` ${fg.billingType}` : ''),
                students: new Set(),
                allocated: 0,
                paid: 0,
                discounts: 0,
                collectible: 0,
                badDebt: 0
            };
        });
        fees.forEach(f => {
            if (!f.feeGroupId)
                return;
            const stats = groupStats[f.feeGroupId];
            if (!stats)
                return;
            stats.students.add(f.studentId);
            stats.allocated += f.amount;
            stats.paid += f.paid;
        });
        const detailedSummary = Object.values(groupStats).map((s) => ({
            name: s.name,
            students: s.students.size,
            allocated: s.allocated,
            paid: s.paid,
            discounts: 0,
            collectible: Math.max(0, s.allocated - s.paid),
            badDebt: 0
        }));
        // 4. Totals
        const totalAllocated = detailedSummary.reduce((sum, s) => sum + s.allocated, 0);
        const totalPaid = detailedSummary.reduce((sum, s) => sum + s.paid, 0);
        const totalStudents = new Set(fees.map(f => f.studentId)).size;
        const creditFees = fees.filter(f => f.paid > f.amount);
        const totalCredit = creditFees.reduce((sum, f) => sum + (f.paid - f.amount), 0);
        // 5. Chart Data
        const charts = {
            allocated: detailedSummary.map(s => ({ name: s.name, value: s.allocated })),
            collectible: detailedSummary.map(s => ({ name: s.name, value: s.collectible })),
            students: detailedSummary.map(s => ({ name: s.name, value: s.students })),
            payments: detailedSummary.map(s => ({ name: s.name, value: s.paid }))
        };
        res.json({
            summary: {
                totalAllocated,
                totalPaid,
                totalDiscounts: 0,
                outstanding: totalAllocated - totalPaid,
                badDebt: 0,
                credit: totalCredit,
                studentCount: totalStudents
            },
            records: detailedSummary,
            charts
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate balances summary' });
    }
});
/**
 * @route   GET /api/report-data/single-fee-group
 * @desc    Get student-level breakdown for a specific fee group
 */
router.get('/single-fee-group', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { feeGroupId, classId, status } = req.query;
    const schoolId = req.user.schoolId;
    try {
        if (!feeGroupId)
            return res.status(400).json({ error: 'Fee Group ID is required' });
        const fees = await prisma.fee.findMany({
            where: {
                schoolId,
                feeGroupId: feeGroupId,
                ...(classId ? { student: { classId: classId } } : {}),
                ...(status === 'Active Students Only' ? { student: { status: 'Active' } } : {})
            },
            include: {
                student: {
                    include: { class: { select: { name: true } } }
                },
                feeGroup: true
            },
            orderBy: { student: { name: 'asc' } }
        });
        const records = fees.map(f => ({
            name: f.student.name,
            className: f.student.class?.name || 'Unassigned',
            amount: f.amount,
            paid: f.paid,
            balance: Math.max(0, f.amount - f.paid)
        }));
        const totalAllocated = records.reduce((sum, r) => sum + r.amount, 0);
        const totalPaid = records.reduce((sum, r) => sum + r.paid, 0);
        const withBalance = records.filter(r => r.balance > 0).length;
        res.json({
            feeGroupName: fees[0]?.feeGroup?.name || 'Report',
            summary: {
                totalStudents: records.length,
                withBalance,
                zeroBalance: records.length - withBalance,
                totalAllocated,
                totalPaid,
                outstanding: totalAllocated - totalPaid
            },
            records
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch fee group details' });
    }
});
/**
 * @route   GET /api/report-data/student-balances
 * @desc    Get comprehensive balance matrix for students across multiple fee groups
 */
router.get('/student-balances', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { year, feeGroupIds, classIds, showBalanceOnly, searchName, searchSurname } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const selectedFeeGroupIds = feeGroupIds ? feeGroupIds.split(',') : [];
        const selectedClassIds = classIds ? classIds.split(',') : [];
        // 1. Get Fee Groups to define dynamic columns
        const feeGroups = await prisma.feeGroup.findMany({
            where: {
                schoolId,
                year: parseInt(year || '2024'),
                ...(selectedFeeGroupIds.length > 0 ? { id: { in: selectedFeeGroupIds } } : {})
            }
        });
        const feeGroupMap = new Map(feeGroups.map(fg => [fg.id, fg.name]));
        // 2. Get Students with filters
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                ...(selectedClassIds.length > 0 ? { classId: { in: selectedClassIds } } : {}),
                ...(searchName ? { name: { contains: searchName, mode: 'insensitive' } } : {}),
                // Simple search logic for surname if surname is part of name string
                ...(searchSurname ? { name: { contains: searchSurname, mode: 'insensitive' } } : {})
            },
            include: {
                class: { select: { name: true } },
                fees: {
                    where: {
                        feeGroupId: { in: feeGroups.map(fg => fg.id) }
                    }
                }
            }
        });
        // 3. Transform data into matrix and calculate metrics
        let records = students.map(s => {
            const groupBalances = {};
            let totalBalance = 0;
            let totalAllocated = 0;
            s.fees.forEach(f => {
                if (!f.feeGroupId)
                    return;
                const bal = Math.max(0, f.amount - f.paid);
                groupBalances[f.feeGroupId] = bal;
                totalBalance += bal;
                totalAllocated += f.amount;
            });
            return {
                id: s.id,
                name: s.name,
                className: s.class?.name || 'Unassigned',
                phone: s.phone || 'N/A',
                balances: groupBalances,
                totalBalance,
                totalAllocated
            };
        });
        if (showBalanceOnly === 'true') {
            records = records.filter(r => r.totalBalance > 0);
        }
        // 4. Summaries & Charts
        const totalOutstanding = records.reduce((sum, r) => sum + r.totalBalance, 0);
        const totalAllocatedAll = records.reduce((sum, r) => sum + r.totalAllocated, 0);
        const studentsWithBalance = records.filter(r => r.totalBalance > 0).length;
        // Highest Balance
        const highestDebtor = [...records].sort((a, b) => b.totalBalance - a.totalBalance)[0];
        // Chart: Balance by Class
        const classBalances = {};
        records.forEach(r => {
            classBalances[r.className] = (classBalances[r.className] || 0) + r.totalBalance;
        });
        // Chart: Balance by Fee Group
        const groupTotalBalances = {};
        records.forEach(r => {
            Object.entries(r.balances).forEach(([fgId, bal]) => {
                const name = feeGroupMap.get(fgId) || 'Other';
                groupTotalBalances[name] = (groupTotalBalances[name] || 0) + bal;
            });
        });
        // Chart: Top 10 Students
        const top10 = [...records]
            .sort((a, b) => b.totalBalance - a.totalBalance)
            .slice(0, 10)
            .map(r => ({ name: `${r.name} (${r.className})`, value: r.totalBalance }));
        res.json({
            summary: {
                totalOutstanding,
                studentsWithBalance,
                totalSelected: records.length,
                highestBalance: highestDebtor ? {
                    amount: highestDebtor.totalBalance,
                    student: highestDebtor.name,
                    class: highestDebtor.className
                } : null
            },
            charts: {
                byClass: Object.entries(classBalances).map(([name, value]) => ({ name, value })),
                byGroup: Object.entries(groupTotalBalances).map(([name, value]) => ({ name, value })),
                top10,
                donut: [
                    { name: 'Outstanding', value: totalOutstanding },
                    { name: 'Estimated Paid', value: Math.max(0, totalAllocatedAll - totalOutstanding) }
                ]
            },
            columns: feeGroups.map(fg => ({ id: fg.id, name: fg.name })),
            records
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate student balances report' });
    }
});
/**
 * @route   GET /api/report-data/communication-logs
 * @desc    Get SMS/WhatsApp/Email activity logs
 */
router.get('/communication-logs', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { type, searchName, searchSurname } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const logs = await prisma.communicationLog.findMany({
            where: {
                schoolId,
                ...(type ? { type: type } : {}),
                student: {
                    OR: [
                        { name: { contains: searchName || '', mode: 'insensitive' } },
                        { name: { contains: searchSurname || '', mode: 'insensitive' } }
                    ]
                }
            },
            include: {
                sender: { select: { name: true } },
                student: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch communication logs' });
    }
});
/**
 * @route   GET /api/report-data/payment-history
 * @desc    Get detailed payment audit trail for a student
 */
router.get('/payment-history', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { searchTerm } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                OR: [
                    { name: { contains: searchTerm || '', mode: 'insensitive' } },
                    { studentId: { contains: searchTerm || '', mode: 'insensitive' } }
                ]
            },
            include: {
                payments: {
                    include: { fee: { include: { feeGroup: true } } },
                    orderBy: { date: 'desc' }
                },
                uniformSales: {
                    include: { items: { include: { item: true } } },
                    orderBy: { saleDate: 'desc' }
                }
            }
        });
        // Grouping by fee group for the UI
        const report = students.map(s => {
            const groupedPayments = {};
            s.payments.forEach(p => {
                const groupName = p.fee?.feeGroup?.name || 'General';
                const billingType = p.fee?.feeGroup?.billingType || '';
                const year = p.fee?.feeGroup?.year || '';
                const key = `${groupName} - ${billingType} (${year})`;
                if (!groupedPayments[key])
                    groupedPayments[key] = [];
                groupedPayments[key].push({
                    date: p.date,
                    paymentMode: p.paymentMode,
                    reference: p.reference,
                    status: p.status,
                    amount: p.amount
                });
            });
            s.uniformSales.forEach(sale => {
                const key = 'Uniform Purchases';
                if (!groupedPayments[key])
                    groupedPayments[key] = [];
                groupedPayments[key].push({
                    date: sale.saleDate,
                    paymentMode: sale.paymentMode,
                    reference: sale.reference,
                    status: 'Paid',
                    amount: sale.totalAmount,
                    details: sale.items.map(si => `${si.item.name} (x${si.quantity})`).join(', ')
                });
            });
            return {
                id: s.id,
                name: s.name,
                studentId: s.studentId,
                history: Object.entries(groupedPayments).map(([group, payments]) => ({
                    group,
                    payments
                }))
            };
        });
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
});
/**
 * @route   GET /api/report-data/uniforms-analytics
 * @desc    Get detailed uniform sales and stock analytics
 */
router.get('/uniforms-analytics', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const [items, sales] = await Promise.all([
            prisma.uniformItem.findMany({ where: { schoolId } }),
            prisma.uniformSale.findMany({
                where: { schoolId },
                include: {
                    items: { include: { item: true } },
                    student: true
                }
            })
        ]);
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const lowStockItems = items.filter(i => i.stockLevel < 10).length;
        // Chart data
        const salesByDay = {};
        const salesByItem = {};
        sales.forEach(s => {
            const day = s.saleDate.toISOString().split('T')[0];
            salesByDay[day] = (salesByDay[day] || 0) + s.totalAmount;
            s.items.forEach(si => {
                const itemName = si.item.name;
                salesByItem[itemName] = (salesByItem[itemName] || 0) + (si.quantity * si.unitPrice);
            });
        });
        res.json({
            summary: {
                totalRevenue,
                totalSales: sales.length,
                lowStockItems,
                totalItems: items.length
            },
            charts: {
                daily: Object.entries(salesByDay).map(([name, value]) => ({ name, value })),
                items: Object.entries(salesByItem).map(([name, value]) => ({ name, value }))
            },
            records: sales.map(s => ({
                id: s.id,
                date: s.saleDate,
                student: s.student?.name || 'Walk-in',
                total: s.totalAmount,
                paymentMode: s.paymentMode,
                itemsCount: s.items.length
            }))
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch uniform analytics' });
    }
});
/**
 * @route   GET /api/report-data/fees-payments
 * @desc    Get all student payment records
 */
router.get('/fees-payments', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { from, to, paymentMode, searchTerm } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const payments = await prisma.studentPayment.findMany({
            where: {
                schoolId,
                ...(from && to ? { date: { gte: new Date(from), lte: new Date(to) } } : {}),
                ...(paymentMode ? { paymentMode: paymentMode } : {}),
                ...(searchTerm ? {
                    student: {
                        OR: [
                            { name: { contains: searchTerm, mode: 'insensitive' } },
                            { studentId: { contains: searchTerm, mode: 'insensitive' } }
                        ]
                    }
                } : {})
            },
            include: {
                student: { select: { name: true, studentId: true, class: { select: { name: true } } } },
                fee: { include: { feeGroup: { select: { name: true } } } }
            },
            orderBy: { date: 'desc' }
        });
        res.json(payments.map(p => ({
            id: p.id,
            date: p.date,
            studentName: p.student.name,
            studentId: p.student.studentId,
            className: p.student.class?.name || 'N/A',
            feeGroup: p.fee?.feeGroup?.name || 'General',
            mode: p.paymentMode,
            ref: p.reference,
            amount: p.amount,
            status: p.status
        })));
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch fees payments' });
    }
});
/**
 * @route   GET /api/report-data/audit-logs
 * @desc    Get system audit logs for administrative actions
 */
router.get('/audit-logs', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { from, to, action, actorId } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                schoolId,
                ...(from && to ? { createdAt: { gte: new Date(from), lte: new Date(to) } } : {}),
                ...(action ? { action: action } : {}),
                ...(actorId ? { actorId: actorId } : {})
            },
            include: {
                actor: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 500 // Limit to latest 500 for performance
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});
/**
 * @route   GET /api/report-data/fee-reminders
 * @desc    Get history of all fee reminders sent
 */
router.get('/fee-reminders', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const { from, to, type } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const logs = await prisma.feeReminderLog.findMany({
            where: {
                schoolId,
                ...(from && to ? { createdAt: { gte: new Date(from), lte: new Date(to) } } : {}),
                ...(type ? { type: type } : {})
            },
            include: {
                student: { select: { name: true, studentId: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch fee reminders' });
    }
});
/**
 * @route   GET /api/report-data/institutional-overview
 * @desc    Get high-level summary of institutional health
 */
router.get('/institutional-overview', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const [studentCount, staffCount, totalPayments, totalUniformSales, totalTuckshopSales, totalOtherIncome, totalExpenses, feeTotals] = await Promise.all([
            prisma.student.count({ where: { schoolId } }),
            prisma.user.count({ where: { schoolId, role: { in: ['TEACHER', 'STAFF', 'ADMIN', 'BURSAR'] } } }),
            prisma.studentPayment.aggregate({
                where: { schoolId, status: 'Commit' },
                _sum: { amount: true }
            }),
            prisma.uniformSale.aggregate({
                where: { schoolId },
                _sum: { totalAmount: true }
            }),
            prisma.tuckshopSale.aggregate({
                where: { schoolId },
                _sum: { totalAmount: true }
            }),
            prisma.income.aggregate({
                where: { schoolId },
                _sum: { amount: true }
            }),
            prisma.expense.aggregate({
                where: { schoolId },
                _sum: { amount: true }
            }),
            prisma.fee.aggregate({
                where: { schoolId },
                _sum: { amount: true, paid: true }
            })
        ]);
        const revenue = (totalPayments._sum?.amount || 0) +
            (totalUniformSales._sum?.totalAmount || 0) +
            (totalTuckshopSales._sum?.totalAmount || 0) +
            (totalOtherIncome._sum?.amount || 0);
        const expenses = totalExpenses._sum?.amount || 0;
        const debt = (feeTotals._sum?.amount || 0) - (feeTotals._sum?.paid || 0);
        res.json({
            summary: {
                totalStudents: studentCount,
                totalStaff: staffCount,
                totalRevenue: revenue,
                totalExpenses: expenses,
                outstandingDebt: debt,
                solvencyRatio: revenue / ((expenses + debt) || 1)
            },
            charts: {
                finance: [
                    { name: 'Revenue', value: revenue },
                    { name: 'Expenses', value: expenses },
                    { name: 'Uncollected', value: debt }
                ]
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch institutional overview' });
    }
});
export default router;
//# sourceMappingURL=report-data.js.map