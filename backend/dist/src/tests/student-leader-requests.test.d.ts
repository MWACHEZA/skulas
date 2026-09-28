/**
 * Automated Test Suite: Student Leader Cleaning Supplies Request Feature
 *
 * Verifies all security, authorization, anti-abuse, and workflow constraints:
 * (a) Normal student without leadership gets 403
 * (b) Leader from Tenant A cannot access or create in Tenant B (Multi-tenant isolation)
 * (c) Non-allowed cleaning item SKU is rejected with 403
 * (d) Spam limit: The 11th request within a rolling 7-day period returns 429
 * (e) Matron / Boarding Master scoping: Hostels outside assignment are isolated
 * (f) Deactivated / expired assignment loses access immediately
 * (g) Payload tamper resistance: Hostel Prefect cannot submit for another hostel ID
 */
export declare function runStudentLeaderFeatureTests(): Promise<{
    passed: number;
    failed: number;
}>;
