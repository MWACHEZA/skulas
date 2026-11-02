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
    // Strip redundant storage/media/ prefixes if present
    clean = clean.replace(/^(api\/)?storage\/media\//, '');
    // If it starts with images/ followed by a path or filename, remove the redundant images/ prefix
    clean = clean.replace(/^images\//, '');

    // Check if the path itself begins with a valid school code (e.g. AX-GOXN5P/avatars/...)
    const embeddedCodeMatch = clean.match(/^([A-Za-z]{2,4}-[A-Za-z0-9_-]+)\/(.+)$/);
    const isValidSchoolCode = (val?: string | null) =>
      Boolean(val && (/^[A-Za-z]{2,4}-[A-Za-z0-9_-]+$/i.test(val.trim()) || val.trim().toLowerCase() === 'global'));

    let code = isValidSchoolCode(schoolCode) ? schoolCode!.trim() : '';
    if (embeddedCodeMatch) {
      if (!code || code.toLowerCase() === 'global') {
        code = embeddedCodeMatch[1];
      }
      clean = embeddedCodeMatch[2];
    }
    if (!code) {
      code = 'global';
    }
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

/**
 * Standardized helper to resolve public website banners, headmaster/director portraits, and media assets.
 * Always returns a clean, fully-qualified URL with cache-busting support.
 */
export const getPublicMediaUrl = (
  media?: string | null,
  schoolCode?: string | null,
  cacheBuster?: string | number
): string | null => {
  return getAvatarUrl(media, schoolCode, cacheBuster);
};

interface BadgeRoleItem {
  leadershipRole?: string;
  name?: string;
  role?: string;
  title?: string;
  hostel?: { name?: string };
}

/**
 * Parses and sanitizes array or JSON-stringified roles/tags into clean badge strings.
 * Completely eliminates raw brackets [], quotes, and empty artifacts.
 */
export const parseCleanBadges = (val: unknown): string[] => {
  if (!val) return [];
  let items: unknown[] = [];
  if (Array.isArray(val)) {
    items = val;
  } else if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '[]' || trimmed === '[""]' || trimmed === 'null' || trimmed === 'undefined') return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) items = parsed;
        else if (typeof parsed === 'string') items = [parsed];
      } catch {
        items = trimmed.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      }
    } else {
      items = trimmed.split(',').map(s => s.trim());
    }
  }

  const result: string[] = [];
  for (const item of items) {
    if (!item) continue;
    if (typeof item === 'object') {
      const roleObj = item as BadgeRoleItem;
      const roleStr = roleObj.leadershipRole || roleObj.name || roleObj.role || roleObj.title;
      if (roleStr && typeof roleStr === 'string') {
        let clean = roleStr.replace(/_/g, ' ').replace(/^["'[\]]+|["'[\]]+$/g, '').trim();
        if (clean && clean !== '[]') {
          if (clean.toUpperCase() === 'HOD' || clean.toUpperCase() === 'HEAD OF DEPARTMENT') {
            clean = 'Head of Department (HOD)';
          }
          const hostelSuffix = roleObj.hostel?.name ? ` (${roleObj.hostel.name})` : '';
          result.push(`${clean}${hostelSuffix}`);
        }
      }
    } else if (typeof item === 'string') {
      const trimmedItem = item.trim();
      if (!trimmedItem || trimmedItem === '[]' || trimmedItem === 'null') continue;
      if (trimmedItem.startsWith('[') && trimmedItem.endsWith(']')) {
        try {
          const nested = JSON.parse(trimmedItem);
          if (Array.isArray(nested)) {
            nested.forEach(n => {
              let clean = String(n).replace(/_/g, ' ').replace(/^["'[\]]+|["'[\]]+$/g, '').trim();
              if (clean && clean !== '[]') {
                if (clean.toUpperCase() === 'HOD' || clean.toUpperCase() === 'HEAD OF DEPARTMENT') {
                  clean = 'Head of Department (HOD)';
                }
                result.push(clean);
              }
            });
            continue;
          }
        } catch {
          // ignore parse error
        }
      }
      let clean = trimmedItem.replace(/_/g, ' ').replace(/^["'[\]]+|["'[\]]+$/g, '').trim();
      if (clean && clean !== '[]') {
        if (clean.toUpperCase() === 'HOD' || clean.toUpperCase() === 'HEAD OF DEPARTMENT') {
          clean = 'Head of Department (HOD)';
        }
        result.push(clean);
      }
    }
  }
  return Array.from(new Set(result));
};
