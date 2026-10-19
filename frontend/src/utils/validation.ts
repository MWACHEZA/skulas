/**
 * Shared validation utilities for Skulas User Creation & Management
 * Supports both Student registration and 4-step Staff HR onboarding.
 */

// Zimbabwean National ID regex: 63-1234567-X-42 or 63-123456-X-42 (with or without spaces/dashes)
export const ZIM_NATIONAL_ID_REGEX = /^[0-9]{2}-?[0-9]{6,7}\s?[A-Za-z]\s?-?[0-9]{2}$/;

// Zimbabwean Birth Certificate format: e.g. BC-12345, 12345/09, or general alphanumeric 3-20 chars
export const ZIM_BIRTH_CERT_REGEX = /^[A-Za-z0-9/_-]{3,25}$/;

// Phone number regex: Supports Zimbabwean (+263 7... or 07...) and international formats (+...)
export const PHONE_REGEX = /^(\+263|0)7[1378][0-9]{7}$/;
export const FLEXIBLE_PHONE_REGEX = /^\+?[0-9\s-]{8,20}$/;

// Email validation regex (standard RFC 5322 compatible syntax)
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// NSSA format: Typically 7-10 alphanumeric characters
export const NSSA_REGEX = /^[0-9A-Za-z]{6,12}$/;

// ZIMRA Tax / BP Number format: Typically 6-10 digits
export const ZIMRA_REGEX = /^[0-9]{6,12}$/;

/**
 * Validates Zimbabwean National ID
 */
export function validateZimNationalId(id: string): boolean {
  if (!id) return false;
  return ZIM_NATIONAL_ID_REGEX.test(id.trim());
}

/**
 * Validates National ID or Birth Certificate number
 */
export function validateNationalIdOrBirthCert(id: string): { valid: boolean; type: 'ZIM_ID' | 'BIRTH_CERT' | 'INVALID' } {
  if (!id || !id.trim()) return { valid: false, type: 'INVALID' };
  const trimmed = id.trim();
  if (ZIM_NATIONAL_ID_REGEX.test(trimmed)) {
    return { valid: true, type: 'ZIM_ID' };
  }
  if (ZIM_BIRTH_CERT_REGEX.test(trimmed)) {
    return { valid: true, type: 'BIRTH_CERT' };
  }
  return { valid: false, type: 'INVALID' };
}

/**
 * Validates Phone number (defaults to accepting Zim mobile or valid international numbers)
 */
export function validatePhone(phone: string): { valid: boolean; isZim: boolean } {
  if (!phone || !phone.trim()) return { valid: false, isZim: false };
  const cleaned = phone.replace(/[\s-]/g, '');
  const isZim = PHONE_REGEX.test(cleaned);
  const isValid = isZim || FLEXIBLE_PHONE_REGEX.test(phone.trim());
  return { valid: isValid, isZim };
}

/**
 * Validates standard email address syntax
 */
export function validateEmail(email: string): boolean {
  if (!email || !email.trim()) return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

/**
 * Validates NSSA statutory number
 */
export function validateNssaNumber(nssa: string): boolean {
  if (!nssa || !nssa.trim()) return false;
  return NSSA_REGEX.test(nssa.trim());
}

/**
 * Validates ZIMRA BP / Tax registration number
 */
export function validateZimraNumber(tax: string): boolean {
  if (!tax || !tax.trim()) return false;
  return ZIMRA_REGEX.test(tax.trim());
}

/**
 * Best-effort bank account validation
 */
export function validateBankAccount(accountNumber: string, _bankName?: string): { valid: boolean; message?: string } {
  if (!accountNumber || !accountNumber.trim()) {
    return { valid: true }; // optional if bank not filled
  }
  const clean = accountNumber.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(clean)) {
    return { valid: false, message: 'Account number should contain digits only' };
  }
  if (clean.length < 6 || clean.length > 20) {
    return { valid: false, message: 'Account number should be between 6 and 20 digits' };
  }
  return { valid: true };
}

/**
 * Checks image file dimensions using an HTML Image element
 */
