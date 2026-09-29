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

import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { LedgerService } from '../services/ledger.service';
import { getAccountId, seedChartOfAccounts } from '../../prisma/seeders/coa.seeder';
import { LedgerEvents } from '../services/ledger-events';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// REAL-TIME SSE PUSH STREAM
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/accounts/events/stream
 * @desc    Server-Sent Events stream for tenant accounting updates
 */
router.get('/events/stream', requireAuth, (req: AuthRequest, res: Response) => {
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
  LedgerEvents.subscribe(clientId, schoolId, req.user!.role, res);
});

// ═══════════════════════════════════════════════════════════════
// CHART OF ACCOUNTS — CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/accounts/coa
 * @desc    Get full Chart of Accounts (hierarchical tree)
 */
router.get('/coa', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;

    // Auto-seed if school doesn't have a CoA yet
    await seedChartOfAccounts(schoolId, prisma);

    const accounts = await prisma.chartOfAccount.findMany({
      where: { schoolId },
      orderBy: { code: 'asc' }
    });

    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch chart of accounts' });
  }
});

/**
 * @route   POST /api/accounts/coa
 * @desc    Create a custom account in Chart of Accounts
 */
router.post('/coa', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { code, name, type, parentId, description } = req.body;

    if (!code || !name || !type) {
      return res.status(400).json({ error: 'Code, name, and type are required' });
    }

    const existing = await prisma.chartOfAccount.findUnique({
      where: { schoolId_code: { schoolId, code } }
    });
    if (existing) {
      return res.status(400).json({ error: `Account code ${code} already exists for this school` });
    }

    if (parentId) {
      const parent = await prisma.chartOfAccount.findFirst({ where: { id: parentId, schoolId } });
      if (!parent) return res.status(404).json({ error: 'Parent account not found' });
      if (parent.type !== type) {
        return res.status(400).json({ error: `Parent account type (${parent.type}) must match child type (${type})` });
      }
    }

    const account = await prisma.chartOfAccount.create({
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
  } catch (error: any) {
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
router.patch('/coa/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const schoolId = req.user!.schoolId!;
    const { name, description, isActive, parentId } = req.body;

    const account = await prisma.chartOfAccount.findFirst({ where: { id, schoolId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    // Build update payload — name and description are always editable
    const updateData: Record<string, any> = {};
    if (name !== undefined)        updateData.name = String(name).trim();
    if (description !== undefined) updateData.description = description;

    // isActive and parentId are only editable on non-system accounts
    if (!account.isSystemAccount) {
      if (isActive !== undefined) updateData.isActive = isActive;
      if (parentId !== undefined) updateData.parentId = parentId;
    } else if (isActive === false) {
      return res.status(403).json({
        error: 'System accounts cannot be deactivated. Deactivate a custom sub-account instead.'
      });
    }

    // Guard: cannot deactivate an account with recent journal entries
    if (updateData.isActive === false) {
      const recentEntry = await prisma.journalEntryLine.findFirst({
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

    const updated = await prisma.chartOfAccount.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update account' });
  }
});

/**
 * @route   PATCH /api/accounts/coa/:id/rename
 * @desc    Dedicated endpoint to rename any account (system or custom).
 *          Only updates name and optionally description — code and type are immutable.
 */
router.patch('/coa/:id/rename', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const schoolId = req.user!.schoolId!;
    const { name, description } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Account name is required' });
    }

    const account = await prisma.chartOfAccount.findFirst({ where: { id, schoolId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const updated = await prisma.chartOfAccount.update({
      where: { id },
      data: {
        name: String(name).trim(),
        ...(description !== undefined ? { description } : {})
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to rename account' });
  }
});

/**
 * @route   DELETE /api/accounts/coa/:id
 * @desc    Delete a custom account (system accounts cannot be deleted)
 */
router.delete('/coa/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const schoolId = req.user!.schoolId!;

    const account = await prisma.chartOfAccount.findFirst({ where: { id, schoolId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (account.isSystemAccount) return res.status(403).json({ error: 'System accounts cannot be deleted' });

    const hasEntries = await prisma.journalEntryLine.count({ where: { accountId: id } });
    if (hasEntries > 0) {
      await prisma.chartOfAccount.update({ where: { id }, data: { isActive: false } });
      return res.json({ success: true, message: 'Account deactivated (has journal entries, cannot be deleted)' });
    }

    await prisma.chartOfAccount.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete account' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CATEGORIES (CoA mapping)
// ═══════════════════════════════════════════════════════════════

router.get('/categories', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    await seedChartOfAccounts(schoolId, prisma);
    const accounts = await prisma.chartOfAccount.findMany({
      where: { schoolId, isActive: true },
      orderBy: { code: 'asc' }
    });
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch categories' });
  }
});

router.post('/categories', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { name, type } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Name and Type are required' });

    const prefix = type === 'ASSET' ? '1' : type === 'LIABILITY' ? '3' : type === 'EQUITY' ? '4' : type === 'INCOME' ? '5' : '7';
    const count = await prisma.chartOfAccount.count({ where: { schoolId, type } });
    const code = `${prefix}${80 + count}0`;

    const account = await prisma.chartOfAccount.create({
      data: {
        schoolId,
        code,
        name,
        type,
        isSystemAccount: false
      }
    });

    res.status(201).json(account);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create category' });
  }
});

// ═══════════════════════════════════════════════════════════════
// JOURNAL ENTRIES — MANUAL POSTING & REVERSALS
// ═══════════════════════════════════════════════════════════════

router.get('/journal', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const period = req.query.period as string | undefined;
    const sourceType = req.query.sourceType as string | undefined;
    const status = req.query.status as string | undefined;
    const page = Number(req.query.page ?? '1');
    const limit = Number(req.query.limit ?? '50');

    const where: any = { schoolId };
    if (period) where.period = period;
    if (sourceType) where.sourceType = sourceType;
    if (status) where.status = status;

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
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
      prisma.journalEntry.count({ where })
    ]);

    res.json({ entries, total, page, limit });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch journal entries' });
  }
});

router.post('/journal', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { date, description, lines, sourceType, sourceId } = req.body;

    const entry = await LedgerService.postEntry({
      schoolId,
      date: new Date(date),
      description,
      sourceType: sourceType || 'manual_journal',
      sourceId,
      createdByUserId: req.user!.id,
      lines
    });

    res.status(201).json(entry);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to post journal entry' });
  }
});

router.post('/journal/:id/reverse', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { reason, date } = req.body;
    const schoolId = req.user!.schoolId!;

    const entry = await prisma.journalEntry.findFirst({ where: { id, schoolId } });
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });

    const reversal = await LedgerService.reverseEntry(
      id,
      reason || 'Manual reversal',
      req.user!.id,
      date ? new Date(date) : undefined
    );

    res.status(201).json(reversal);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reverse journal entry' });
  }
});

