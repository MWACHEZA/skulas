import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';

interface BannerConfigItem {
  id: string;
  field: string;
  title: string;
  category: string;
  description: string;
  recommended: string;
  publicRoute: string;
  defaultIcon: string;
}

const PUBLIC_BANNERS: BannerConfigItem[] = [
  {
    id: 'hero-banner',
    field: 'bannerImage',
    title: 'Home Page Hero Main Banner',
    category: 'Home Landing Page',
    description: 'The prominent background banner at the top of your school public homepage.',
    recommended: '1920 × 750px (JPG, PNG, WebP • Max 10MB)',
    publicRoute: '',
    defaultIcon: 'fas fa-landmark'
  },
  {
    id: 'cta-banner',
    field: 'ctaBanner',
    title: 'Home Page Admissions CTA Banner',
    category: 'Admissions & Enrollment',
    description: 'Background graphic for the "Apply Now & Join Our Family" section on the homepage.',
    recommended: '1920 × 500px (JPG, PNG, WebP)',
    publicRoute: '',
    defaultIcon: 'fas fa-graduation-cap'
  },
  {
    id: 'about-banner',
    field: 'aboutBanner',
    title: 'About Us Heritage Header Banner',
    category: 'About & Leadership',
    description: 'Top banner displayed on the About Us, school heritage, and mission page.',
    recommended: '1920 × 600px (JPG, PNG, WebP)',
    publicRoute: 'about',
    defaultIcon: 'fas fa-history'
  },
  {
    id: 'director-photo',
    field: 'directorImage',
    title: 'Principal / Headmaster / Director Portrait',
    category: 'About & Leadership',
    description: 'Official photographic portrait of the School Headmaster displayed in the About Us section.',
    recommended: '800 × 1000px Portrait (JPG, PNG, WebP)',
    publicRoute: 'about',
    defaultIcon: 'fas fa-user-tie'
  },
  {
    id: 'departments-banner',
    field: 'departmentsBanner',
    title: 'Academic Departments Header Banner',
    category: 'Academics',
    description: 'Top hero banner displayed on the Academic Departments and faculty directory page.',
    recommended: '1920 × 600px (JPG, PNG, WebP)',
    publicRoute: 'departments',
    defaultIcon: 'fas fa-chalkboard-teacher'
  },
  {
    id: 'sports-banner',
    field: 'sportsBanner',
    title: 'Sports & Athletics Header Banner',
    category: 'Student Life',
    description: 'Top banner showcased across sporting codes, fixtures, and athletics achievements.',
    recommended: '1920 × 600px (JPG, PNG, WebP)',
    publicRoute: 'sports',
    defaultIcon: 'fas fa-running'
  },
  {
    id: 'clubs-banner',
    field: 'clubsBanner',
    title: 'Clubs & Societies Header Banner',
    category: 'Student Life',
    description: 'Top banner displayed across extracurricular clubs and societies.',
    recommended: '1920 × 600px (JPG, PNG, WebP)',
    publicRoute: 'clubs',
    defaultIcon: 'fas fa-users'
  },
  {
    id: 'news-banner',
    field: 'newsBanner',
    title: 'School News & Press Header Banner',
    category: 'Communications',
    description: 'Header banner for school articles, term newsletters, and administrative press releases.',
    recommended: '1920 × 600px (JPG, PNG, WebP)',
    publicRoute: 'news',
    defaultIcon: 'fas fa-newspaper'
  },
  {
    id: 'gallery-banner',
    field: 'galleryBanner',
    title: 'Campus Life Photo Gallery Banner',
    category: 'Campus Media',
    description: 'Top banner on the public photo albums and campus events gallery.',
    recommended: '1920 × 600px (JPG, PNG, WebP)',
    publicRoute: 'gallery',
    defaultIcon: 'fas fa-camera-retro'
  },
  {
    id: 'contact-banner',
    field: 'contactBanner',
    title: 'Contact Us & Campus Visit Banner',
    category: 'Inquiries & Contact',
    description: 'Header banner above physical campus directions and inquiry dispatch forms.',
    recommended: '1920 × 600px (JPG, PNG, WebP)',
    publicRoute: 'contact',
    defaultIcon: 'fas fa-map-marked-alt'
  },
  {
    id: 'noticeboard-banner',
    field: 'noticeboardBanner',
    title: 'Digital Public Noticeboard Banner',
    category: 'Announcements',
    description: 'Header banner for public announcements, term dates, and exam timetables.',
    recommended: '1920 × 600px (JPG, PNG, WebP)',
    publicRoute: 'noticeboard',
    defaultIcon: 'fas fa-clipboard-list'
  }
];

