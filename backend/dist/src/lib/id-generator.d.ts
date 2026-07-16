/**
 * Generates a sequential ID following the legacy pattern: PREFIX-YY000001 or PREFIX-GLB-YY000001 (for global)
 * @param schoolId - The unique ID of the school (null for global records)
 * @param role - The user role or entity type
 * @param tx - Optional Prisma Transaction Client
 * @returns {Promise<string>} - The generated ID
 */
export declare function generateSequentialId(schoolId: string | null, role: string, tx?: any): Promise<string>;
