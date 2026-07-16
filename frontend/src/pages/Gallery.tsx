import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSchool } from '../components/layout/Layout';
import api from '../lib/api';

interface GalleryItem {
  id: string;
  title: string;
  content: string;
  coverImage: string | null;
  category: string | null;
  createdAt: string;
}

export default function Gallery() {
  const school = useSchool();
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = (schoolCode || school?.code || '').toUpperCase();

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  useEffect(() => {
    if (!code) return;
    api.get(`/api/schools/${code}/content`)
      .then(res => {
        setItems(res.data.gallery || []);
      })
      .catch(err => console.error('Failed to load gallery items', err))
      .finally(() => setLoading(false));
  }, [code]);

  // Dynamically derive categories from DB data
  const categories = ['all', ...Array.from(new Set(items.map(i => i.category || 'General').filter(Boolean)))];

  const filteredItems = items.filter(item => {
    if (activeCategory === 'all') return true;
    return (item.category || 'General') === activeCategory;
  });

  const settings = (school as any)?.websiteSettings;
  const bannerImage = settings?.bannerImage;
  const bannerStyle = bannerImage 
    ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${api.defaults.baseURL}/api/storage/media/${code}/${bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '80px 0', color: 'white', textAlign: 'center' as const }
    : { background: 'linear-gradient(135deg, var(--school-primary, #1e3a8a) 0%, var(--school-accent, #3b82f6) 100%)', padding: '80px 0', color: 'white', textAlign: 'center' as const };

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px' }}
          onClick={() => setLightbox(null)}
        >
          <div style={{ maxWidth: '900px', width: '100%', background: '#0f172a', borderRadius: '16px', overflow: 'hidden', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.15)', border: 'none', width: '35px', height: '35px', borderRadius: '50%', color: 'white', fontSize: '18px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
            {lightbox.coverImage && (
              <img
                src={`${api.defaults.baseURL}/api/storage/media/${code}/${lightbox.coverImage}`}
                alt={lightbox.title}
                style={{ width: '100%', maxHeight: '600px', objectFit: 'contain', display: 'block' }}
              />
            )}
            <div style={{ padding: '20px' }}>
              <h3 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '1.2rem' }}>{lightbox.title}</h3>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>{lightbox.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-banner" style={bannerStyle}>
        <div className="container">
          <h1 id="hero-title" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '15px', color: 'var(--banner-title-color, white)' }}>Life at {school?.name || 'Our School'}</h1>
          <p id="hero-subtitle" style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 30px auto' }}>
            Capturing the moments that define our vibrant community.
          </p>

          {/* Category filter in header */}
          {!loading && items.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '8px 22px',
                    border: '2px solid',
                    borderColor: activeCategory === cat ? 'white' : 'rgba(255,255,255,0.4)',
                    background: activeCategory === cat ? 'white' : 'transparent',
                    color: activeCategory === cat ? '#1e3a8a' : 'white',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cat === 'all' ? 'All Photos' : cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container" style={{ padding: '60px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px' }}>
            <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#3b82f6' }}></i>
            <p style={{ marginTop: '20px', color: '#64748b', fontSize: '1.1rem' }}>Loading gallery archive...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <i className="far fa-images fa-4x" style={{ color: '#cbd5e1', marginBottom: '20px' }}></i>
            <p style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: 500 }}>
              {items.length === 0 ? 'No gallery images uploaded yet.' : 'No images in this category.'}
            </p>
          </div>
        ) : (
          <div style={{ columns: '4 200px', columnGap: '16px' }}>
            {filteredItems.map(item => {
              const imgUrl = item.coverImage
                ? `${api.defaults.baseURL}/api/storage/media/${code}/${item.coverImage}`
                : 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=400';
              return (
                <div
                  key={item.id}
                  className="gallery-item"
                  style={{ breakInside: 'avoid', marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', position: 'relative', display: 'block' }}
                  onClick={() => setLightbox(item)}
                >
                  <img
                    src={imgUrl}
                    alt={item.title}
                    style={{ width: '100%', display: 'block', transition: 'transform 0.3s ease' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=400';
                    }}
                  />
                  <div className="gallery-overlay" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '20px 15px 12px', color: 'white', opacity: 0, transition: 'opacity 0.3s ease' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{item.title}</h4>
                    {item.category && <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{item.category}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .gallery-item:hover img { transform: scale(1.04); }
        .gallery-item:hover .gallery-overlay { opacity: 1 !important; }
      `}</style>
    </>
  );
}
