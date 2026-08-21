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
 * @desc    Create a custom account
 */
router.post('/coa', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { code, name, type, parentId, description } = req.body;

    if (!code || !name || !type) {
      return res.status(400).json({ error: 'code, name, and type are required' });
    }

    const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    // Validate parent belongs to this school
    if (parentId) {
      const parent = await prisma.chartOfAccount.findFirst({ where: { id: parentId, schoolId } });
      if (!parent) return res.status(400).json({ error: 'Parent account not found in this school' });
    }

    const account = await prisma.chartOfAccount.create({
      data: { schoolId, code, name, type, parentId, description, isSystemAccount: false }
    });

    res.status(201).json(account);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Account code already exists in this school' });
    }
    res.status(400).json({ error: error.message || 'Failed to create account' });
  }
});

/**
 * @route   PATCH /api/accounts/coa/:id
 * @desc    Update an account (name, description, isActive)
 *          Cannot change type or code of a system account
 */
router.patch('/coa/:id', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const schoolId = req.user!.schoolId!;
    const { name, description, isActive, parentId } = req.body;

    const account = await prisma.chartOfAccount.findFirst({ where: { id, schoolId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const updateData: Record<string, any> = { description, isActive, parentId };
    if (!account.isSystemAccount) {
      updateData.name = name;
    } else if (name && name !== account.name) {
      return res.status(403).json({ error: 'Cannot rename a system account' });
    }

    if (isActive === false) {
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
 * @route   DELETE /api/accounts/coa/:id
 * @desc    Deactivate an account (never hard-delete — preserves historical entries)
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
// JOURNAL ENTRIES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/accounts/journal
 * @desc    List journal entries (paginated, filterable)
 */
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

/**
 * @route   POST /api/accounts/journal
 * @desc    Create a manual journal entry (must be balanced)
 */
router.post('/journal', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { date, description, lines } = req.body;

    if (!Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ error: 'At least 2 journal lines required' });
    }

    const entry = await LedgerService.postEntry({
      schoolId,
      date: new Date(date || new Date()),
      description,
      sourceType: 'manual',
      sourceId: req.user!.id,
      lines,
      createdByUserId: req.user!.id
    });

    res.status(201).json(entry);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to post journal entry' });
  }
});

/**
 * @route   POST /api/accounts/journal/:id/reverse
 * @desc    Reverse a posted journal entry
 */
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
// REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/accounts/reports/trial-balance
 * @desc    Trial balance for a period (YYYY-MM)
 */
router.get('/reports/trial-balance', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const period = req.query.period as string || new Date().toISOString().slice(0, 7);

    const lines = await LedgerService.trialBalance(schoolId, period);
    const totalDebit = lines.reduce((s, l) => s + l.totalDebit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.totalCredit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    res.json({ period, lines, totalDebit, totalCredit, isBalanced });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate trial balance' });
  }
});

/**
 * @route   GET /api/accounts/reports/income-statement
 * @desc    Profit & Loss statement for a date range
 */
router.get('/reports/income-statement', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { from, to } = req.query;

    const fromDate = from ? new Date(from as string) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to as string) : new Date();

    const statement = await LedgerService.incomeStatement(schoolId, fromDate, toDate);
    res.json(statement);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate income statement' });
  }
});

/**
 * @route   GET /api/accounts/reports/balance-sheet
 * @desc    Balance sheet as of a given date
 */
router.get('/reports/balance-sheet', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const asOf = req.query.asOf ? new Date(req.query.asOf as string) : new Date();

    const sheet = await LedgerService.balanceSheet(schoolId, asOf);
    res.json(sheet);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate balance sheet' });
  }
});

/**
 * @route   GET /api/accounts/reports/general-ledger
 * @desc    General ledger drill-down for a specific account
 */
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

/**
 * @route   GET /api/accounts/reports/ar-aging
 * @desc    Accounts Receivable aging per student
 */
router.get('/reports/ar-aging', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const asOf = req.query.asOf ? new Date(req.query.asOf as string) : new Date();

    const rows = await LedgerService.arAging(schoolId, asOf);
    const totals = {
      current: rows.reduce((s, r) => s + r.current, 0),
      days31_60: rows.reduce((s, r) => s + r.days31_60, 0),
      days61_90: rows.reduce((s, r) => s + r.days61_90, 0),
      over90: rows.reduce((s, r) => s + r.over90, 0),
      total: rows.reduce((s, r) => s + r.total, 0)
    };

    res.json({ asOf, rows, totals });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate AR aging' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PERIOD CONTROL
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/accounts/periods
 * @desc    List accounting periods and their status
 */
router.get('/periods', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const periods = await prisma.accountingPeriod.findMany({
      where: { schoolId },
      orderBy: { period: 'desc' }
    });
    res.json(periods);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch periods' });
  }
});

/**
 * @route   POST /api/accounts/periods/:period/close
 * @desc    Close an accounting period (prevents new postings)
 */
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

/**
 * @route   POST /api/accounts/periods/:period/reopen
 * @desc    Reopen a CLOSED period (not LOCKED)
 */
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

/**
 * @route   GET /api/accounts/bank-reconciliation
 * @desc    Get bank reconciliation status for a period
 */
router.get('/bank-reconciliation', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { period } = req.query;

    const statements = await prisma.bankStatement.findMany({
      where: { schoolId, ...(period ? { period: period as string } : {}) },
      include: {
        account: { select: { code: true, name: true } },
        lines: {
          orderBy: { date: 'asc' }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    // Compute reconciliation stats per statement
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

/**
 * @route   POST /api/accounts/bank-reconciliation/match
 * @desc    Match a bank statement line to a journal entry line
 */
router.post('/bank-reconciliation/match', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { bankLineId, journalLineId } = req.body;
    const schoolId = req.user!.schoolId!;

    await prisma.$transaction(async tx => {
      // Mark bank statement line as reconciled
      await tx.bankStatementLine.update({
        where: { id: bankLineId },
        data: {
          isReconciled: true,
          journalLineId,
          matchedAt: new Date(),
          matchedBy: req.user!.id
        }
      });

      // Mark journal entry line as reconciled
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

/**
 * @route   POST /api/accounts/bank-reconciliation/unmatch
 * @desc    Unmatch a previously matched pair
 */
router.post('/bank-reconciliation/unmatch', requireAuth, requireRole('BURSAR', 'SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { bankLineId } = req.body;
    const schoolId = req.user!.schoolId!;

    const bankLine = await prisma.bankStatementLine.findFirst({
      where: { id: bankLineId, statement: { schoolId } }
    });
    if (!bankLine) return res.status(404).json({ error: 'Bank statement line not found' });

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
    res.status(500).json({ error: error.message || 'Failed to unmatch items' });
  }
});

export default router;