// ═══════════════════════════════════════════════════════════════
// INCOME / EXPENSES / LIABILITIES WITH LEDGER POSTING
// ═══════════════════════════════════════════════════════════════

router.get('/income', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const incomes = await prisma.income.findMany({
      where: { schoolId },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(incomes);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch income' });
  }
});

router.post('/income', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { title, amount, date, categoryId, paymentMode, currency } = req.body;

    const income = await prisma.income.create({
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
      const cashId = await getAccountId(schoolId, '1100', prisma);
      const incAccId = categoryId || await getAccountId(schoolId, '5900', prisma);

      await LedgerService.postEntry({
        schoolId,
        date: income.date,
        description: `Income: ${title}`,
        sourceType: 'income',
        sourceId: income.id,
        createdByUserId: req.user!.id,
        lines: [
          { accountId: cashId, debit: Number(amount), description: `Received via ${paymentMode || 'Cash'}` },
          { accountId: incAccId, credit: Number(amount), description: title }
        ]
      });
    } catch (lErr) {
      console.error('[Ledger] Failed to post income JE:', lErr);
    }

    res.status(201).json(income);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record income' });
  }
});

router.get('/expenses', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const expenses = await prisma.expense.findMany({
      where: { schoolId },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(expenses);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.post('/expenses', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { title, amount, date, categoryId, paymentMode, currency } = req.body;

    const expense = await prisma.expense.create({
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
      const cashId = await getAccountId(schoolId, '1100', prisma);
      const expAccId = categoryId || await getAccountId(schoolId, '7900', prisma);

      await LedgerService.postEntry({
        schoolId,
        date: expense.date,
        description: `Expense: ${title}`,
        sourceType: 'expense',
        sourceId: expense.id,
        createdByUserId: req.user!.id,
        lines: [
          { accountId: expAccId, debit: Number(amount), description: title },
          { accountId: cashId, credit: Number(amount), description: `Paid via ${paymentMode || 'Cash'}` }
        ]
      });
    } catch (lErr) {
      console.error('[Ledger] Failed to post expense JE:', lErr);
    }

    res.status(201).json(expense);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record expense' });
  }
});

router.get('/liabilities', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const liabilities = await prisma.liability.findMany({
      where: { schoolId },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(liabilities);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch liabilities' });
  }
});

router.post('/liabilities', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { name, amount, date, categoryId } = req.body;

    const liability = await prisma.liability.create({
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
      const expId = await getAccountId(schoolId, '7900', prisma);
      const liabAccId = categoryId || await getAccountId(schoolId, '3100', prisma);

      await LedgerService.postEntry({
        schoolId,
        date: liability.date,
        description: `Liability incurred: ${name}`,
        sourceType: 'liability',
        sourceId: liability.id,
        createdByUserId: req.user!.id,
        lines: [
          { accountId: expId, debit: Number(amount), description: name },
          { accountId: liabAccId, credit: Number(amount), description: 'Liability payable' }
        ]
      });
    } catch (lErr) {
      console.error('[Ledger] Failed to post liability JE:', lErr);
    }

    res.status(201).json(liability);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record liability' });
  }
});

router.patch('/liabilities/:id/settle', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const schoolId = req.user!.schoolId!;
    const { amount } = req.body;
    const settleAmt = Number(amount);

    const liab = await prisma.liability.findFirst({ where: { id, schoolId } });
    if (!liab) return res.status(404).json({ error: 'Liability not found' });

    const newSettled = liab.settled + settleAmt;
    const newStatus = newSettled >= liab.amount ? 'settled' : 'partial';

    const updated = await prisma.liability.update({
      where: { id },
      data: { settled: newSettled, status: newStatus }
    });

    try {
      const cashId = await getAccountId(schoolId, '1100', prisma);
      const liabAccId = liab.categoryId || await getAccountId(schoolId, '3100', prisma);

      await LedgerService.postEntry({
        schoolId,
        date: new Date(),
        description: `Liability settlement: ${liab.name}`,
        sourceType: 'liability_settlement',
        sourceId: liab.id,
        createdByUserId: req.user!.id,
        lines: [
          { accountId: liabAccId, debit: settleAmt, description: 'Reduce liability balance' },
          { accountId: cashId, credit: settleAmt, description: 'Cash settlement' }
        ]
      });
    } catch (lErr) {
      console.error('[Ledger] Failed to post settlement JE:', lErr);
    }

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to settle liability' });
  }
});

