/**
 * Normalizes input strings for sensitive identifiers like School Codes.
 * Converts common visual typos: I, l, L -> 1 and O -> 0.
 * @param code - The raw school code or identifier
 * @returns {string} - The normalized string
 */
export function normalizeSchoolCode(code: string): string {
  if (!code) return '';
  return code
    .toUpperCase()
    .trim()
    .replace(/[ILl]/g, '1')
    .replace(/O/g, '0');
}

/**
 * Generates a short, uppercase code from a name.
 */
export function generateShortCode(name: string): string {
  if (!name) return '';
  const clean = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0].substring(0, 2) + words[1].substring(0, 2)).substring(0, 4);
  }
  return words[0].substring(0, 4);
}
