import { useState, useEffect } from 'react';
import { Link, NavLink, useParams, useLocation } from 'react-router-dom';
import { BASE_URL } from '../../lib/api';
import { getPublicMediaUrl } from '../../utils/formatters';
import { t } from '../../utils/translate';

interface Props {
  school?: any;
}

export default function Header({ school }: Props) {
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const location = useLocation();
  const code = schoolCode || school?.code;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const schoolName = school?.name || 'School Website';
  const logo = school?.branding?.logo;
  const planFeatures: string[] = school?.plan?.features ?? [];
  const hasPlan = planFeatures.length > 0;

  // Public nav features — always shown unless explicitly blocked by plan
  const featureEnabled = (key: string) => {
    if (!hasPlan) return true;
    const publicPages = ['departments', 'admissions', 'news', 'sports', 'clubs', 'gallery', 'contact', 'about', 'careers'];
    if (publicPages.includes(key.toLowerCase())) return true;
    const featuresLower = planFeatures.map(f => f.toLowerCase());
    if (key === 'library') return featuresLower.some(f => f.includes('library'));
    if (key === 'alumni') return featuresLower.some(f => f.includes('alumni'));
    return featuresLower.some(f => f.includes(key.toLowerCase()));
  };

  const base = code ? `/school/${code}` : '/';

  const getLogoUrl = () => {
    if (!logo) return null;
    return getPublicMediaUrl(logo, code, (school as any)?.branding?.updatedAt || Date.now());
  };

  return (
    <header style={{
      position: 'fixed',
      top: '40px',
      left: 0,
      right: 0,
      width: '100%',
      zIndex: 1000,
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(14px)',
      boxShadow: '0 2px 15px rgba(0,0,0,0.07)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
      transition: 'background-color 0.3s'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 32px',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Logo */}
        <div className="logo">
          <Link to={base} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            {getLogoUrl() ? (
              <img src={getLogoUrl()!} alt={schoolName} style={{ height: '40px' }} />
            ) : (
              <div style={{
                width: '36px', height: '36px',
                background: 'var(--school-primary, #1e3a8a)',
                borderRadius: '8px', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '1.2rem',
              }}>
                {schoolName.charAt(0)}
              </div>
            )}
            <span className="acadex-school-name" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--school-primary, #1e3a8a)' }}>
              {schoolName}
            </span>
          </Link>
        </div>

        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 1000,
              backdropFilter: 'blur(2px)'
            }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Nav */}
        <nav className={mobileMenuOpen ? 'active' : ''}>
          <ul style={{ display: 'flex', listStyle: 'none', margin: 0, padding: 0, gap: '4px', alignItems: 'center' }}>
            <li><NavLink to={base} end onClick={() => setMobileMenuOpen(false)}>{t('Home')}</NavLink></li>
            <li><NavLink to={`${base}/about`} onClick={() => setMobileMenuOpen(false)}>{t('About Us')}</NavLink></li>

            {featureEnabled('departments') && (
              <li><NavLink to={`${base}/departments`} onClick={() => setMobileMenuOpen(false)}>{t('Departments')}</NavLink></li>
            )}
            {featureEnabled('admissions') && (
              <li><NavLink to={`${base}/apply`} onClick={() => setMobileMenuOpen(false)}>{t('Apply')}</NavLink></li>
            )}
            {featureEnabled('news') && (
              <li><NavLink to={`${base}/news`} onClick={() => setMobileMenuOpen(false)}>{t('News')}</NavLink></li>
            )}
            {featureEnabled('noticeboard') && (
              <li><NavLink to={`${base}/noticeboard`} onClick={() => setMobileMenuOpen(false)}>{t('Noticeboard')}</NavLink></li>
            )}
            {featureEnabled('sports') && (
              <li><NavLink to={`${base}/sports`} onClick={() => setMobileMenuOpen(false)}>{t('Sports')}</NavLink></li>
            )}
            {featureEnabled('clubs') && (
              <li><NavLink to={`${base}/clubs`} onClick={() => setMobileMenuOpen(false)}>{t('Clubs')}</NavLink></li>
            )}
            {featureEnabled('gallery') && (
              <li><NavLink to={`${base}/gallery`} onClick={() => setMobileMenuOpen(false)}>{t('Gallery')}</NavLink></li>
            )}
            <li><NavLink to={`${base}/careers`} onClick={() => setMobileMenuOpen(false)}>{t('Careers')}</NavLink></li>
            <li><NavLink to={`${base}/contact`} onClick={() => setMobileMenuOpen(false)}>{t('Contact')}</NavLink></li>
          </ul>
        </nav>

        <div 
          className="menu-toggle"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          role="button"
          tabIndex={0}
          aria-label="Toggle navigation menu"
          style={{ cursor: 'pointer' }}
        >
          <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </div>
      </div>
    </header>
  );
}
