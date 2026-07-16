import { Link, useParams } from 'react-router-dom';

interface Props {
  school?: any;
}

export default function Footer({ school }: Props) {
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = schoolCode || school?.code;

  const schoolName = school?.name || 'ACADEX Platform';
  const currentYear = new Date().getFullYear();
  const planFeatures: string[] = school?.plan?.features ?? [];
  const hasPlan = planFeatures.length > 0;

  const featureEnabled = (key: string) => {
    if (!hasPlan) return true;
    const keyLower = key.toLowerCase();
    const publicPages = ['departments', 'admissions', 'news', 'sports', 'clubs', 'gallery', 'contact', 'about', 'careers'];
    if (publicPages.includes(keyLower)) return true;
    const featuresLower = planFeatures.map(f => f.toLowerCase());
    if (keyLower === 'library') return featuresLower.some(f => f.includes('library'));
    if (keyLower === 'alumni') return featuresLower.some(f => f.includes('alumni'));
    return planFeatures.includes(key);
  };

  const base = code ? `/school/${code}` : '/';

  // Social links — read from SchoolSetting (single source of truth)
  const facebook  = school?.schoolSetting?.facebook  || school?.branding?.facebook;
  const twitter   = school?.schoolSetting?.twitter   || school?.branding?.twitter;
  const linkedin  = school?.schoolSetting?.linkedin  || school?.branding?.linkedin;
  const instagram = school?.schoolSetting?.instagram;
  const youtube   = school?.schoolSetting?.youtube;
  const tiktok    = school?.schoolSetting?.tiktok;

  const phone   = school?.schoolSetting?.phone || school?.phone;
  const email   = school?.schoolSetting?.systemEmail || school?.email;
  const address = school?.schoolSetting?.address || school?.address;
  const motto   = school?.branding?.motto;

  return (
    <footer style={{ background: 'linear-gradient(to bottom, #0f172a 0%, #1e293b 100%)', color: '#cbd5e1', marginTop: 'auto' }}>
      <div className="container" style={{ padding: '60px 0 0 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '50px', paddingBottom: '50px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

          {/* School Identity Column */}
          <div>
            <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: '10px' }}>{schoolName}</h2>
            {motto && (
              <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem', marginBottom: '20px' }}>{motto}</p>
            )}
            {address && (
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '8px', display: 'flex', gap: '8px', color: '#94a3b8' }}>
                <i className="fas fa-map-marker-alt" style={{ color: 'var(--school-primary, #3b82f6)', marginTop: '3px', flexShrink: 0 }}></i>
                {address}
              </p>
            )}
            {phone && (
              <p style={{ fontSize: '0.875rem', marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center', color: '#94a3b8' }}>
                <i className="fas fa-phone" style={{ color: 'var(--school-primary, #3b82f6)' }}></i>
                {phone}
              </p>
            )}
            {email && (
              <p style={{ fontSize: '0.875rem', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center', color: '#94a3b8' }}>
                <i className="fas fa-envelope" style={{ color: 'var(--school-primary, #3b82f6)' }}></i>
                {email}
              </p>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
              {(facebook || twitter || linkedin || instagram || youtube || tiktok) ? (
                <>
                  {facebook  && <a href={facebook}  target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', transition: 'background 0.2s', textDecoration: 'none' }}><i className="fab fa-facebook-f"></i></a>}
                  {twitter   && <a href={twitter}   target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', transition: 'background 0.2s', textDecoration: 'none' }}><i className="fab fa-twitter"></i></a>}
                  {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', transition: 'background 0.2s', textDecoration: 'none' }}><i className="fab fa-instagram"></i></a>}
                  {linkedin  && <a href={linkedin}  target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', transition: 'background 0.2s', textDecoration: 'none' }}><i className="fab fa-linkedin-in"></i></a>}
                  {youtube   && <a href={youtube}   target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', transition: 'background 0.2s', textDecoration: 'none' }}><i className="fab fa-youtube"></i></a>}
                  {tiktok    && <a href={tiktok}    target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', transition: 'background 0.2s', textDecoration: 'none' }}><i className="fab fa-tiktok"></i></a>}
                </>
              ) : (
                <>
                  <a href="#" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', textDecoration: 'none' }}><i className="fab fa-facebook-f"></i></a>
                  <a href="#" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', textDecoration: 'none' }}><i className="fab fa-twitter"></i></a>
                  <a href="#" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', textDecoration: 'none' }}><i className="fab fa-instagram"></i></a>
                </>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 style={{ color: 'white', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>Quick Links</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { to: base, label: 'Home' },
                { to: `${base}/about`, label: 'About Us' },
                featureEnabled('departments') ? { to: `${base}/departments`, label: 'Departments' } : null,
                featureEnabled('news') ? { to: `${base}/news`, label: 'News' } : null,
                featureEnabled('sports') ? { to: `${base}/sports`, label: 'Sports' } : null,
                featureEnabled('clubs') ? { to: `${base}/clubs`, label: 'Clubs' } : null,
                featureEnabled('gallery') ? { to: `${base}/gallery`, label: 'Gallery' } : null,
                featureEnabled('careers') ? { to: `${base}/careers`, label: 'Careers' } : null,
                { to: `${base}/contact`, label: 'Contact Us' },
                featureEnabled('admissions') ? { to: `${base}/apply`, label: 'Apply Online' } : null,
              ].filter(Boolean).map((link: any) => (
                <li key={link.label}>
                  <Link to={link.to} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-chevron-right" style={{ fontSize: '10px', color: 'var(--school-primary, #3b82f6)' }}></i>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 style={{ color: 'white', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>Resources</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {featureEnabled('admissions') && (
                <li><Link to={`${base}/apply`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-chevron-right" style={{ fontSize: '10px', color: 'var(--school-primary, #3b82f6)' }}></i>Apply Now</Link></li>
              )}
              {featureEnabled('admissions') && (
                <li><Link to={`${base}/check-status`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-chevron-right" style={{ fontSize: '10px', color: 'var(--school-primary, #3b82f6)' }}></i>Track Application</Link></li>
              )}
              {featureEnabled('departments') && (
                <li><Link to={`${base}/departments`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-chevron-right" style={{ fontSize: '10px', color: 'var(--school-primary, #3b82f6)' }}></i>Academic Departments</Link></li>
              )}
              {featureEnabled('careers') && (
                <li><Link to={`${base}/careers`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-chevron-right" style={{ fontSize: '10px', color: 'var(--school-primary, #3b82f6)' }}></i>Careers / Vacancies</Link></li>
              )}
              <li><Link to={`${base}/contact`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}><i className="fas fa-chevron-right" style={{ fontSize: '10px', color: 'var(--school-primary, #3b82f6)' }}></i>Contact Registrar</Link></li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom */}
        <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            {school?.schoolSetting?.footer
              ? school.schoolSetting.footer
              : `© ${currentYear} ${schoolName}. All Rights Reserved.`}
          </p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
            Powered by <strong style={{ color: 'var(--school-primary, #3b82f6)' }}>ACADEX</strong>&nbsp;|&nbsp; Designed by <span style={{ color: '#94a3b8' }}>Santana IT Solutions</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
