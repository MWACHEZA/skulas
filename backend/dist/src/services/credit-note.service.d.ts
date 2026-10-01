import type { Prisma } from '../generated/client';
export interface CreateCreditNoteInput {
    schoolId: string;
    originalJournalEntryId: string;
    reason: string;
    issuedByUserId?: string;
    ipAddress?: string;
}
export declare class CreditNoteService {
    /**
     * Generically reverses a posted financial transaction with a Credit Note.
     * Works for any number of lines, any account types, student/supplier links.
     * If the original sale was fiscalised, emits a FiscalCreditNote to ZIMRA.
     */
    static createCreditNote(input: CreateCreditNoteInput): Promise<{
        creditNote: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            schoolId: string;
            totalAmount: number;
            currency: string;
            reason: string;
            creditNoteNumber: string;
            originalJournalEntryId: string;
            reversalJournalEntryId: string | null;
            fiscalInvoiceId: string | null;
            totalVat: number;
            issuedByUserId: string | null;
        };
        reversingEntry: {
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
        };
        originalEntryNumber: string;
        fiscalCreditNote: any;
    }>;
    /**
     * List credit notes for a school
     */
    static listCreditNotes(schoolId: string): Promise<({
        fiscalInvoice: {
            paymentMethod: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            schoolId: string;
            amount: number;
            currency: string;
            payload: Prisma.JsonValue | null;
            deviceId: string;
            glTransactionId: string | null;
            receiptNo: string;
            fiscalCode: string | null;
            fiscalDayNo: number | null;
            qrCode: string | null;
            receiptHash: string | null;
            response: Prisma.JsonValue | null;
            vatAmount: number;
            isCreditNote: boolean;
            originalFiscalId: string | null;
        } | null;
        lines: {
            id: string;
            createdAt: Date;
            schoolId: string;
            description: string | null;
            studentId: string | null;
            supplierId: string | null;
            amount: number;
            coaCode: string;
            vatAmount: number;
            creditNoteId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        schoolId: string;
        totalAmount: number;
        currency: string;
        reason: string;
        creditNoteNumber: string;
        originalJournalEntryId: string;
        reversalJournalEntryId: string | null;
        fiscalInvoiceId: string | null;
        totalVat: number;
        issuedByUserId: string | null;
    })[]>;
    /**
     * Get single credit note with printable receipt details
     */
    static getCreditNoteDetails(schoolId: string, creditNoteId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        schoolId: string;
        totalAmount: number;
        currency: string;
        reason: string;
        creditNoteNumber: string;
        originalJournalEntryId: string;
        reversalJournalEntryId: string | null;
        fiscalInvoiceId: string | null;
        totalVat: number;
        issuedByUserId: string | null;
    }>;
}
