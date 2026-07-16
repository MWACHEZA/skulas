import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';

export default function HealthComplaints() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]); // For staff to file complaints for others

  const [formData, setFormData] = useState({
    title: '',
    symptoms: '',
    date: new Date().toISOString().substring(0, 10),
    medicine: '',
    targetUserId: ''
  });

  const isStaff = ['SCHOOL_ADMIN', 'CLINIC', 'TEACHER'].includes(user?.role || '');

  useEffect(() => {
    fetchComplaints();
    if (isStaff) {
      fetchUsers();
    }
  }, [isStaff]);

  const fetchComplaints = async () => {
    try {
      const res = await api.get('/api/clinic/complaints');
      setComplaints(res.data);
    } catch (err) {
      showToast('Failed to load health complaints', 'error');
    
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
    if (!formData.title || !formData.symptoms) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/clinic/complaints', formData);
      showToast('Health complaint submitted successfully!', 'success');
      setShowModal(false);
      setFormData({
        title: '',
        symptoms: '',
        date: new Date().toISOString().substring(0, 10),
        medicine: '',
        targetUserId: ''
      });
      fetchComplaints();
    } catch (err) {
      showToast('Failed to submit health complaint', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this health complaint?')) return;
    try {
      await api.delete(`/api/clinic/complaints/${id}`);
      showToast('Complaint removed.', 'success');
      fetchComplaints();
    } catch (err) {
      showToast('Failed to delete complaint', 'error');
    
    }
  };

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Health Complaints</h1>
          <p>Report and track your medical complaints.</p>
        </div>
        <button 
          className="portal-btn-primary" 
          onClick={() => setShowModal(true)}
          style={{ background: 'var(--school-primary, #0056b3)' }}
        >
          <i className="fas fa-plus mr-2"></i>Add Complaint
        </button>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ background: 'var(--school-primary, #0056b3)', color: 'white' }}>
          <h2 style={{ color: 'white' }}><i className="fas fa-list" style={{ marginRight: 8 }}></i>Health Complaints Log</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--school-primary, #0056b3)' }}></i>
              <p style={{ marginTop: 10 }}>Loading records...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
              <i className="fas fa-folder-open fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
              <p>No complaints found.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    {isStaff && <th>Patient</th>}
                    <th>Title</th>
                    <th>Symptoms</th>
                    <th>Date Noticed</th>
                    <th>Medicine Taken</th>
                    <th style={{ textAlign: 'center' }}>Options</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id}>
                      {isStaff && <td style={{ fontWeight: 600 }}>{c.user?.name || 'Unknown'} ({c.user?.role})</td>}
                      <td style={{ fontWeight: 600 }}>{c.title}</td>
                      <td>{c.symptoms}</td>
                      <td>{new Date(c.date).toLocaleDateString()}</td>
                      <td>{c.medicine || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="portal-btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--portal-danger)', borderColor: '#feb2b2' }} 
                          onClick={() => handleDelete(c.id)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
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
              <h3 style={{ color: 'white', margin: 0 }}>Report Health Complaint</h3>
              <button className="portal-modal-close" onClick={() => setShowModal(false)} style={{ color: 'white' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="portal-modal-body" style={{ padding: '20px' }}>
                {isStaff && (
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
                )}

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Complaint Title <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder="e.g. Headache, Fever, Stomach ache" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    required 
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Symptoms <span style={{ color: 'red' }}>*</span></label>
                  <textarea 
                    className="portal-input" 
                    placeholder="Describe in detail how you are feeling..." 
                    rows={4}
                    value={formData.symptoms}
                    onChange={e => setFormData({...formData, symptoms: e.target.value})}
                    required 
                  ></textarea>
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Date symptoms noticed <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="date" 
                    className="portal-input" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    required 
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Medicine Taken</label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder="e.g. Paracetamol, Ibuprofen (leave empty if none)" 
                    value={formData.medicine}
                    onChange={e => setFormData({...formData, medicine: e.target.value})}
                  />
                </div>
              </div>
              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)' }} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
