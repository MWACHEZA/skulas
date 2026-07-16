import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSchool } from '../components/layout/Layout';
import api from '../lib/api';

interface Sport {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  coach: string | null;
  category: string | null;
}

export default function Sports() {
  const school = useSchool();
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = (schoolCode || school?.code || '').toUpperCase();

  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSport, setActiveSport] = useState<Sport | null>(null);

  useEffect(() => {
    if (!code) return;
    api.get(`/api/schools/${code}/content`)
      .then(res => {
        const data: Sport[] = res.data.sports || [];
        setSports(data);
        if (data.length > 0) setActiveSport(data[0]);
      })
      .catch(err => console.error('Failed to load sports', err))
      .finally(() => setLoading(false));
  }, [code]);

  const getSportIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('soccer') || lower.includes('football')) return 'fa-futbol';
    if (lower.includes('basketball')) return 'fa-basketball-ball';
    if (lower.includes('netball') || lower.includes('volleyball')) return 'fa-volleyball-ball';
    if (lower.includes('rugby')) return 'fa-football-ball';
    if (lower.includes('tennis')) return 'fa-table-tennis';
    if (lower.includes('chess')) return 'fa-chess';
    if (lower.includes('athletics') || lower.includes('track') || lower.includes('run')) return 'fa-running';
    if (lower.includes('swim')) return 'fa-swimmer';
    if (lower.includes('cricket')) return 'fa-baseball-ball';
    return 'fa-trophy';
  };

  const settings = (school as any)?.websiteSettings;
  const bannerImage = settings?.bannerImage;
  const bannerStyle = bannerImage 
    ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${api.defaults.baseURL}/api/storage/media/${code}/${bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '80px 0', color: 'white', textAlign: 'center' as const }
    : { background: 'linear-gradient(135deg, var(--school-primary, #1e3a8a) 0%, var(--school-accent, #3b82f6) 100%)', padding: '80px 0', color: 'white', textAlign: 'center' as const };

  return (
    <>
      <section className="page-banner" style={bannerStyle}>
        <div className="container">
          <h1 id="hero-title" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '15px', color: 'var(--banner-title-color, white)' }}>Sports Programs</h1>
          <p id="hero-subtitle" style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>
            At {school?.name || 'our school'}, we believe in the holistic development of our students through athletics and sportsmanship.
          </p>
        </div>
      </section>

      <section style={{ padding: '60px 0', backgroundColor: '#f8fafc' }}>
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px' }}>
              <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#3b82f6' }}></i>
              <p style={{ marginTop: '20px', color: '#64748b', fontSize: '1.1rem' }}>Loading sports programs...</p>
            </div>
          ) : sports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <i className="fas fa-trophy fa-4x" style={{ color: '#cbd5e1', marginBottom: '20px' }}></i>
              <p style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: 500 }}>No sports programs registered yet.</p>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '8px' }}>An administrator can add sports from the admin portal.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '30px', alignItems: 'start' }}>
              {/* Sidebar — Sport Tabs */}
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                <div style={{ background: '#1e3a8a', padding: '20px', color: 'white' }}>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Registered Sports
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {sports.map(sport => {
                    const logoUrl = sport.icon ? `${api.defaults.baseURL}/api/storage/media/${code}/${sport.icon}` : null;
                    return (
                      <button
                        key={sport.id}
                        onClick={() => setActiveSport(sport)}
                        style={{
                          padding: '15px 20px',
                          background: activeSport?.id === sport.id ? '#eff6ff' : 'transparent',
                          border: 'none',
                          borderLeft: activeSport?.id === sport.id ? '4px solid #3b82f6' : '4px solid transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.2s ease',
                          borderBottom: '1px solid #f1f5f9',
                          color: activeSport?.id === sport.id ? '#1e3a8a' : '#475569',
                          fontWeight: activeSport?.id === sport.id ? 700 : 500,
                          fontSize: '0.95rem'
                        }}
                      >
                        <div style={{ width: '24px', height: '24px', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {logoUrl ? (
                            <img src={logoUrl} alt={sport.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <i className={`fas ${getSportIcon(sport.name)}`} style={{ color: activeSport?.id === sport.id ? '#3b82f6' : '#94a3b8' }}></i>
                          )}
                        </div>
                        <span style={{ marginLeft: '8px' }}>{sport.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Content — Active Sport Details */}
              {activeSport && (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                  {/* Sport Header */}
                  <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', padding: '35px 40px', color: 'white', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', overflow: 'hidden' }}>
                      {activeSport.icon ? (
                        <img 
                          src={`${api.defaults.baseURL}/api/storage/media/${code}/${activeSport.icon}`} 
                          alt={activeSport.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <i className={`fas ${getSportIcon(activeSport.name)}`}></i>
                      )}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>{activeSport.name}</h2>
                      {activeSport.category && (
                        <span style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '20px', marginTop: '8px', display: 'inline-block' }}>
                          {activeSport.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '40px' }}>
                    {activeSport.description && (
                      <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.7, marginBottom: '30px', borderBottom: '1px solid #f1f5f9', paddingBottom: '25px' }}>
                        {activeSport.description}
                      </p>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '25px' }}>
                      {/* Coach Card */}
                      {activeSport.coach && (
                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '25px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3b82f6', fontWeight: 700, marginBottom: '15px' }}>
                            Head Coach / Instructor
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="fas fa-user-tie" style={{ color: '#3b82f6', fontSize: '18px' }}></i>
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{activeSport.coach}</p>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Sports Coach</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* School Representing Card */}
                      <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '25px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981', fontWeight: 700, marginBottom: '15px' }}>
                          Representing
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-school" style={{ color: '#10b981', fontSize: '18px' }}></i>
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{school?.name || 'Our School'}</p>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Inter-School Competitions</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
