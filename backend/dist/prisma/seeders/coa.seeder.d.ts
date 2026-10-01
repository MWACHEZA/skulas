/**
 * Global Chart of Accounts (COA) Template — 80-Code Zimbabwean Boarding School Standard.
 * Seeded per tenant on creation.
 *
 * Rules:
 *  - System accounts cannot be deleted by tenants.
 *  - School Admin can add custom sub-accounts or deactivate non-system codes within their tenant.
 *  - Bank & Cash accounts are marked with isBank: true.
 */
import { PrismaClient } from '../../src/generated/client';
export interface AccountTemplate {
    code: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    parentCode?: string;
    description?: string;
    isBank?: boolean;
    isSystem?: boolean;
}
export declare const ZIMBABWE_BOARDING_COA_TEMPLATE: AccountTemplate[];
export declare const DEFAULT_COA: AccountTemplate[];
/**
 * Seed or update the Chart of Accounts for a school.
 */
export declare function seedChartOfAccounts(schoolId: string, db: PrismaClient | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>): Promise<void>;
/**
 * Helper: Resolve account ID by code with automatic fallback for legacy codes.
 */
export declare function getAccountId(schoolId: string, code: string, db: PrismaClient | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>): Promise<string>;
