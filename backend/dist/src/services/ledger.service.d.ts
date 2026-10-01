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
import type { Prisma } from '../generated/client';
export interface JournalLine {
    accountId: string;
    debit?: number;
    credit?: number;
    description?: string;
    studentId?: string;
    supplierId?: string;
    coaCode?: string;
    baseAmount?: number;
    taxCode?: string;
    currency?: string;
    exchangeRate?: number;
}
export interface PostEntryArgs {
    schoolId: string;
    date: Date;
    description: string;
    sourceType: string;
    sourceId: string;
    lines: JournalLine[];
    createdByUserId?: string;
    currency?: string;
    exchangeRateUsed?: number;
    ipAddress?: string;
    period?: string;
    tx?: Prisma.TransactionClient;
}
export interface PostDoubleEntryArgs {
    tenantId: string;
    debitCode: string;
    creditCode: string;
    amount: number;
    currency?: string;
    reference?: string;
    description: string;
    studentId?: string;
    supplierId?: string;
    sourceModule: string;
    period?: string;
    date?: Date;
    taxCode?: string;
    vatCreditCode?: string;
    vatAmount?: number;
    userId?: string;
    ipAddress?: string;
    tx?: Prisma.TransactionClient;
    bypassApprovalCheck?: boolean;
}
export interface TrialBalanceLine {
    accountCode: string;
    accountName: string;
    accountType: string;
    totalDebit: number;
    totalCredit: number;
    balance: number;
}
export interface LedgerEntry {
    date: Date;
    entryNumber: string;
    description: string;
    sourceType: string;
    sourceId: string;
    debit: number;
    credit: number;
    runningBalance: number;
    currency: string;
    coaCode?: string | null;
}
export interface ARAgingRow {
    studentId: string;
    studentName: string;
    className: string | null;
    current: number;
    days31_60: number;
    days61_90: number;
    over90: number;
    total: number;
}
export declare const LedgerService: {
    /**
     * High-level single posting function mandated by specification.
     * Every financial module calls this function.
     */
    postDoubleEntry(args: PostDoubleEntryArgs): Promise<{
        lines: {
            exchangeRate: number;
            id: string;
            createdAt: Date;
            schoolId: string;
            description: string | null;
            studentId: string | null;
            supplierId: string | null;
            currency: string;
            journalEntryId: string;
            accountId: string;
            coaCode: string | null;
            debit: number;
            credit: number;
            baseAmount: number;
            taxCode: string | null;
            debitForeign: number;
            creditForeign: number;
            isReconciled: boolean;
            reconciledAt: Date | null;
            bankLineId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        schoolId: string;
        description: string;
        date: Date;
        currency: string;
        isLocked: boolean;
        ipAddress: string | null;
        period: string;
        entryNumber: string;
        exchangeRateUsed: number;
        isReversing: boolean;
        reversedById: string | null;
        isReversed: boolean;
        reversedByCnId: string | null;
        sourceType: string;
        sourceId: string;
        createdByUserId: string | null;
    }>;
    /**
     * Post a balanced journal entry with multiple lines.
     */
    postEntry(args: PostEntryArgs): Promise<{
        lines: {
            exchangeRate: number;
            id: string;
            createdAt: Date;
            schoolId: string;
            description: string | null;
            studentId: string | null;
            supplierId: string | null;
            currency: string;
            journalEntryId: string;
            accountId: string;
            coaCode: string | null;
            debit: number;
            credit: number;
            baseAmount: number;
            taxCode: string | null;
            debitForeign: number;
            creditForeign: number;
            isReconciled: boolean;
            reconciledAt: Date | null;
            bankLineId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        schoolId: string;
        description: string;
        date: Date;
        currency: string;
        isLocked: boolean;
        ipAddress: string | null;
        period: string;
        entryNumber: string;
        exchangeRateUsed: number;
        isReversing: boolean;
        reversedById: string | null;
        isReversed: boolean;
        reversedByCnId: string | null;
        sourceType: string;
        sourceId: string;
        createdByUserId: string | null;
    }>;
    /**
     * Reverse a posted entry. Creates an immutable new entry with all DR/CR swapped.
     * Original entry status updated to REVERSED — never deleted.
     */
    reverseEntry(journalEntryId: string, reason: string, userId: string, date?: Date): Promise<{
        lines: {
            exchangeRate: number;
            id: string;
            createdAt: Date;
            schoolId: string;
            description: string | null;
            studentId: string | null;
            supplierId: string | null;
            currency: string;
            journalEntryId: string;
            accountId: string;
            coaCode: string | null;
            debit: number;
            credit: number;
            baseAmount: number;
            taxCode: string | null;
            debitForeign: number;
            creditForeign: number;
            isReconciled: boolean;
            reconciledAt: Date | null;
            bankLineId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        schoolId: string;
        description: string;
        date: Date;
        currency: string;
        isLocked: boolean;
        ipAddress: string | null;
        period: string;
        entryNumber: string;
        exchangeRateUsed: number;
        isReversing: boolean;
        reversedById: string | null;
        isReversed: boolean;
        reversedByCnId: string | null;
        sourceType: string;
        sourceId: string;
        createdByUserId: string | null;
    }>;
    /**
     * Year-End / Period Close Function:
     * Transfers net Income - Expense to Retained Surplus (3020) and marks period CLOSED.
     */
    closePeriod(tenantId: string, periodStr: string, userId: string, notes?: string, isYearEnd?: boolean): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        schoolId: string;
        term: string | null;
        startDate: Date | null;
        year: number | null;
        endDate: Date | null;
        notes: string | null;
        period: string;
        closedAt: Date | null;
        closedBy: string | null;
    }>;
    /**
     * Account balance from posted journal lines.
     */
    getAccountBalance(accountId: string, upToDate?: Date): Promise<number>;
    /**
     * Trial Balance — verified sum of debit === credit across all accounts.
     */
    trialBalance(schoolId: string, period?: string): Promise<{
        lines: TrialBalanceLine[];
        totalDebit: number;
        totalCredit: number;
        difference: number;
        isBalanced: boolean;
        period: string;
    }>;
    /**
     * Income Statement (Profit & Loss).
     */
    incomeStatement(schoolId: string, from: Date, to: Date): Promise<{
        income: {
            code: string;
            name: string;
            amount: number;
        }[];
        expenses: {
            code: string;
            name: string;
            amount: number;
        }[];
        totalIncome: number;
        totalExpenses: number;
        netProfit: number;
        from: Date;
        to: Date;
    }>;
    /**
     * Balance Sheet (Assets = Liabilities + Equity).
     */
    balanceSheet(schoolId: string, asOfDate: Date): Promise<{
        assets: {
            code: string;
            name: string;
            balance: number;
        }[];
        liabilities: {
            code: string;
            name: string;
            balance: number;
        }[];
        equity: {
            code: string;
            name: string;
            balance: number;
        }[];
        totalAssets: number;
        totalLiabilities: number;
        totalEquity: number;
        isValid: boolean;
        asOfDate: Date;
    }>;
    /**
     * General Ledger drilldown for a specific account.
     */
    generalLedger(accountId: string, from: Date, to: Date): Promise<LedgerEntry[]>;
    /**
     * Accounts Receivable (Debtors) Aging with 0-30, 31-60, 61-90, 90+ buckets.
     */
    arAging(schoolId: string, asOfDate: Date): Promise<ARAgingRow[]>;
    /**
     * ZIMRA VAT Report — split standard-rated (15%) vs exempt education supplies.
     */
    vatReport(schoolId: string, from: Date, to: Date): Promise<{
        standardRatedSales: number;
        vatOutputCollected: number;
        exemptTuitionSales: number;
        effectiveRate: number;
        from: Date;
        to: Date;
        details: ({
            journalEntry: {
                description: string;
                date: Date;
                entryNumber: string;
            };
            account: {
                name: string;
                code: string;
                type: import("../generated/client").$Enums.AccountType;
            };
        } & {
            exchangeRate: number;
            id: string;
            createdAt: Date;
            schoolId: string;
            description: string | null;
            studentId: string | null;
            supplierId: string | null;
            currency: string;
            journalEntryId: string;
            accountId: string;
            coaCode: string | null;
            debit: number;
            credit: number;
            baseAmount: number;
            taxCode: string | null;
            debitForeign: number;
            creditForeign: number;
            isReconciled: boolean;
            reconciledAt: Date | null;
            bankLineId: string | null;
        })[];
    }>;
    /**
     * Cash Flow Statement — movement through all liquid bank & cash accounts.
     */
    cashFlowStatement(schoolId: string, from: Date, to: Date): Promise<{
        openingCash: number;
        operatingInflows: number;
        operatingOutflows: number;
        capitalExpenditure: number;
        netChange: number;
        closingCash: number;
        from: Date;
        to: Date;
    }>;
    /**
     * Budget vs Actual variance report.
     */
    budgetVsActual(schoolId: string, year: number, term?: string): Promise<{
        year: number;
        term: string;
        rows: {
            code: string;
            name: string;
            type: import("../generated/client").$Enums.AccountType;
            budget: number;
            actual: number;
            variance: number;
            percentUtilized: number;
            term: string | null;
        }[];
    }>;
    /**
     * Calculate wallet balance for student from WalletTransaction table.
     */
    getWalletBalance(studentId: string): Promise<number>;
    /**
     * Calculate current stock level for item from StockMovement table.
     */
    getStockLevel(itemId: string): Promise<number>;
};
export default LedgerService;
