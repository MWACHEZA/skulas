"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSchoolCode = normalizeSchoolCode;
exports.generateShortCode = generateShortCode;
/**
 * Normalizes input strings for sensitive identifiers like School Codes.
 * Converts common visual typos: I, l, L -> 1 and O -> 0.
 * @param code - The raw school code or identifier
 * @returns {string} - The normalized string
 */
function normalizeSchoolCode(code) {
    if (!code)
        return '';
    return code
        .toUpperCase()
        .trim();
}
/**
 * Generates a short, uppercase code from a name.
 */
function generateShortCode(name) {
    if (!name)
        return '';
    const clean = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 2) {
        return (words[0].substring(0, 2) + words[1].substring(0, 2)).substring(0, 4);
    }
    return words[0].substring(0, 4);
}
//# sourceMappingURL=utils.js.map