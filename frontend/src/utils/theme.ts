/**
 * Theme & Branding Color Manager
 * Standardizes primary, accent, dark/light variants, and RGB color channels
 * across both public school websites and internal role portals.
 */

export interface SchoolColors {
  primaryColor?: string | null;
  accentColor?: string | null;
  bannerTitleColor?: string | null;
}

export function hexToRgb(hex?: string | null): { r: number; g: number; b: number } | null {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(x => x + x).join('');
  }
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const factor = 1 + percent / 100;
  const r = Math.min(255, Math.max(0, Math.round(rgb.r * factor)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g * factor)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b * factor)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Checks if the current pathname belongs to Acadex's public platform / SaaS pages
 * (e.g. /, /features, /pricing, /contact, /acadex/*) which must preserve Acadex branding.
 */
export function isAcadexPlatformPath(pathname: string): boolean {
  if (!pathname) return true;
  const p = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  
  // Root and public SaaS marketing pages
  if (p === '/' || p === '/features' || p === '/pricing' || p === '/contact' || p === '/privacy-policy' || p === '/terms' || p === '/register/school') {
    return true;
  }
  
  // Acadex Super-Admin layout and auth
  if (p.startsWith('/acadex')) {
    return true;
  }
  
  return false;
}

/**
 * Resets document styling and favicon to Acadex platform defaults.
 */
export function resetToAcadexTheme() {
  const root = document.documentElement;
  const primary = '#2563eb';
  const accent = '#7c3aed';

  root.style.setProperty('--school-primary', primary);
  root.style.setProperty('--school-primary-dark', '#1d4ed8');
  root.style.setProperty('--school-primary-light', '#60a5fa');
  root.style.setProperty('--school-primary-rgb', '37, 99, 235');
  root.style.setProperty('--portal-primary', primary);
  root.style.setProperty('--primary-color', primary);
  root.style.setProperty('--admin-primary', primary);
  root.style.setProperty('--school-accent', accent);
  root.style.setProperty('--accent-color', accent);
  root.style.setProperty('--school-secondary', accent);

  // Reset favicon to Acadex default
  const links = document.querySelectorAll("link[rel*='icon']");
  links.forEach(l => (l as HTMLLinkElement).href = '/favicon.svg');
  if (links.length === 0) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = '/favicon.svg';
    document.head.appendChild(link);
  }
}

/**
 * Applies a school's tenant color scheme to the entire document.
 */
export function applySchoolTheme(colors: SchoolColors) {
  const primary = colors.primaryColor?.trim() || '#0056b3';
  const accent = colors.accentColor?.trim() || '#d97706';
  const root = document.documentElement;
  const rgb = hexToRgb(primary);

  root.style.setProperty('--school-primary', primary);
  root.style.setProperty('--school-primary-dark', adjustBrightness(primary, -20));
  root.style.setProperty('--school-primary-light', adjustBrightness(primary, 30));
  if (rgb) {
    root.style.setProperty('--school-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  }
  root.style.setProperty('--portal-primary', primary);
  root.style.setProperty('--primary-color', primary);
  root.style.setProperty('--admin-primary', primary);

  root.style.setProperty('--school-accent', accent);
  root.style.setProperty('--accent-color', accent);
  root.style.setProperty('--school-secondary', accent);

  if (colors.bannerTitleColor) {
    root.style.setProperty('--banner-title-color', colors.bannerTitleColor);
  }
}