// ═══════════════════════════════════════════════════════════════
// REPORTS & PERIODS
// ═══════════════════════════════════════════════════════════════

router.get('/reports/trial-balance', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const period = req.query.period as string | undefined;

    const report = await LedgerService.trialBalance(schoolId, period);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate trial balance' });
  }
});

router.get('/reports/income-statement', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const fromStr = req.query.from as string | undefined;
    const toStr = req.query.to as string | undefined;

    const fromDate = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = toStr ? new Date(toStr) : new Date();

    const report = await LedgerService.incomeStatement(schoolId, fromDate, toDate);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate income statement' });
  }
});

router.get('/reports/balance-sheet', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const asOfStr = req.query.asOf as string | undefined;

    const asOfDate = asOfStr ? new Date(asOfStr) : new Date();
    const report = await LedgerService.balanceSheet(schoolId, asOfDate);

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate balance sheet' });
  }
});

router.get('/reports/general-ledger', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const accountId = req.query.accountId as string | undefined;
    const fromStr = req.query.from as string | undefined;
    const toStr = req.query.to as string | undefined;

    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const account = await prisma.chartOfAccount.findFirst({ where: { id: accountId, schoolId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const fromDate = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = toStr ? new Date(toStr) : new Date();

    const entries = await LedgerService.generalLedger(accountId, fromDate, toDate);
    const currentBalance = await LedgerService.getAccountBalance(accountId);

    res.json({ account, entries, currentBalance, from: fromDate, to: toDate });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch general ledger' });
  }
});

router.get('/reports/ar-aging', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const asOfStr = req.query.asOf as string | undefined;

    const asOfDate = asOfStr ? new Date(asOfStr) : new Date();
    const report = await LedgerService.arAging(schoolId, asOfDate);

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate AR aging report' });
  }
});

