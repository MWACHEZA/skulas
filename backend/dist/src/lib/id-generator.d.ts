/**
 * Generates a sequential ID following the legacy pattern: PREFIX-YY000001 or PREFIX-GLB-YY000001 (for global)
 *
 * Uses an atomic upsert + increment on the `SchoolSequence` table so that concurrent calls
 * for the same school/entity always get a unique value — eliminating the previous
 * select-max + insert race condition.
 *
 * @param schoolId - The unique ID of the school (null for global records like Supplier, Parent)
 * @param role - The user role or entity type
 * @param tx - Optional Prisma Transaction Client (pass `tx` when calling inside a $transaction)
 * @returns {Promise<string>} - The generated ID
 */
export declare function generateSequentialId(schoolId: string | null, role: string, tx?: any): Promise<string>;