export default function SystemPublicImagesConfig() {
  const { user } = useAuth();
  const { showToast, toastConfirm } = useToast();

  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const schoolCode = (user?.schoolCode || '').toLowerCase();

  useEffect(() => {
    fetchWebsiteSettings();
  }, []);

  const fetchWebsiteSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/website-settings');
      setSettings(res.data || {});
    } catch (err) {
      console.error('Failed to load website settings', err);
      showToast('Could not load website media settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getMediaUrl = (filename?: string | null) => {
    if (!filename) return null;
    if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
      return filename;
    }
    const code = user?.schoolCode || 'global';
    return `${api.defaults.baseURL}/api/storage/media/${code}/${filename}`;
  };

  const handleUpload = async (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast('File exceeds 15MB limit. Please upload an optimized image.', 'error');
      e.target.value = '';
      return;
    }

    setUploadingField(field);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Upload media file to backend
      const uploadRes = await api.post('/api/website-settings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const filename = uploadRes.data?.filename;
      if (!filename) throw new Error('No filename returned');

      // 2. Persist field in WebsiteSettings
      await api.put('/api/website-settings', {
        [field]: filename
      });

      // 3. Update local state
      setSettings(prev => ({
        ...prev,
        [field]: filename
      }));

      showToast(`Image uploaded and published successfully!`, 'success');
    } catch (err: any) {
      console.error('Upload error:', err);
      showToast(err.response?.data?.error || 'Failed to upload image', 'error');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const handleRemove = async (field: string, title: string) => {
    if (!(await toastConfirm(`Are you sure you want to remove the custom image for "${title}" and restore the default system banner?`))) {
      return;
    }

    try {
      await api.put('/api/website-settings', {
        [field]: null
      });
      setSettings(prev => ({
        ...prev,
        [field]: null
      }));
      showToast(`Restored default banner for ${title}`, 'info');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to remove image', 'error');
    }
  };

  const categories = ['all', ...Array.from(new Set(PUBLIC_BANNERS.map(b => b.category)))];

  const filteredBanners = filterCategory === 'all'
    ? PUBLIC_BANNERS
    : PUBLIC_BANNERS.filter(b => b.category === filterCategory);

  if (loading) {
    return (
      <div className="portal-card" style={{ background: '#fff', borderRadius: 10, padding: 32, textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#4f46e5', marginBottom: 12 }} />
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading public website banners and showcase media...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview Banner */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              <i className="fas fa-images" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
              Public-Facing Website Images & Banners
            </h2>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Upload and manage custom high-resolution banner photography across your school's public website, admissions portals, and department showcases.
          </p>
        </div>

        {schoolCode && (
          <a
            href={`/school/${schoolCode.toUpperCase()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="portal-btn"
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#1e293b',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none'
            }}
          >
            <i className="fas fa-external-link-alt" style={{ color: '#4f46e5' }} />
            View Public Website
          </a>
        )}
      </div>

      {/* Filter Category Pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              background: filterCategory === cat ? '#4f46e5' : '#f1f5f9',
              color: filterCategory === cat ? '#ffffff' : '#475569',
              fontSize: '0.8rem',
              fontWeight: filterCategory === cat ? 700 : 500,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {cat === 'all' ? 'All Banners & Media' : cat}
          </button>
        ))}
      </div>

      {/* Grid of Banner Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
        {filteredBanners.map(item => {
          const currentFilename = settings[item.field];
          const mediaUrl = getMediaUrl(currentFilename);
          const isUploading = uploadingField === item.field;
          const isPortrait = item.field === 'directorImage';

          const targetUrl = schoolCode
            ? (item.publicRoute ? `/school/${schoolCode.toUpperCase()}/${item.publicRoute}` : `/school/${schoolCode.toUpperCase()}`)
            : null;

          return (
            <div
              key={item.id}
              className="portal-card"
              style={{
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              {/* Media Preview Area */}
              <div
                style={{
                  height: isPortrait ? 220 : 170,
                  background: mediaUrl ? '#0f172a' : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt={item.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: isPortrait ? 'contain' : 'cover',
                      transition: 'transform 0.3s'
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.85)', padding: 16 }}>
                    <i className={`${item.defaultIcon} fa-3x`} style={{ marginBottom: 8, opacity: 0.9 }} />
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Default System Template Active</div>
                  </div>
                )}

                {/* Badge top-right */}
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: mediaUrl ? 'rgba(22, 101, 52, 0.9)' : 'rgba(15, 23, 42, 0.75)',
                      color: '#ffffff',
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    {mediaUrl ? 'Custom Image Live' : 'Default Preset'}
                  </span>
                </div>

                {/* Badge top-left */}
                <div style={{ position: 'absolute', top: 10, left: 10 }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.9)',
                      color: '#1e293b'
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              </div>

              {/* Card Details & Actions */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                    {item.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                  <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-info-circle" />
                    <span>Recommended: {item.recommended}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 14, gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Upload File Input */}
                    <label
                      className="portal-btn-primary"
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#4f46e5',
                        borderColor: '#4f46e5',
                        color: '#fff'
                      }}
                    >
                      <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-upload'}`} />
                      {isUploading ? 'Uploading...' : (mediaUrl ? 'Replace Image' : 'Upload Image')}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={e => handleUpload(item.field, e)}
                        disabled={isUploading}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {/* Remove button if custom media exists */}
                    {mediaUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemove(item.field, item.title)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid #fee2e2',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        title="Reset to default banner"
                      >
                        <i className="fas fa-trash-alt" />
                      </button>
                    )}
                  </div>

                  {/* Public Page Link */}
                  {targetUrl && (
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: '#4f46e5',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      Preview Page <i className="fas fa-external-link-alt" style={{ fontSize: '0.65rem' }} />
                    </a>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
