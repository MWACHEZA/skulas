"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const finance_schema_1 = require("../schemas/finance.schema");
const multer_1 = __importDefault(require("multer"));
const xlsx_utils_1 = require("../lib/xlsx-utils");
const notifications_1 = require("../services/notifications");
const audit_1 = require("../utils/audit");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
/**
 * @route   GET /api/fees/stats
 * @desc    [BURSAR/ADMIN] Get real-time fees dashboard stats
 */
router.get('/stats', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        // 1. Grand Totals (use aggregate instead of pulling all rows)
        const totals = await prisma_1.default.fee.aggregate({
            where: { schoolId },
            _sum: { amount: true, discount: true, paid: true }
        });
        const sumAmount = totals._sum.amount || 0;
        const sumDiscount = totals._sum.discount || 0;
        const totalCollected = totals._sum.paid || 0;
        const totalBilled = Math.max(0, sumAmount - sumDiscount);
        // 2. Collection by class (DB level grouping via raw SQL for relation joins)
        const classStats = await prisma_1.default.$queryRaw `
      SELECT c.name as "className", 
             SUM(GREATEST(0, f.amount - f.discount)) as "billed", 
             SUM(f.paid) as "collected"
      FROM "Fee" f
      JOIN "Student" s ON f."studentId" = s.id
      LEFT JOIN "SchoolClass" c ON s."classId" = c.id
      WHERE f."schoolId" = ${schoolId} AND s.status = 'Enrolled'
      GROUP BY c.id, c.name
    `;
        const collectionByClass = classStats.map(stat => {
            const billed = Number(stat.billed) || 0;
            const collected = Number(stat.collected) || 0;
            const pct = billed > 0 ? Math.round((collected / billed) * 100) : 0;
            return { className: stat.className || 'Unassigned', pct };
        }).sort((a, b) => b.pct - a.pct);
        // 3. Top defaulters (Calculated entirely in DB)
        const defaultersRaw = await prisma_1.default.$queryRaw `
      SELECT s.name as "studentName", c.name as "className", 
             SUM(GREATEST(0, f.amount - f.discount) - f.paid) as "arrears"
      FROM "Fee" f
      JOIN "Student" s ON f."studentId" = s.id
      LEFT JOIN "SchoolClass" c ON s."classId" = c.id
      WHERE f."schoolId" = ${schoolId} 
        AND f.status IN ('unpaid', 'partial', 'overdue')
        AND s.status = 'Enrolled'
      GROUP BY s.id, s.name, c.name
      HAVING SUM(GREATEST(0, f.amount - f.discount) - f.paid) > 0
      ORDER BY "arrears" DESC
      LIMIT 5
    `;
        const topDefaulters = defaultersRaw.map(d => ({
            studentName: d.studentName || 'Unknown',
            className: d.className || 'Unassigned',
            arrears: Number(d.arrears) || 0
        }));
        const outstanding = Math.max(0, totalBilled - totalCollected);
        const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;
        res.json({
            totalBilled,
            totalCollected,
            outstanding,
            collectionRate,
            collectionByClass,
            topDefaulters
        });
    }
    catch (error) {
        console.error('Fees stats error:', error);
        res.status(500).json({ error: 'Failed to generate fees statistics' });
    }
});
/**
 * @route   GET /api/fees/template
 * @desc    Download the Excel template for fee imports
 */
router.get('/template', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const buffer = await (0, xlsx_utils_1.generateFeeTemplateBuffer)();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=fee_import_template.xlsx');
        res.send(buffer);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate template' });
    }
});
/**
 * @route   POST /api/fees/import
 * @desc    Bulk import fees from an Excel file
 */
