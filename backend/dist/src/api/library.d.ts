declare const router: import("express-serve-static-core").Router;
/**
 * Helper to generate sequential accession number for a school: ACC-0001, ACC-0002...
 */
export declare function generateNextAccessionNumber(schoolId: string, prismaClient: any): Promise<string>;
export default router;
