import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';

export default function Referrals() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]); // For staff to select patients

  const [formData, setFormData] = useState({
    title: '',
    details: '',
    date: new Date().toISOString().substring(0, 10),
    to: '',
    address: '',
    targetUserId: ''
  });

  const isNurseOrHealthCoordinator = user?.role === 'SCHOOL_ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'CLINIC' ||
    user?.secondaryRoles?.some(r => 
      r.toLowerCase() === 'nurse' || 
      r.toLowerCase() === 'health coordinator' || 
      r.toLowerCase() === 'health co-ordinator'
    );

  useEffect(() => {
    fetchReferrals();
    if (isNurseOrHealthCoordinator) {
      fetchUsers();
    }
  }, [isNurseOrHealthCoordinator]);

  const fetchReferrals = async () => {
    try {
      const res = await api.get('/api/clinic/referrals');
      setReferrals(res.data);
    } catch (err) {
      showToast('Failed to load referrals list', 'error');
    
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
    if (!formData.title || !formData.to || !formData.address) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/clinic/referrals', formData);
      showToast('Referral created successfully!', 'success');
      setShowModal(false);
      setFormData({
        title: '',
        details: '',
        date: new Date().toISOString().substring(0, 10),
        to: '',
        address: '',
        targetUserId: ''
      });
      fetchReferrals();
    } catch (err) {
      showToast('Failed to save referral record', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this referral record?')) return;
    try {
      await api.delete(`/api/clinic/referrals/${id}`);
      showToast('Referral deleted.', 'success');
      fetchReferrals();
    } catch (err) {
      showToast('Failed to delete referral', 'error');
    
    }
  };

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Medical Referrals</h1>
          <p>Track external medical referrals made by the school clinic.</p>
        </div>
        {isNurseOrHealthCoordinator && (
          <button 
            className="portal-btn-primary" 
            onClick={() => setShowModal(true)}
            style={{ background: 'var(--school-primary, #0056b3)' }}
          >
            <i className="fas fa-plus mr-2"></i>Create Referral
          </button>
        )}
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ background: 'var(--school-primary, #0056b3)', color: 'white' }}>
          <h2 style={{ color: 'white' }}><i className="fas fa-file-medical" style={{ marginRight: 8 }}></i>Referrals Log</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--school-primary, #0056b3)' }}></i>
              <p style={{ marginTop: 10 }}>Loading records...</p>
            </div>
          ) : referrals.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
              <i className="fas fa-folder-open fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
              <p>No referrals found.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    {isNurseOrHealthCoordinator && <th>Patient</th>}
                    <th>Title</th>
                    <th>Details</th>
                    <th>Date</th>
                    <th>Referred To</th>
                    <th>Destination Facility</th>
                    {isNurseOrHealthCoordinator && <th style={{ textAlign: 'center' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(r => (
                    <tr key={r.id}>
                      {isNurseOrHealthCoordinator && <td style={{ fontWeight: 600 }}>{r.user?.name || 'Unknown'}</td>}
                      <td style={{ fontWeight: 600 }}>{r.title}</td>
                      <td>{r.details}</td>
                      <td>{new Date(r.date).toLocaleDateString()}</td>
                      <td style={{ color: 'var(--school-primary, #0056b3)', fontWeight: 600 }}>{r.to}</td>
                      <td>{r.address}</td>
                      {isNurseOrHealthCoordinator && (
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="portal-btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--portal-danger)', borderColor: '#feb2b2' }} 
                            onClick={() => handleDelete(r.id)}
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
              <h3 style={{ color: 'white', margin: 0 }}>Create Referral Record</h3>
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
                  <label className="portal-label">Referral Title <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder="e.g. Eye Test, Cardiology Check" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    required 
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Referred Doctor / Consultant <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder="e.g. Dr. Chibvuri" 
                    value={formData.to}
                    onChange={e => setFormData({...formData, to: e.target.value})}
                    required 
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Destination Facility / Hospital <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    placeholder="e.g. Borrowdale Clinic" 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    required 
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Date of Referral <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="date" 
                    className="portal-input" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    required 
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Reason / Clinical Details</label>
                  <textarea 
                    className="portal-input" 
                    placeholder="Provide details about why the patient is being referred..." 
                    rows={3}
                    value={formData.details}
                    onChange={e => setFormData({...formData, details: e.target.value})}
                  ></textarea>
                </div>
              </div>
              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)' }} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
