/**
 * Default Chart of Accounts seeder.
 * Called once per new school/tenant on creation.
 *
 * All accounts are isSystemAccount = true, meaning they cannot be
 * deleted or have their type changed by the tenant.
 * Tenants may: rename, add custom children, deactivate non-system accounts.
 */
import { PrismaClient } from '../../src/generated/client';
interface AccountTemplate {
    code: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    parentCode?: string;
    description?: string;
    isSystem?: boolean;
}
export declare const DEFAULT_COA: AccountTemplate[];
export declare function seedChartOfAccounts(schoolId: string, db: PrismaClient | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>): Promise<void>;
export declare function getAccountId(schoolId: string, code: string, db: PrismaClient | Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>): Promise<string>;
export {};
