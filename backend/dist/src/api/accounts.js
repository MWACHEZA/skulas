"use strict";
/**
 * Accounting API — Chart of Accounts management, Journal, and all reports.
 * All routes are BURSAR/SCHOOL_ADMIN only.
 *
 * Routes:
 *   CoA CRUD        GET/POST/PATCH/DELETE  /api/accounts/coa
 *   Journal         GET/POST               /api/accounts/journal
 *   Journal Reversal POST                  /api/accounts/journal/:id/reverse
 *   Reports         GET                    /api/accounts/reports/*
 *   Periods         GET/POST               /api/accounts/periods
 *   Bank Rec        GET/POST               /api/accounts/bank-reconciliation
 *   Income/Expense  GET/POST               /api/accounts/income, /api/accounts/expenses
 *   Liabilities     GET/POST/PATCH         /api/accounts/liabilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const ledger_service_1 = require("../services/ledger.service");
const coa_seeder_1 = require("../../prisma/seeders/coa.seeder");
const ledger_events_1 = require("../services/ledger-events");
const router = (0, express_1.Router)();
// ═══════════════════════════════════════════════════════════════
// REAL-TIME SSE PUSH STREAM
// ═══════════════════════════════════════════════════════════════
/**
 * @route   GET /api/accounts/events/stream
 * @desc    Server-Sent Events stream for tenant accounting updates
 */
router.get('/events/stream', auth_1.requireAuth, (req, res) => {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
        return res.status(403).json({ error: 'Tenant school ID required' });
    }
    // Set SSE response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
    const clientId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    ledger_events_1.LedgerEvents.subscribe(clientId, schoolId, req.user.role, res);
});
// ═══════════════════════════════════════════════════════════════
// CHART OF ACCOUNTS — CRUD
// ═══════════════════════════════════════════════════════════════
/**
 * @route   GET /api/accounts/coa
 * @desc    Get full Chart of Accounts (hierarchical tree)
 */
router.get('/coa', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        // Auto-seed if school doesn't have a CoA yet
        await (0, coa_seeder_1.seedChartOfAccounts)(schoolId, prisma_1.default);
        const accounts = await prisma_1.default.chartOfAccount.findMany({
            where: { schoolId },
            orderBy: { code: 'asc' }
        });
        res.json(accounts);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch chart of accounts' });
    }
});
/**
 * @route   POST /api/accounts/coa
 * @desc    Create a custom account in Chart of Accounts
 */
router.post('/coa', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { code, name, type, parentId, description } = req.body;
        if (!code || !name || !type) {
            return res.status(400).json({ error: 'Code, name, and type are required' });
        }
        const existing = await prisma_1.default.chartOfAccount.findUnique({
            where: { schoolId_code: { schoolId, code } }
        });
        if (existing) {
            return res.status(400).json({ error: `Account code ${code} already exists for this school` });
        }
        if (parentId) {
            const parent = await prisma_1.default.chartOfAccount.findFirst({ where: { id: parentId, schoolId } });
            if (!parent)
                return res.status(404).json({ error: 'Parent account not found' });
            if (parent.type !== type) {
                return res.status(400).json({ error: `Parent account type (${parent.type}) must match child type (${type})` });
            }
        }
        const account = await prisma_1.default.chartOfAccount.create({
            data: {
                schoolId,
                code,
                name,
                type,
                parentId,
                description,
                isSystemAccount: false
            }
        });
        res.status(201).json(account);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to create account' });
    }
});
/**
 * @route   PATCH /api/accounts/coa/:id
 * @desc    Update a Chart of Accounts entry.
 *          - name & description: editable on ALL accounts (system and custom)
 *          - isActive / parentId: editable on custom accounts only
 *          - code & type: NEVER editable (structural integrity)
 */