router.post('/import', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), upload.single('file'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No file uploaded' });
    try {
        const data = await (0, xlsx_utils_1.parseExcelBuffer)(req.file.buffer);
        const schoolId = req.user.schoolId;
        const results = {
            created: 0,
            skipped: 0,
            errors: []
        };
        // Bulk processing
        await prisma_1.default.$transaction(async (tx) => {
            for (const [index, row] of data.entries()) {
                const studentId = row['Student ID']?.toString();
                const email = row['Student Email'];
                const amount = parseFloat(row['Amount']);
                const paid = parseFloat(row['Paid']) || 0;
                const term = row['Term']?.toString();
                const year = parseInt(row['Year']);
                const description = row['Description'] || 'Imported Fee Record';
                if (!studentId && !email) {
                    results.errors.push(`Row ${index + 2} couldn't be imported because it's missing a Student ID or Email. Please update your Excel file to include at least one of these and upload again.`);
                    results.skipped++;
                    continue;
                }
                try {
                    // Find student in current school
                    const student = await tx.student.findFirst({
                        where: {
                            schoolId,
                            OR: [
                                { studentId: studentId || 'NON_EXISTENT' },
                                { email: email || 'NON_EXISTENT' }
                            ]
                        }
                    });
                    if (!student) {
                        results.errors.push(`Row ${index + 2}: Student ${studentId || email} not found in this school. Please double-check the ID or email spelling.`);
                        results.skipped++;
                        continue;
                    }
                    // Check for idempotency (avoid duplicating exact fee)
                    const existingFee = await tx.fee.findFirst({
                        where: {
                            schoolId,
                            studentId: student.id,
                            amount,
                            term,
                            year
                        }
                    });
                    if (existingFee) {
                        results.errors.push(`Row ${index + 2}: Fee of ${amount} for ${term} ${year} already exists for student ${student.name}`);
                        results.skipped++;
                        continue;
                    }
                    // Create Fee record
                    await tx.fee.create({
                        data: {
                            schoolId,
                            studentId: student.id,
                            amount,
                            paid,
                            status: paid >= amount ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
                            term,
                            year,
                            description,
                            dueDate: new Date(year, 11, 31) // EOY fallback
                        }
                    });
                    results.created++;
                }
                catch (err) {
                    results.errors.push(`Row ${index + 2}: ${err.message}`);
                    results.skipped++;
                }
            }
            // Strict mode: Rollback if ANY errors occurred
            if (results.errors.length > 0) {
                const err = new Error('IMPORT_VALIDATION_FAILED');
                err.details = results;
                throw err;
            }
        });
        res.json({
            success: true,
            summary: `Successfully imported ${results.created} records.`,
            details: results
        });
    }
    catch (error) {
        if (error.message === 'IMPORT_VALIDATION_FAILED') {
            return res.status(400).json({ error: 'Fee import failed due to validation errors. Entire import was rolled back.', details: error.details });
        }
        console.error('Import error:', error);
        res.status(500).json({ error: error.message || 'Failed to process Excel file' });
    }
});
/**
 * @route   GET /api/fees/groups
 * @desc    [BURSAR/ADMIN] Get all fee groups for the school
 */
router.get('/groups', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const groups = await prisma_1.default.feeGroup.findMany({
            where: { schoolId: req.user.schoolId },
            include: {
                _count: { select: { fees: true } },
                classAmounts: { select: { classId: true, amount: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(groups);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch fee groups' });
    }
});
/**
 * @route   POST /api/fees/groups
 * @desc    [BURSAR/ADMIN] Create or update a fee group
 */
router.post('/groups', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id, classAmounts, ...rest } = req.body;
        // Assuming FeeGroupSchema validates everything but we strip classAmounts for separate processing
        const validatedData = finance_schema_1.FeeGroupSchema.parse(rest);
        let group;
        if (id) {
            const existing = await prisma_1.default.feeGroup.findFirst({
                where: { id: id, schoolId }
            });
            if (!existing) {
                return res.status(403).json({ error: 'You do not have permission to update this fee group.' });
            }
            group = await prisma_1.default.feeGroup.update({
                where: { id: id },
                data: validatedData
            });
            // Update class amounts if provided
            if (Array.isArray(classAmounts)) {
                await prisma_1.default.feeGroupClassAmount.deleteMany({ where: { feeGroupId: group.id } });
                if (classAmounts.length > 0) {
                    await prisma_1.default.feeGroupClassAmount.createMany({
                        data: classAmounts.map((ca) => ({
                            feeGroupId: group.id,
                            classId: ca.classId,
                            amount: parseFloat(ca.amount)
                        }))
                    });
                }
            }
        }
        else {
            group = await prisma_1.default.feeGroup.create({ data: { ...validatedData, schoolId } });
            if (Array.isArray(classAmounts) && classAmounts.length > 0) {
                await prisma_1.default.feeGroupClassAmount.createMany({
                    data: classAmounts.map((ca) => ({
                        feeGroupId: group.id,
                        classId: ca.classId,
                        amount: parseFloat(ca.amount)
                    }))
                });
            }
        }
        // Return the updated group with classAmounts
        const updatedGroup = await prisma_1.default.feeGroup.findFirst({
            where: { id: group.id },
            include: { classAmounts: true, _count: { select: { fees: true } } }
        });
        res.json(updatedGroup);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to save fee group' });
    }
});
/**
 * @route   DELETE /api/fees/groups/:id
 * @desc    [BURSAR/ADMIN] Delete a fee group
 */
