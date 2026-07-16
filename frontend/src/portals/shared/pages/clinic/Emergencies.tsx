import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';

export default function Emergencies() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    details: '',
    date: new Date().toISOString().substring(0, 10),
    time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  });

  const isStaff = user?.role && !['STUDENT', 'PARENT', 'ALUMNI', 'SUPPLIER'].includes(user.role);

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const fetchEmergencies = async () => {
    try {
      const res = await api.get('/api/clinic/emergencies');
      setEmergencies(res.data);
    } catch (err) {
      showToast('Failed to load emergencies list', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.details) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/clinic/emergencies', formData);
      showToast('Emergency recorded successfully', 'success');
      setShowModal(false);
      setFormData({
        title: '',
        details: '',
        date: new Date().toISOString().substring(0, 10),
        time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
      });
      fetchEmergencies();
    } catch (err) {
      showToast('Failed to save emergency report', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Delete this emergency record?'))) return;
    try {
      await api.delete(`/api/clinic/emergencies/${id}`);
      showToast('Record deleted successfully', 'success');
      fetchEmergencies();
    } catch (err) {
      showToast('Failed to delete emergency record', 'error');
    
    }
  };

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Medical Emergencies</h1>
          <p>Log of medical emergencies and incident reports.</p>
        </div>
        {isStaff && (
          <button 
            className="portal-btn-primary" 
            onClick={() => setShowModal(true)}
            style={{ background: 'var(--school-primary, #0056b3)' }}
          >
            <i className="fas fa-ambulance mr-2"></i>Report Emergency
          </button>
        )}
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ background: 'var(--school-primary, #0056b3)', color: 'white' }}>
          <h2 style={{ color: 'white' }}><i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }}></i>Recent Emergencies</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--school-primary, #0056b3)' }}></i>
              <p style={{ marginTop: 10 }}>Loading records...</p>
            </div>
          ) : emergencies.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
              <i className="fas fa-folder-open fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
              <p>No emergencies recorded.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Details</th>
                    <th>Date</th>
                    <th>Time</th>
                    {isStaff && <th style={{ textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {emergencies.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.title}</td>
                      <td>{e.details}</td>
                      <td>{new Date(e.date).toLocaleDateString()}</td>
                      <td>{e.time}</td>
                      {isStaff && (
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            onClick={() => handleDelete(e.id)}
                            className="portal-btn-secondary" 
                            style={{ padding: '4px 8px', color: 'var(--portal-danger)', borderColor: '#feb2b2' }}
                            title="Delete Record"
                          >
                            <i className="fas fa-trash-alt"></i>
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
              <h3 style={{ color: 'white', margin: 0 }}>Report Medical Emergency</h3>
              <button className="portal-modal-close" onClick={() => setShowModal(false)} style={{ color: 'white' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="portal-modal-body" style={{ padding: '20px' }}>
                <div className="form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Emergency Title *</label>
                  <input 
                    type="text" className="portal-input"
                    placeholder="e.g. Asthma Attack, Sports Injury"
                    value={formData.title} 
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: 15 }}>
                  <div className="form-group">
                    <label className="portal-label">Date</label>
                    <input 
                      type="date" className="portal-input"
                      value={formData.date} 
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Time</label>
                    <input 
                      type="text" className="portal-input" placeholder="e.g. 14:30"
                      value={formData.time} 
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Incident Details / Actions Taken *</label>
                  <textarea 
                    className="portal-input" style={{ height: '100px', resize: 'none' }}
                    placeholder="Describe what happened and immediate care actions taken..."
                    value={formData.details} 
                    onChange={e => setFormData({ ...formData, details: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)' }} disabled={saving}>
                  {saving ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
