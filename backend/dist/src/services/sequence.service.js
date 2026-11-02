"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequenceService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
class SequenceService {
    /**
     * Atomically generate a batch of sequential document numbers for a given tenant and prefix.
     * Eliminates hundreds of individual roundtrips during bulk invoicing.
     */
    static async nextDocNos(tenantId, prefix, count = 1, tx) {
        if (count <= 0)
            return [];
        const db = tx || prisma_1.default;
        const currentYear = new Date().getFullYear();
        const cleanPrefix = prefix.toUpperCase().trim();
        // Use Prisma upsert to ensure the sequence record exists
        const sequence = await db.documentSequence.upsert({
            where: {
                schoolId_prefix: {
                    schoolId: tenantId,
                    prefix: cleanPrefix
                }
            },
            update: {},
            create: {
                schoolId: tenantId,
                prefix: cleanPrefix,
                lastNumber: 0,
                year: currentYear,
                format: '{PREFIX}-{YEAR}-{NUMBER}'
            }
        });
        let startNumber = sequence.lastNumber + 1;
        let sequenceYear = sequence.year;
        // Reset sequence counter on year boundary
        if (sequenceYear !== currentYear) {
            startNumber = 1;
            sequenceYear = currentYear;
        }
        const endNumber = startNumber + count - 1;
        // Atomically increment and save the entire batch range in one single update
        const updated = await db.documentSequence.update({
            where: {
                schoolId_prefix: {
                    schoolId: tenantId,
                    prefix: cleanPrefix
                }
            },
            data: {
                lastNumber: endNumber,
                year: sequenceYear
            }
        });
        const results = [];
        for (let n = startNumber; n <= endNumber; n++) {
            const paddedNum = String(n).padStart(5, '0');
            results.push(`${cleanPrefix}-${sequenceYear}-${paddedNum}`);
        }
        return results;
    }
    /**
     * Atomically generate the next document sequence number for a given tenant and prefix.
     * Format default: {PREFIX}-{YEAR}-{5-digit-padded-number}, e.g. "INV-2026-00001"
     */
    static async nextDocNo(tenantId, prefix, tx) {
        const [docNo] = await this.nextDocNos(tenantId, prefix, 1, tx);
        return docNo;
    }
    /**
     * Seed standard document sequences for a new tenant
     */
    static async seedStandardSequences(tenantId, tx) {
        const db = tx || prisma_1.default;
        const currentYear = new Date().getFullYear();
        const standardPrefixes = [
            { prefix: 'INV', description: 'Student Fee & General Invoices' },
            { prefix: 'PAY', description: 'Receipts & Payment Allocations' },
            { prefix: 'CN', description: 'Credit Notes & Transaction Reversals' },
            { prefix: 'DN', description: 'Debit Notes' },
            { prefix: 'FISCAL', description: 'ZIMRA Fiscal Tax Receipts' },
            { prefix: 'EXP', description: 'Operational Expense Vouchers' },
            { prefix: 'RCPT', description: 'Point of Sale Retail Receipts' },
            { prefix: 'TILL', description: 'Till Cash-Up Sessions' }
        ];
        for (const item of standardPrefixes) {
            await db.documentSequence.upsert({
                where: {
                    schoolId_prefix: {
                        schoolId: tenantId,
                        prefix: item.prefix
                    }
                },
                update: {},
                create: {
                    schoolId: tenantId,
                    prefix: item.prefix,
                    description: item.description,
                    lastNumber: 0,
                    year: currentYear,
                    format: '{PREFIX}-{YEAR}-{NUMBER}'
                }
            });
        }
    }
}
exports.SequenceService = SequenceService;