router.get('/reports/vat', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const fromStr = req.query.from as string | undefined;
    const toStr = req.query.to as string | undefined;
    const fromDate = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = toStr ? new Date(toStr) : new Date();

    const report = await LedgerService.vatReport(schoolId, fromDate, toDate);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate ZIMRA VAT report' });
  }
});

router.get('/reports/cash-flow', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const fromStr = req.query.from as string | undefined;
    const toStr = req.query.to as string | undefined;
    const fromDate = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = toStr ? new Date(toStr) : new Date();

    const report = await LedgerService.cashFlowStatement(schoolId, fromDate, toDate);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate Cash Flow Statement' });
  }
});

router.get('/reports/budget-vs-actual', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const year = Number(req.query.year || new Date().getFullYear());
    const term = req.query.term ? String(req.query.term) : undefined;

    const report = await LedgerService.budgetVsActual(schoolId, year, term);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate Budget vs Actual report' });
  }
});


router.get('/periods', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const periods = await prisma.accountingPeriod.findMany({
      where: { schoolId },
      orderBy: { period: 'desc' }
    });

    res.json(periods);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch accounting periods' });
  }
});

router.post('/periods/:period/close', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const period = String(req.params.period);
    const schoolId = req.user!.schoolId!;
    const { notes } = req.body;

    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: 'Period must be in YYYY-MM format' });
    }

    const ap = await prisma.accountingPeriod.upsert({
      where: { schoolId_period: { schoolId, period } },
      update: { status: 'CLOSED', closedBy: req.user!.id, closedAt: new Date(), notes },
      create: { schoolId, period, status: 'CLOSED', closedBy: req.user!.id, closedAt: new Date(), notes }
    });

    res.json(ap);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to close period' });
  }
});

router.post('/periods/:period/reopen', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const period = String(req.params.period);
    const schoolId = req.user!.schoolId!;

    const ap = await prisma.accountingPeriod.findUnique({
      where: { schoolId_period: { schoolId, period } }
    });

    if (!ap) return res.status(404).json({ error: 'Period not found' });
    if (ap.status === 'LOCKED') return res.status(403).json({ error: 'LOCKED periods cannot be reopened' });

    const updated = await prisma.accountingPeriod.update({
      where: { schoolId_period: { schoolId, period } },
      data: { status: 'OPEN', closedBy: null, closedAt: null }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reopen period' });
  }
});

// ═══════════════════════════════════════════════════════════════
// BANK RECONCILIATION
// ═══════════════════════════════════════════════════════════════

router.get('/bank-reconciliation', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { period } = req.query;

    const statements = await prisma.bankStatement.findMany({
      where: { schoolId, ...(period ? { period: period as string } : {}) },
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch bank reconciliation' });
  }
});

