import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSchool } from '../components/layout/Layout';
import api from '../lib/api';
import '../assets/css/style.css';

export default function News() {
  const school = useSchool();
  const { schoolCode: urlSchoolCode } = useParams<{ schoolCode: string }>();
  const schoolCode = (urlSchoolCode || school?.code || 'AX-EMBAKWE').toUpperCase();
  const schoolName = school?.name || 'our school';

  const [news, setNews] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedNews, setSelectedNews] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newsRes, annRes] = await Promise.all([
          api.get(`/api/public/news`, { params: { schoolCode } }),
          api.get(`/api/public/announcements`, { params: { schoolCode } })
        ]);
        setNews(Array.isArray(newsRes.data) ? newsRes.data : []);
        setAnnouncements(Array.isArray(annRes.data) ? annRes.data : []);
      } catch (err) {
        console.error('Failed to fetch public content');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [schoolCode]);

  const combinedContent = [
    ...news.map(n => ({ ...n, type: 'news', date: n.publishedAt, category: n.category || 'News' })),
    ...announcements.map(a => ({ ...a, type: 'announcement', date: a.publishedAt, category: 'Announcements' }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Extract unique categories dynamically, always keeping 'all' first
  const dynamicCategories = ['all', ...Array.from(new Set(combinedContent.map(item => (item.category || '').toLowerCase())))].filter(c => c);

  const filteredContent = combinedContent.filter(item => {
    if (filter === 'all') return true;
    return (item.category || '').toLowerCase() === filter.toLowerCase();
  });

  const truncateText = (text: string, length = 150) => {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  const settings = (school as any)?.websiteSettings;
  const bannerImage = settings?.bannerImage;
  const bannerStyle = bannerImage 
    ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${api.defaults.baseURL}/api/storage/media/${schoolCode}/${bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '80px 0', color: 'white', textAlign: 'center' as const }
    : { background: 'linear-gradient(135deg, var(--school-primary, #1e3a8a) 0%, var(--school-accent, #3b82f6) 100%)', padding: '80px 0', color: 'white', textAlign: 'center' as const };

  return (
    <>
      <section className="page-banner" style={bannerStyle}>
        <div className="container">
          <h1 id="hero-title" style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '15px', color: 'var(--banner-title-color, white)' }}>School News & Updates</h1>
          <p id="hero-subtitle" style={{ fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto', opacity: 0.9 }}>Stay informed about the latest happenings at <span className="acadex-school-name">{schoolName}</span></p>
        </div>
      </section>

      <section className="news-section" style={{ padding: '60px 20px' }}>
        <div className="container">
          <div className="news-filters" style={{ marginBottom: 40, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {dynamicCategories.map(f => (
              <button 
                key={f}
                className={`portal-btn-${filter === f ? 'primary' : 'neutral'}`}
                style={{ borderRadius: 20, padding: '8px 20px', textTransform: 'capitalize' }}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
               <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#0056b3' }}></i>
               <p style={{ marginTop: 20, color: '#64748b' }}>Fetching latest updates...</p>
            </div>
          ) : (
            <div className="news-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 30 }}>
              {filteredContent.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 80, background: '#f8fafc', borderRadius: 12 }}>
                  <i className="far fa-newspaper fa-4x" style={{ color: '#cbd5e1', marginBottom: 20 }}></i>
                  <p style={{ color: '#64748b' }}>No news or announcements found in this category.</p>
                </div>
              ) : (
                filteredContent.map((item, idx) => (
                  <div key={idx} className="portal-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    {item.type === 'news' && item.image && (
                      <img 
                        src={`${api.defaults.baseURL}/api/storage/media/${schoolCode}/${item.image}`} 
                        alt={item.title} 
                        style={{ width: '100%', height: 200, objectFit: 'cover' }} 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `${api.defaults.baseURL}/api/storage/media/global/${item.image}`;
                        }}
                      />
                    )}
                    <div className="portal-card-body" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--school-primary, #3182ce)', textTransform: 'uppercase' }}>
                            {item.type === 'announcement' ? 'Official Announcement' : item.category || 'School News'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>{item.title}</h3>
                        <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>{truncateText(item.content)}</p>
                      </div>
                      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          By: {item.author || 'Administrator'}
                        </span>
                        <button
                          onClick={() => setSelectedNews(item)}
                          className="portal-btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          Read More
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {selectedNews && (
        <div className="portal-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedNews(null)}>
          <div 
            className="portal-modal-card animate-in zoom-in duration-200" 
            style={{ maxWidth: '700px', width: '95%', padding: 0, overflow: 'hidden', borderRadius: '16px', position: 'relative', background: 'white', color: '#1e293b', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            {selectedNews.image && selectedNews.type === 'news' && (
              <img 
                src={`${api.defaults.baseURL}/api/storage/media/${schoolCode}/${selectedNews.image}`} 
                alt={selectedNews.title} 
                style={{ width: '100%', height: 300, objectFit: 'cover' }} 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `${api.defaults.baseURL}/api/storage/media/global/${selectedNews.image}`;
                }}
              />
            )}
            <div style={{ padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--school-primary, #3182ce)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    {selectedNews.type === 'announcement' ? 'Official Announcement' : selectedNews.category || 'School News'}
                  </span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>{selectedNews.title}</h3>
                </div>
                <button onClick={() => setSelectedNews(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '10px', color: '#475569', fontSize: '1.05rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
                {selectedNews.content}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                <span>Published on: {new Date(selectedNews.date).toLocaleDateString()}</span>
                <span>Published by: <strong>{selectedNews.author || 'Administrator'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
