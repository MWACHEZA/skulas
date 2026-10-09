"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditNoteService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const sequence_service_1 = require("./sequence.service");
const ledger_service_1 = require("./ledger.service");
const fiscal_service_1 = require("./fiscal.service");
class CreditNoteService {
    /**
     * Generically reverses a posted financial transaction with a Credit Note.
     * Works for any number of lines, any account types, student/supplier links.
     * If the original sale was fiscalised, emits a FiscalCreditNote to ZIMRA.
     */
    static async createCreditNote(input) {
        const { schoolId, originalJournalEntryId, reason, issuedByUserId, ipAddress, proRataRatio } = input;
        const ratio = (proRataRatio !== undefined && proRataRatio > 0 && proRataRatio <= 1) ? proRataRatio : 1.0;
        // 1. Fetch original JournalEntry and its lines
        const originalEntry = await prisma_1.default.journalEntry.findFirst({
            where: {
                id: originalJournalEntryId,
                schoolId
            },
            include: {
                lines: true,
                fiscalInvoices: true
            }
        });
        if (!originalEntry) {
            throw new Error('Original journal transaction not found for this tenant');
        }
        if (originalEntry.isReversed) {
            throw new Error(`Transaction ${originalEntry.entryNumber} has already been reversed by Credit Note: ${originalEntry.reversedByCnId}`);
        }
        if (originalEntry.status !== 'POSTED') {
            throw new Error(`Cannot reverse transaction with status '${originalEntry.status}'`);
        }
        // 2. Check period lock for target reversal date
        const currentDate = new Date();
        const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const lockedPeriod = await prisma_1.default.accountingPeriod.findFirst({
            where: {
                schoolId,
                period: period,
                status: { in: ['CLOSED', 'LOCKED'] }
            }
        });
        if (lockedPeriod) {
            throw new Error(`Accounting period ${period} is ${lockedPeriod.status}. Posting reversals to locked periods is strictly prohibited.`);
        }
        // 3. Atomically generate Credit Note number
        const cnNumber = await sequence_service_1.SequenceService.nextDocNo(schoolId, 'CN');
        // 4. Build exact opposite journal lines generically (scaled by ratio for pro-rata)
        const reversalLines = originalEntry.lines.map(line => ({
            accountId: line.accountId,
            coaCode: line.coaCode || undefined,
            // SWAP DEBIT AND CREDIT:
            debit: Math.round(line.credit * ratio * 100) / 100,
            credit: Math.round(line.debit * ratio * 100) / 100,
            description: ratio < 1.0
                ? `Pro-rata Reversal (${Math.round(ratio * 100)}%) of [${originalEntry.entryNumber}]: ${line.description || reason}`
                : `Reversal of [${originalEntry.entryNumber}]: ${line.description || reason}`,
            studentId: line.studentId || undefined,
            supplierId: line.supplierId || undefined,
            baseAmount: line.baseAmount ? Math.round(line.baseAmount * ratio * 100) / 100 : undefined,
            taxCode: line.taxCode || undefined,
            currency: line.currency,
            exchangeRate: line.exchangeRate
        }));
        // Calculate gross amount reversed and VAT portion
        let totalGrossReversed = 0;
        let totalVatReversed = 0;
        for (const l of reversalLines) {
            if (l.debit > 0)
                totalGrossReversed += l.debit;
            if (l.coaCode === '2021')
                totalVatReversed += (l.credit - l.debit);
        }
        totalGrossReversed = Math.round(totalGrossReversed * 100) / 100;
        totalVatReversed = Math.max(0, Math.round(totalVatReversed * 100) / 100);
        // 5. Execute DB write in transaction
        const result = await prisma_1.default.$transaction(async (tx) => {
            // A) Post the reversing journal entry
            const reversingEntry = await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: currentDate,
                description: `Credit Note ${cnNumber} — Reversal of ${originalEntry.entryNumber}: ${reason}`,
                sourceType: 'credit_note',
                sourceId: cnNumber,
                createdByUserId: issuedByUserId,
                lines: reversalLines,
                currency: originalEntry.currency,
                exchangeRateUsed: originalEntry.exchangeRateUsed,
                ipAddress,
                period,
                tx
            });
            // B) Update original entry to mark reversed if fully reversed (ratio >= 1.0)
            if (ratio >= 1.0) {
                await tx.journalEntry.update({
                    where: { id: originalEntry.id },
                    data: {
                        isReversed: true,
                        reversedByCnId: cnNumber,
                        status: 'REVERSED'
                    }
                });
            }
            // C) Create CreditNote record
            const creditNote = await tx.creditNote.create({
                data: {
                    schoolId,
                    creditNoteNumber: cnNumber,
                    originalJournalEntryId: originalEntry.id,
                    reversalJournalEntryId: reversingEntry.id,
                    reason,
                    totalAmount: totalGrossReversed,
                    totalVat: totalVatReversed,
                    currency: originalEntry.currency,
                    issuedByUserId: issuedByUserId || null,
                    status: 'ISSUED'
                }
            });
            // D) Create CreditNote lines
            for (const line of originalEntry.lines) {
                await tx.creditNoteLine.create({
                    data: {
                        creditNoteId: creditNote.id,
                        schoolId,
                        coaCode: line.coaCode || '0000',
                        amount: line.debit > 0 ? line.debit : line.credit,
                        vatAmount: line.taxCode === 'STANDARD_VAT_15' ? Math.round(line.debit * 15 / 115 * 100) / 100 : 0,
                        description: line.description,
                        studentId: line.studentId || null,
                        supplierId: line.supplierId || null
                    }
                });
            }
            // E) If original sale was fiscalised, issue FiscalCreditNote
            const originalFiscal = originalEntry.fiscalInvoices.find(f => f.status === 'fiscalised');
            let fiscalCreditNote = null;
            if (originalFiscal) {
                fiscalCreditNote = await fiscal_service_1.FiscalService.fiscaliseSale({
                    schoolId,
                    deviceId: originalFiscal.deviceId,
                    grossAmount: -originalFiscal.amount, // negative per ZIMRA credit note requirement
                    currency: originalFiscal.currency,
                    paymentMethod: originalFiscal.paymentMethod,
                    items: [
                        {
                            name: `CN ${cnNumber} Reversal: ${reason}`,
                            quantity: 1,
                            unitPrice: -originalFiscal.amount,
                            totalAmount: -originalFiscal.amount,
                            taxCode: 'A'
                        }
                    ],
                    glTransactionId: reversingEntry.id,
                    isCreditNote: true,
                    originalFiscalId: originalFiscal.id,
                    originalFiscalCode: originalFiscal.fiscalCode || undefined,
                    tx
                });
                // Link fiscalInvoiceId to CreditNote
                if (fiscalCreditNote?.invoiceId) {
                    await tx.creditNote.update({
                        where: { id: creditNote.id },
                        data: { fiscalInvoiceId: fiscalCreditNote.invoiceId }
                    });
                }
            }
            // F) Audit Log
            if (issuedByUserId && issuedByUserId !== 'SYSTEM') {
                try {
                    await tx.auditLog.create({
                        data: {
                            schoolId,
                            actorId: issuedByUserId,
                            action: 'CREATE_CREDIT_NOTE',
                            entityType: 'CreditNote',
                            entityId: creditNote.id,
                            details: {
                                creditNoteNumber: cnNumber,
                                originalEntryNumber: originalEntry.entryNumber,
                                totalGrossReversed,
                                reason
                            },
                            ipAddress: ipAddress || '127.0.0.1'
                        }
                    });
                }
                catch (auditErr) {
                    console.warn('Audit log creation skipped (non-critical):', auditErr);
                }
            }
            return {
                creditNote,
                reversingEntry,
                originalEntryNumber: originalEntry.entryNumber,
                fiscalCreditNote
            };
        });
        return result;
    }
    /**
     * List credit notes for a school
     */
    static async listCreditNotes(schoolId) {
        return prisma_1.default.creditNote.findMany({
            where: { schoolId },
            include: {
                lines: true,
                fiscalInvoice: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    /**
     * Get single credit note with printable receipt details
     */
    static async getCreditNoteDetails(schoolId, creditNoteId) {
        const cn = await prisma_1.default.creditNote.findFirst({
            where: { id: creditNoteId, schoolId },
            include: {
                lines: true,
                fiscalInvoice: true,
                school: {
                    include: { schoolSetting: true }
                }
            }
        });
        if (!cn)
            throw new Error('Credit Note not found');
        return cn;
    }
    /**
     * Reverses or pro-rata reverses a StudentInvoice by issuing a double-entry Credit Note.
     * If proRataRatio < 1 (e.g. 0.5 for a 50% refund on vacating a hostel), scales reversal lines accordingly.
     */
    static async createCreditNoteForInvoice(input) {
        const { schoolId, invoiceId, reason, proRataRatio = 1.0, issuedByUserId } = input;
        const invoice = await prisma_1.default.studentInvoice.findFirst({
            where: { id: invoiceId, schoolId },
            include: { items: true }
        });
        if (!invoice)
            throw new Error(`Student fee invoice ${invoiceId} not found`);
        let journalEntryId = invoice.journalEntryId;
        if (!journalEntryId) {
            const je = await prisma_1.default.journalEntry.findFirst({
                where: { schoolId, sourceType: 'invoice', sourceId: invoice.id }
            });
            if (je)
                journalEntryId = je.id;
        }
        if (!journalEntryId) {
            throw new Error(`Cannot reverse invoice ${invoice.invoiceNumber}: No linked journal entry found.`);
        }
        const cnResult = await this.createCreditNote({
            schoolId,
            originalJournalEntryId: journalEntryId,
            reason: `${reason} (Invoice ${invoice.invoiceNumber})`,
            issuedByUserId,
            proRataRatio,
            ipAddress: '127.0.0.1'
        });
        if (proRataRatio >= 1.0) {
            await prisma_1.default.studentInvoice.update({
                where: { id: invoice.id },
                data: { status: 'cancelled' }
            });
        }
        return cnResult;
    }
}
exports.CreditNoteService = CreditNoteService;
//# sourceMappingURL=credit-note.service.js.map