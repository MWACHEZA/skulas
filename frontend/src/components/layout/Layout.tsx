import { Outlet, useParams } from 'react-router-dom';
import { useEffect, useState, createContext, useContext } from 'react';
import api from '../../lib/api';
import TopBar from './TopBar';
import Header from './Header';
import Footer from './Footer';
import AIChatBot from '../shared/AIChatBot';

// ── Timezone overrides ───────────────────────────────────────────────────────
if (typeof window !== 'undefined' && !(window as any).__date_overridden__) {
  (window as any).__date_overridden__ = true;

  const originalToLocaleDateString = Date.prototype.toLocaleDateString;
  Date.prototype.toLocaleDateString = function (this: Date, locales?: any, options?: any) {
    let tz = undefined;
    try {
      const localPrefs = localStorage.getItem('personal_prefs');
      if (localPrefs) {
        const prefs = JSON.parse(localPrefs);
        if (prefs.preferredTimezone) tz = prefs.preferredTimezone;
      }
    } catch (err) {}
    const opts = { timeZone: tz, ...options };
    return originalToLocaleDateString.call(this, locales, opts);
  };

  const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
  Date.prototype.toLocaleTimeString = function (this: Date, locales?: any, options?: any) {
    let tz = undefined;
    try {
      const localPrefs = localStorage.getItem('personal_prefs');
      if (localPrefs) {
        const prefs = JSON.parse(localPrefs);
        if (prefs.preferredTimezone) tz = prefs.preferredTimezone;
      }
    } catch (err) {}
    const opts = { timeZone: tz, ...options };
    return originalToLocaleTimeString.call(this, locales, opts);
  };

  const originalToLocaleString = Date.prototype.toLocaleString;
  Date.prototype.toLocaleString = function (this: any, locales?: any, options?: any) {
    let tz = undefined;
    try {
      const localPrefs = localStorage.getItem('personal_prefs');
      if (localPrefs) {
        const prefs = JSON.parse(localPrefs);
        if (prefs.preferredTimezone) tz = prefs.preferredTimezone;
      }
    } catch (err) {}
    if (this instanceof Date) {
      const opts = { timeZone: tz, ...options };
      return originalToLocaleString.call(this, locales, opts);
    }
    return originalToLocaleString.call(this, locales, options);
  };
}


// ── School Context ───────────────────────────────────────────────────────────
interface SchoolData {
  id: string;
  code: string;
  name: string;
  type: string;
  address?: string;
  phone?: string;
  email?: string;
  branding?: any;
  customContent?: any;
  schoolSetting?: any;
  websiteSettings?: any;
  plan?: { name: string; features: string[] };
  yearsOfExcellence?: number;
  firstAttendedYear?: number;
  sportsCount?: number;
  clubsCount?: number;
}

const SchoolContext = createContext<SchoolData | null>(null);
export const useSchool = () => useContext(SchoolContext);

// ── Layout ───────────────────────────────────────────────────────────────────
export default function Layout() {
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolCode) { setLoading(false); return; }
    api.get(`/api/schools/${schoolCode.toUpperCase()}`)
      .then(res => setSchool(res.data))
      .catch(() => setSchool(null))
      .finally(() => setLoading(false));
  }, [schoolCode]);

  // Apply school branding CSS variables
  useEffect(() => {
    const primaryColor = school?.branding?.primaryColor || (school as any)?.websiteSettings?.schoolPrimaryColor;
    if (primaryColor) {
      document.documentElement.style.setProperty('--school-primary', primaryColor);
    }
    if (school?.branding?.accentColor) {
      document.documentElement.style.setProperty('--school-accent', school.branding.accentColor);
    }
    const bannerTitleColor = (school as any)?.websiteSettings?.bannerTitleColor;
    if (bannerTitleColor) {
      document.documentElement.style.setProperty('--banner-title-color', bannerTitleColor);
    }
    // Dynamic page title
    if (school?.name) {
      document.title = school.name;
    }
  }, [school]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--school-primary, #0056b3)' }}></i>
        <p style={{ marginTop: '12px', color: '#666' }}>Loading school website…</p>
      </div>
    </div>
  );

  return (
    <SchoolContext.Provider value={school}>
      <TopBar school={school} />
      <Header school={school} />
      <main style={{ paddingTop: '110px' }}>
        <Outlet />
      </main>
      <Footer school={school} />
      <AIChatBot />
    </SchoolContext.Provider>
  );
}
