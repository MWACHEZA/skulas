"use strict";
/**
 * Historical Data Migration Script
 * =====================================
 * Migrates all pre-ledger financial records into JournalEntry/JournalEntryLine.
 *
 * Run once per school after the ledger goes live:
 *   npx ts-node --project tsconfig.json src/scripts/migrate-to-ledger.ts [--schoolId=xxx]
 *
 * Order of migration (important — earlier entries should be posted first):
 *   1. StudentPayments  → fee_payment entries
 *   2. UniformSales     → uniform_sale + COGS entries + StockMovements
 *   3. UniformStockOrders → uniform_purchase entries + StockMovements
 *   4. PayrollRuns      → payroll entries
 *   5. Income records   → income entries
 *   6. Expense records  → expense entries
 *
 * IDEMPOTENT: Re-running will skip already-migrated records.
 * Each source record is checked for an existing JE (sourceType + sourceId) before posting.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const ledger_service_1 = require("../services/ledger.service");
const coa_seeder_1 = require("../../prisma/seeders/coa.seeder");
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function round2(n) {
    return Math.round(n * 100) / 100;
}
async function jeExists(sourceType, sourceId) {
    const existing = await prisma_1.default.journalEntry.findFirst({ where: { sourceType, sourceId } });
    return !!existing;
}
function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}
// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: StudentPayments
// ─────────────────────────────────────────────────────────────────────────────
async function migrateStudentPayments(schoolId) {
    const payments = await prisma_1.default.studentPayment.findMany({
        where: { schoolId, status: 'Commit', journalEntryId: null }
    });
    log(`  StudentPayments: ${payments.length} to migrate`);
    let count = 0;
    for (const payment of payments) {
        if (await jeExists('fee_payment', payment.id))
            continue;
        try {
            const cashId = await (0, coa_seeder_1.getAccountId)(schoolId, '1100', prisma_1.default);
            const arId = await (0, coa_seeder_1.getAccountId)(schoolId, '1210', prisma_1.default);
            const je = await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: payment.date || payment.createdAt,
                description: `[MIGRATION] Fee payment — ${payment.paymentMode}`,
                sourceType: 'fee_payment',
                sourceId: payment.id,
                lines: [
                    { accountId: cashId, debit: payment.amount, studentId: payment.studentId },
                    { accountId: arId, credit: payment.amount, studentId: payment.studentId }
                ]
            });
            // Link back
            await prisma_1.default.studentPayment.update({
                where: { id: payment.id },
                data: { journalEntryId: je.id }
            });
            count++;
        }
        catch (err) {
            log(`    SKIP payment ${payment.id}: ${err.message}`);
        }
    }
    // Also post invoice entries for Fees that have no JE yet
    const fees = await prisma_1.default.fee.findMany({
        where: { schoolId },
        select: { id: true, studentId: true, amount: true, discount: true, createdAt: true, description: true }
    });
    log(`  Fee invoices: ${fees.length} to check`);
    for (const fee of fees) {
        if (await jeExists('fee_invoice', fee.id))
            continue;
        try {
            const arId = await (0, coa_seeder_1.getAccountId)(schoolId, '1210', prisma_1.default);
            const incomeId = await (0, coa_seeder_1.getAccountId)(schoolId, '5100', prisma_1.default);
            const netAmount = round2(Math.max(0, fee.amount - (fee.discount ?? 0)));
            if (netAmount <= 0)
                continue;
            await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: fee.createdAt,
                description: `[MIGRATION] Invoice: ${fee.description ?? 'Fee'}`,
                sourceType: 'fee_invoice',
                sourceId: fee.id,
                lines: [
                    { accountId: arId, debit: netAmount, studentId: fee.studentId },
                    { accountId: incomeId, credit: netAmount }
                ]
            });
            count++;
        }
        catch (err) {
            log(`    SKIP fee ${fee.id}: ${err.message}`);
        }
    }
    return count;
}
// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Uniform Sales (revenue + COGS)
// ─────────────────────────────────────────────────────────────────────────────
async function migrateUniformSales(schoolId) {
    const sales = await prisma_1.default.uniformSale.findMany({
        where: { schoolId },
        include: { items: { include: { item: true } } }
    });
    log(`  UniformSales: ${sales.length} to migrate`);
    let count = 0;
    for (const sale of sales) {
        if (await jeExists('uniform_sale', sale.id))
            continue;
        try {
            const cashId = await (0, coa_seeder_1.getAccountId)(schoolId, '1100', prisma_1.default);
            const salesId = await (0, coa_seeder_1.getAccountId)(schoolId, '5200', prisma_1.default);
            const cogsId = await (0, coa_seeder_1.getAccountId)(schoolId, '6100', prisma_1.default);
            const invId = await (0, coa_seeder_1.getAccountId)(schoolId, '1300', prisma_1.default);
            // Revenue entry
            await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: sale.saleDate,
                description: `[MIGRATION] Uniform sale`,
                sourceType: 'uniform_sale',
                sourceId: sale.id,
                lines: [
                    { accountId: cashId, debit: sale.totalAmount, studentId: sale.studentId ?? undefined },
                    { accountId: salesId, credit: sale.totalAmount }
                ]
            });
            // COGS entry
            const totalCogs = sale.items.reduce((s, i) => s + (i.item.costPrice || i.unitPrice * 0.7) * i.quantity, 0);
            if (totalCogs > 0) {
                await ledger_service_1.LedgerService.postEntry({
                    schoolId,
                    date: sale.saleDate,
                    description: `[MIGRATION] COGS — uniform sale`,
                    sourceType: 'cogs',
                    sourceId: sale.id,
                    lines: [
                        { accountId: cogsId, debit: round2(totalCogs) },
                        { accountId: invId, credit: round2(totalCogs) }
                    ]
                });
            }
            // Create stock movements for each item sold
            for (const saleItem of sale.items) {
                const movExists = await prisma_1.default.uniformStockMovement.findFirst({
                    where: { sourceType: 'uniform_sale', sourceId: sale.id, itemId: saleItem.itemId }
                });
                if (!movExists) {
                    await prisma_1.default.uniformStockMovement.create({
                        data: {
                            schoolId,
                            itemId: saleItem.itemId,
                            movementType: 'SALE_OUT',
                            quantity: -saleItem.quantity,
                            unitCost: saleItem.item.costPrice || saleItem.unitPrice * 0.7,
                            totalCost: (saleItem.item.costPrice || saleItem.unitPrice * 0.7) * saleItem.quantity,
                            reference: sale.id,
                            sourceType: 'uniform_sale',
                            sourceId: sale.id
                        }
                    });
                }
            }
            count++;
        }
        catch (err) {
            log(`    SKIP sale ${sale.id}: ${err.message}`);
        }
    }
    return count;
}
// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: Uniform Stock Orders (purchases)
// ─────────────────────────────────────────────────────────────────────────────
async function migrateUniformPurchases(schoolId) {
    const orders = await prisma_1.default.uniformStockOrder.findMany({
        where: { schoolId },
        include: { items: { include: { item: true } } }
    });
    log(`  UniformStockOrders: ${orders.length} to migrate`);
    let count = 0;
    for (const order of orders) {
        if (await jeExists('uniform_purchase', order.id))
            continue;
        try {
            const invId = await (0, coa_seeder_1.getAccountId)(schoolId, '1300', prisma_1.default);
            const apId = await (0, coa_seeder_1.getAccountId)(schoolId, '3110', prisma_1.default);
            await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: order.orderDate,
                description: `[MIGRATION] Uniform purchase`,
                sourceType: 'uniform_purchase',
                sourceId: order.id,
                lines: [
                    { accountId: invId, debit: order.totalAmount },
                    { accountId: apId, credit: order.totalAmount }
                ]
            });
            // Create stock movements
            for (const orderItem of order.items) {
                const movExists = await prisma_1.default.uniformStockMovement.findFirst({
                    where: { sourceType: 'uniform_purchase', sourceId: order.id, itemId: orderItem.itemId }
                });
                if (!movExists) {
                    await prisma_1.default.uniformStockMovement.create({
                        data: {
                            schoolId,
                            itemId: orderItem.itemId,
                            movementType: 'PURCHASE_IN',
                            quantity: orderItem.quantity,
                            unitCost: orderItem.unitPrice,
                            totalCost: orderItem.quantity * orderItem.unitPrice,
                            reference: order.id,
                            sourceType: 'uniform_purchase',
                            sourceId: order.id
                        }
                    });
                    // Update item costPrice
                    await prisma_1.default.uniformItem.update({
                        where: { id: orderItem.itemId },
                        data: { costPrice: orderItem.unitPrice }
                    });
                }
            }
            count++;
        }
        catch (err) {
            log(`    SKIP order ${order.id}: ${err.message}`);
        }
    }
    return count;
}
// ─────────────────────────────────────────────────────────────────────────────
// Phase 4: Payroll Runs
// ─────────────────────────────────────────────────────────────────────────────
async function migratePayrollRuns(schoolId) {
    const runs = await prisma_1.default.payrollRun.findMany({ where: { schoolId } });
    log(`  PayrollRuns: ${runs.length} to migrate`);
    let count = 0;
    for (const run of runs) {
        if (await jeExists('payroll', run.id))
            continue;
        try {
            const salId = await (0, coa_seeder_1.getAccountId)(schoolId, '7100', prisma_1.default);
            const accruedId = await (0, coa_seeder_1.getAccountId)(schoolId, '3300', prisma_1.default);
            const payeId = await (0, coa_seeder_1.getAccountId)(schoolId, '3400', prisma_1.default);
            const lines = [
                { accountId: salId, debit: round2(run.totalGross), description: `Gross payroll ${run.month}/${run.year}` }
            ];
            const deductions = round2(run.totalDeductions);
            if (deductions > 0) {
                lines.push({ accountId: payeId, credit: deductions, description: 'PAYE withheld' });
            }
            lines.push({
                accountId: accruedId,
                credit: round2(run.totalNet),
                description: `Net salaries payable ${run.month}/${run.year}`
            });
            await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: new Date(run.year, run.month - 1, run.runDate.getDate()),
                description: `[MIGRATION] Payroll ${run.month}/${run.year}`,
                sourceType: 'payroll',
                sourceId: run.id,
                lines
            });
            count++;
        }
        catch (err) {
            log(`    SKIP payroll ${run.id}: ${err.message}`);
        }
    }
    return count;
}
// ─────────────────────────────────────────────────────────────────────────────
// Phase 5: Income Records
// ─────────────────────────────────────────────────────────────────────────────
async function migrateIncomeRecords(schoolId) {
    const incomes = await prisma_1.default.income.findMany({ where: { schoolId } });
    log(`  Income records: ${incomes.length} to migrate`);
    let count = 0;
    for (const income of incomes) {
        if (await jeExists('income', income.id))
            continue;
        try {
            const cashId = await (0, coa_seeder_1.getAccountId)(schoolId, '1100', prisma_1.default);
            const incomeId = await (0, coa_seeder_1.getAccountId)(schoolId, '5900', prisma_1.default); // Miscellaneous Income (default)
            await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: income.date || income.createdAt,
                description: `[MIGRATION] Income: ${income.title ?? income.categoryId}`,
                sourceType: 'income',
                sourceId: income.id,
                lines: [
                    { accountId: cashId, debit: round2(income.amount) },
                    { accountId: incomeId, credit: round2(income.amount) }
                ]
            });
            count++;
        }
        catch (err) {
            log(`    SKIP income ${income.id}: ${err.message}`);
        }
    }
    return count;
}
// ─────────────────────────────────────────────────────────────────────────────
// Phase 6: Expense Records
// ─────────────────────────────────────────────────────────────────────────────
async function migrateExpenseRecords(schoolId) {
    const expenses = await prisma_1.default.expense.findMany({ where: { schoolId } });
    log(`  Expense records: ${expenses.length} to migrate`);
    let count = 0;
    for (const expense of expenses) {
        if (await jeExists('expense', expense.id))
            continue;
        try {
            const cashId = await (0, coa_seeder_1.getAccountId)(schoolId, '1100', prisma_1.default);
            const expId = await (0, coa_seeder_1.getAccountId)(schoolId, '7900', prisma_1.default); // Miscellaneous Expense (default)
            await ledger_service_1.LedgerService.postEntry({
                schoolId,
                date: expense.date || expense.createdAt,
                description: `[MIGRATION] Expense: ${expense.title ?? expense.categoryId}`,
                sourceType: 'expense',
                sourceId: expense.id,
                lines: [
                    { accountId: expId, debit: round2(expense.amount) },
                    { accountId: cashId, credit: round2(expense.amount) }
                ]
            });
            count++;
        }
        catch (err) {
            log(`    SKIP expense ${expense.id}: ${err.message}`);
        }
    }
    return count;
}
// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
    const schoolIdArg = process.argv.find(a => a.startsWith('--schoolId='));
    const targetSchoolId = schoolIdArg ? schoolIdArg.split('=')[1] : null;
    const schools = targetSchoolId
        ? await prisma_1.default.school.findMany({ where: { id: targetSchoolId } })
        : await prisma_1.default.school.findMany();
    log(`Starting migration for ${schools.length} school(s)`);
    let grandTotal = 0;
    for (const school of schools) {
        log(`\n────────────────────────────────────────────`);
        log(`School: ${school.name} (${school.id})`);
        // Ensure CoA is seeded
        await (0, coa_seeder_1.seedChartOfAccounts)(school.id, prisma_1.default);
        let schoolTotal = 0;
        schoolTotal += await migrateStudentPayments(school.id);
        schoolTotal += await migrateUniformSales(school.id);
        schoolTotal += await migrateUniformPurchases(school.id);
        schoolTotal += await migratePayrollRuns(school.id);
        schoolTotal += await migrateIncomeRecords(school.id);
        schoolTotal += await migrateExpenseRecords(school.id);
        log(`  ✔ ${schoolTotal} journal entries created for ${school.name}`);
        grandTotal += schoolTotal;
    }
    log(`\n════════════════════════════════════════════`);
    log(`Migration complete. Total entries created: ${grandTotal}`);
    await prisma_1.default.$disconnect();
}
main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
//# sourceMappingURL=migrate-to-ledger.js.map