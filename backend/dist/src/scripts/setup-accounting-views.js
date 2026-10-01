"use strict";
/**
 * Setup script for PostgreSQL Views & Analytics Materialized Views.
 * Executes each SQL DDL statement individually with exact schema column names.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
async function exec(sql, description) {
    try {
        await prisma_1.default.$executeRawUnsafe(sql);
        console.log(`✓ ${description}`);
    }
    catch (err) {
        console.error(`✗ Failed: ${description}`, err.message);
        throw err;
    }
}
async function main() {
    console.log('--- Setting up Accounting & Analytics Views ---');
    // 1. student_ledger_balances View
    await exec(`
    CREATE OR REPLACE VIEW student_ledger_balances AS
    SELECT 
      jel."schoolId" AS tenant_id,
      jel."studentId" AS student_id,
      s.name AS student_name,
      c.name AS class_name,
      COALESCE(SUM(jel.debit), 0)::FLOAT AS total_billed,
      COALESCE(SUM(jel.credit), 0)::FLOAT AS total_paid,
      (COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0))::FLOAT AS balance_due,
      MAX(je.date) AS last_transaction_date
    FROM "JournalEntryLine" jel
    JOIN "JournalEntry" je ON jel."journalEntryId" = je.id
    JOIN "ChartOfAccount" coa ON jel."accountId" = coa.id
    LEFT JOIN "Student" s ON jel."studentId" = s.id
    LEFT JOIN "SchoolClass" c ON s."classId" = c.id
    WHERE je.status = 'POSTED'
      AND jel."studentId" IS NOT NULL
      AND (coa.code IN ('1100', '1210') OR coa.type = 'ASSET')
    GROUP BY jel."schoolId", jel."studentId", s.name, c.name;
  `, 'Create student_ledger_balances view');
    // 2. analytics_finance Materialized View
    await exec(`DROP MATERIALIZED VIEW IF EXISTS analytics_finance CASCADE;`, 'Drop analytics_finance if exists');
    await exec(`
    CREATE MATERIALIZED VIEW analytics_finance AS
    SELECT
      je."schoolId" AS tenant_id,
      TO_CHAR(je.date, 'YYYY-MM') AS period,
      COALESCE(SUM(CASE WHEN coa.type = 'INCOME' THEN (jel.credit - jel.debit) ELSE 0 END), 0)::FLOAT AS total_revenue_billed,
      COALESCE(SUM(CASE WHEN coa.code IN ('1100', '1210') THEN jel.credit ELSE 0 END), 0)::FLOAT AS total_fees_collected,
      COALESCE(SUM(CASE WHEN coa.type = 'EXPENSE' THEN (jel.debit - jel.credit) ELSE 0 END), 0)::FLOAT AS total_expenses,
      ROUND(
        (CASE 
          WHEN SUM(CASE WHEN coa.type = 'INCOME' THEN (jel.credit - jel.debit) ELSE 0 END) > 0 
          THEN (SUM(CASE WHEN coa.code IN ('1100', '1210') THEN jel.credit ELSE 0 END) / NULLIF(SUM(CASE WHEN coa.type = 'INCOME' THEN (jel.credit - jel.debit) ELSE 0 END), 0)) * 100 
          ELSE 0 
        END)::NUMERIC, 2
      )::FLOAT AS collection_rate_pct,
      COUNT(DISTINCT je.id) AS total_transactions,
      CURRENT_TIMESTAMP AS refreshed_at
    FROM "JournalEntry" je
    JOIN "JournalEntryLine" jel ON jel."journalEntryId" = je.id
    JOIN "ChartOfAccount" coa ON jel."accountId" = coa.id
    WHERE je.status = 'POSTED'
    GROUP BY je."schoolId", TO_CHAR(je.date, 'YYYY-MM');
  `, 'Create analytics_finance materialized view');
    await exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_finance_tenant_period ON analytics_finance (tenant_id, period);`, 'Create index on analytics_finance');
    // 3. analytics_academics Materialized View
    await exec(`DROP MATERIALIZED VIEW IF EXISTS analytics_academics CASCADE;`, 'Drop analytics_academics if exists');
    await exec(`
    CREATE MATERIALIZED VIEW analytics_academics AS
    SELECT
      g."schoolId" AS tenant_id,
      g."term",
      g."year",
      g."subjectId",
      sub.name AS subject_name,
      c.id AS class_id,
      c.name AS class_name,
      ROUND(AVG(g.score)::NUMERIC, 2)::FLOAT AS average_score,
      ROUND((COUNT(CASE WHEN g.score >= 50 THEN 1 END)::NUMERIC / NULLIF(COUNT(g.id), 0) * 100)::NUMERIC, 2)::FLOAT AS pass_rate_pct,
      COUNT(CASE WHEN g.score < 50 THEN 1 END) AS at_risk_count,
      COUNT(g.id) AS total_graded_students,
      CURRENT_TIMESTAMP AS refreshed_at
    FROM "Grade" g
    JOIN "Subject" sub ON g."subjectId" = sub.id
    JOIN "Student" s ON g."studentId" = s.id
    LEFT JOIN "SchoolClass" c ON s."classId" = c.id
    GROUP BY g."schoolId", g."term", g."year", g."subjectId", sub.name, c.id, c.name;
  `, 'Create analytics_academics materialized view');
    await exec(`CREATE INDEX IF NOT EXISTS idx_analytics_academics_tenant ON analytics_academics (tenant_id, class_id);`, 'Create index on analytics_academics');
    // 4. analytics_attendance Materialized View
    await exec(`DROP MATERIALIZED VIEW IF EXISTS analytics_attendance CASCADE;`, 'Drop analytics_attendance if exists');
    await exec(`
    CREATE MATERIALIZED VIEW analytics_attendance AS
    SELECT
      a."schoolId" AS tenant_id,
      TO_CHAR(a.date, 'YYYY-MM') AS month_period,
      a."classId",
      c.name AS class_name,
      COUNT(CASE WHEN a.status ILIKE 'present' THEN 1 END) AS present_count,
      COUNT(CASE WHEN a.status ILIKE 'absent' THEN 1 END) AS absent_count,
      COUNT(CASE WHEN a.status ILIKE 'late' THEN 1 END) AS late_count,
      COUNT(CASE WHEN a.status ILIKE 'excused' THEN 1 END) AS excused_count,
      ROUND(
        ((COUNT(CASE WHEN a.status ILIKE 'present' OR a.status ILIKE 'late' THEN 1 END)::NUMERIC / NULLIF(COUNT(a.id), 0)) * 100)::NUMERIC, 2
      )::FLOAT AS attendance_rate_pct,
      CURRENT_TIMESTAMP AS refreshed_at
    FROM "Attendance" a
    LEFT JOIN "SchoolClass" c ON a."classId" = c.id
    GROUP BY a."schoolId", TO_CHAR(a.date, 'YYYY-MM'), a."classId", c.name;
  `, 'Create analytics_attendance materialized view');
    await exec(`CREATE INDEX IF NOT EXISTS idx_analytics_attendance_tenant ON analytics_attendance (tenant_id, "classId");`, 'Create index on analytics_attendance');
    // 5. analytics_operations Materialized View
    await exec(`DROP MATERIALIZED VIEW IF EXISTS analytics_operations CASCADE;`, 'Drop analytics_operations if exists');
    await exec(`
    CREATE MATERIALIZED VIEW analytics_operations AS
    SELECT
      s.id AS tenant_id,
      COALESCE((SELECT SUM("numberOfBeds") FROM "HostelRoom" hr WHERE hr."schoolId" = s.id), 0)::FLOAT AS total_hostel_capacity,
      COALESCE((SELECT COUNT(*) FROM "Student" st WHERE st."schoolId" = s.id AND st."hostelId" IS NOT NULL AND st.status = 'Enrolled'), 0)::FLOAT AS current_hostel_occupancy,
      COALESCE((SELECT COUNT(*) FROM "AssetMaintenance" am WHERE am."schoolId" = s.id AND am."performedDate" IS NULL), 0)::FLOAT AS pending_maintenance_count,
      COALESCE((SELECT COUNT(*) FROM "AssetMaintenance" am WHERE am."schoolId" = s.id AND am."performedDate" IS NOT NULL), 0)::FLOAT AS completed_maintenance_count,
      COALESCE((SELECT SUM("totalCost") FROM "StockMovement" sm WHERE sm."schoolId" = s.id AND sm.module = 'TUCKSHOP' AND sm.direction = 'OUT'), 0)::FLOAT AS tuckshop_cost_of_sales,
      COALESCE((SELECT SUM("totalCost") FROM "StockMovement" sm WHERE sm."schoolId" = s.id AND sm.module = 'PHARMACY' AND sm.direction = 'OUT'), 0)::FLOAT AS pharmacy_dispensed_cost,
      CURRENT_TIMESTAMP AS refreshed_at
    FROM "School" s;
  `, 'Create analytics_operations materialized view');
    await exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_operations_tenant ON analytics_operations (tenant_id);`, 'Create index on analytics_operations');
    // 6. analytics_engagement Materialized View
    await exec(`DROP MATERIALIZED VIEW IF EXISTS analytics_engagement CASCADE;`, 'Drop analytics_engagement if exists');
    await exec(`
    CREATE MATERIALIZED VIEW analytics_engagement AS
    SELECT
      bl."schoolId" AS tenant_id,
      COUNT(bl.id) AS total_book_loans,
      COUNT(CASE WHEN bl.status ILIKE 'borrowed' THEN 1 END) AS active_loans,
      COUNT(CASE WHEN bl.status ILIKE 'overdue' THEN 1 END) AS overdue_loans,
      COUNT(CASE WHEN bl.status ILIKE 'returned' THEN 1 END) AS returned_loans,
      ROUND(
        ((COUNT(CASE WHEN bl.status ILIKE 'returned' THEN 1 END)::NUMERIC / NULLIF(COUNT(bl.id), 0)) * 100)::NUMERIC, 2
      )::FLOAT AS return_rate_pct,
      CURRENT_TIMESTAMP AS refreshed_at
    FROM "BookLoan" bl
    GROUP BY bl."schoolId";
  `, 'Create analytics_engagement materialized view');
    await exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_engagement_tenant ON analytics_engagement (tenant_id);`, 'Create index on analytics_engagement');
    // 7. Refresh function
    await exec(`
    CREATE OR REPLACE FUNCTION refresh_all_analytics_views()
    RETURNS VOID AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW analytics_finance;
      REFRESH MATERIALIZED VIEW analytics_academics;
      REFRESH MATERIALIZED VIEW analytics_attendance;
      REFRESH MATERIALIZED VIEW analytics_operations;
      REFRESH MATERIALIZED VIEW analytics_engagement;
    END;
    $$ LANGUAGE plpgsql;
  `, 'Create refresh_all_analytics_views() function');
    console.log('✓ All views and analytics materialized views successfully created and verified!');
}
main()
    .catch(e => {
    console.error('Error creating views:', e);
    process.exit(1);
})
    .finally(() => prisma_1.default.$disconnect());
//# sourceMappingURL=setup-accounting-views.js.map