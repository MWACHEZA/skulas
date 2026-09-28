/**
 * Portal Consolidation & Security Guard Automated Test Suite
 *
 * Verifies:
 * 1. Clinic Data Scrubbing: Student and Parent roles receive plain-language summaries
 *    with vitals, ICD-10 codes, and clinical dosages completely omitted.
 * 2. Parent-Child Fee Boundary: Parent can only access invoices and ledgers belonging to their linked children.
 * 3. Teacher Class Attendance Scope: Teacher is restricted to recording/viewing attendance for assigned classes.
 * 4. Cross-Tenant Requisition Isolation: Student leader in Tenant A cannot query or view Tenant B requests.
 * 5. Procurement RBAC Enforcement: Unauthorized roles cannot approve or issue requisitions.
 */
declare function runConsolidationGuardTests(): Promise<void>;
export { runConsolidationGuardTests };
