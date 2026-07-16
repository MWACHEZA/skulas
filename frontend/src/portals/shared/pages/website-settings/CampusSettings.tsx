import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import api from '../../../../lib/api';

interface CampusFormValues {
  campusTitle: string;
  campusContent: string;
  campusImages: string[];
}

export default function CampusSettings() {
  const { register, control, handleSubmit, setValue, watch } = useForm<CampusFormValues>({
    defaultValues: {
      campusImages: ['', '', '', '', ''] // 5 empty slots
    }
  });

  const { fields } = useFieldArray({
    control,
    name: 'campusImages' as never
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploadingMap, setUploadingMap] = useState<{[key: number]: boolean}>({});

  const campusImages = watch('campusImages') || [];

  const handleCampusImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMap(prev => ({ ...prev, [index]: true }));
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/website-settings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setValue(`campusImages.${index}`, res.data.filename);
      toast.success(`Campus image ${index + 1} uploaded successfully!`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload campus image ${index + 1}.`);
    } finally {
      setUploadingMap(prev => ({ ...prev, [index]: false }));
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/website-settings');
      if (res.data) {
        setValue('campusTitle', res.data.campusTitle);
        setValue('campusContent', res.data.campusContent);
        if (res.data.campusImages && res.data.campusImages.length > 0) {
          // pad or slice to 5
          const images = [...res.data.campusImages];
          while (images.length < 5) images.push('');
          setValue('campusImages', images.slice(0, 5));
        }
      }
    } catch (error) {
      console.error(error);
    
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await api.put('/api/website-settings', data);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="portal-card" style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div className="portal-card">
      <div className="portal-card-header">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>School Campus Data</h2>
      </div>

      <div className="portal-card-body" style={{ padding: '24px' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div className="portal-form-group">
              <label className="portal-label" style={{ color: 'var(--portal-primary)' }}>Title <span style={{ color: 'red' }}>*</span></label>
              <input type="text" {...register('campusTitle')} className="portal-input" placeholder="e.g. Students Enjoying Their Lives on MSS." />
            </div>
            
            <div className="portal-form-group">
              <label className="portal-label" style={{ color: 'var(--portal-primary)' }}>Campus content <span style={{ color: 'red' }}>*</span></label>
              <textarea {...register('campusContent')} rows={3} className="portal-input" placeholder="e.g. Helping students to gain skills..."></textarea>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <label className="portal-label" style={{ color: 'var(--portal-primary)', marginBottom: '12px', display: 'block' }}>Student campus images <span style={{ color: 'red' }}>*</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {fields.map((field, index) => (
                <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}>
                    {index + 1}
                  </div>
                  <input type="file" className="portal-input" style={{ flex: 1, padding: '8px' }} onChange={(e) => handleCampusImageUpload(index, e)} />
                  <input type="hidden" {...register(`campusImages.${index}` as const)} />
                  {uploadingMap[index] && <i className="fas fa-spinner fa-spin" style={{ color: 'var(--portal-primary)' }}></i>}
                  {campusImages[index] && !uploadingMap[index] && (
                    <img 
                      src={`${api.defaults.baseURL}/api/storage/media/global/${campusImages[index]}`} 
                      alt={`Campus ${index + 1}`} 
                      style={{ height: '40px', width: '60px', borderRadius: '4px', objectFit: 'cover' }}
                      onError={(e) => {
                        try {
                          const userStr = localStorage.getItem('acadex_user');
                          if (userStr) {
                            const u = JSON.parse(userStr);
                            if (u.schoolCode) {
                              (e.target as HTMLImageElement).src = `${api.defaults.baseURL}/api/storage/media/${u.schoolCode}/${campusImages[index]}`;
                            }
                          }
                        } catch (err) {}
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="submit" disabled={loading} className="portal-btn-primary" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-save"></i> Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
