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
        school: {
            schoolSetting: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                address: string | null;
                country: string | null;
                phone: string | null;
                schoolId: string;
                city: string | null;
                state: string | null;
                language: string | null;
                theme: string | null;
                favicon: string | null;
                idleTime: number | null;
                idleTimeCountdown: number | null;
                baseCurrency: string | null;
                baseCurrencySymbol: string | null;
                altCurrency: string | null;
                altCurrencySymbol: string | null;
                mandatoryReceipts: boolean;
                showBalanceOnReceipts: boolean;
                showUniformsModule: boolean;
                financialApprovalThreshold: number | null;
                tier1ApprovalRole: string | null;
                tier2ApprovalRole: string | null;
                debtorLimit: number | null;
                tillVarianceThreshold: number | null;
                allowNegativeStock: boolean;
                vatNumber: string | null;
                vatRate: number | null;
                smtpEmail: string | null;
                smtpHost: string | null;
                smtpPort: number | null;
                smtpPassword: string | null;
                smtpSsl: boolean;
                systemUrl: string | null;
                whatsappApiUrl: string | null;
                whatsappAccessToken: string | null;
                countryPhoneCode: string | null;
                systemName: string | null;
                systemTitle: string | null;
                shortSystemName: string | null;
                systemEmail: string | null;
                mapLocation: string | null;
                mapLatitude: number | null;
                mapLongitude: number | null;
                paypalEmail: string | null;
                systemCurrency: string | null;
                runningSession: string | null;
                weekends: string[];
                currentTerm: string | null;
                nextTermBegin: Date | null;
                timezone: string | null;
                tawktoPropertyId: string | null;
                textAlignment: string | null;
                themeColour: string | null;
                enableParentMarketplace: boolean;
                deletePaymentHistoryWithPartial: boolean;
                footer: string | null;
                facebook: string | null;
                twitter: string | null;
                youtube: string | null;
                instagram: string | null;
                linkedin: string | null;
                tiktok: string | null;
                reportCardTemplate: string | null;
                allowTeacherEnterScores: boolean;
                scoreClosingDate: Date | null;
                allowStudentCheckResult: boolean;
                allowParentPrintReport: boolean;
                reportCommentSignature: string | null;
                showSubjectPosition: boolean;
                gateMinPaidAmount: number;
                gateMinPaidPercent: number;
                gateRequiredType: string;
                idCardTemplateFront: string | null;
                idCardTemplateBack: string | null;
                setupStatus: Prisma.JsonValue | null;
                housesModuleEnabled: boolean;
                transportGpsEnabled: boolean;
                transportTodayStatus: string | null;
            } | null;
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            code: string;
            type: string;
            isCombined: boolean;
            levels: string[];
            address: string | null;
            country: string | null;
            email: string;
            phone: string | null;
            website: string | null;
            status: string;
            planId: string;
            branding: Prisma.JsonValue | null;
            customContent: Prisma.JsonValue | null;
            hexcoCenterNumber: string | null;
            idCardTemplate: string | null;
            settings: Prisma.JsonValue | null;
            subscription: Prisma.JsonValue | null;
        };
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
    }>;
}
