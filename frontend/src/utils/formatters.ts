import { BASE_URL } from '../lib/api';

/**
 * Formats a numeric value into a currency string.
 * @param amount The number to format
 * @param currency The currency symbol or code (default: '$')
 * @returns A formatted currency string
 */
export const formatCurrency = (amount: number | string, currency: string = '$'): string => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(value)) return `${currency}0.00`;
  
  return `${currency}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Formats a date string or object into a human-readable format.
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Resolves a stored avatar path or URL to an accessible image URL.
 */
export const getAvatarUrl = (avatar?: string | null, schoolCode?: string | null, cacheBuster?: string | number): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('data:')) {
    return avatar;
  }
  let url: string;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    url = avatar;
  } else {
    let clean = avatar.replace(/\\/g, '/').replace(/^\/+/, '');
    // If it starts with images/ followed by a path or filename, remove the redundant images/ prefix
    clean = clean.replace(/^images\//, '');
    const code = schoolCode || 'global';
    if (clean.toLowerCase().startsWith(`${code.toLowerCase()}/`)) {
      clean = clean.slice(code.length + 1);
    }
    url = `${BASE_URL}/api/storage/media/${code}/${clean}`;
  }
  if (cacheBuster !== undefined && cacheBuster !== null && cacheBuster !== '') {
    const buster = typeof cacheBuster === 'number'
      ? cacheBuster
      : !isNaN(new Date(cacheBuster).getTime())
        ? new Date(cacheBuster).getTime()
        : cacheBuster;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${buster}`;
  }
  return url;
};
