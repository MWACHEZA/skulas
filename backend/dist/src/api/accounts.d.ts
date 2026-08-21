/**
 * Accounting API — Chart of Accounts management, Journal, and all reports.
 * All routes are BURSAR/SCHOOL_ADMIN only.
 *
 * Routes:
 *   CoA CRUD        GET/POST/PATCH/DELETE  /api/accounts/coa
 *   Journal         GET/POST               /api/accounts/journal
 *   Journal Reversal POST                  /api/accounts/journal/:id/reverse
 *   Reports         GET                    /api/accounts/reports/*
 *   Periods         GET/POST               /api/accounts/periods
 *   Bank Rec        GET/POST               /api/accounts/bank-reconciliation
 *   Income/Expense  GET/POST               /api/accounts/income, /api/accounts/expenses
 *   Liabilities     GET/POST/PATCH         /api/accounts/liabilities
 */
declare const router: import("express-serve-static-core").Router;
export default router;
