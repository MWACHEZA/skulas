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
import type { Prisma } from '../generated/client';
export interface JournalLine {
    accountId: string;
    debit?: number;
    credit?: number;
    description?: string;
    studentId?: string;
    supplierId?: string;
    /** ISO 4217 currency code — defaults to school's baseCurrency */
    currency?: string;
    /** Exchange rate to base currency — defaults to 1.0 */
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
    /** Pass the caller's transaction client so the JE is atomic with the source record */
    tx?: Prisma.TransactionClient;
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
     * Post a balanced journal entry.
     * Must be called inside the same DB transaction as the triggering operation
     * so that either both commit or both roll back.
     */
    postEntry(args: PostEntryArgs): Promise<{
        lines: {
            id: string;
            createdAt: Date;
            schoolId: string;
            description: string | null;
            supplierId: string | null;
            studentId: string | null;
            currency: string;
            journalEntryId: string;
            accountId: string;
            debit: number;
            credit: number;
            exchangeRate: number;
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
        isLocked: boolean;
        period: string;
        entryNumber: string;
        isReversing: boolean;
        reversedById: string | null;
        sourceType: string;
        sourceId: string;
        createdByUserId: string | null;
    }>;
    /**
     * Reverse a posted entry. Creates a new entry with all DR/CR swapped.
     * The original entry is marked REVERSED — never deleted.
     */
    reverseEntry(journalEntryId: string, reason: string, userId: string, date?: Date): Promise<{
        lines: {
            id: string;
            createdAt: Date;
            schoolId: string;
            description: string | null;
            supplierId: string | null;
            studentId: string | null;
            currency: string;
            journalEntryId: string;
            accountId: string;
            debit: number;
            credit: number;
            exchangeRate: number;
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
        isLocked: boolean;
        period: string;
        entryNumber: string;
        isReversing: boolean;
        reversedById: string | null;
        sourceType: string;
        sourceId: string;
        createdByUserId: string | null;
    }>;
    /**
     * Compute an account's balance from posted journal entries.
     * For ASSET & EXPENSE: balance = SUM(debit) - SUM(credit)
     * For LIABILITY, EQUITY, INCOME: balance = SUM(credit) - SUM(debit)
     */
    getAccountBalance(accountId: string, upToDate?: Date): Promise<number>;
    /**
     * Trial Balance — sum all accounts and verify debit === credit.
     */
    trialBalance(schoolId: string, period?: string): Promise<TrialBalanceLine[]>;
    /**
     * Income Statement (P&L) for a date range.
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
     * Balance Sheet as of a given date.
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
        asOfDate: Date;
    }>;
    /**
     * General Ledger — all transactions for a given account with running balance.
     */
    generalLedger(accountId: string, from: Date, to: Date): Promise<LedgerEntry[]>;
    /**
     * Accounts Receivable Aging — per student sub-ledger.
     * Buckets: Current (0–30 days), 31–60, 61–90, 90+
     */
    arAging(schoolId: string, asOfDate: Date): Promise<ARAgingRow[]>;
    /**
     * Compute a student wallet balance on-the-fly (no cached field).
     * DEPOSIT = positive, PURCHASE = negative, REFUND = positive.
     */
    getWalletBalance(studentId: string): Promise<number>;
    /**
     * Compute uniform stock level on-the-fly from stock movements.
     */
    getStockLevel(itemId: string): Promise<number>;
};
export default LedgerService;
