"use strict";
/**
 * LedgerService — the core double-entry accounting engine.
 *
 * Enforces:
 *  1. Every posted entry balances: SUM(debit) === SUM(credit).
 *  2. All accounts belong strictly to the tenant (schoolId).
 *  3. Period must be OPEN (posting to CLOSED or LOCKED periods is rejected).
 *  4. Immutability: No direct UPDATE/DELETE on posted entries; corrections only via reversal.
 *  5. Dual-currency: base-currency and foreign amounts with historical exchange rates recorded at posting.
 *  6. Threshold-based multi-tier approvals.
 *  7. Full audit logging on every write.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const ledger_events_1 = require("./ledger-events");
const coa_seeder_1 = require("../../prisma/seeders/coa.seeder");
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
        throw new Error(`Accounting period ${period} is ${p.status} — cannot post new transactions.`);
    }
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
// LedgerService Implementation
// ─────────────────────────────────────────────────────────────────────────────
exports.LedgerService = {
    /**
     * High-level single posting function mandated by specification.
     * Every financial module calls this function.
     */
    async postDoubleEntry(args) {
        const { tenantId, debitCode, creditCode, amount, currency, reference, description, studentId, supplierId, sourceModule, period: customPeriod, date = new Date(), taxCode, vatCreditCode = '2021', vatAmount = 0, userId, ipAddress, tx, bypassApprovalCheck = false } = args;
        if (!amount || amount <= 0) {
            throw new Error(`Invalid posting amount: ${amount}. Must be strictly positive.`);
        }
        const run = async (db) => {
            // 1. Fetch Tenant Settings
            const setting = await db.schoolSetting.findUnique({
                where: { schoolId: tenantId }
            });
            const baseCurrency = setting?.baseCurrency || 'USD';
            const entryCurrency = currency || baseCurrency;
            const threshold = setting?.financialApprovalThreshold ?? 50.0;
            // 2. Approval Enforcement for transactions exceeding threshold
            if (!bypassApprovalCheck && amount > threshold) {
                const approved = await db.approval.findFirst({
                    where: {
                        schoolId: tenantId,
                        entityType: sourceModule,
                        entityId: reference || 'general',
                        status: 'APPROVED'
                    }
                });
                if (!approved) {
                    // Segregation of duties: requester cannot approve
                    const tier = amount > 500 ? 2 : 1;
                    const approverRole = tier === 2
                        ? (setting?.tier2ApprovalRole || 'SCHOOL_ADMIN')
                        : (setting?.tier1ApprovalRole || 'BURSAR');
                    const newApproval = await db.approval.create({
                        data: {
                            schoolId: tenantId,
                            entityType: sourceModule,
                            entityId: reference || `REF-${Date.now()}`,
                            requestedBy: userId || 'SYSTEM',
                            amount,
                            currency: entryCurrency,
                            status: 'PENDING',
                            tier,
                            approverRole,
                            thresholdRule: `Amount $${amount} exceeds approval threshold ($${threshold})`
                        }
                    });
                    throw new Error(`APPROVAL_REQUIRED: Amount $${amount} exceeds approval threshold ($${threshold}). Approval pending (ID: ${newApproval.id}, Required Approver: ${approverRole}).`);
                }
            }
            // 3. Resolve Exchange Rate
            let exchangeRateUsed = 1.0;
            if (entryCurrency !== baseCurrency) {
                const fxRecord = await db.exchangeRate.findFirst({
                    where: {
                        schoolId: tenantId,
                        fromCurrency: baseCurrency,
                        toCurrency: entryCurrency,
                        date: { lte: date }
                    },
                    orderBy: { date: 'desc' }
                });
                exchangeRateUsed = fxRecord?.rate || setting?.exchangeRate || 1.0;
            }
            // 4. Resolve Account IDs
            const debitAccountId = await (0, coa_seeder_1.getAccountId)(tenantId, debitCode, db);
            const creditAccountId = await (0, coa_seeder_1.getAccountId)(tenantId, creditCode, db);
            const netAmount = round2(amount);
            const netVat = round2(vatAmount);
            const mainCredit = round2(netAmount - netVat);
            const lines = [];
            // DR Line
            lines.push({
                accountId: debitAccountId,
                coaCode: debitCode,
                debit: netAmount,
                credit: 0,
                description: description || `Debit ${debitCode}`,
                studentId,
                supplierId,
                currency: entryCurrency,
                exchangeRate: exchangeRateUsed,
                baseAmount: round2(netAmount / exchangeRateUsed),
                taxCode
            });
            // CR Line (Net of VAT)
            lines.push({
                accountId: creditAccountId,
                coaCode: creditCode,
                debit: 0,
                credit: mainCredit,
                description: description || `Credit ${creditCode}`,
                studentId,
                supplierId,
                currency: entryCurrency,
                exchangeRate: exchangeRateUsed,
                baseAmount: round2(mainCredit / exchangeRateUsed),
                taxCode
            });
            // VAT Split if applicable
            if (netVat > 0) {
                const vatAccountId = await (0, coa_seeder_1.getAccountId)(tenantId, vatCreditCode, db);
                lines.push({
                    accountId: vatAccountId,
                    coaCode: vatCreditCode,
                    debit: 0,
                    credit: netVat,
                    description: `VAT Output Tax (ZIMRA 15%)`,
                    currency: entryCurrency,
                    exchangeRate: exchangeRateUsed,
                    baseAmount: round2(netVat / exchangeRateUsed),
                    taxCode: 'STANDARD_VAT_15'
                });
            }
            // 5. Post Balanced Journal Entry
            const entry = await exports.LedgerService.postEntry({
                schoolId: tenantId,
                date,
                description,
                sourceType: sourceModule,
                sourceId: reference || `REF-${Date.now()}`,
                lines,
                createdByUserId: userId,
                currency: entryCurrency,
                exchangeRateUsed,
                ipAddress,
                period: customPeriod,
                tx: db
            });
            // 6. Audit Log (if actor is an actual User)
            if (userId && userId !== 'SYSTEM') {
                try {
                    await db.auditLog.create({
                        data: {
                            schoolId: tenantId,
                            actorId: userId,
                            action: 'POST_DOUBLE_ENTRY',
                            entityType: 'JournalEntry',
                            entityId: entry.id,
                            details: {
                                entryNumber: entry.entryNumber,
                                debitCode,
                                creditCode,
                                amount: netAmount,
                                currency: entryCurrency,
                                rate: exchangeRateUsed,
                                sourceModule,
                                reference
                            },
                            ipAddress: ipAddress || '127.0.0.1'
                        }
                    });
                }
                catch (auditErr) {
                    console.warn('Audit log creation skipped (non-critical):', auditErr);
                }
            }
            return entry;
        };
        return tx ? run(tx) : prisma_1.default.$transaction(run);
    },
    /**
     * Post a balanced journal entry with multiple lines.
     */
    async postEntry(args) {
        const { schoolId, date, description, sourceType, sourceId, lines, createdByUserId, currency = 'USD', exchangeRateUsed = 1.0, ipAddress, period: userPeriod, tx } = args;
        const db = tx ?? prisma_1.default;
        // 1. Validate balance
        const totalDebit = round2(lines.reduce((s, l) => s + (l.debit ?? 0), 0));
        const totalCredit = round2(lines.reduce((s, l) => s + (l.credit ?? 0), 0));
        if (Math.abs(totalDebit - totalCredit) > 0.005) {
            throw new Error(`Journal entry imbalanced: DR ${totalDebit} !== CR ${totalCredit} (diff: ${round2(Math.abs(totalDebit - totalCredit))})`);
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
        const period = userPeriod || getPeriod(date);
        // 3. Check period is open
        await assertPeriodOpen(schoolId, period, db);
        // 4. Validate accounts belong to this school
        await assertAccountsBelongToSchool(schoolId, lines.map(l => l.accountId), db);
        // 5. Generate entry number atomically
        const entryNumber = await getNextEntryNumber(schoolId, db);
        // 6. Create the journal entry with lines
        const entry = await db.journalEntry.create({
            data: {
                schoolId,
                entryNumber,
                date,
                description,
                sourceType,
                sourceId,
                period,
                currency,
                exchangeRateUsed,
                ipAddress,
                createdByUserId,
                lines: {
                    create: lines.map(line => {
                        const lineCurr = line.currency ?? currency;
                        const rate = line.exchangeRate ?? exchangeRateUsed;
                        const debit = round2(line.debit ?? 0);
                        const credit = round2(line.credit ?? 0);
                        const baseAmount = line.baseAmount ?? round2((debit > 0 ? debit : credit) / rate);
                        return {
                            schoolId,
                            accountId: line.accountId,
                            coaCode: line.coaCode,
                            description: line.description,
                            debit,
                            credit,
                            baseAmount,
                            taxCode: line.taxCode,
                            currency: lineCurr,
                            exchangeRate: rate,
                            debitForeign: lineCurr !== currency ? round2(debit / rate) : debit,
                            creditForeign: lineCurr !== currency ? round2(credit / rate) : credit,
                            studentId: line.studentId,
                            supplierId: line.supplierId
                        };
                    })
                }
            },
            include: { lines: true }
        });
        // Broadcast SSE event for real-time UI synchronization
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
     * Reverse a posted entry. Creates an immutable new entry with all DR/CR swapped.
     * Original entry status updated to REVERSED — never deleted.
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
                coaCode: l.coaCode,
                description: `Reversal: ${l.description ?? ''}`,
                debit: round2(l.credit),
                credit: round2(l.debit),
                baseAmount: round2(l.baseAmount),
                taxCode: l.taxCode,
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
                    currency: original.currency,
                    exchangeRateUsed: original.exchangeRateUsed,
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
            await tx.auditLog.create({
                data: {
                    schoolId: original.schoolId,
                    actorId: userId,
                    action: 'REVERSE_JOURNAL_ENTRY',
                    entityType: 'JournalEntry',
                    entityId: original.id,
                    details: { originalEntryNumber: original.entryNumber, reversalEntryNumber: entryNumber, reason },
                    status: 'SUCCESS'
                }
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
     * Year-End / Period Close Function:
     * Transfers net Income - Expense to Retained Surplus (3020) and marks period CLOSED.
     */
    async closePeriod(tenantId, periodStr, userId, notes, isYearEnd = false) {
        return prisma_1.default.$transaction(async (tx) => {
            // 1. Check current period state
            const current = await tx.accountingPeriod.findUnique({
                where: { schoolId_period: { schoolId: tenantId, period: periodStr } }
            });
            if (current && (current.status === 'CLOSED' || current.status === 'LOCKED')) {
                throw new Error(`Period ${periodStr} is already ${current.status}.`);
            }
            // 2. If Year-End close: Transfer Net Surplus / (Deficit) to Retained Surplus (3020)
            if (isYearEnd) {
                const [year] = periodStr.split('-').map(Number);
                const yearStart = new Date(year, 0, 1);
                const yearEnd = new Date(year, 11, 31, 23, 59, 59);
                // Aggregate Income & Expense accounts
                const incAgg = await tx.journalEntryLine.aggregate({
                    where: {
                        schoolId: tenantId,
                        account: { type: 'INCOME' },
                        journalEntry: { status: 'POSTED', date: { gte: yearStart, lte: yearEnd } }
                    },
                    _sum: { credit: true, debit: true }
                });
                const expAgg = await tx.journalEntryLine.aggregate({
                    where: {
                        schoolId: tenantId,
                        account: { type: 'EXPENSE' },
                        journalEntry: { status: 'POSTED', date: { gte: yearStart, lte: yearEnd } }
                    },
                    _sum: { debit: true, credit: true }
                });
                const totalIncome = round2((incAgg._sum.credit ?? 0) - (incAgg._sum.debit ?? 0));
                const totalExpense = round2((expAgg._sum.debit ?? 0) - (expAgg._sum.credit ?? 0));
                const netSurplus = round2(totalIncome - totalExpense);
                if (netSurplus !== 0) {
                    const retainedSurplusId = await (0, coa_seeder_1.getAccountId)(tenantId, '3020', tx);
                    const currentYearSurplusId = await (0, coa_seeder_1.getAccountId)(tenantId, '3050', tx);
                    const lines = [];
                    if (netSurplus > 0) {
                        // Surplus: Debit Current Year Surplus / Credit Retained Surplus
                        lines.push({ accountId: currentYearSurplusId, coaCode: '3050', debit: netSurplus, credit: 0, description: `Year-end transfer of net surplus` });
                        lines.push({ accountId: retainedSurplusId, coaCode: '3020', debit: 0, credit: netSurplus, description: `Year-end retained surplus transfer` });
                    }
                    else {
                        // Deficit: Debit Retained Surplus / Credit Current Year Surplus
                        const absDeficit = Math.abs(netSurplus);
                        lines.push({ accountId: retainedSurplusId, coaCode: '3020', debit: absDeficit, credit: 0, description: `Year-end absorption of operational deficit` });
                        lines.push({ accountId: currentYearSurplusId, coaCode: '3050', debit: 0, credit: absDeficit, description: `Year-end deficit transfer` });
                    }
                    const entryNumber = await getNextEntryNumber(tenantId, tx);
                    await tx.journalEntry.create({
                        data: {
                            schoolId: tenantId,
                            entryNumber,
                            date: yearEnd,
                            description: `[YEAR-END CLOSE] Transfer of surplus/deficit for ${year} to Retained Earnings`,
                            sourceType: 'year_end_close',
                            sourceId: `CLOSE-${year}`,
                            period: periodStr,
                            createdByUserId: userId,
                            lines: {
                                create: lines.map(l => ({
                                    schoolId: tenantId,
                                    accountId: l.accountId,
                                    coaCode: l.coaCode,
                                    description: l.description,
                                    debit: l.debit ?? 0,
                                    credit: l.credit ?? 0,
                                    baseAmount: l.debit ?? l.credit ?? 0,
                                    currency: 'USD',
                                    exchangeRate: 1.0
                                }))
                            }
                        }
                    });
                }
            }
            // 3. Mark Period Closed
            const updated = await tx.accountingPeriod.upsert({
                where: { schoolId_period: { schoolId: tenantId, period: periodStr } },
                update: { status: 'CLOSED', closedBy: userId, closedAt: new Date(), notes },
                create: { schoolId: tenantId, period: periodStr, status: 'CLOSED', closedBy: userId, closedAt: new Date(), notes }
            });
            // 4. Audit Log
            await tx.auditLog.create({
                data: {
                    schoolId: tenantId,
                    actorId: userId,
                    action: isYearEnd ? 'YEAR_END_CLOSE_PERIOD' : 'CLOSE_ACCOUNTING_PERIOD',
                    entityType: 'AccountingPeriod',
                    entityId: updated.id,
                    details: { period: periodStr, isYearEnd, notes },
                    status: 'SUCCESS'
                }
            });
            return updated;
        });
    },
    /**
     * Account balance from posted journal lines.
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
            ? totalDebit - totalCredit
            : totalCredit - totalDebit;
        return round2(normalBalance);
    },
    /**
     * Trial Balance — verified sum of debit === credit across all accounts.
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
        const totalDebit = round2(lines.reduce((s, l) => s + l.totalDebit, 0));
        const totalCredit = round2(lines.reduce((s, l) => s + l.totalCredit, 0));
        const difference = round2(Math.abs(totalDebit - totalCredit));
        const isBalanced = difference < 0.01;
        return {
            lines,
            totalDebit,
            totalCredit,
            difference,
            isBalanced,
            period: currentPeriod
        };
    },
    /**
     * Income Statement (Profit & Loss).
     */
    async incomeStatement(schoolId, from, to) {
        const incomeAccounts = await prisma_1.default.chartOfAccount.findMany({
            where: { schoolId, type: 'INCOME', isActive: true },
            orderBy: { code: 'asc' }
        });
        const expenseAccounts = await prisma_1.default.chartOfAccount.findMany({
            where: { schoolId, type: 'EXPENSE', isActive: true },
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
     * Balance Sheet (Assets = Liabilities + Equity).
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
        const difference = round2(Math.abs(totalAssets - (totalLiabilities + totalEquity)));
        return {
            assets: result.ASSET,
            liabilities: result.LIABILITY,
            equity: result.EQUITY,
            totalAssets,
            totalLiabilities,
            totalEquity,
            isValid: difference < 0.05,
            asOfDate
        };
    },
    /**
     * General Ledger drilldown for a specific account.
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
                runningBalance,
                currency: line.currency,
                coaCode: line.coaCode
            };
        });
    },
    /**
     * Accounts Receivable (Debtors) Aging with 0-30, 31-60, 61-90, 90+ buckets.
     */
    async arAging(schoolId, asOfDate) {
        // Look up AR accounts (1100 or 1210)
        const arAccounts = await prisma_1.default.chartOfAccount.findMany({
            where: { schoolId, code: { in: ['1100', '1210'] }, isActive: true }
        });
        if (arAccounts.length === 0)
            return [];
        const activePaymentPlans = await prisma_1.default.paymentPlan.findMany({
            where: { schoolId, status: 'ACTIVE' },
            select: { studentId: true }
        });
        const excludedStudentIds = new Set(activePaymentPlans.map(p => p.studentId));
        const lines = await prisma_1.default.journalEntryLine.findMany({
            where: {
                accountId: { in: arAccounts.map(a => a.id) },
                studentId: { not: null, notIn: [...excludedStudentIds] },
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
     * ZIMRA VAT Report — split standard-rated (15%) vs exempt education supplies.
     */
    async vatReport(schoolId, from, to) {
        const vatLines = await prisma_1.default.journalEntryLine.findMany({
            where: {
                schoolId,
                journalEntry: { status: 'POSTED', date: { gte: from, lte: to } },
                OR: [
                    { taxCode: { not: null } },
                    { account: { code: '2021' } }
                ]
            },
            include: {
                account: { select: { code: true, name: true, type: true } },
                journalEntry: { select: { entryNumber: true, date: true, description: true } }
            }
        });
        let standardRatedSales = 0;
        let vatOutputCollected = 0;
        let exemptTuitionSales = 0;
        for (const l of vatLines) {
            if (l.account.code === '2021') {
                vatOutputCollected += round2(l.credit - l.debit);
            }
            else if (l.taxCode === 'STANDARD_VAT_15') {
                standardRatedSales += round2(l.credit - l.debit);
            }
            else if (l.taxCode === 'EXEMPT') {
                exemptTuitionSales += round2(l.credit - l.debit);
            }
        }
        return {
            standardRatedSales: round2(standardRatedSales),
            vatOutputCollected: round2(vatOutputCollected),
            exemptTuitionSales: round2(exemptTuitionSales),
            effectiveRate: standardRatedSales > 0 ? round2((vatOutputCollected / standardRatedSales) * 100) : 15,
            from,
            to,
            details: vatLines.slice(0, 50)
        };
    },
    /**
     * Cash Flow Statement — movement through all liquid bank & cash accounts.
     */
    async cashFlowStatement(schoolId, from, to) {
        // 1. Identify bank and cash accounts (isBank = true or codes 1010-1024)
        const bankAccounts = await prisma_1.default.chartOfAccount.findMany({
            where: {
                schoolId,
                isActive: true,
                OR: [{ isBank: true }, { code: { in: ['1010', '1011', '1012', '1013', '1020', '1021', '1022', '1023', '1024', '1100'] } }]
            }
        });
        const bankAccountIds = bankAccounts.map(b => b.id);
        // 2. Opening Balance (before 'from' date)
        const openingAgg = await prisma_1.default.journalEntryLine.aggregate({
            where: {
                accountId: { in: bankAccountIds },
                journalEntry: { status: 'POSTED', date: { lt: from } }
            },
            _sum: { debit: true, credit: true }
        });
        const openingCash = round2((openingAgg._sum.debit ?? 0) - (openingAgg._sum.credit ?? 0));
        // 3. Current period inflows and outflows
        const periodLines = await prisma_1.default.journalEntryLine.findMany({
            where: {
                accountId: { in: bankAccountIds },
                journalEntry: { status: 'POSTED', date: { gte: from, lte: to } }
            },
            include: { journalEntry: true }
        });
        let operatingInflows = 0; // Fee payments, tuckshop cash
        let operatingOutflows = 0; // Staff salaries, groceries, utilities
        let capitalExpenditure = 0; // Fixed asset purchases
        for (const l of periodLines) {
            const src = l.journalEntry.sourceType;
            const net = round2(l.debit - l.credit);
            if (net > 0) {
                // Cash Inflow
                operatingInflows += net;
            }
            else {
                // Cash Outflow
                const out = Math.abs(net);
                if (src.includes('asset') || src.includes('capital')) {
                    capitalExpenditure += out;
                }
                else {
                    operatingOutflows += out;
                }
            }
        }
        const netChange = round2(operatingInflows - operatingOutflows - capitalExpenditure);
        const closingCash = round2(openingCash + netChange);
        return {
            openingCash,
            operatingInflows: round2(operatingInflows),
            operatingOutflows: round2(operatingOutflows),
            capitalExpenditure: round2(capitalExpenditure),
            netChange,
            closingCash,
            from,
            to
        };
    },
    /**
     * Budget vs Actual variance report.
     */
    async budgetVsActual(schoolId, year, term) {
        const budgets = await prisma_1.default.budget.findMany({
            where: {
                schoolId,
                year,
                ...(term ? { term } : {})
            }
        });
        const accounts = await prisma_1.default.chartOfAccount.findMany({
            where: { schoolId, isActive: true },
            select: { id: true, code: true, name: true, type: true }
        });
        const accMap = new Map(accounts.map(a => [a.code, a]));
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);
        const rows = await Promise.all(budgets.map(async (b) => {
            const acc = accMap.get(b.coaCode);
            let actual = 0;
            if (acc) {
                const agg = await prisma_1.default.journalEntryLine.aggregate({
                    where: {
                        accountId: acc.id,
                        journalEntry: { status: 'POSTED', date: { gte: yearStart, lte: yearEnd } }
                    },
                    _sum: { debit: true, credit: true }
                });
                const d = agg._sum.debit ?? 0;
                const c = agg._sum.credit ?? 0;
                actual = ['EXPENSE', 'ASSET'].includes(acc.type) ? round2(d - c) : round2(c - d);
            }
            const variance = round2(b.amount - actual);
            const percentUtilized = b.amount > 0 ? round2((actual / b.amount) * 100) : 0;
            return {
                code: b.coaCode,
                name: acc?.name || b.coaCode,
                type: acc?.type || 'EXPENSE',
                budget: round2(b.amount),
                actual: round2(actual),
                variance,
                percentUtilized,
                term: b.term
            };
        }));
        return {
            year,
            term: term || 'Annual',
            rows: rows.sort((a, b) => a.code.localeCompare(b.code))
        };
    },
    /**
     * Calculate wallet balance for student from WalletTransaction table.
     */
    async getWalletBalance(studentId) {
        const txs = await prisma_1.default.walletTransaction.findMany({
            where: { wallet: { studentId } },
            select: { type: true, amount: true }
        });
        return round2(txs.reduce((sum, t) => sum + (t.type === 'CREDIT' ? t.amount : -t.amount), 0));
    },
    /**
     * Calculate current stock level for item from StockMovement table.
     */
    async getStockLevel(itemId) {
        const movements = await prisma_1.default.stockMovement.findMany({
            where: { itemId },
            select: { direction: true, quantity: true }
        });
        return movements.reduce((sum, m) => sum + (m.direction === 'IN' ? m.quantity : -m.quantity), 0);
    }
};
exports.default = exports.LedgerService;
//# sourceMappingURL=ledger.service.js.map