router.patch('/coa/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = String(req.params.id);
        const schoolId = req.user.schoolId;
        const { name, description, isActive, parentId } = req.body;
        const account = await prisma_1.default.chartOfAccount.findFirst({ where: { id, schoolId } });
        if (!account)
            return res.status(404).json({ error: 'Account not found' });
        // Build update payload — name and description are always editable
        const updateData = {};
        if (name !== undefined)
            updateData.name = String(name).trim();
        if (description !== undefined)
            updateData.description = description;
        // isActive and parentId are only editable on non-system accounts
        if (!account.isSystemAccount) {
            if (isActive !== undefined)
                updateData.isActive = isActive;
            if (parentId !== undefined)
                updateData.parentId = parentId;
        }
        else if (isActive === false) {
            return res.status(403).json({
                error: 'System accounts cannot be deactivated. Deactivate a custom sub-account instead.'
            });
        }
        // Guard: cannot deactivate an account with recent journal entries
        if (updateData.isActive === false) {
            const recentEntry = await prisma_1.default.journalEntryLine.findFirst({
                where: {
                    accountId: id,
                    journalEntry: { date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }
                }
            });
            if (recentEntry) {
                return res.status(400).json({
                    error: 'Cannot deactivate an account that has journal entries in the last 90 days'
                });
            }
        }
        const updated = await prisma_1.default.chartOfAccount.update({
            where: { id },
            data: updateData
        });
        res.json(updated);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to update account' });
    }
});
/**
 * @route   PATCH /api/accounts/coa/:id/rename
 * @desc    Dedicated endpoint to rename any account (system or custom).
 *          Only updates name and optionally description — code and type are immutable.
 */
router.patch('/coa/:id/rename', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = String(req.params.id);
        const schoolId = req.user.schoolId;
        const { name, description } = req.body;
        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'Account name is required' });
        }
        const account = await prisma_1.default.chartOfAccount.findFirst({ where: { id, schoolId } });
        if (!account)
            return res.status(404).json({ error: 'Account not found' });
        const updated = await prisma_1.default.chartOfAccount.update({
            where: { id },
            data: {
                name: String(name).trim(),
                ...(description !== undefined ? { description } : {})
            }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to rename account' });
    }
});
/**
 * @route   DELETE /api/accounts/coa/:id
 * @desc    Delete a custom account (system accounts cannot be deleted)
 */