router.delete('/groups/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        await prisma_1.default.feeGroup.deleteMany({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete fee group' });
    }
});
/**
 * @route   GET /api/fees/students-list
 * @desc    [BURSAR/ADMIN] Get students list for invoicing
 */
router.get('/students-list', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    const { classIds, category } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const students = await prisma_1.default.student.findMany({
            where: {
                schoolId,
                ...(classIds ? { classId: { in: classIds.split(',') } } : {}),
                ...(category ? { boardingStatus: category } : {})
            },
            select: {
                id: true,
                studentId: true,
                name: true,
                boardingStatus: true,
                gender: true,
                class: { select: { name: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json(students);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch students list' });
    }
});
/**
 * @route   POST /api/fees/invoice/standard
 * @desc    [BURSAR/ADMIN] Process standard invoicing for multiple fee groups and students
 */
router.post('/invoice/standard', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    const { feeGroupIds, studentIds, dueDate, discount, paymentStatus, paymentMethod, description } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const feeGroups = await prisma_1.default.feeGroup.findMany({
            where: { id: { in: feeGroupIds }, schoolId },
            include: { classAmounts: true }
        });
        if (feeGroups.length === 0)
            return res.status(400).json({ error: 'No valid fee groups selected' });
        const results = await prisma_1.default.$transaction(async (tx) => {
            let createdCount = 0;
            const parsedDiscount = parseFloat(discount) || 0;
            const isPaid = paymentStatus === 'paid';
            for (const studentId of studentIds) {
                const student = await tx.student.findFirst({ where: { id: studentId } });
                if (!student)
                    continue;
                // Pre-calculate amounts for this student to distribute discount proportionally
                let totalAmount = 0;
                const studentFeeGroups = [];
                for (const group of feeGroups) {
                    // Check if already invoiced
                    const existing = await tx.fee.findFirst({
                        where: { studentId, feeGroupId: group.id, schoolId }
                    });
                    if (!existing) {
                        let amount = group.amount;
                        if (student.classId) {
                            const classAmount = group.classAmounts.find(ca => ca.classId === student.classId);
                            if (classAmount)
                                amount = classAmount.amount;
                        }
                        totalAmount += amount;
                        studentFeeGroups.push({ group, amount });
                    }
                }
                if (studentFeeGroups.length === 0)
                    continue;
                // Now create fees, distributing the discount proportionally to avoid double-application
                let remainingDiscount = parsedDiscount;
                for (let i = 0; i < studentFeeGroups.length; i++) {
                    const { group, amount } = studentFeeGroups[i];
                    let itemDiscount = 0;
                    if (totalAmount > 0) {
                        // Distribute proportionally and round to 2 decimals
                        itemDiscount = Math.round((amount / totalAmount) * parsedDiscount * 100) / 100;
                    }
                    // If it's the last item, give it the rest of the discount to avoid rounding loss
                    if (i === studentFeeGroups.length - 1) {
                        itemDiscount = Math.max(0, Math.round(remainingDiscount * 100) / 100);
                    }
                    remainingDiscount -= itemDiscount;
                    const netAmount = Math.max(0, Math.round((amount - itemDiscount) * 100) / 100);
                    const paidAmount = isPaid ? netAmount : 0;
                    const fee = await tx.fee.create({
                        data: {
                            studentId,
                            feeGroupId: group.id,
                            amount: Math.round(amount * 100) / 100,
                            discount: itemDiscount,
                            paid: paidAmount,
                            status: isPaid ? 'paid' : 'unpaid',
                            term: group.billingType,
                            year: group.year,
                            dueDate: dueDate ? new Date(dueDate) : new Date(group.year, 11, 31),
                            description: description || `${group.name} - ${group.billingType} ${group.year}`,
                            schoolId
                        }
                    });
                    if (isPaid && paymentMethod) {
                        await tx.studentPayment.create({
                            data: {
                                studentId,
                                feeId: fee.id,
                                amount: paidAmount,
                                paymentMode: paymentMethod,
                                status: 'Commit',
                                schoolId
                            }
                        });
                    }
                    createdCount++;
                }
            }
            return { createdCount };
        });
        res.json({ success: true, message: `Successfully created ${results.createdCount} fee records.` });
    }
    catch (error) {
        res.status(500).json({ error: 'Invoicing failed: ' + error.message });
    }
});
/**
 * @route   POST /api/fees/invoice/custom
 * @desc    [BURSAR/ADMIN] Process custom invoicing (variable amount)
 */
router.post('/invoice/custom', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    const { feeGroupId, studentIds, customAmount, dueDate, discount, paymentStatus, paymentMethod, description } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const group = await prisma_1.default.feeGroup.findFirst({
            where: { id: feeGroupId, schoolId }
        });
        if (!group)
            return res.status(400).json({ error: 'Invalid fee group selected' });
        const results = await prisma_1.default.$transaction(async (tx) => {
            let createdCount = 0;
            for (const studentId of studentIds) {
                const parsedDiscount = Math.round((parseFloat(discount) || 0) * 100) / 100;
                const amount = Math.round(parseFloat(customAmount) * 100) / 100;
                const netAmount = Math.max(0, Math.round((amount - parsedDiscount) * 100) / 100);
                const isPaid = paymentStatus === 'paid';
                const paidAmount = isPaid ? netAmount : 0;
                const fee = await tx.fee.create({
                    data: {
                        studentId,
                        feeGroupId: group.id,
                        amount: amount,
                        discount: parsedDiscount,
                        paid: paidAmount,
                        status: isPaid ? 'paid' : 'unpaid',
                        term: group.billingType,
                        year: group.year,
                        dueDate: dueDate ? new Date(dueDate) : new Date(group.year, 11, 31),
                        description: description || `Custom: ${group.name} - ${group.billingType} ${group.year}`,
                        schoolId
                    }
                });
                if (isPaid && paymentMethod) {
                    await tx.studentPayment.create({
                        data: {
                            studentId,
                            feeId: fee.id,
                            amount: paidAmount,
                            paymentMode: paymentMethod,
                            status: 'Commit',
                            schoolId
                        }
                    });
                }
                createdCount++;
            }
            return { createdCount };
        });
        res.json({ success: true, message: `Successfully created ${results.createdCount} custom fee records.` });
    }
    catch (error) {
        res.status(500).json({ error: 'Custom invoicing failed: ' + error.message });
    }
});
/**
 * @route   GET /api/fees/reminder-logs
 * @desc    [BURSAR/ADMIN] Get fee reminder logs
 */
