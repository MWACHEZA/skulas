import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';

export default function Immunization() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [immunizations, setImmunizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]); // For staff to select patients

  const [formData, setFormData] = useState({
    title: '',
    details: '',
    date: new Date().toISOString().substring(0, 10),
    targetUserId: ''
  });

  const isStaff = ['SCHOOL_ADMIN', 'CLINIC', 'TEACHER'].includes(user?.role || '');

  useEffect(() => {
    fetchImmunizations();
    if (isStaff) {
      fetchUsers();
    }
  }, [isStaff]);

  const fetchImmunizations = async () => {
    try {
      const res = await api.get('/api/clinic/immunizations');
      setImmunizations(res.data);
    } catch (err) {
      showToast('Failed to load immunization records', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to load user list:', err);
    
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.details) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/clinic/immunizations', formData);
      showToast('Immunization record saved successfully!', 'success');
      setShowModal(false);
      setFormData({
        title: '',
        details: '',
        date: new Date().toISOString().substring(0, 10),
        targetUserId: ''
      });
      fetchImmunizations();
    } catch (err) {
      showToast('Failed to submit immunization record', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Delete this immunization record?'))) return;
    try {
      await api.delete(`/api/clinic/immunizations/${id}`);
      showToast('Record deleted.', 'success');
      fetchImmunizations();
    } catch (err) {
      showToast('Failed to delete immunization record', 'error');
    
    }
  };

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Immunization Records</h1>
          <p>Keep track of your vaccination history and immunization records.</p>
        </div>
        {isStaff && (
          <button 
            className="portal-btn-primary" 
            onClick={() => setShowModal(true)}
            style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--school-primary, #0056b3)' }}
          >
            <i className="fas fa-plus"></i> ADD IMMUNIZATION
          </button>
        )}
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ background: 'var(--school-primary, #0056b3)', color: 'white' }}>
          <h2 style={{ color: 'white' }}><i className="fas fa-syringe" style={{ marginRight: 8 }}></i>Immunizations</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--school-primary, #0056b3)' }}></i>
              <p style={{ marginTop: 10 }}>Loading records...</p>
            </div>
          ) : immunizations.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
              <i className="fas fa-folder-open fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
              <p>No immunization records found.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    {isStaff && <th>Patient</th>}
                    <th>Vaccine / Immunization</th>
                    <th>Details</th>
                    <th>Date Received</th>
                    {isStaff && <th style={{ textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {immunizations.map(i => (
                    <tr key={i.id}>
                      {isStaff && <td style={{ fontWeight: 600 }}>{i.user?.name || 'Unknown'}</td>}
                      <td style={{ fontWeight: 600 }}>{i.title}</td>
                      <td>{i.details}</td>
                      <td>{new Date(i.date).toLocaleDateString()}</td>
                      {isStaff && (
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="portal-btn-ghost" 
                            style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                            onClick={() => handleDelete(i.id)}
                            title="Delete"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="portal-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="portal-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="portal-modal-header" style={{ background: 'var(--school-primary, #0056b3)', color: 'white' }}>
              <h3 style={{ color: 'white', margin: 0 }}>Add Immunization Record</h3>
              <button className="portal-modal-close" onClick={() => setShowModal(false)} style={{ color: 'white' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="portal-modal-body" style={{ padding: '20px' }}>
                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Patient (User) <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    className="portal-input"
                    value={formData.targetUserId} 
                    onChange={e => setFormData({ ...formData, targetUserId: e.target.value })}
                    required
                  >
                    <option value="">Select Patient</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Vaccine Title <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder="e.g. COVID-19 Booster, Tetanus Shot" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    required 
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Batch / Manufacturer Details <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder="e.g. Pfizer-BioNTech Lot #12345" 
                    value={formData.details}
                    onChange={e => setFormData({...formData, details: e.target.value})}
                    required 
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Date Administered <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="date" 
                    className="portal-input" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    required 
                  />
                </div>
              </div>
              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'var(--school-primary, #0056b3)' }} disabled={saving}>
                  {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} SAVE RECORD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
