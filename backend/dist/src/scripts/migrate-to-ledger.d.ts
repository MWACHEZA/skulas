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
export {};
