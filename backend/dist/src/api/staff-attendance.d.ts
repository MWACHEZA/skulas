declare const router: import("express-serve-static-core").Router;
/**
 * 15-Minute Punch Processor: converts raw biometric punches to daily records.
 * Rules:
 * - first punch = firstIn, last punch = lastOut
 * - calculates totalHours
 * - benchmark arrival: 08:00 AM.
 * - late over 30 minutes is flagged to the HR tardiness log.
 * - absent with no approved leave in /admin/leave is marked absent (UNAUTHORIZED_ABSENCE).
 */
export declare function processStaffPunches(schoolId: string, queryDate: Date): Promise<{
    processedCount: number;
    flaggedTardinessCount: number;
    unauthorizedAbsencesCount: number;
}>;
export default router;
