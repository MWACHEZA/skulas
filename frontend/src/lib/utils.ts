/**
 * Generates a short, uppercase code from a name.
 * e.g. "Mathematics" -> "MATH"
 * e.g. "Computer Science" -> "CS" or "COSC"
 */
export const generateShortCode = (name: string): string => {
  if (!name) return '';
  
  // Clean string and uppercase
  const clean = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length >= 2) {
    // Take first 2 letters of first two words
    return (words[0].substring(0, 2) + words[1].substring(0, 2)).substring(0, 4);
  }
  
  // Take first 4 letters
  return words[0].substring(0, 4);
};
