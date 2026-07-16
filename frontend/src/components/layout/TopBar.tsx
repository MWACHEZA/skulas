import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { t } from '../../utils/translate';

interface Props {
  school?: any;
}

export default function TopBar({ school }: Props) {
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = schoolCode || school?.code;
  const [portalsOpen, setPortalsOpen] = useState(false);

  // Pull contact info from schoolSetting first, then direct school fields
  const phone = school?.schoolSetting?.phone || school?.phone || '';
  const email = school?.schoolSetting?.systemEmail || school?.email || '';
  const address = school?.schoolSetting?.address || school?.address || '';

  const facebook = school?.schoolSetting?.facebook || school?.branding?.facebook;
  const twitter = school?.schoolSetting?.twitter || school?.branding?.twitter;
  const instagram = school?.schoolSetting?.instagram;
  const youtube = school?.schoolSetting?.youtube;
  const linkedin = school?.schoolSetting?.linkedin || school?.branding?.linkedin;
  const tiktok = school?.schoolSetting?.tiktok;

  const hasSocial = facebook || twitter || instagram || youtube || linkedin || tiktok;

  const planFeatures: string[] = school?.plan?.features ?? [];
  const hasPlan = planFeatures.length > 0;

  const portalEnabled = (key: string) => {
    if (!hasPlan) return true;
    const featuresLower = planFeatures.map(f => f.toLowerCase());
    const isProfessionalOrEnterprise = featuresLower.some(f => f.includes('professional') || f.includes('enterprise') || f.includes('everything in starter'));

    switch (key.toLowerCase()) {
      case 'admin':
        return true;
      case 'teacher':
      case 'student':
      case 'parent':
        return true;
      case 'bursar':
        return featuresLower.some(f => f.includes('finance') || f.includes('fee') || f.includes('bursar') || f.includes('starter') || f.includes('professional') || f.includes('enterprise'));
      case 'librarian':
        return isProfessionalOrEnterprise || featuresLower.some(f => f.includes('library') || f.includes('librarian'));
      case 'alumni':
        return isProfessionalOrEnterprise || featuresLower.some(f => f.includes('alumni'));
      case 'supplier':
        return true;
      case 'ancillary':
        return isProfessionalOrEnterprise || featuresLower.some(f => f.includes('boarding') || f.includes('hostel') || f.includes('ancillary'));
      case 'clinic':
        return isProfessionalOrEnterprise || featuresLower.some(f => f.includes('clinic') || f.includes('medical') || f.includes('health') || f.includes('starter'));
      default:
        return true;
    }
  };

  const portals = [
    { key: 'admin', label: 'Admin Portal', icon: 'fa-user-shield', color: '#94a3b8', to: '/admin/login', always: true },
    { key: 'teacher', label: 'Teacher Portal', icon: 'fa-chalkboard-teacher', color: '#fbbf24', to: '/teacher/login' },
    { key: 'student', label: 'Student Portal', icon: 'fa-graduation-cap', color: '#34d399', to: '/student/login' },
    { key: 'parent', label: 'Parent Portal', icon: 'fa-home', color: '#60a5fa', to: '/parent/login' },
    { key: 'bursar', label: 'Bursar Portal', icon: 'fa-money-check-alt', color: '#c084fc', to: '/bursar/login' },
    { key: 'librarian', label: 'Library Portal', icon: 'fa-book', color: '#f472b6', to: '/librarian/login' },
    { key: 'clinic', label: 'Clinic Portal', icon: 'fa-user-md', color: '#10b981', to: '/clinic/login' },
    { key: 'alumni', label: 'Alumni Portal', icon: 'fa-user-tie', color: '#fb923c', to: '/alumni/login' },
    { key: 'supplier', label: 'Supplier Portal', icon: 'fa-truck', color: '#22d3ee', to: '/supplier/login' },
    { key: 'ancillary', label: 'Ancillary Portal', icon: 'fa-hands-helping', color: '#38bdf8', to: '/ancillary/login' },
  ].filter(p => p.always || portalEnabled(p.key));

  return (
    <div
      className="top-bar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 1001,
        boxSizing: 'border-box',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        height: '40px',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px', width: '100%', boxSizing: 'border-box' }}>

        {/* Left: Contact Info */}
        <div style={{ display: 'flex', gap: '20px', color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', fontWeight: 500 }}>
          {phone && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-phone" style={{ color: '#60a5fa', fontSize: '11px' }}></i>
              {phone}
            </span>
          )}
          {email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-envelope" style={{ color: '#60a5fa', fontSize: '11px' }}></i>
              {email}
            </span>
          )}
          {address && !phone && !email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-map-marker-alt" style={{ color: '#60a5fa', fontSize: '11px' }}></i>
              {address}
            </span>
          )}
          {!phone && !email && !address && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.7 }}>
              <i className="fas fa-school" style={{ color: '#60a5fa', fontSize: '11px' }}></i>
              {t('Welcome to')} {school?.name || 'our school'}
            </span>
          )}
        </div>

        {/* Right side container */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {/* Social Links */}
          {hasSocial && (
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', borderRight: '1px solid rgba(255,255,255,0.15)', paddingRight: '20px' }}>
              {facebook && (
                <a href={facebook} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                ><i className="fab fa-facebook-f"></i></a>
              )}
              {twitter && (
                <a href={twitter} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                ><i className="fab fa-twitter"></i></a>
              )}
              {instagram && (
                <a href={instagram} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                ><i className="fab fa-instagram"></i></a>
              )}
              {linkedin && (
                <a href={linkedin} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                ><i className="fab fa-linkedin-in"></i></a>
              )}
              {youtube && (
                <a href={youtube} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                ><i className="fab fa-youtube"></i></a>
              )}
              {tiktok && (
                <a href={tiktok} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                ><i className="fab fa-tiktok"></i></a>
              )}
            </div>
          )}

          {/* Portals Dropdown */}
          <div style={{ position: 'relative' }}
            onMouseEnter={() => setPortalsOpen(true)}
            onMouseLeave={() => setPortalsOpen(false)}
          >
            <button
              onClick={() => setPortalsOpen(v => !v)}
              style={{
                background: 'linear-gradient(135deg, var(--school-primary, #1e3a8a), var(--school-accent, #3b82f6))',
                color: 'white', border: 'none', borderRadius: '4px',
                padding: '4px 12px', fontWeight: 700, fontSize: '0.75rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'opacity 0.2s'
              }}
            >
              <i className="fas fa-th-large" style={{ fontSize: '9px' }}></i>
              {t('Portals')}
              <i className={`fas fa-chevron-${portalsOpen ? 'up' : 'down'}`} style={{ fontSize: '8px', marginLeft: '2px' }}></i>
            </button>

            {/* Dropdown Panel */}
            {portalsOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 5px)', right: 0,
                background: 'white', borderRadius: '12px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                border: '1px solid #e2e8f0',
                padding: '12px', minWidth: '260px', zIndex: 9999,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
                animation: 'fadeInDown 0.15s ease'
              }}>
                <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '2px' }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {t('Access Portals')}
                  </p>
                </div>
                {portals.map(portal => (
                  <Link
                    key={portal.key}
                    to={portal.to}
                    onClick={() => setPortalsOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 10px', borderRadius: '8px',
                      textDecoration: 'none', color: '#1e293b',
                      fontSize: '0.8rem', fontWeight: 600,
                      transition: 'background 0.15s',
                      background: 'transparent'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: '26px', height: '26px', borderRadius: '6px',
                      background: `${portal.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className={`fas ${portal.icon}`} style={{ fontSize: '11px', color: portal.color }}></i>
                    </div>
                    {t(portal.label)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
