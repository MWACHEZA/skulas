-- Add unique constraint to PayrollRun to prevent duplicate payroll runs for the same school/month/year.
-- This enables the safe upsert pattern in payroll.ts and prevents race conditions during concurrent
-- payroll entry creation.
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollRun_schoolId_month_year_key" ON "PayrollRun"("schoolId", "month", "year");