router.get('/reminder-logs', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    const { status, startDate, endDate } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const logs = await prisma_1.default.feeReminderLog.findMany({
            where: {
                schoolId,
                ...(status && status !== 'ALL' ? { status: status } : {}),
                ...(startDate || endDate ? {
                    createdAt: {
                        ...(startDate ? { gte: new Date(startDate) } : {}),
                        ...(endDate ? { lte: new Date(endDate) } : {})
                    }
                } : {})
            },
            include: {
                student: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch reminder logs' });
    }
});
/**
 * @route   POST /api/fees/reminder-logs/:id/retry
 * @desc    [BURSAR/ADMIN] Retry a failed reminder
 */
router.post('/reminder-logs/:id/retry', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const log = await prisma_1.default.feeReminderLog.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!log)
            return res.status(404).json({ error: 'Log not found' });
        // Enqueue the notification using the new notification engine
        await notifications_1.NotificationService.enqueue({
            type: 'WhatsApp', // Fallback to Email can be handled by service later if needed
            schoolId: req.user.schoolId,
            senderId: req.user.id,
            studentId: log.studentId,
            template: 'fee_reminder',
            payload: { logId: log.id }
        });
        await prisma_1.default.feeReminderLog.update({
            where: { id: log.id },
            data: {
                status: 'PENDING', // Will be updated by webhook later
                lastAttempt: new Date(),
                retries: { increment: 1 }
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retry reminder' });
    }
});
// ═══════════════════════════════════════════════════════
// BULK INVOICES REGISTRY
// Stored as special FeeGroup records tagged with category
// so no schema migration is needed.
// ═══════════════════════════════════════════════════════
/**
 * @route   GET /api/fees/bulk-invoices
 * @desc    [BURSAR/ADMIN] Retrieve mass billing operation history
 */
router.get('/bulk-invoices', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const groups = await prisma_1.default.feeGroup.findMany({
            where: {
                schoolId,
                name: { startsWith: '[BULK]' }
            },
            include: {
                _count: { select: { fees: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        const invoices = groups.map(g => ({
            id: g.id,
            name: g.name.replace(/^\[BULK\]\s*/, '').replace(/\s*\|\|.*$/, ''),
            amount: g.amount,
            date: g.createdAt,
            category: g.billingType,
            description: g.name.match(/\|\|(.*)$/)?.[1]?.trim() || '',
            recipientsCount: g._count.fees
        }));
        res.json(invoices);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch bulk invoices' });
    }
});
/**
 * @route   POST /api/fees/bulk-invoices
 * @desc    [BURSAR/ADMIN] Initiate a mass billing operation
 */
router.post('/bulk-invoices', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { name, amount, description, category, targetType } = req.body;
        if (!name || !amount) {
            return res.status(400).json({ error: 'Name and amount are required' });
        }
        const parsedAmount = Math.round(parseFloat(amount) * 100) / 100;
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }
        const year = new Date().getFullYear();
        const billingLabel = category || 'General';
        // Create a FeeGroup tagged as BULK invoice
        // Append timestamp to avoid unique constraint conflicts
        const ts = Date.now();
        const feeGroup = await prisma_1.default.feeGroup.create({
            data: {
                name: `[BULK] ${name} || ${description || ''} | ${ts}`,
                amount: parsedAmount,
                year,
                billingType: billingLabel,
                isRecurring: false,
                remindersEnabled: false,
                schoolId
            }
        });
        // Apply fees to target students
        const studentFilter = { schoolId };
        if (targetType === 'Boarders Only')
            studentFilter.boardingStatus = 'Boarder';
        if (targetType === 'Day Students Only')
            studentFilter.boardingStatus = 'Day';
        const students = await prisma_1.default.student.findMany({
            where: studentFilter,
            select: { id: true }
        });
        if (students.length > 0) {
            await prisma_1.default.fee.createMany({
                data: students.map(s => ({
                    studentId: s.id,
                    feeGroupId: feeGroup.id,
                    amount: parsedAmount,
                    term: billingLabel,
                    year,
                    dueDate: new Date(year, 11, 31),
                    description: description || `${name} - Bulk Invoice`,
                    schoolId
                })),
                skipDuplicates: true
            });
        }
        res.status(201).json({
            success: true,
            id: feeGroup.id,
            recipientsCount: students.length
        });
    }
    catch (error) {
        console.error('Bulk invoice error:', error);
        res.status(500).json({ error: error.message || 'Failed to create bulk invoice' });
    }
});
/**
 * @route   DELETE /api/fees/bulk-invoices/:id
 * @desc    [BURSAR/ADMIN] Remove a bulk invoice record
 */
router.delete('/bulk-invoices/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { id } = req.params;
        const group = await prisma_1.default.feeGroup.findFirst({
            where: { id: id, schoolId, name: { startsWith: '[BULK]' } }
        });
        if (!group) {
            return res.status(404).json({ error: 'Bulk invoice not found' });
        }
        // Remove linked fee records then the group itself
        await prisma_1.default.fee.deleteMany({ where: { feeGroupId: id, schoolId } });
        await prisma_1.default.feeGroup.delete({ where: { id: id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete bulk invoice error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete bulk invoice' });
    }
});
/**
 * @route   GET /api/fees/invoices
 * @desc    [BURSAR/ADMIN] Retrieve all invoices (Fees) with student details and payments
 */
router.get('/invoices', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const invoices = await prisma_1.default.fee.findMany({
            where: { schoolId: req.user.schoolId },
            include: {
                student: { select: { name: true, class: { select: { name: true } } } },
                feeGroup: { select: { name: true } },
                payments: { select: { id: true, amount: true, date: true, paymentMode: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(invoices);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});
/**
 * @route   POST /api/fees/invoices/:id/pay
 * @desc    [BURSAR/ADMIN] Record a payment against an invoice
 */
router.post('/invoices/:id/pay', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { amount, method, date, description } = req.body;
        const feeId = String(req.params.id);
        const schoolId = req.user.schoolId;
        const idempotencyKey = req.header('Idempotency-Key');
        const paymentAmount = Math.round(parseFloat(amount) * 100) / 100;
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({ error: 'Valid positive amount required' });
        }
        if (idempotencyKey) {
            const existingPayment = await prisma_1.default.studentPayment.findFirst({
                where: { reference: idempotencyKey, feeId, schoolId }
            });
            if (existingPayment) {
                // Payment was already successfully processed
                return res.json({ success: true, message: 'Payment already processed (idempotent)', payment: existingPayment });
            }
        }
        const result = await prisma_1.default.$transaction(async (tx) => {
            // Read fee inside the transaction so no concurrent payment can interleave
            const fee = await tx.fee.findFirst({ where: { id: feeId, schoolId } });
            if (!fee)
                return null;
            const payment = await tx.studentPayment.create({
                data: {
                    studentId: fee.studentId,
                    feeId: fee.id,
                    amount: paymentAmount,
                    paymentMode: method,
                    status: 'Commit',
                    date: new Date(date || new Date()),
                    schoolId,
                    reference: idempotencyKey || description
                }
            });
            const updatedPaid = Math.round((fee.paid + paymentAmount) * 100) / 100;
            const netAmount = Math.max(0, Math.round((fee.amount - fee.discount) * 100) / 100);
            let newStatus = fee.status;
            if (updatedPaid >= netAmount) {
                newStatus = 'paid';
            }
            else if (updatedPaid > 0) {
                newStatus = 'partial';
            }
            const updatedFee = await tx.fee.update({
                where: { id: fee.id },
                data: { paid: updatedPaid, status: newStatus }
            });
            return {
                updatedFee,
                oldState: { paid: fee.paid, status: fee.status }
            };
        });
        if (!result)
            return res.status(404).json({ error: 'Invoice not found' });
        // Audit Log the payment and ledger modification
        await (0, audit_1.logAction)(req, 'RECORD_PAYMENT', 'Fee', feeId, {
            paymentAmount,
            method,
            previousValues: result.oldState,
            newValues: { paid: result.updatedFee.paid, status: result.updatedFee.status }
        });
        res.json({ success: true, message: 'Payment recorded successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Payment recording failed: ' + error.message });
    }
});
/**
 * @route   GET /api/fees/payments
 * @desc    [BURSAR/ADMIN] Retrieve all student payments (Payment History)
 */
router.get('/payments', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { classId, studentId } = req.query;
        const whereClause = { schoolId };
        if (studentId) {
            whereClause.studentId = String(studentId);
        }
        else if (classId) {
            whereClause.student = { classId: String(classId) };
        }
        const payments = await prisma_1.default.studentPayment.findMany({
            where: whereClause,
            include: {
                student: { select: { name: true, class: { select: { name: true } } } },
                fee: { select: { description: true, feeGroup: { select: { name: true } } } }
            },
            orderBy: { date: 'desc' }
        });
        res.json(payments);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});
/**
 * @route   POST /api/fees/ledger
 * @desc    [BURSAR/ADMIN] Create a student ledger (multi-item invoice)
 */
router.post('/ledger', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { title, studentId, dueDate, vatPercentage, discount, status, lineItems } = req.body;
        if (!studentId || !Array.isArray(lineItems) || lineItems.length === 0) {
            return res.status(400).json({ error: 'Student ID and at least one line item are required' });
        }
        const grossAmount = Math.round(lineItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0) * 100) / 100;
        const vatPct = parseFloat(vatPercentage) || 0;
        const calculatedVat = Math.round((grossAmount * (vatPct / 100)) * 100) / 100;
        const parsedDiscount = Math.round((parseFloat(discount) || 0) * 100) / 100;
        const totalAmount = Math.round((grossAmount + calculatedVat) * 100) / 100;
        const fee = await prisma_1.default.fee.create({
            data: {
                schoolId,
                studentId,
                term: 'Ledger',
                year: new Date().getFullYear(),
                amount: totalAmount,
                discount: parsedDiscount,
                vatPercentage: vatPct,
                dueDate: new Date(dueDate || new Date()),
                status: status || 'unpaid',
                description: title,
                isLedger: true,
                lineItems: {
                    create: lineItems.map((item) => ({
                        item: item.item,
                        amount: Math.round((parseFloat(item.amount) || 0) * 100) / 100,
                        date: new Date(item.date || new Date())
                    }))
                }
            },
            include: { lineItems: true }
        });
        res.json({ success: true, fee });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create ledger: ' + error.message });
    }
});
/**
 * @route   GET /api/fees/ledgers
 * @desc    [BURSAR/ADMIN] Retrieve all ledgers
 */
router.get('/ledgers', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const ledgers = await prisma_1.default.fee.findMany({
            where: { schoolId: req.user.schoolId, isLedger: true },
            include: {
                student: { select: { name: true, class: { select: { name: true } } } },
                lineItems: true,
                payments: { select: { id: true, amount: true, date: true, paymentMode: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(ledgers);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch ledgers' });
    }
});
exports.default = router;
//# sourceMappingURL=fees.js.map