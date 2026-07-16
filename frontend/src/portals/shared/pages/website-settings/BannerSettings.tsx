import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import api from '../../../../lib/api';
import { useAuth } from '../../../../contexts/AuthContext';

interface BannerFormValues {
  bannerTitle: string;
  bannerSubTitleOne: string;
  bannerSubTitleTwo: string;
  bannerSubContentTwo: string;
  bannerSubTitleThree: string;
  bannerSubContentThree: string;
  applyTitle: string;
  applyContent: string;
  bannerTitleColor: string;
  schoolPrimaryColor: string;
  bannerImage: string;

  // Branding fields
  primaryColor: string;
  accentColor: string;
  motto: string;
  favicon: string;
}

export default function BannerSettings() {
  const { user, refreshUser } = useAuth();
  const { register, handleSubmit, setValue, watch } = useForm<BannerFormValues>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Logo upload state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const bannerImage = watch('bannerImage');
  const favicon = watch('favicon');

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const [webSettingsRes, schoolSettingsRes] = await Promise.all([
        api.get('/api/website-settings'),
        api.get('/api/schools/settings')
      ]);

      if (webSettingsRes.data) {
        Object.keys(webSettingsRes.data).forEach(key => {
          setValue(key as any, webSettingsRes.data[key]);
        });
      }

      if (user?.schoolBranding) {
        const branding = user.schoolBranding as any;
        setValue('primaryColor', branding.primaryColor || 'var(--portal-primary)');
        setValue('accentColor', branding.accentColor || '#d1410c');
        setValue('motto', branding.motto || '');
        if (branding.logo) {
          setLogoPreview(`${api.defaults.baseURL}/api/storage/media/${user.schoolCode}/${branding.logo}`);
        }
      }

      if (schoolSettingsRes.data) {
        setValue('favicon', schoolSettingsRes.data.favicon);
      }
    } catch (error) {
      console.error('Failed to load settings data', error);
    
    } finally {
      setFetching(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/website-settings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setValue('bannerImage', res.data.filename);
      toast.success('Banner image uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload banner image.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('favicon', file);
    try {
      toast.loading('Uploading favicon...', { id: 'favicon-upload' });
      const res = await api.patch('/api/schools/favicon', formData);
      setValue('favicon', res.data.favicon);
      toast.success('Favicon updated successfully', { id: 'favicon-upload' });
    } catch (err) {
      toast.error('Favicon upload failed', { id: 'favicon-upload' });
    }
  };

  const onSubmit = async (data: BannerFormValues) => {
    setLoading(true);
    try {
      // 1. Save banner/website settings
      const websiteData = {
        bannerTitle: data.bannerTitle,
        bannerSubTitleOne: data.bannerSubTitleOne,
        bannerSubTitleTwo: data.bannerSubTitleTwo,
        bannerSubContentTwo: data.bannerSubContentTwo,
        bannerSubTitleThree: data.bannerSubTitleThree,
        bannerSubContentThree: data.bannerSubContentThree,
        applyTitle: data.applyTitle,
        applyContent: data.applyContent,
        bannerTitleColor: data.bannerTitleColor,
        schoolPrimaryColor: data.primaryColor || data.schoolPrimaryColor,
        bannerImage: data.bannerImage
      };
      await api.put('/api/website-settings', websiteData);

      // 2. Save branding details
      const fd = new FormData();
      fd.append('primaryColor', data.primaryColor);
      fd.append('accentColor', data.accentColor);
      fd.append('motto', data.motto);
      if (logoFile) {
        fd.append('logo', logoFile);
      }
      await api.patch('/api/schools/branding', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await refreshUser();
      toast.success('Banner & Branding settings saved successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  return (
    <div className="portal-card">
      <div className="portal-card-header">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Banner & Branding Settings</h2>
      </div>

      <div className="portal-card-body" style={{ padding: '24px' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          
          {/* Banner Settings Section */}
          <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>Banner Customization</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="portal-form-group">
              <label className="portal-label">Banner Title <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('bannerTitle')} className="portal-input" placeholder="e.g. Build Your Dream with Eduman" />
            </div>
            
            <div className="portal-form-group">
              <label className="portal-label">Banner Sub-title One <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('bannerSubTitleOne')} className="portal-input" placeholder="e.g. College" />
            </div>

            <div className="portal-form-group">
              <label className="portal-label">Banner Sub Title Two <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('bannerSubTitleTwo')} className="portal-input" placeholder="e.g. College" />
            </div>

            <div className="portal-form-group">
              <label className="portal-label">Banner Sub Content Two <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('bannerSubContentTwo')} className="portal-input" placeholder="e.g. Higher education is designed for..." />
            </div>

            <div className="portal-form-group">
              <label className="portal-label">Banner Sub Title Three <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('bannerSubTitleThree')} className="portal-input" placeholder="e.g. College" />
            </div>

            <div className="portal-form-group">
              <label className="portal-label">Banner Sub Content Three <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('bannerSubContentThree')} className="portal-input" placeholder="e.g. Higher education is designed for..." />
            </div>

            <div className="portal-form-group">
              <label className="portal-label">Apply Title <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('applyTitle')} className="portal-input" placeholder="e.g. Discover yourself" />
            </div>

            <div className="portal-form-group">
              <label className="portal-label">Apply Content <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('applyContent')} className="portal-input" placeholder="e.g. Earn Your Result From" />
            </div>
            
            <div className="portal-form-group">
              <label className="portal-label">Banner Title Color <span style={{ color: 'red' }}>*</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="color" {...register('bannerTitleColor')} style={{ width: '45px', height: '45px', padding: 0, border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }} />
                <input type="text" {...register('bannerTitleColor')} className="portal-input" style={{ flex: 1 }} placeholder="#ffffff" />
              </div>
            </div>

            <div className="portal-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="portal-label">Banner Image <span style={{ color: 'red' }}>*</span></label>
              <input type="file" className="portal-input" style={{ padding: '8px' }} onChange={handleImageUpload} />
              <input type="hidden" {...register('bannerImage')} />
              {uploading && <p style={{ fontSize: '0.8rem', color: 'var(--school-primary, #3182ce)', marginTop: '6px' }}><i className="fas fa-spinner fa-spin mr-1"></i> Uploading image...</p>}
              {bannerImage && !uploading && (
                <div style={{ marginTop: '10px' }}>
                  <img 
                    src={`${api.defaults.baseURL}/api/storage/media/global/${bannerImage}`}
                    alt="Banner Preview" 
                    style={{ maxHeight: '150px', borderRadius: '8px', border: '1px solid #cbd5e1', objectFit: 'cover' }}
                    onError={(e) => {
                      try {
                        const userStr = localStorage.getItem('acadex_user');
                        if (userStr) {
                          const u = JSON.parse(userStr);
                          if (u.schoolCode) {
                            (e.target as HTMLImageElement).src = `${api.defaults.baseURL}/api/storage/media/${u.schoolCode}/${bannerImage}`;
                          }
                        }
                      } catch (err) {}
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Branding Section */}
          <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>Branding Logos & Colors</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            
            {/* Logo Upload */}
            <div className="portal-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="portal-label">School Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div
                  onClick={() => logoRef.current?.click()}
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '12px',
                    border: '2px dashed #cbd5e1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: '#f8fafc'
                  }}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '8px' }}>
                      <i className="fas fa-image" style={{ fontSize: '1.5rem', marginBottom: '4px' }}></i>
                      <div style={{ fontSize: '10px', fontWeight: 600 }}>Upload Logo</div>
                    </div>
                  )}
                </div>
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                <div>
                  <button type="button" onClick={() => logoRef.current?.click()} className="portal-btn-ghost" style={{ padding: '8px 16px', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <i className="fas fa-upload mr-2"></i> Choose Image
                  </button>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>PNG or JPG. Max 5MB.</p>
                </div>
              </div>
            </div>

            {/* Motto */}
            <div className="portal-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="portal-label">School Motto</label>
              <input type="text" className="portal-input" {...register('motto')} placeholder="e.g. Excellence in All Things" />
            </div>

            {/* Primary Color */}
            <div className="portal-form-group">
              <label className="portal-label">Primary Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="color" {...register('primaryColor')} style={{ width: '42px', height: '42px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', padding: 0 }} />
                <input type="text" className="portal-input" {...register('primaryColor')} placeholder='var(--portal-primary)' />
              </div>
            </div>

            {/* Accent Color */}
            <div className="portal-form-group">
              <label className="portal-label">Accent Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="color" {...register('accentColor')} style={{ width: '42px', height: '42px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', padding: 0 }} />
                <input type="text" className="portal-input" {...register('accentColor')} placeholder="#d1410c" />
              </div>
            </div>

            {/* Favicon Upload */}
            <div className="portal-form-group">
              <label className="portal-label">Favicon Branding</label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                {favicon && (
                  <img 
                    src={`${api.defaults.baseURL}/api/storage/media/${user?.schoolCode}/${favicon}`} 
                    alt="Favicon" 
                    style={{ width: '40px', height: '40px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px', background: '#fff' }} 
                  />
                )}
                <input type="file" accept="image/*" onChange={handleFaviconUpload} style={{ fontSize: '0.85rem' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="submit" disabled={loading || uploading} className="portal-btn-primary" style={{ padding: '12px 24px' }}>
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
