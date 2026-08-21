"use strict";
/**
 * LedgerService — the single posting engine for all financial events.
 *
 * RULES enforced here:
 *  1. Every posted entry must balance: SUM(debit) === SUM(credit)
 *  2. All account IDs must belong to the same schoolId
 *  3. Period must be OPEN (not CLOSED or LOCKED)
 *  4. Reversal creates a new entry with swapped DR/CR — never deletes
 *  5. Dual-currency: base-currency amounts always stored alongside foreign amounts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const ledger_events_1 = require("./ledger-events");
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function round2(n) {
    return Math.round(n * 100) / 100;
}
function getPeriod(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}
async function getNextEntryNumber(schoolId, db) {
    // Use SchoolSequence for atomic increment
    const seq = await db.schoolSequence.upsert({
        where: { schoolId_entity: { schoolId, entity: 'JOURNAL_ENTRY' } },
        update: { lastValue: { increment: 1 } },
        create: { schoolId, entity: 'JOURNAL_ENTRY', lastValue: 1 }
    });
    const school = await db.school.findUnique({ where: { id: schoolId }, select: { code: true } });
    const code = school?.code ?? schoolId.slice(0, 6).toUpperCase();
    return `JE-${code}-${String(seq.lastValue).padStart(6, '0')}`;
}
async function assertPeriodOpen(schoolId, period, db) {
    const p = await db.accountingPeriod.findUnique({
        where: { schoolId_period: { schoolId, period } }
    });
    if (p && (p.status === 'CLOSED' || p.status === 'LOCKED')) {
        throw new Error(`Accounting period ${period} is ${p.status} — cannot post new entries.`);
    }
    // If no period record exists, the period is implicitly OPEN
}
async function assertAccountsBelongToSchool(schoolId, accountIds, db) {
    const unique = [...new Set(accountIds)];
    const count = await db.chartOfAccount.count({
        where: { id: { in: unique }, schoolId, isActive: true }
    });
    if (count !== unique.length) {
        throw new Error('One or more account IDs are invalid, inactive, or belong to a different tenant.');
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// LedgerService
// ─────────────────────────────────────────────────────────────────────────────
exports.LedgerService = {
    /**
     * Post a balanced journal entry.
     * Must be called inside the same DB transaction as the triggering operation
     * so that either both commit or both roll back.
     */
    async postEntry(args) {
        const { schoolId, date, description, sourceType, sourceId, lines, createdByUserId, tx } = args;
        const db = tx ?? prisma_1.default;
        // 1. Validate balance
        const totalDebit = round2(lines.reduce((s, l) => s + (l.debit ?? 0), 0));
        const totalCredit = round2(lines.reduce((s, l) => s + (l.credit ?? 0), 0));
        if (Math.abs(totalDebit - totalCredit) > 0.005) {
            throw new Error(`Journal entry imbalanced: DR ${totalDebit} ≠ CR ${totalCredit} (diff: ${round2(Math.abs(totalDebit - totalCredit))})`);
        }
        // 2. Validate all lines have at least one non-zero side
        for (const line of lines) {
            const d = line.debit ?? 0;
            const c = line.credit ?? 0;
            if (d === 0 && c === 0) {
                throw new Error('Journal entry line has zero debit and zero credit.');
            }
            if (d < 0 || c < 0) {
                throw new Error('Debit and credit amounts must be non-negative. Use a reversal entry for corrections.');
            }
        }
        const period = getPeriod(date);
        // 3. Check period is open
        await assertPeriodOpen(schoolId, period, db);
        // 4. Validate accounts belong to this school
        await assertAccountsBelongToSchool(schoolId, lines.map(l => l.accountId), db);
        // 5. Generate entry number atomically
        const entryNumber = await getNextEntryNumber(schoolId, db);
        // 6. Get school's base currency for default
        const setting = await db.schoolSetting.findUnique({
            where: { schoolId },
            select: { baseCurrency: true }
        });
        const baseCurrency = setting?.baseCurrency ?? 'USD';
        // 7. Create the journal entry with lines
        const entry = await db.journalEntry.create({
            data: {
                schoolId,
                entryNumber,
                date,
                description,
                sourceType,
                sourceId,
                period,
                createdByUserId,
                lines: {
                    create: lines.map(line => {
                        const currency = line.currency ?? baseCurrency;
                        const rate = line.exchangeRate ?? 1.0;
                        const debit = round2(line.debit ?? 0);
                        const credit = round2(line.credit ?? 0);
                        return {
                            schoolId,
                            accountId: line.accountId,
                            description: line.description,
                            debit,
                            credit,
                            currency,
                            exchangeRate: rate,
                            debitForeign: currency !== baseCurrency ? round2(debit / rate) : debit,
                            creditForeign: currency !== baseCurrency ? round2(credit / rate) : credit,
                            studentId: line.studentId,
                            supplierId: line.supplierId
                        };
                    })
                }
            },
            include: { lines: true }
        });
        // Broadcast SSE event for real-time UI synchronization across tenant screens/tabs
        ledger_events_1.LedgerEvents.broadcast({
            type: 'LEDGER_POSTED',
            schoolId,
            sourceType,
            sourceId,
            affectedAccounts: lines.map(l => l.accountId),
            studentId: lines.find(l => l.studentId)?.studentId,
            timestamp: new Date().toISOString()
        });
        return entry;
    },
    /**
     * Reverse a posted entry. Creates a new entry with all DR/CR swapped.
     * The original entry is marked REVERSED — never deleted.
     */
    async reverseEntry(journalEntryId, reason, userId, date) {
        const original = await prisma_1.default.journalEntry.findUnique({
            where: { id: journalEntryId },
            include: { lines: true }
        });
        if (!original)
            throw new Error(`Journal entry ${journalEntryId} not found.`);
        if (original.status === 'REVERSED')
            throw new Error(`Journal entry ${original.entryNumber} is already reversed.`);
        if (original.isLocked)
            throw new Error(`Journal entry ${original.entryNumber} is locked.`);
        const reversalDate = date ?? new Date();
        const period = getPeriod(reversalDate);
        return prisma_1.default.$transaction(async (tx) => {
            await assertPeriodOpen(original.schoolId, period, tx);
            // Swap DR/CR on every line
            const reversalLines = original.lines.map(l => ({
                schoolId: l.schoolId,
                accountId: l.accountId,
                description: `Reversal: ${l.description ?? ''}`,
                debit: round2(l.credit),
                credit: round2(l.debit),
                currency: l.currency,
                exchangeRate: l.exchangeRate,
                debitForeign: round2(l.creditForeign),
                creditForeign: round2(l.debitForeign),
                studentId: l.studentId,
                supplierId: l.supplierId
            }));
            const entryNumber = await getNextEntryNumber(original.schoolId, tx);
            const reversal = await tx.journalEntry.create({
                data: {
                    schoolId: original.schoolId,
                    entryNumber,
                    date: reversalDate,
                    description: `REVERSAL of ${original.entryNumber}: ${reason}`,
                    sourceType: original.sourceType,
                    sourceId: original.sourceId,
                    period,
                    isReversing: true,
                    reversedById: original.id,
                    createdByUserId: userId,
                    lines: { create: reversalLines }
                },
                include: { lines: true }
            });
            // Mark original as reversed
            await tx.journalEntry.update({
                where: { id: original.id },
                data: { status: 'REVERSED' }
            });
            ledger_events_1.LedgerEvents.broadcast({
                type: 'LEDGER_REVERSED',
                schoolId: original.schoolId,
                sourceType: original.sourceType,
                sourceId: original.sourceId,
                affectedAccounts: original.lines.map(l => l.accountId),
                timestamp: new Date().toISOString()
            });
            return reversal;
        });
    },
    /**
     * Compute an account's balance from posted journal entries.
     * For ASSET & EXPENSE: balance = SUM(debit) - SUM(credit)
     * For LIABILITY, EQUITY, INCOME: balance = SUM(credit) - SUM(debit)
     */
    async getAccountBalance(accountId, upToDate) {
        const account = await prisma_1.default.chartOfAccount.findUnique({ where: { id: accountId } });
        if (!account)
            throw new Error(`Account ${accountId} not found.`);
        const where = {
            accountId,
            journalEntry: {
                status: 'POSTED',
                ...(upToDate ? { date: { lte: upToDate } } : {})
            }
        };
        const agg = await prisma_1.default.journalEntryLine.aggregate({
            where,
            _sum: { debit: true, credit: true }
        });
        const totalDebit = agg._sum.debit ?? 0;
        const totalCredit = agg._sum.credit ?? 0;
        const normalBalance = ['ASSET', 'EXPENSE'].includes(account.type)
            ? totalDebit - totalCredit // DR normal balance
            : totalCredit - totalDebit; // CR normal balance
        return round2(normalBalance);
    },
    /**
     * Trial Balance — sum all accounts and verify debit === credit.
     */
    async trialBalance(schoolId, period) {
        const currentPeriod = period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const [year, month] = currentPeriod.split('-').map(Number);
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0, 23, 59, 59);
        const accounts = await prisma_1.default.chartOfAccount.findMany({
            where: { schoolId, isActive: true },
            orderBy: { code: 'asc' }
        });
        const lines = [];
        for (const acc of accounts) {
            const agg = await prisma_1.default.journalEntryLine.aggregate({
                where: {
                    accountId: acc.id,
                    journalEntry: {
                        status: 'POSTED',
                        date: { gte: periodStart, lte: periodEnd }
                    }
                },
                _sum: { debit: true, credit: true }
            });
            const d = round2(agg._sum.debit ?? 0);
            const c = round2(agg._sum.credit ?? 0);
            if (d === 0 && c === 0)
                continue;
            lines.push({
                accountCode: acc.code,
                accountName: acc.name,
                accountType: acc.type,
                totalDebit: d,
                totalCredit: c,
                balance: round2(d - c)
            });
        }
        return lines;
    },
    /**
     * Income Statement (P&L) for a date range.
     */
    async incomeStatement(schoolId, from, to) {
        const incomeAccounts = await prisma_1.default.chartOfAccount.findMany({
            where: { schoolId, type: 'INCOME', isActive: true },
            orderBy: { code: 'asc' }
        });
        const expenseAccounts = await prisma_1.default.chartOfAccount.findMany({
            where: { schoolId, type: { in: ['EXPENSE'] }, isActive: true },
            orderBy: { code: 'asc' }
        });
        async function sumAccount(accId) {
            const agg = await prisma_1.default.journalEntryLine.aggregate({
                where: {
                    accountId: accId,
                    journalEntry: { status: 'POSTED', date: { gte: from, lte: to } }
                },
                _sum: { credit: true, debit: true }
            });
            return { credit: round2(agg._sum.credit ?? 0), debit: round2(agg._sum.debit ?? 0) };
        }
        const income = await Promise.all(incomeAccounts.map(async (acc) => {
            const { credit, debit } = await sumAccount(acc.id);
            return { code: acc.code, name: acc.name, amount: round2(credit - debit) };
        }));
        const expenses = await Promise.all(expenseAccounts.map(async (acc) => {
            const { debit, credit } = await sumAccount(acc.id);
            return { code: acc.code, name: acc.name, amount: round2(debit - credit) };
        }));
        const totalIncome = round2(income.reduce((s, i) => s + i.amount, 0));
        const totalExpenses = round2(expenses.reduce((s, e) => s + e.amount, 0));
        const netProfit = round2(totalIncome - totalExpenses);
        return { income, expenses, totalIncome, totalExpenses, netProfit, from, to };
    },
    /**
     * Balance Sheet as of a given date.
     */
    async balanceSheet(schoolId, asOfDate) {
        const types = ['ASSET', 'LIABILITY', 'EQUITY'];
        const result = {};
        for (const type of types) {
            const accounts = await prisma_1.default.chartOfAccount.findMany({
                where: { schoolId, type, isActive: true },
                orderBy: { code: 'asc' }
            });
            result[type] = await Promise.all(accounts.map(async (acc) => ({
                code: acc.code,
                name: acc.name,
                balance: await exports.LedgerService.getAccountBalance(acc.id, asOfDate)
            })));
        }
        const totalAssets = round2(result.ASSET.reduce((s, a) => s + a.balance, 0));
        const totalLiabilities = round2(result.LIABILITY.reduce((s, a) => s + a.balance, 0));
        const totalEquity = round2(result.EQUITY.reduce((s, a) => s + a.balance, 0));
        return {
            assets: result.ASSET,
            liabilities: result.LIABILITY,
            equity: result.EQUITY,
            totalAssets,
            totalLiabilities,
            totalEquity,
            asOfDate
        };
    },
    /**
     * General Ledger — all transactions for a given account with running balance.
     */
    async generalLedger(accountId, from, to) {
        const account = await prisma_1.default.chartOfAccount.findUnique({ where: { id: accountId } });
        if (!account)
            throw new Error(`Account ${accountId} not found.`);
        const lines = await prisma_1.default.journalEntryLine.findMany({
            where: {
                accountId,
                journalEntry: { status: 'POSTED', date: { gte: from, lte: to } }
            },
            include: { journalEntry: true },
            orderBy: { journalEntry: { date: 'asc' } }
        });
        const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.type);
        let runningBalance = 0;
        return lines.map(line => {
            const debit = round2(line.debit);
            const credit = round2(line.credit);
            runningBalance = isDebitNormal
                ? round2(runningBalance + debit - credit)
                : round2(runningBalance + credit - debit);
            return {
                date: line.journalEntry.date,
                entryNumber: line.journalEntry.entryNumber,
                description: line.description ?? line.journalEntry.description,
                sourceType: line.journalEntry.sourceType,
                sourceId: line.journalEntry.sourceId,
                debit,
                credit,
                runningBalance
            };
        });
    },
    /**
     * Accounts Receivable Aging — per student sub-ledger.
     * Buckets: Current (0–30 days), 31–60, 61–90, 90+
     */
    async arAging(schoolId, asOfDate) {
        // Find the AR account (1210 Student Accounts Receivable)
        const arAccount = await prisma_1.default.chartOfAccount.findFirst({
            where: { schoolId, code: '1210', isActive: true }
        });
        if (!arAccount)
            return [];
        // Get all open AR lines grouped by studentId
        const lines = await prisma_1.default.journalEntryLine.findMany({
            where: {
                accountId: arAccount.id,
                studentId: { not: null },
                journalEntry: { status: 'POSTED', date: { lte: asOfDate } }
            },
            include: {
                journalEntry: { select: { date: true } }
            }
        });
        const studentIds = [...new Set(lines.map(l => l.studentId))];
        const students = await prisma_1.default.student.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, name: true, class: { select: { name: true } } }
        });
        const studentMap = new Map(students.map(s => [s.id, s]));
        const byStudent = new Map();
        for (const line of lines) {
            const sid = line.studentId;
            if (!byStudent.has(sid))
                byStudent.set(sid, { current: 0, d31_60: 0, d61_90: 0, over90: 0 });
            const entry = byStudent.get(sid);
            const daysDiff = Math.floor((asOfDate.getTime() - line.journalEntry.date.getTime()) / (1000 * 60 * 60 * 24));
            // AR: debit = invoice, credit = payment
            const netAmount = round2(line.debit - line.credit);
            if (daysDiff <= 30)
                entry.current += netAmount;
            else if (daysDiff <= 60)
                entry.d31_60 += netAmount;
            else if (daysDiff <= 90)
                entry.d61_90 += netAmount;
            else
                entry.over90 += netAmount;
        }
        return [...byStudent.entries()]
            .map(([sid, buckets]) => {
            const student = studentMap.get(sid);
            const total = round2(buckets.current + buckets.d31_60 + buckets.d61_90 + buckets.over90);
            return {
                studentId: sid,
                studentName: student?.name ?? sid,
                className: student?.class?.name ?? null,
                current: round2(buckets.current),
                days31_60: round2(buckets.d31_60),
                days61_90: round2(buckets.d61_90),
                over90: round2(buckets.over90),
                total
            };
        })
            .filter(r => r.total !== 0)
            .sort((a, b) => b.total - a.total);
    },
    /**
     * Compute a student wallet balance on-the-fly (no cached field).
     * DEPOSIT = positive, PURCHASE = negative, REFUND = positive.
     */
    async getWalletBalance(studentId) {
        const agg = await prisma_1.default.walletTransaction.aggregate({
            where: { wallet: { studentId } },
            _sum: { amount: true }
        });
        return round2(agg._sum.amount ?? 0);
    },
    /**
     * Compute uniform stock level on-the-fly from stock movements.
     */
    async getStockLevel(itemId) {
        const agg = await prisma_1.default.uniformStockMovement.aggregate({
            where: { itemId },
            _sum: { quantity: true }
        });
        return agg._sum.quantity ?? 0;
    }
};
exports.default = exports.LedgerService;
//# sourceMappingURL=ledger.service.js.map