export function checkImageDimensions(
  file: File,
  minWidth = 200,
  minHeight = 200
): Promise<{ valid: boolean; width: number; height: number; message?: string }> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({ valid: false, width: 0, height: 0, message: 'File is not a valid image format (JPG/PNG required)' });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width < minWidth || img.height < minHeight) {
        resolve({
          valid: false,
          width: img.width,
          height: img.height,
          message: `Image resolution too low (${img.width}x${img.height}px). Minimum required is ${minWidth}x${minHeight}px for clear ID passes.`
        });
      } else {
        resolve({ valid: true, width: img.width, height: img.height });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: false, width: 0, height: 0, message: 'Failed to inspect image dimensions' });
    };
    img.src = url;
  });
}

/**
 * Evaluates age against grade level to detect potential mismatches.
 * Returns non-blocking warning guidance.
 */
export function checkAgeGradeMismatch(
  age: number,
  className?: string
): { mismatch: boolean; warning?: string; expectedRange?: string } | null {
  if (!age || age < 1 || !className) return null;

  const lower = className.toLowerCase();
  let expectedMin = 5;
  let expectedMax = 25;

  if (lower.includes('grade 1') || lower.includes('grade 0') || lower.includes('class 1')) {
    expectedMin = 5; expectedMax = 7;
  } else if (lower.includes('grade 2') || lower.includes('class 2')) {
    expectedMin = 6; expectedMax = 8;
  } else if (lower.includes('grade 3')) {
    expectedMin = 7; expectedMax = 9;
  } else if (lower.includes('grade 4')) {
    expectedMin = 8; expectedMax = 10;
  } else if (lower.includes('grade 5')) {
    expectedMin = 9; expectedMax = 11;
  } else if (lower.includes('grade 6')) {
    expectedMin = 10; expectedMax = 12;
  } else if (lower.includes('grade 7')) {
    expectedMin = 11; expectedMax = 13;
  } else if (lower.includes('form 1') || lower.includes('form one') || lower.includes('grade 8')) {
    expectedMin = 12; expectedMax = 14;
  } else if (lower.includes('form 2') || lower.includes('grade 9')) {
    expectedMin = 13; expectedMax = 15;
  } else if (lower.includes('form 3') || lower.includes('grade 10')) {
    expectedMin = 14; expectedMax = 16;
  } else if (lower.includes('form 4') || lower.includes('grade 11')) {
    expectedMin = 15; expectedMax = 17;
  } else if (lower.includes('lower 6') || lower.includes('form 5') || lower.includes('grade 12')) {
    expectedMin = 16; expectedMax = 18;
  } else if (lower.includes('upper 6') || lower.includes('form 6')) {
    expectedMin = 17; expectedMax = 19;
  } else if (lower.includes('part 1') || lower.includes('year 1') || lower.includes('degree') || lower.includes('diploma')) {
    expectedMin = 18; expectedMax = 70;
  } else {
    return null;
  }

  const expectedRange = `${expectedMin}–${expectedMax} years`;
  if (age < expectedMin || age > expectedMax) {
    return {
      mismatch: true,
      expectedRange,
      warning: `Student is ${age} years old for ${className} (typical age range: ${expectedRange}). This is acceptable for late starters, transfers, or repeaters.`
    };
  }

  return { mismatch: false, expectedRange };
}

/**
 * Checks if a teacher's recorded qualifications appear to align with teaching duties
 */
export function checkTeacherQualifications(qualification?: string): { hasQualification: boolean; warning?: string } {
  if (!qualification || !qualification.trim()) {
    return {
      hasQualification: false,
      warning: 'No academic or professional qualification recorded. You may proceed on a provisional or specialist basis.'
    };
  }
  const qLower = qualification.toLowerCase();
  const teachingKeywords = ['diped', 'degree', 'bsc', 'ba', 'bed', 'b.ed', 'pgde', 'master', 'phd', 'diploma', 'certificate', 'qts', 'teacher'];
  const hasRecognized = teachingKeywords.some(k => qLower.includes(k));
  if (!hasRecognized) {
    return {
      hasQualification: true,
      warning: 'Qualification does not explicitly indicate an education or academic degree. Verify specialist accreditation if required.'
    };
  }
  return { hasQualification: true };
}
