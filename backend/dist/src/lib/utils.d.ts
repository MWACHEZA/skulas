/**
 * Normalizes input strings for sensitive identifiers like School Codes.
 * Converts common visual typos: I, l, L -> 1 and O -> 0.
 * @param code - The raw school code or identifier
 * @returns {string} - The normalized string
 */
export declare function normalizeSchoolCode(code: string): string;
/**
 * Generates a short, uppercase code from a name.
 */
export declare function generateShortCode(name: string): string;
