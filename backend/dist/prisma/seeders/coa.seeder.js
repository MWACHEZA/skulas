"use strict";
/**
 * Default Chart of Accounts seeder.
 * Called once per new school/tenant on creation.
 *
 * All accounts are isSystemAccount = true, meaning they cannot be
 * deleted or have their type changed by the tenant.
 * Tenants may: rename, add custom children, deactivate non-system accounts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COA = void 0;
exports.seedChartOfAccounts = seedChartOfAccounts;
exports.getAccountId = getAccountId;
// ─────────────────────────────────────────────────────────────────────────────
// Standard school Chart of Accounts (35 accounts across 5 types)
// ─────────────────────────────────────────────────────────────────────────────
exports.DEFAULT_COA = [
    // ── ASSETS ────────────────────────────────────────────────────────────────
    { code: '1000', name: 'Current Assets', type: 'ASSET', description: 'All short-term assets' },
    { code: '1100', name: 'Cash on Hand', type: 'ASSET', parentCode: '1000', description: 'Physical cash held at the school' },
    { code: '1110', name: 'Bank Account (Main)', type: 'ASSET', parentCode: '1000', description: 'Primary school bank account' },
    { code: '1120', name: 'Mobile Money Account', type: 'ASSET', parentCode: '1000', description: 'EcoCash / Mobile money wallet' },
    { code: '1130', name: 'Card / POS Terminal', type: 'ASSET', parentCode: '1000', description: 'Funds received via POS / card payments' },
    { code: '1200', name: 'Accounts Receivable', type: 'ASSET', parentCode: '1000', description: 'Amounts owed to the school' },
    { code: '1210', name: 'Student Accounts Receivable', type: 'ASSET', parentCode: '1200', description: 'AR control account — must reconcile to student sub-ledger' },
    { code: '1300', name: 'Inventory — Uniforms', type: 'ASSET', parentCode: '1000', description: 'Uniform stock at cost (FIFO/last purchase price)' },
    { code: '1310', name: 'Inventory — Tuckshop', type: 'ASSET', parentCode: '1000', description: 'Tuckshop/canteen stock at cost' },
    { code: '1320', name: 'Inventory — Stationery', type: 'ASSET', parentCode: '1000', description: 'Stationery and book stock at cost' },
    { code: '1400', name: 'Prepaid Expenses', type: 'ASSET', parentCode: '1000', description: 'Expenses paid in advance' },
    { code: '2000', name: 'Fixed Assets', type: 'ASSET', description: 'Long-term assets' },
    { code: '2100', name: 'Property & Equipment', type: 'ASSET', parentCode: '2000', description: 'School buildings, furniture, equipment' },
    { code: '2110', name: 'Accumulated Depreciation', type: 'ASSET', parentCode: '2000', description: 'Contra-asset: accumulated depreciation' },
    // ── LIABILITIES ───────────────────────────────────────────────────────────
    { code: '3000', name: 'Current Liabilities', type: 'LIABILITY', description: 'Short-term obligations' },
    { code: '3100', name: 'Accounts Payable', type: 'LIABILITY', parentCode: '3000', description: 'General payables to suppliers' },
    { code: '3110', name: 'Uniform Supplier Payable', type: 'LIABILITY', parentCode: '3000', description: 'Amounts owed to uniform suppliers' },
    { code: '3200', name: 'Student Deposits', type: 'LIABILITY', parentCode: '3000', description: 'Advance fees / wallet deposits held for students' },
    { code: '3300', name: 'Accrued Salaries', type: 'LIABILITY', parentCode: '3000', description: 'Salaries earned but not yet paid out' },
    { code: '3400', name: 'PAYE / Tax Payable', type: 'LIABILITY', parentCode: '3000', description: 'PAYE tax withheld, due to revenue authority' },
    { code: '3500', name: 'Loans Payable', type: 'LIABILITY', description: 'Long-term debt / bank loans' },
    // ── EQUITY ────────────────────────────────────────────────────────────────
    { code: '4000', name: 'Equity', type: 'EQUITY', description: 'Owner\'s equity / institutional surplus' },
    { code: '4100', name: 'Retained Surplus', type: 'EQUITY', parentCode: '4000', description: 'Accumulated surpluses from prior periods' },
    { code: '4200', name: 'Current Year Surplus', type: 'EQUITY', parentCode: '4000', description: 'Net income for the current financial year' },
    // ── INCOME ────────────────────────────────────────────────────────────────
    { code: '5000', name: 'Income', type: 'INCOME', description: 'All revenue streams' },
    { code: '5100', name: 'Tuition Fees Income', type: 'INCOME', parentCode: '5000', description: 'Core academic tuition fees' },
    { code: '5110', name: 'Registration / Admission Fees', type: 'INCOME', parentCode: '5000', description: 'One-time admission / registration fees' },
    { code: '5120', name: 'Exam Fees', type: 'INCOME', parentCode: '5000', description: 'Internal and external examination fees' },
    { code: '5130', name: 'Boarding / Hostel Fees', type: 'INCOME', parentCode: '5000', description: 'Residential boarding fees' },
    { code: '5140', name: 'Transport Fees Income', type: 'INCOME', parentCode: '5000', description: 'School transport / bus fees' },
    { code: '5150', name: 'Activity / Extracurricular Fees', type: 'INCOME', parentCode: '5000', description: 'Sports, clubs, and extracurricular activity fees' },
    { code: '5160', name: 'Late Payment Penalties', type: 'INCOME', parentCode: '5000', description: 'Penalties charged on overdue fee balances' },
    { code: '5200', name: 'Uniform Sales Income', type: 'INCOME', parentCode: '5000', description: 'Revenue from uniform sales to students/parents' },
    { code: '5210', name: 'Tuckshop / Canteen Sales', type: 'INCOME', parentCode: '5000', description: 'Tuckshop and cafeteria sales revenue' },
    { code: '5220', name: 'Stationery / Book Sales', type: 'INCOME', parentCode: '5000', description: 'Textbook and stationery sales' },
    { code: '5300', name: 'Grants & Donations', type: 'INCOME', parentCode: '5000', description: 'External grants, sponsorships and donations' },
    { code: '5900', name: 'Miscellaneous Income', type: 'INCOME', parentCode: '5000', description: 'Other income not classified above' },
    // ── COST OF GOODS SOLD ────────────────────────────────────────────────────
    { code: '6000', name: 'Cost of Goods Sold', type: 'EXPENSE', description: 'Direct costs of goods sold' },
    { code: '6100', name: 'COGS — Uniforms', type: 'EXPENSE', parentCode: '6000', description: 'Cost of uniforms sold (debited at point of sale)' },
    { code: '6110', name: 'COGS — Tuckshop', type: 'EXPENSE', parentCode: '6000', description: 'Cost of tuckshop/canteen items sold' },
    { code: '6120', name: 'COGS — Stationery', type: 'EXPENSE', parentCode: '6000', description: 'Cost of stationery/books sold' },
    // ── OPERATING EXPENSES ────────────────────────────────────────────────────
    { code: '7000', name: 'Operating Expenses', type: 'EXPENSE', description: 'All school operating costs' },
    { code: '7100', name: 'Salaries & Wages', type: 'EXPENSE', parentCode: '7000', description: 'Gross payroll cost — teaching and non-teaching staff' },
    { code: '7110', name: 'PAYE Tax Expense', type: 'EXPENSE', parentCode: '7000', description: 'Employer portion of PAYE / payroll tax' },
    { code: '7120', name: 'AIDS Levy Expense', type: 'EXPENSE', parentCode: '7000', description: 'AIDS levy on income tax (Zimbabwe specific)' },
    { code: '7200', name: 'Utilities', type: 'EXPENSE', parentCode: '7000', description: 'Electricity, water, internet, and other utilities' },
    { code: '7210', name: 'Maintenance & Repairs', type: 'EXPENSE', parentCode: '7000', description: 'Building and equipment maintenance costs' },
    { code: '7220', name: 'Teaching & Office Supplies', type: 'EXPENSE', parentCode: '7000', description: 'Classroom and office consumables' },
    { code: '7230', name: 'Transport / Fuel', type: 'EXPENSE', parentCode: '7000', description: 'School vehicle fuel, transport contractor fees' },
    { code: '7240', name: 'Insurance', type: 'EXPENSE', parentCode: '7000', description: 'School insurance premiums' },
    { code: '7250', name: 'Bank Charges', type: 'EXPENSE', parentCode: '7000', description: 'Bank fees, transaction charges' },
    { code: '7260', name: 'Marketing & Advertising', type: 'EXPENSE', parentCode: '7000', description: 'Recruitment and marketing costs' },
    { code: '7270', name: 'Depreciation Expense', type: 'EXPENSE', parentCode: '7000', description: 'Periodic charge for fixed asset depreciation' },
    { code: '7280', name: 'Loan Interest Expense', type: 'EXPENSE', parentCode: '7000', description: 'Interest charges on school loans' },
    { code: '7290', name: 'Bad Debt Expense', type: 'EXPENSE', parentCode: '7000', description: 'Uncollectable fee write-offs' },
    { code: '7900', name: 'Miscellaneous Expense', type: 'EXPENSE', parentCode: '7000', description: 'Other expenses not classified above' },
];
// ─────────────────────────────────────────────────────────────────────────────
// Seed function — call this when a new School is created
// ─────────────────────────────────────────────────────────────────────────────
async function seedChartOfAccounts(schoolId, db) {
    // Check if already seeded
    const existing = await db.chartOfAccount.count({ where: { schoolId } });
    if (existing > 0)
        return;
    // First pass: create all accounts without parentId
    const codeToId = new Map();
    for (const tpl of exports.DEFAULT_COA) {
        const account = await db.chartOfAccount.create({
            data: {
                schoolId,
                code: tpl.code,
                name: tpl.name,
                type: tpl.type,
                description: tpl.description,
                isSystemAccount: tpl.isSystem !== false, // default true
                isActive: true
            }
        });
        codeToId.set(tpl.code, account.id);
    }
    // Second pass: link parent accounts
    for (const tpl of exports.DEFAULT_COA) {
        if (tpl.parentCode) {
            const parentId = codeToId.get(tpl.parentCode);
            const childId = codeToId.get(tpl.code);
            if (parentId && childId) {
                await db.chartOfAccount.update({
                    where: { id: childId },
                    data: { parentId }
                });
            }
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Helper: get account ID by code for a specific school (used by posting rules)
// ─────────────────────────────────────────────────────────────────────────────
async function getAccountId(schoolId, code, db) {
    const account = await db.chartOfAccount.findUnique({
        where: { schoolId_code: { schoolId, code } }
    });
    if (!account) {
        throw new Error(`Chart of account code ${code} not found for school ${schoolId}. Has the school been seeded?`);
    }
    if (!account.isActive) {
        throw new Error(`Account ${code} (${account.name}) is deactivated and cannot be posted to.`);
    }
    return account.id;
}
//# sourceMappingURL=coa.seeder.js.map