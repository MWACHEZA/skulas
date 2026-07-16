import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSchool } from '../components/layout/Layout';
import api from '../lib/api';

interface Club {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  patron: string | null;
  chairperson: string | null;
}

export default function Clubs() {
  const school = useSchool();
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = (schoolCode || school?.code || '').toUpperCase();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (!code) return;
    api.get(`/api/schools/${code}/content`)
      .then(res => {
        setClubs(res.data.clubs || []);
      })
      .catch(err => console.error('Failed to load clubs', err))
      .finally(() => setLoading(false));
  }, [code]);

  // Build dynamic category tabs from what's in the DB
  const categories = ['all', ...Array.from(new Set(clubs.map(c => c.category || 'General').filter(Boolean)))];

  const filteredClubs = clubs.filter(club => {
    if (activeCategory === 'all') return true;
    return (club.category || 'General') === activeCategory;
  });

  const settings = (school as any)?.websiteSettings;
  const bannerImage = settings?.bannerImage;
  const bannerStyle = bannerImage 
    ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${api.defaults.baseURL}/api/storage/media/${code}/${bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '80px 0', color: 'white', textAlign: 'center' as const }
    : { background: 'linear-gradient(135deg, var(--school-primary, #1e3a8a) 0%, var(--school-accent, #3b82f6) 100%)', padding: '80px 0', color: 'white', textAlign: 'center' as const };

  return (
    <>
      <section className="page-banner" style={bannerStyle}>
        <div className="container">
          <h1 id="hero-title" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '15px', color: 'var(--banner-title-color, white)' }}>Clubs &amp; Activities</h1>
          <p id="hero-subtitle" style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '700px', margin: '0 auto' }}>
            Discover the diverse range of clubs at {school?.name || 'our school'} that help students develop leadership skills and pursue their passions.
          </p>
        </div>
      </section>

      <section style={{ padding: '60px 0', backgroundColor: '#f8fafc' }}>
        <div className="container">

          {/* Category Filter Tabs */}
          {!loading && clubs.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '50px' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '10px 24px',
                    border: '2px solid',
                    borderColor: activeCategory === cat ? '#3b82f6' : '#e2e8f0',
                    background: activeCategory === cat ? '#3b82f6' : 'white',
                    color: activeCategory === cat ? 'white' : '#64748b',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cat === 'all' ? 'All Clubs' : cat}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px' }}>
              <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#3b82f6' }}></i>
              <p style={{ marginTop: '20px', color: '#64748b', fontSize: '1.1rem' }}>Loading clubs...</p>
            </div>
          ) : filteredClubs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <i className="fas fa-users-slash fa-4x" style={{ color: '#cbd5e1', marginBottom: '20px' }}></i>
              <p style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: 500 }}>
                {clubs.length === 0 ? 'No student clubs registered yet.' : 'No clubs in this category.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
              {filteredClubs.map(club => {
                const logoUrl = club.icon
                  ? `${api.defaults.baseURL}/api/storage/media/${code}/${club.icon}`
                  : null;

                return (
                  <div key={club.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
                    className="club-card"
                  >
                    {/* Cover Image or Gradient */}
                    <div style={{ height: '180px', background: logoUrl ? 'transparent' : 'linear-gradient(135deg, #1e3a8a, #3b82f6)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={club.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <i className="fas fa-users" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.6)' }}></i>
                      )}
                    </div>

                    <div style={{ padding: '25px' }}>
                      {/* Category badge */}
                      {club.category && (
                        <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#3b82f6', padding: '3px 10px', borderRadius: '20px', fontWeight: 700, display: 'inline-block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {club.category}
                        </span>
                      )}

                      <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>{club.name}</h3>
                      <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px', minHeight: '55px' }}>{club.description || 'An active student club at our school.'}</p>

                      {/* Patron & Chairperson */}
                      {(club.patron || club.chairperson) && (
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {club.patron && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: '#475569' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="fas fa-chalkboard-teacher" style={{ color: '#10b981', fontSize: '13px' }}></i>
                              </div>
                              <div>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Patron</span>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{club.patron}</span>
                              </div>
                            </div>
                          )}
                          {club.chairperson && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: '#475569' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="fas fa-user-graduate" style={{ color: '#3b82f6', fontSize: '13px' }}></i>
                              </div>
                              <div>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Chairperson</span>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{club.chairperson}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!club.patron && !club.chairperson && (
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '0.875rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          <i className="fas fa-users" style={{ marginRight: '6px' }}></i> Open to all students
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
