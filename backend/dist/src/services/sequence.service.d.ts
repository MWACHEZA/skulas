import type { Prisma } from '../generated/client';
export declare class SequenceService {
    /**
     * Atomically generate the next document sequence number for a given tenant and prefix.
     * Format default: {PREFIX}-{YEAR}-{5-digit-padded-number}, e.g. "INV-2026-00001"
     */
    static nextDocNo(tenantId: string, prefix: string, tx?: Prisma.TransactionClient): Promise<string>;
    /**
     * Seed standard document sequences for a new tenant
     */
    static seedStandardSequences(tenantId: string, tx?: Prisma.TransactionClient): Promise<void>;
}
