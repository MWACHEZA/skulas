import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import api from '../../../../lib/api';

interface AdmissionFormValues {
  admissionProcedure: string;
}

export default function AdmissionSettings() {
  const { register, handleSubmit, setValue } = useForm<AdmissionFormValues>();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/api/website-settings');
        if (response.data) {
          setValue('admissionProcedure', response.data.admissionProcedure || '');
        }
      } catch (error) {
        console.error('Error fetching settings', error);
      
    }
    };
    fetchSettings();
  }, [setValue]);

  const onSubmit = async (data: AdmissionFormValues) => {
    try {
      await api.put('/api/website-settings', data);
      toast.success('Admission Procedure updated successfully!');
    } catch (error) {
      console.error('Error saving settings', error);
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="portal-card">
      <div className="portal-card-header">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-file-alt text-[#2196F3]"></i>
          Admission Procedure
        </h3>
      </div>

      <div className="portal-card-body" style={{ padding: '24px' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="portal-form-group">
            <label className="portal-label">Procedure Content</label>
            <textarea
              {...register('admissionProcedure')}
              rows={15}
              placeholder="Enter admission procedure details here..."
              className="portal-input"
            ></textarea>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
              This content will be displayed on the public website's admission page.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              type="submit"
              className="portal-btn-primary"
              style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fas fa-save"></i>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
