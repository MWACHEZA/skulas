import React from 'react';
import { useParams } from 'react-router-dom';
import { useSchool } from '../components/layout/Layout';
import api from '../lib/api';

export default function About() {
  const school = useSchool();
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = schoolCode || school?.code;

  const settings = (school as any)?.websiteSettings;
  const name = school?.name || 'Our School';

  // School-type aware leader label (read from public school data)
  const schoolType = (school?.type || 'secondary').toLowerCase();
  const isTertiary = schoolType.includes('college') || schoolType.includes('colledge') ||
    schoolType.includes('university') || schoolType.includes('varsity') ||
    schoolType.includes('tertiary') || schoolType.includes('nursing') ||
    schoolType.includes('medical') || schoolType.includes('poly') ||
    schoolType.includes('seminary');
  const leaderLabel = isTertiary ? 'Principal' : 'Headmaster';

  const aboutTitle = settings?.aboutTitle || `About ${name}`;
  const directorName = settings?.directorName;
  const directorTitle = settings?.directorTitle;
  const directorImage = settings?.directorImage;
  const yearOfEstablishment = settings?.yearOfEstablishment;
  const countryOfEstablishment = settings?.countryOfEstablishment;
  const aboutFeatures = settings?.aboutFeatures || [];

  const bannerImage = settings?.bannerImage;
  const bannerStyle = bannerImage
    ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${api.defaults.baseURL}/api/storage/media/${code}/${bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <>
      <section className="page-banner" style={bannerStyle}>
        <div className="container">
          <h1 id="hero-title">{aboutTitle}</h1>
          <p id="hero-subtitle">Learn more about our heritage, values, and leadership</p>
        </div>
      </section>

      {/* About Section — Establishment Info + School Graphic */}
      <section className="about-section" style={{ padding: '80px 0', backgroundColor: '#fff' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '50px', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '24px', fontWeight: 800 }}>
                About {name}
              </h2>
              {(yearOfEstablishment || countryOfEstablishment) && (
                <div style={{ display: 'flex', gap: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '24px', marginTop: '16px' }}>
                  {yearOfEstablishment && (
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--school-primary, #0056b3)', fontWeight: 800 }}>{yearOfEstablishment}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Established</p>
                    </div>
                  )}
                  {countryOfEstablishment && (
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--school-primary, #0056b3)', fontWeight: 800 }}>{countryOfEstablishment}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Country</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* School graphic — always shown (no YouTube embed) */}
            <div>
              <div style={{
                background: 'linear-gradient(135deg, var(--school-primary, #0056b3), var(--school-accent, #d1410c))',
                height: '300px', borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', padding: '30px', textAlign: 'center',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
              }}>
                <div>
                  <i className="fas fa-university fa-3x" style={{ marginBottom: '15px' }}></i>
                  <h3>Welcome to {name}</h3>
                  <p style={{ opacity: 0.9 }}>Nurturing minds and building strong future leaders.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* School Features Grid */}
      {aboutFeatures.length > 0 && (
        <section style={{ padding: '80px 0', backgroundColor: '#f8fafc' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '50px' }}>
              <h2 style={{ fontSize: '1.8rem', color: '#1e293b', fontWeight: 800 }}>Why Choose {name}?</h2>
              <p style={{ color: '#64748b' }}>We stand out for our commitment to excellence across a variety of pillars.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '30px' }}>
              {aboutFeatures.map((feat: string, idx: number) => (
                <div key={idx} className="portal-card" style={{ padding: '24px', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(0, 86, 179, 0.1)', color: 'var(--school-primary, #0056b3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fas fa-check" style={{ fontSize: '1.1rem' }}></i>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: '#1e293b', fontSize: '0.95rem', lineHeight: 1.6, fontWeight: 500 }}>{feat}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Leader (Headmaster/Principal) Greeting Card */}
      {(directorName || directorImage) && (
        <section style={{ padding: '80px 0', backgroundColor: '#fff' }}>
          <div className="container">
            <div style={{ maxWidth: '900px', margin: '0 auto', background: '#f8fafc', borderRadius: '24px', padding: '40px', border: '1px solid #e2e8f0', display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
              {directorImage && (
                <div style={{ width: '150px', height: '150px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', flexShrink: 0, margin: '0 auto' }}>
                  <img
                    src={`${api.defaults.baseURL}/api/storage/media/${code}/${directorImage}`}
                    alt={directorName || leaderLabel}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2';
                    }}
                  />
                </div>
              )}
              <div style={{ flex: 1, minWidth: '260px' }}>
                <i className="fas fa-quote-left" style={{ fontSize: '2rem', color: 'rgba(0, 86, 179, 0.2)', marginBottom: '15px', display: 'block' }}></i>
                <p style={{ color: '#475569', fontSize: '1.1rem', fontStyle: 'italic', lineHeight: 1.8, marginBottom: '20px' }}>
                  "As {leaderLabel} of {name}, I am extremely proud to lead this wonderful institution. Our students achieve fantastic milestones, supported by our excellent staff, state-of-the-art facilities, and strong core values."
                </p>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: 800 }}>{directorName || leaderLabel}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{directorTitle || leaderLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