router.post('/bank-reconciliation/match', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { bankLineId, journalLineId } = req.body;

    await prisma.$transaction(async tx => {
      await tx.bankStatementLine.update({
        where: { id: bankLineId },
        data: {
          isReconciled: true,
          journalLineId,
          matchedAt: new Date(),
          matchedBy: req.user!.id
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to match reconciliation items' });
  }
});

router.post('/bank-reconciliation/unmatch', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { bankLineId } = req.body;

    const bankLine = await prisma.bankStatementLine.findFirst({
      where: { id: bankLineId }
    });

    if (!bankLine) return res.status(404).json({ error: 'Bank line not found' });

    await prisma.$transaction(async tx => {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to unmatch reconciliation items' });
  }
});

// ═══════════════════════════════════════════════════════════════
// FILTERABLE GENERAL LEDGER
// ═══════════════════════════════════════════════════════════════

router.get('/gl', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { accountId, coaCode, from, to, sourceType, search, minAmount, maxAmount } = req.query;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));

    const fromDate = from ? new Date(String(from)) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(String(to)) : new Date();

    const where: any = {
      schoolId,
      journalEntry: {
        status: 'POSTED',
        date: { gte: fromDate, lte: toDate },
        ...(sourceType ? { sourceType: String(sourceType) } : {})
      }
    };

    if (accountId) {
      where.accountId = String(accountId);
    }
    if (coaCode) {
      where.account = { code: { startsWith: String(coaCode) } };
    }
    if (search) {
      const s = String(search).trim();
      where.OR = [
        { description: { contains: s, mode: 'insensitive' } },
        { journalEntry: { entryNumber: { contains: s, mode: 'insensitive' } } },
        { journalEntry: { description: { contains: s, mode: 'insensitive' } } }
      ];
    }
    if (minAmount || maxAmount) {
      const conditions: any[] = [];
      if (minAmount) {
        conditions.push({
          OR: [
            { debit: { gte: Number(minAmount) } },
            { credit: { gte: Number(minAmount) } }
          ]
        });
      }
      if (maxAmount) {
        conditions.push({
          OR: [
            { debit: { lte: Number(maxAmount) } },
            { credit: { lte: Number(maxAmount) } }
          ]
        });
      }
      where.AND = conditions;
    }

    const [lines, total] = await Promise.all([
      prisma.journalEntryLine.findMany({
        where,
        include: {
          account: { select: { id: true, code: true, name: true, type: true } },
          journalEntry: { select: { id: true, entryNumber: true, date: true, description: true, sourceType: true, sourceId: true, currency: true } }
        },
        orderBy: [
          { journalEntry: { date: 'asc' } },
          { id: 'asc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.journalEntryLine.count({ where })
    ]);

    const agg = await prisma.journalEntryLine.aggregate({
      where,
      _sum: { debit: true, credit: true }
    });

    const entries = lines.map(line => ({
      id: line.id,
      date: line.journalEntry.date,
      entryNumber: line.journalEntry.entryNumber,
      accountCode: line.account.code,
      accountName: line.account.name,
      accountType: line.account.type,
      accountId: line.accountId,
      description: line.description || line.journalEntry.description,
      sourceType: line.journalEntry.sourceType,
      sourceId: line.journalEntry.sourceId,
      debit: line.debit,
      credit: line.credit,
      currency: line.currency || line.journalEntry.currency || 'USD'
    }));

    res.json({
      entries,
      total,
      page,
      limit,
      totalDebit: Math.round((agg._sum.debit || 0) * 100) / 100,
      totalCredit: Math.round((agg._sum.credit || 0) * 100) / 100,
      from: fromDate,
      to: toDate
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch general ledger' });
  }
});

// ═══════════════════════════════════════════════════════════════
// BUDGETS MANAGEMENT
// ═══════════════════════════════════════════════════════════════

router.get('/budgets', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const term = typeof req.query.term === 'string' ? req.query.term : undefined;

    const where: any = { schoolId, year };
    if (term) where.term = term;

    const budgets = await prisma.budget.findMany({
      where,
      orderBy: { coaCode: 'asc' }
    });

    const accounts = await prisma.chartOfAccount.findMany({
      where: { schoolId, isActive: true },
      select: { code: true, name: true, type: true }
    });
    const accMap = new Map(accounts.map(a => [a.code, a]));

    const result = budgets.map(b => ({
      ...b,
      accountName: accMap.get(b.coaCode)?.name || b.coaCode,
      accountType: accMap.get(b.coaCode)?.type || 'EXPENSE'
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch budgets' });
  }
});

router.post('/budgets', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { year, term, coaCode, amount, currency } = req.body;

    if (!year || !coaCode || amount === undefined) {
      return res.status(400).json({ error: 'Year, coaCode, and amount are required' });
    }

    const budget = await prisma.budget.upsert({
      where: {
        schoolId_year_term_coaCode: {
          schoolId,
          year: Number(year),
          term: term ? String(term) : 'Annual',
          coaCode: String(coaCode)
        }
      },
      update: {
        amount: Number(amount),
        currency: currency || 'USD'
      },
      create: {
        schoolId,
        year: Number(year),
        term: term ? String(term) : 'Annual',
        coaCode: String(coaCode),
        amount: Number(amount),
        currency: currency || 'USD'
      }
    });

    res.status(201).json(budget);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to save budget' });
  }
});

router.delete('/budgets/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const id = String(req.params.id);

    const existing = await prisma.budget.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: 'Budget item not found' });

    await prisma.budget.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete budget' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MULTI-TIER FINANCIAL APPROVALS
// ═══════════════════════════════════════════════════════════════

router.get('/approvals', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userRole = req.user!.role;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const where: any = { schoolId };
    if (status) where.status = status;
    if (userRole === 'BURSAR') {
      where.tier = 1;
    }

    const approvals = await prisma.approval.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const userIds = [...new Set(approvals.map(a => a.requestedBy).concat(approvals.map(a => a.approvedBy).filter(Boolean) as string[]))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, role: true, email: true }
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const result = approvals.map(a => ({
      ...a,
      requester: userMap.get(a.requestedBy),
      approver: a.approvedBy ? userMap.get(a.approvedBy) : null,
      canApprove: a.status === 'PENDING' && a.requestedBy !== req.user!.id && (
        userRole === 'SCHOOL_ADMIN' || (userRole === 'BURSAR' && a.tier === 1)
      )
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch approvals' });
  }
});

router.post('/approvals/:id/approve', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const id = String(req.params.id);
    const userRole = req.user!.role;
    const userId = req.user!.id;

    const approval = await prisma.approval.findFirst({ where: { id, schoolId } });
    if (!approval) return res.status(404).json({ error: 'Approval request not found' });
    if (approval.status !== 'PENDING') return res.status(400).json({ error: `Request already ${approval.status}` });

    // Segregation of duties: requester cannot approve their own request!
    if (approval.requestedBy === userId) {
      return res.status(403).json({ error: 'Segregation of duties violation: You cannot approve your own request' });
    }

    // Role check: Tier 2 requires SCHOOL_ADMIN
    if (approval.tier === 2 && userRole !== 'SCHOOL_ADMIN') {
      return res.status(403).json({ error: 'Tier 2 approvals (> $500) require School Admin / Principal authorization' });
    }

    const updated = await prisma.approval.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date()
      }
    });

    res.json({ success: true, approval: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to approve request' });
  }
});

router.post('/approvals/:id/reject', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const id = String(req.params.id);
    const { reason } = req.body;
    const userId = req.user!.id;


    const approval = await prisma.approval.findFirst({ where: { id, schoolId } });
    if (!approval) return res.status(404).json({ error: 'Approval request not found' });
    if (approval.status !== 'PENDING') return res.status(400).json({ error: `Request already ${approval.status}` });

    if (approval.requestedBy === userId) {
      return res.status(403).json({ error: 'You cannot reject your own request' });
    }

    const updated = await prisma.approval.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy: userId,
        approvedAt: new Date(),
        rejectionReason: reason || 'Rejected by approver'
      }
    });

    res.json({ success: true, approval: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reject request' });
  }
});

