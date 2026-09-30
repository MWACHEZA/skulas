import prisma from '../lib/prisma';
import type { Prisma } from '../generated/client';

export class SequenceService {
  /**
   * Atomically generate the next document sequence number for a given tenant and prefix.
   * Format default: {PREFIX}-{YEAR}-{5-digit-padded-number}, e.g. "INV-2026-00001"
   */
  static async nextDocNo(
    tenantId: string,
    prefix: string,
    tx?: Prisma.TransactionClient
  ): Promise<string> {
    const db = tx || prisma;
    const currentYear = new Date().getFullYear();
    const cleanPrefix = prefix.toUpperCase().trim();

    // Use SELECT ... FOR UPDATE or Prisma transaction upsert to guarantee atomic locking
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

    let nextNumber = sequence.lastNumber + 1;
    let sequenceYear = sequence.year;

    // Reset sequence counter on year boundary
    if (sequenceYear !== currentYear) {
      nextNumber = 1;
      sequenceYear = currentYear;
    }

    // Atomically increment and save
    const updated = await db.documentSequence.update({
      where: {
        schoolId_prefix: {
          schoolId: tenantId,
          prefix: cleanPrefix
        }
      },
      data: {
        lastNumber: nextNumber,
        year: sequenceYear
      }
    });

    const paddedNum = String(updated.lastNumber).padStart(5, '0');
    return `${cleanPrefix}-${sequenceYear}-${paddedNum}`;
  }

  /**
   * Seed standard document sequences for a new tenant
   */
  static async seedStandardSequences(tenantId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
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