router.delete('/coa/:id', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = String(req.params.id);
        const schoolId = req.user.schoolId;
        const account = await prisma_1.default.chartOfAccount.findFirst({ where: { id, schoolId } });
        if (!account)
            return res.status(404).json({ error: 'Account not found' });
        if (account.isSystemAccount)
            return res.status(403).json({ error: 'System accounts cannot be deleted' });
        const hasEntries = await prisma_1.default.journalEntryLine.count({ where: { accountId: id } });
        if (hasEntries > 0) {
            await prisma_1.default.chartOfAccount.update({ where: { id }, data: { isActive: false } });
            return res.json({ success: true, message: 'Account deactivated (has journal entries, cannot be deleted)' });
        }
        await prisma_1.default.chartOfAccount.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to delete account' });
    }
});
// ═══════════════════════════════════════════════════════════════
// CATEGORIES (CoA mapping)
// ═══════════════════════════════════════════════════════════════
router.get('/categories', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        await (0, coa_seeder_1.seedChartOfAccounts)(schoolId, prisma_1.default);
        const accounts = await prisma_1.default.chartOfAccount.findMany({
            where: { schoolId, isActive: true },
            orderBy: { code: 'asc' }
        });
        res.json(accounts);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch categories' });
    }
});
router.post('/categories', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { name, type } = req.body;
        if (!name || !type)
            return res.status(400).json({ error: 'Name and Type are required' });
        const prefix = type === 'ASSET' ? '1' : type === 'LIABILITY' ? '3' : type === 'EQUITY' ? '4' : type === 'INCOME' ? '5' : '7';
        const count = await prisma_1.default.chartOfAccount.count({ where: { schoolId, type } });
        const code = `${prefix}${80 + count}0`;
        const account = await prisma_1.default.chartOfAccount.create({
            data: {
                schoolId,
                code,
                name,
                type,
                isSystemAccount: false
            }
        });
        res.status(201).json(account);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to create category' });
    }
});
// ═══════════════════════════════════════════════════════════════
// JOURNAL ENTRIES — MANUAL POSTING & REVERSALS
// ═══════════════════════════════════════════════════════════════
router.get('/journal', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const period = req.query.period;
        const sourceType = req.query.sourceType;
        const status = req.query.status;
        const page = Number(req.query.page ?? '1');
        const limit = Number(req.query.limit ?? '50');
        const where = { schoolId };
        if (period)
            where.period = period;
        if (sourceType)
            where.sourceType = sourceType;
        if (status)
            where.status = status;
        const [entries, total] = await Promise.all([
            prisma_1.default.journalEntry.findMany({
                where,
                include: {
                    lines: {
                        include: { account: { select: { code: true, name: true, type: true } } }
                    }
                },
                orderBy: { date: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma_1.default.journalEntry.count({ where })
        ]);
        res.json({ entries, total, page, limit });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch journal entries' });
    }
});
router.post('/journal', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { date, description, lines, sourceType, sourceId } = req.body;
        const entry = await ledger_service_1.LedgerService.postEntry({
            schoolId,
            date: new Date(date),
            description,
            sourceType: sourceType || 'manual_journal',
            sourceId,
            createdByUserId: req.user.id,
            lines
        });
        res.status(201).json(entry);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to post journal entry' });
    }
});
router.post('/journal/:id/reverse', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = String(req.params.id);
        const { reason, date } = req.body;
        const schoolId = req.user.schoolId;
        const entry = await prisma_1.default.journalEntry.findFirst({ where: { id, schoolId } });
        if (!entry)
            return res.status(404).json({ error: 'Journal entry not found' });
        const reversal = await ledger_service_1.LedgerService.reverseEntry(id, reason || 'Manual reversal', req.user.id, date ? new Date(date) : undefined);
        res.status(201).json(reversal);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to reverse journal entry' });
    }
});
// ═══════════════════════════════════════════════════════════════
// INCOME / EXPENSES / LIABILITIES WITH LEDGER POSTING
// ═══════════════════════════════════════════════════════════════
router.get('/income', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const incomes = await prisma_1.default.income.findMany({
            where: { schoolId },
            include: { category: true },
            orderBy: { createdAt: 'desc' }
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
        const { title, amount, date, categoryId, paymentMode, currency } = req.body;
        const income = await prisma_1.default.income.create({
            data: {
                schoolId,
                title,
                amount: Number(amount),
                date: date ? new Date(date) : new Date(),
                categoryId,
                paymentMode,
                currency: currency || 'USD'
            },
            include: { category: true }
        });
        try {
            const cashId = await (0, coa_seeder_1.getAccountId)(schoolId, '1100', prisma_1.default);
            const incAccId = categoryId || await (0, coa_seeder_1.getAccountId)(schoolId, '5900', prisma_1.default);
            await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: income.date,
                description: `Income: ${title}`,
                sourceType: 'income',
                sourceId: income.id,
                createdByUserId: req.user.id,
                lines: [
                    { accountId: cashId, debit: Number(amount), description: `Received via ${paymentMode || 'Cash'}` },
                    { accountId: incAccId, credit: Number(amount), description: title }
                ]
            });
        }
        catch (lErr) {
            console.error('[Ledger] Failed to post income JE:', lErr);
        }
        res.status(201).json(income);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to record income' });
    }
});
router.get('/expenses', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const expenses = await prisma_1.default.expense.findMany({
            where: { schoolId },
            include: { category: true },
            orderBy: { createdAt: 'desc' }
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
        const { title, amount, date, categoryId, paymentMode, currency } = req.body;
        const expense = await prisma_1.default.expense.create({
            data: {
                schoolId,
                title,
                amount: Number(amount),
                date: date ? new Date(date) : new Date(),
                categoryId,
                paymentMode,
                currency: currency || 'USD'
            },
            include: { category: true }
        });
        try {
            const cashId = await (0, coa_seeder_1.getAccountId)(schoolId, '1100', prisma_1.default);
            const expAccId = categoryId || await (0, coa_seeder_1.getAccountId)(schoolId, '7900', prisma_1.default);
            await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: expense.date,
                description: `Expense: ${title}`,
                sourceType: 'expense',
                sourceId: expense.id,
                createdByUserId: req.user.id,
                lines: [
                    { accountId: expAccId, debit: Number(amount), description: title },
                    { accountId: cashId, credit: Number(amount), description: `Paid via ${paymentMode || 'Cash'}` }
                ]
            });
        }
        catch (lErr) {
            console.error('[Ledger] Failed to post expense JE:', lErr);
        }
        res.status(201).json(expense);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to record expense' });
    }
});
router.get('/liabilities', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const liabilities = await prisma_1.default.liability.findMany({
            where: { schoolId },
            include: { category: true },
            orderBy: { createdAt: 'desc' }
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
        const { name, amount, date, categoryId } = req.body;
        const liability = await prisma_1.default.liability.create({
            data: {
                schoolId,
                name,
                amount: Number(amount),
                date: date ? new Date(date) : new Date(),
                categoryId,
                status: 'pending',
                settled: 0
            },
            include: { category: true }
        });
        try {
            const expId = await (0, coa_seeder_1.getAccountId)(schoolId, '7900', prisma_1.default);
            const liabAccId = categoryId || await (0, coa_seeder_1.getAccountId)(schoolId, '3100', prisma_1.default);
            await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: liability.date,
                description: `Liability incurred: ${name}`,
                sourceType: 'liability',
                sourceId: liability.id,
                createdByUserId: req.user.id,
                lines: [
                    { accountId: expId, debit: Number(amount), description: name },
                    { accountId: liabAccId, credit: Number(amount), description: 'Liability payable' }
                ]
            });
        }
        catch (lErr) {
            console.error('[Ledger] Failed to post liability JE:', lErr);
        }
        res.status(201).json(liability);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to record liability' });
    }
});
router.patch('/liabilities/:id/settle', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = String(req.params.id);
        const schoolId = req.user.schoolId;
        const { amount } = req.body;
        const settleAmt = Number(amount);
        const liab = await prisma_1.default.liability.findFirst({ where: { id, schoolId } });
        if (!liab)
            return res.status(404).json({ error: 'Liability not found' });
        const newSettled = liab.settled + settleAmt;
        const newStatus = newSettled >= liab.amount ? 'settled' : 'partial';
        const updated = await prisma_1.default.liability.update({
            where: { id },
            data: { settled: newSettled, status: newStatus }
        });
        try {
            const cashId = await (0, coa_seeder_1.getAccountId)(schoolId, '1100', prisma_1.default);
            const liabAccId = liab.categoryId || await (0, coa_seeder_1.getAccountId)(schoolId, '3100', prisma_1.default);
            await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: new Date(),
                description: `Liability settlement: ${liab.name}`,
                sourceType: 'liability_settlement',
                sourceId: liab.id,
                createdByUserId: req.user.id,
                lines: [
                    { accountId: liabAccId, debit: settleAmt, description: 'Reduce liability balance' },
                    { accountId: cashId, credit: settleAmt, description: 'Cash settlement' }
                ]
            });
        }
        catch (lErr) {
            console.error('[Ledger] Failed to post settlement JE:', lErr);
        }
        res.json(updated);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to settle liability' });
    }
});
// ═══════════════════════════════════════════════════════════════
// REPORTS & PERIODS
// ═══════════════════════════════════════════════════════════════
router.get('/reports/trial-balance', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const period = req.query.period;
        const report = await ledger_service_1.LedgerService.trialBalance(schoolId, period);
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to generate trial balance' });
    }
});
router.get('/reports/income-statement', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const fromStr = req.query.from;
        const toStr = req.query.to;
        const fromDate = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), 0, 1);
        const toDate = toStr ? new Date(toStr) : new Date();
        const report = await ledger_service_1.LedgerService.incomeStatement(schoolId, fromDate, toDate);
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to generate income statement' });
    }
});
router.get('/reports/balance-sheet', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const asOfStr = req.query.asOf;
        const asOfDate = asOfStr ? new Date(asOfStr) : new Date();
        const report = await ledger_service_1.LedgerService.balanceSheet(schoolId, asOfDate);
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to generate balance sheet' });
    }
});
router.get('/reports/general-ledger', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const accountId = req.query.accountId;
        const fromStr = req.query.from;
        const toStr = req.query.to;
        if (!accountId)
            return res.status(400).json({ error: 'accountId is required' });
        const account = await prisma_1.default.chartOfAccount.findFirst({ where: { id: accountId, schoolId } });
        if (!account)
            return res.status(404).json({ error: 'Account not found' });
        const fromDate = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), 0, 1);
        const toDate = toStr ? new Date(toStr) : new Date();
        const entries = await ledger_service_1.LedgerService.generalLedger(accountId, fromDate, toDate);
        const currentBalance = await ledger_service_1.LedgerService.getAccountBalance(accountId);
        res.json({ account, entries, currentBalance, from: fromDate, to: toDate });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch general ledger' });
    }
});
router.get('/reports/ar-aging', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const asOfStr = req.query.asOf;
        const asOfDate = asOfStr ? new Date(asOfStr) : new Date();
        const report = await ledger_service_1.LedgerService.arAging(schoolId, asOfDate);
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to generate AR aging report' });
    }
});
router.get('/periods', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const periods = await prisma_1.default.accountingPeriod.findMany({
            where: { schoolId },
            orderBy: { period: 'desc' }
        });
        res.json(periods);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch accounting periods' });
    }
});
router.post('/periods/:period/close', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const period = String(req.params.period);
        const schoolId = req.user.schoolId;
        const { notes } = req.body;
        if (!/^\d{4}-\d{2}$/.test(period)) {
            return res.status(400).json({ error: 'Period must be in YYYY-MM format' });
        }
        const ap = await prisma_1.default.accountingPeriod.upsert({
            where: { schoolId_period: { schoolId, period } },
            update: { status: 'CLOSED', closedBy: req.user.id, closedAt: new Date(), notes },
            create: { schoolId, period, status: 'CLOSED', closedBy: req.user.id, closedAt: new Date(), notes }
        });
        res.json(ap);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to close period' });
    }
});
router.post('/periods/:period/reopen', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const period = String(req.params.period);
        const schoolId = req.user.schoolId;
        const ap = await prisma_1.default.accountingPeriod.findUnique({
            where: { schoolId_period: { schoolId, period } }
        });
        if (!ap)
            return res.status(404).json({ error: 'Period not found' });
        if (ap.status === 'LOCKED')
            return res.status(403).json({ error: 'LOCKED periods cannot be reopened' });
        const updated = await prisma_1.default.accountingPeriod.update({
            where: { schoolId_period: { schoolId, period } },
            data: { status: 'OPEN', closedBy: null, closedAt: null }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to reopen period' });
    }
});
// ═══════════════════════════════════════════════════════════════
// BANK RECONCILIATION
// ═══════════════════════════════════════════════════════════════
router.get('/bank-reconciliation', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { period } = req.query;
        const statements = await prisma_1.default.bankStatement.findMany({
            where: { schoolId, ...(period ? { period: period } : {}) },
            include: {
                account: { select: { code: true, name: true } },
                lines: { orderBy: { date: 'asc' } }
            },
            orderBy: { uploadedAt: 'desc' }
        });
        const result = statements.map(stmt => {
            const total = stmt.lines.length;
            const reconciled = stmt.lines.filter(l => l.isReconciled).length;
            const unreconciled = total - reconciled;
            const unreconciledAmount = stmt.lines
                .filter(l => !l.isReconciled)
                .reduce((s, l) => s + l.credit - l.debit, 0);
            return {
                ...stmt,
                stats: { total, reconciled, unreconciled, unreconciledAmount }
            };
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch bank reconciliation' });
    }
});
router.post('/bank-reconciliation/match', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { bankLineId, journalLineId } = req.body;
        await prisma_1.default.$transaction(async (tx) => {
            await tx.bankStatementLine.update({
                where: { id: bankLineId },
                data: {
                    isReconciled: true,
                    journalLineId,
                    matchedAt: new Date(),
                    matchedBy: req.user.id
                }
            });
            await tx.journalEntryLine.update({
                where: { id: journalLineId },
                data: {
                    isReconciled: true,
                    reconciledAt: new Date(),
                    bankLineId
                }
            });
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to match reconciliation items' });
    }
});
router.post('/bank-reconciliation/unmatch', auth_1.requireAuth, (0, auth_1.requireRole)('BURSAR', 'SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { bankLineId } = req.body;
        const bankLine = await prisma_1.default.bankStatementLine.findFirst({
            where: { id: bankLineId }
        });
        if (!bankLine)
            return res.status(404).json({ error: 'Bank line not found' });
        await prisma_1.default.$transaction(async (tx) => {
            if (bankLine.journalLineId) {
                await tx.journalEntryLine.update({
                    where: { id: bankLine.journalLineId },
                    data: { isReconciled: false, reconciledAt: null, bankLineId: null }
                });
            }
            await tx.bankStatementLine.update({
                where: { id: bankLineId },
                data: { isReconciled: false, journalLineId: null, matchedAt: null, matchedBy: null }
            });
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to unmatch reconciliation items' });
    }
});
exports.default = router;
//# sourceMappingURL=accounts.js.map