router.get('/approvals/settings', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const settings = await prisma.schoolSetting.findUnique({
      where: { schoolId },
      select: { financialApprovalThreshold: true, tier1ApprovalRole: true, tier2ApprovalRole: true }
    });

    res.json(settings || { financialApprovalThreshold: 50.0, tier1ApprovalRole: 'BURSAR', tier2ApprovalRole: 'SCHOOL_ADMIN' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch approval settings' });
  }
});

router.patch('/approvals/settings', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { financialApprovalThreshold, tier1ApprovalRole, tier2ApprovalRole } = req.body;

    const updated = await prisma.schoolSetting.upsert({
      where: { schoolId },
      update: {
        ...(financialApprovalThreshold !== undefined ? { financialApprovalThreshold: Number(financialApprovalThreshold) } : {}),
        ...(tier1ApprovalRole !== undefined ? { tier1ApprovalRole: String(tier1ApprovalRole) } : {}),
        ...(tier2ApprovalRole !== undefined ? { tier2ApprovalRole: String(tier2ApprovalRole) } : {})
      },
      create: {
        schoolId,
        financialApprovalThreshold: Number(financialApprovalThreshold ?? 50.0),
        tier1ApprovalRole: String(tier1ApprovalRole ?? 'BURSAR'),
        tier2ApprovalRole: String(tier2ApprovalRole ?? 'SCHOOL_ADMIN')
      }
    });

    res.json({
      financialApprovalThreshold: updated.financialApprovalThreshold,
      tier1ApprovalRole: updated.tier1ApprovalRole,
      tier2ApprovalRole: updated.tier2ApprovalRole
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update approval settings' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 5 SHARED ANALYTICS ENGINES (ROLE-SCOPED)
// ═══════════════════════════════════════════════════════════════

router.post('/analytics/refresh', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.$executeRawUnsafe('SELECT refresh_all_analytics_views();');
    res.json({ success: true, message: 'Materialized views refreshed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to refresh analytics views' });
  }
});

router.get('/analytics/:engine', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const role = req.user!.role;
    const userId = req.user!.id;
    const engine = String(req.params.engine || '').toLowerCase();

    // ─────────────────────────────────────────────────────────────
    // 1. ACADEMICS ANALYTICS
    // ─────────────────────────────────────────────────────────────
    if (engine === 'academics') {
      if (role === 'STUDENT') {
        const student = await prisma.student.findFirst({ where: { userId, schoolId } });
        if (!student) return res.status(404).json({ error: 'Student profile not found' });

        const grades = await prisma.grade.findMany({
          where: { studentId: student.id, schoolId },
          include: { subject: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        });

        const avgScore = grades.length > 0
          ? Math.round((grades.reduce((s, g) => s + g.score, 0) / grades.length) * 100) / 100
          : 0;

        return res.json({
          engine: 'academics',
          role,
          metrics: { averageScore: avgScore, totalSubjects: grades.length },
          details: grades.map(g => ({
            subject: g.subject.name,
            score: g.score,
            term: g.term,
            year: g.year
          }))
        });
      }

      if (role === 'PARENT') {
        const parent = await prisma.parent.findFirst({ where: { userId } });
        const parentStudents = parent ? await prisma.parentStudent.findMany({
          where: { parentId: parent.id },
          include: { student: true }
        }) : [];
        const children = parentStudents.map(ps => ps.student);

        const studentSummaries = await Promise.all(
          children.map(async s => {
            const grades = await prisma.grade.findMany({
              where: { studentId: s.id, schoolId },
              include: { subject: { select: { name: true } } }
            });
            const avg = grades.length > 0
              ? Math.round((grades.reduce((acc, g) => acc + g.score, 0) / grades.length) * 100) / 100
              : 0;
            return {
              studentId: s.id,
              studentName: s.name,
              averageScore: avg,
              grades: grades.map(g => ({ subject: g.subject.name, score: g.score, term: g.term }))
            };
          })
        );

        return res.json({ engine: 'academics', role, children: studentSummaries });
      }

      if (role === 'TEACHER') {
        const teacher = await prisma.teacher.findFirst({ where: { userId, schoolId } });
        const teacherSubjects = teacher
          ? await prisma.teacherSubject.findMany({ where: { teacherId: teacher.id }, select: { subjectId: true } })
          : [];
        const subjectIds = teacherSubjects.map(ts => ts.subjectId);

        const rows: any[] = await prisma.$queryRaw`
          SELECT * FROM analytics_academics
          WHERE tenant_id = ${schoolId}
            AND ("subjectId" = ANY(${subjectIds}) OR ${subjectIds.length === 0})
          ORDER BY year DESC, term DESC, subject_name ASC
        `;

        return res.json({ engine: 'academics', role, rows });
      }

      // Admin / Bursar / Super Admin
      const rows: any[] = await prisma.$queryRaw`
        SELECT * FROM analytics_academics
        WHERE tenant_id = ${schoolId}
        ORDER BY year DESC, term DESC, subject_name ASC
      `;

      return res.json({ engine: 'academics', role, rows });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. FINANCE ANALYTICS
    // ─────────────────────────────────────────────────────────────
    if (engine === 'finance') {
      if (role === 'TEACHER') {
        return res.status(403).json({ error: 'Teachers do not have access to financial reports' });
      }

      if (role === 'STUDENT') {
        const student = await prisma.student.findFirst({ where: { userId, schoolId } });
        if (!student) return res.status(404).json({ error: 'Student profile not found' });

        const rows: any[] = await prisma.$queryRaw`
          SELECT * FROM student_ledger_balances
          WHERE tenant_id = ${schoolId} AND student_id = ${student.id}
        `;
        const studentBalance = rows[0] || { total_billed: 0, total_paid: 0, balance_due: 0 };

        return res.json({ engine: 'finance', role, studentBalance });
      }

      if (role === 'PARENT') {
        const parent = await prisma.parent.findFirst({ where: { userId } });
        const parentStudents = parent ? await prisma.parentStudent.findMany({
          where: { parentId: parent.id },
          select: { studentId: true }
        }) : [];
        const studentIds = parentStudents.map(ps => ps.studentId);

        const rows: any[] = await prisma.$queryRaw`
          SELECT * FROM student_ledger_balances
          WHERE tenant_id = ${schoolId} AND student_id = ANY(${studentIds})
        `;

        const totalDue = rows.reduce((s, r) => s + (Number(r.balance_due) || 0), 0);

        return res.json({ engine: 'finance', role, balances: rows, totalDue });
      }

      // Bursar / School Admin
      const rows: any[] = await prisma.$queryRaw`
        SELECT * FROM analytics_finance
        WHERE tenant_id = ${schoolId}
        ORDER BY period DESC
        LIMIT 12
      `;

      const totals = rows.reduce(
        (acc, r) => ({
          totalRevenueBilled: acc.totalRevenueBilled + (Number(r.total_revenue_billed) || 0),
          totalFeesCollected: acc.totalFeesCollected + (Number(r.total_fees_collected) || 0),
          totalExpenses: acc.totalExpenses + (Number(r.total_expenses) || 0)
        }),
        { totalRevenueBilled: 0, totalFeesCollected: 0, totalExpenses: 0 }
      );

      const netSurplus = Math.round((totals.totalFeesCollected - totals.totalExpenses) * 100) / 100;
      const avgCollectionRate = rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + (Number(r.collection_rate_pct) || 0), 0) / rows.length)
        : 0;

      return res.json({
        engine: 'finance',
        role,
        kpis: { ...totals, netSurplus, avgCollectionRate },
        monthlyTrend: rows
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. ATTENDANCE ANALYTICS
    // ─────────────────────────────────────────────────────────────
    if (engine === 'attendance') {
      if (role === 'STUDENT') {
        const student = await prisma.student.findFirst({ where: { userId, schoolId } });
        if (!student) return res.status(404).json({ error: 'Student record not found' });

        const records = await prisma.attendance.findMany({
          where: { studentId: student.id, schoolId },
          orderBy: { date: 'desc' },
          take: 60
        });

        const present = records.filter(r => r.status.toLowerCase() === 'present').length;
        const total = records.length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

        return res.json({ engine: 'attendance', role, rate, present, total, records });
      }

      if (role === 'PARENT') {
        const parent = await prisma.parent.findFirst({ where: { userId } });
        const parentStudents = parent ? await prisma.parentStudent.findMany({
          where: { parentId: parent.id },
          include: { student: true }
        }) : [];
        const children = parentStudents.map(ps => ps.student);

        const summaries = await Promise.all(
          children.map(async s => {
            const records = await prisma.attendance.findMany({
              where: { studentId: s.id, schoolId },
              take: 30
            });
            const present = records.filter(r => r.status.toLowerCase() === 'present').length;
            const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;
            return { studentId: s.id, name: s.name, attendanceRate: rate, totalSessions: records.length };
          })
        );

        return res.json({ engine: 'attendance', role, children: summaries });
      }

      // Teacher / Bursar / School Admin
      const rows: any[] = await prisma.$queryRaw`
        SELECT * FROM analytics_attendance
        WHERE tenant_id = ${schoolId}
        ORDER BY month_period DESC
        LIMIT 50
      `;

      return res.json({ engine: 'attendance', role, rows });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. OPERATIONS ANALYTICS
    // ─────────────────────────────────────────────────────────────
    if (engine === 'operations') {
      const rows: any[] = await prisma.$queryRaw`
        SELECT * FROM analytics_operations
        WHERE tenant_id = ${schoolId}
      `;

      const op = rows[0] || {};
      const hostelOccupancyRate = Number(op.total_hostel_capacity) > 0
        ? Math.round((Number(op.current_hostel_occupancy) / Number(op.total_hostel_capacity)) * 100)
        : 0;

      return res.json({
        engine: 'operations',
        role,
        kpis: {
          ...op,
          hostelOccupancyRate
        }
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. ENGAGEMENT ANALYTICS
    // ─────────────────────────────────────────────────────────────
    if (engine === 'engagement') {
      if (role === 'STUDENT') {
        const student = await prisma.student.findFirst({ where: { userId, schoolId } });
        const loans = student
          ? await prisma.bookLoan.findMany({
              where: { studentId: student.id, schoolId },
              include: { book: { select: { title: true, author: true } } },
              orderBy: { borrowedAt: 'desc' }
            })
          : [];

        return res.json({ engine: 'engagement', role, loans });
      }

      const rows: any[] = await prisma.$queryRaw`
        SELECT * FROM analytics_engagement
        WHERE tenant_id = ${schoolId}
      `;

      return res.json({ engine: 'engagement', role, kpis: rows[0] || {} });
    }

    return res.status(400).json({ error: `Unknown analytics engine '${engine}'. Valid engines: academics, finance, attendance, operations, engagement.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch analytics' });
  }
});

export default router;

