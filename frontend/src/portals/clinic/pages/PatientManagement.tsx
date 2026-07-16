import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

interface PatientHistory {
  appointments: any[];
  complaints: any[];
  immunizations: any[];
  referrals: any[];
}

export default function PatientManagement() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Selected Patient Details & History Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [history, setHistory] = useState<PatientHistory>({
    appointments: [],
    complaints: [],
    immunizations: [],
    referrals: []
  });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Add Medical Record Modal
  const [showAddRecordModal, setShowAddRecordModal] = useState<any | null>(null); // holds user object
  const [recordType, setRecordType] = useState<'COMPLAINT' | 'APPOINTMENT' | 'IMMUNIZATION' | 'REFERRAL'>('COMPLAINT');
  const [submitting, setSubmitting] = useState(false);

  // Forms State
  const [complaintForm, setComplaintForm] = useState({ title: '', symptoms: '', medicine: '', date: new Date().toISOString().split('T')[0] });
  const [appointmentForm, setAppointmentForm] = useState({ appointment: '', symptoms: '', medicine: '', date: new Date().toISOString().slice(0, 16) });
  const [immunizationForm, setImmunizationForm] = useState({ title: '', details: '', date: new Date().toISOString().split('T')[0] });
  const [referralForm, setReferralForm] = useState({ title: '', details: '', to: '', address: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users');
      setUsers(res.data || []);
    } catch (err) {
      showToast('Failed to load patient database', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientHistory = async (targetUser: any) => {
    setSelectedUser(targetUser);
    setLoadingHistory(true);
    try {
      const [compRes, appRes, immRes, refRes] = await Promise.all([
        api.get('/api/clinic/complaints'),
        api.get('/api/clinic/appointments'),
        api.get('/api/clinic/immunizations'),
        api.get('/api/clinic/referrals')
      ]);

      // Filter each record type by the patient's userId
      const userId = targetUser.id;
      setHistory({
        complaints: (compRes.data || []).filter((x: any) => x.userId === userId),
        appointments: (appRes.data || []).filter((x: any) => x.userId === userId),
        immunizations: (immRes.data || []).filter((x: any) => x.userId === userId),
        referrals: (refRes.data || []).filter((x: any) => x.userId === userId)
      });
    } catch (err) {
      showToast('Failed to retrieve patient medical history', 'error');
    
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddRecordModal) return;
    setSubmitting(true);

    try {
      const targetUserId = showAddRecordModal.id;
      if (recordType === 'COMPLAINT') {
        if (!complaintForm.title || !complaintForm.symptoms) {
          showToast('Please specify complaint title and symptoms', 'warning');
          setSubmitting(false);
          return;
        }
        await api.post('/api/clinic/complaints', { ...complaintForm, targetUserId });
        showToast('Complaint registered successfully', 'success');
        setComplaintForm({ title: '', symptoms: '', medicine: '', date: new Date().toISOString().split('T')[0] });
      } else if (recordType === 'APPOINTMENT') {
        if (!appointmentForm.appointment || !appointmentForm.date) {
          showToast('Please specify appointment reason and schedule date', 'warning');
          setSubmitting(false);
          return;
        }
        await api.post('/api/clinic/appointments', { ...appointmentForm, targetUserId });
        showToast('Appointment booked successfully', 'success');
      } else if (recordType === 'IMMUNIZATION') {
        if (!immunizationForm.title) {
          showToast('Please specify vaccine title', 'warning');
          setSubmitting(false);
          return;
        }
        await api.post('/api/clinic/immunizations', { ...immunizationForm, targetUserId });
        showToast('Immunization record added', 'success');
        setImmunizationForm({ title: '', details: '', date: new Date().toISOString().split('T')[0] });
      } else if (recordType === 'REFERRAL') {
        if (!referralForm.title || !referralForm.to) {
          showToast('Please specify referral reason and hospital name', 'warning');
          setSubmitting(false);
          return;
        }
        await api.post('/api/clinic/referrals', { ...referralForm, targetUserId });
        showToast('Referral created successfully', 'success');
        setReferralForm({ title: '', details: '', to: '', address: '', date: new Date().toISOString().split('T')[0] });
      }

      setShowAddRecordModal(null);
      if (selectedUser && selectedUser.id === targetUserId) {
        fetchPatientHistory(selectedUser);
      }
    } catch (err) {
      showToast('Failed to save medical record', 'error');
    
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.staffId && u.staffId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <>
      <div className="portal-page-header">
        <h1>Patient Management</h1>
        <p>Manage all student and staff medical records dynamically.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
          <h2><i className="fas fa-users" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Patient Database</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select className="portal-input" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ minWidth: 150 }}>
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="TEACHER">Teachers</option>
              <option value="ANCILLARY">Ancillary Staff</option>
              <option value="BURSAR">Bursars</option>
              <option value="LIBRARIAN">Librarians</option>
              <option value="SCHOOL_ADMIN">Admins</option>
            </select>
            <input 
              type="text" 
              className="portal-input" 
              placeholder="Search by name, email, ID..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ minWidth: 220 }} 
            />
          </div>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin mr-2"></i> Loading patients...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              No matching records found.
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>ID / Code</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td><span className={`portal-badge ${u.role === 'STUDENT' ? 'success' : 'info'}`}>{u.role}</span></td>
                    <td>{u.staffId || u.student?.studentId || 'N/A'}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || 'N/A'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="portal-btn-secondary" 
                        onClick={() => fetchPatientHistory(u)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', marginRight: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <i className="fas fa-eye" style={{ color: 'var(--school-primary, #0056b3)' }}></i> History
                      </button>
                      <button 
                        className="portal-btn-primary" 
                        onClick={() => setShowAddRecordModal(u)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--portal-success)', borderColor: 'var(--portal-success)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <i className="fas fa-plus"></i> Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Patient Medical History Drawer / Modal */}
      {selectedUser && (
        <div className="portal-modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, padding: 20 }}>
          <div className="portal-modal-content" style={{ background: 'white', borderRadius: 16, maxWidth: 800, width: '100%', padding: '30px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
            <button 
              onClick={() => setSelectedUser(null)} 
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}
            >
              <i className="fas fa-times"></i>
            </button>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-notes-medical" style={{ color: 'var(--portal-success)', marginRight: 8 }}></i>
              Medical File: {selectedUser.name}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 24 }}>Role: {selectedUser.role} | ID: {selectedUser.staffId || selectedUser.student?.studentId || 'N/A'}</p>

            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin mr-2"></i> Fetching records...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Complaints */}
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '2px solid #ef4444', paddingBottom: 6, color: 'var(--portal-danger)', marginBottom: 12 }}>
                    <i className="fas fa-heartbeat mr-2"></i> Complaints & Diagnoses
                  </h3>
                  {history.complaints.length === 0 ? (
                    <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#94a3b8' }}>No recorded complaints.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {history.complaints.map(c => (
                        <div key={c.id} style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem' }}>
                            <span>{c.title}</span>
                            <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>{new Date(c.date).toLocaleDateString()}</span>
                          </div>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#4b5563' }}><strong>Symptoms:</strong> {c.symptoms}</p>
                          {c.medicine && <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#059669' }}><strong>Rx:</strong> {c.medicine}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Appointments */}
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '2px solid #3b82f6', paddingBottom: 6, color: '#3b82f6', marginBottom: 12 }}>
                    <i className="fas fa-calendar-check mr-2"></i> Clinic Appointments
                  </h3>
                  {history.appointments.length === 0 ? (
                    <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#94a3b8' }}>No recorded appointments.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {history.appointments.map(a => (
                        <div key={a.id} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem' }}>
                            <span>Reason: {a.appointment}</span>
                            <span style={{ fontSize: '0.8rem', color: '#2563eb' }}>{new Date(a.date).toLocaleString()}</span>
                          </div>
                          {a.symptoms && <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#4b5563' }}><strong>Symptoms:</strong> {a.symptoms}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Immunizations */}
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '2px solid #10b981', paddingBottom: 6, color: '#10b981', marginBottom: 12 }}>
                    <i className="fas fa-syringe mr-2"></i> Immunization History
                  </h3>
                  {history.immunizations.length === 0 ? (
                    <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#94a3b8' }}>No recorded immunizations.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {history.immunizations.map(i => (
                        <div key={i.id} style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem' }}>
                            <span>{i.title}</span>
                            <span style={{ fontSize: '0.8rem', color: '#059669' }}>{new Date(i.date).toLocaleDateString()}</span>
                          </div>
                          {i.details && <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#4b5563' }}>{i.details}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Referrals */}
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '2px solid #8b5cf6', paddingBottom: 6, color: '#8b5cf6', marginBottom: 12 }}>
                    <i className="fas fa-file-medical mr-2"></i> Referrals
                  </h3>
                  {history.referrals.length === 0 ? (
                    <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#94a3b8' }}>No recorded referrals.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {history.referrals.map(r => (
                        <div key={r.id} style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem' }}>
                            <span>Referred to: {r.to}</span>
                            <span style={{ fontSize: '0.8rem', color: '#7c3aed' }}>{new Date(r.date).toLocaleDateString()}</span>
                          </div>
                          <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#4b5563' }}><strong>Reason:</strong> {r.title}</p>
                          {r.details && <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6d28d9' }}><strong>Details:</strong> {r.details}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Medical Record Popup Modal */}
      {showAddRecordModal && (
        <div className="portal-modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, padding: 20 }}>
          <div className="portal-modal-content" style={{ background: 'white', borderRadius: 16, maxWidth: 540, width: '100%', padding: '30px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
            <button 
              onClick={() => setShowAddRecordModal(null)} 
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}
            >
              <i className="fas fa-times"></i>
            </button>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
              Add Medical Record
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 20 }}>Registering clinical note for patient: {showAddRecordModal.name}</p>

            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
              {(['COMPLAINT', 'APPOINTMENT', 'IMMUNIZATION', 'REFERRAL'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setRecordType(type)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '10px 0',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: recordType === type ? 'var(--portal-success)' : '#64748b',
                    borderBottom: recordType === type ? '3px solid #38a169' : '3px solid transparent',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            <form onSubmit={handleAddRecordSubmit}>
              {recordType === 'COMPLAINT' && (
                <>
                  <div className="portal-form-group">
                    <label className="portal-label">Complaint Title *</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      placeholder="e.g. Flu, Stomach Ache"
                      value={complaintForm.title}
                      onChange={e => setComplaintForm({ ...complaintForm, title: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">Symptoms *</label>
                    <textarea 
                      className="portal-input" 
                      rows={3} 
                      placeholder="Describe symptoms..."
                      value={complaintForm.symptoms}
                      onChange={e => setComplaintForm({ ...complaintForm, symptoms: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">Prescription (Medicine)</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      placeholder="Prescribed medicine..."
                      value={complaintForm.medicine}
                      onChange={e => setComplaintForm({ ...complaintForm, medicine: e.target.value })}
                    />
                  </div>
                </>
              )}

              {recordType === 'APPOINTMENT' && (
                <>
                  <div className="portal-form-group">
                    <label className="portal-label">Appointment Title / Purpose *</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      placeholder="e.g. Regular Checkup, Dental check"
                      value={appointmentForm.appointment}
                      onChange={e => setAppointmentForm({ ...appointmentForm, appointment: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">Symptoms / Notes</label>
                    <textarea 
                      className="portal-input" 
                      rows={2} 
                      placeholder="Note down complaints..."
                      value={appointmentForm.symptoms}
                      onChange={e => setAppointmentForm({ ...appointmentForm, symptoms: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">Schedule Date & Time *</label>
                    <input 
                      type="datetime-local" 
                      className="portal-input"
                      value={appointmentForm.date}
                      onChange={e => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                      required 
                    />
                  </div>
                </>
              )}

              {recordType === 'IMMUNIZATION' && (
                <>
                  <div className="portal-form-group">
                    <label className="portal-label">Vaccine Title *</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      placeholder="e.g. BCG, Tetanus, COVID-19"
                      value={immunizationForm.title}
                      onChange={e => setImmunizationForm({ ...immunizationForm, title: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">Immunization details</label>
                    <textarea 
                      className="portal-input" 
                      rows={3} 
                      placeholder="Dosage, batch, remarks..."
                      value={immunizationForm.details}
                      onChange={e => setImmunizationForm({ ...immunizationForm, details: e.target.value })}
                    ></textarea>
                  </div>
                </>
              )}

              {recordType === 'REFERRAL' && (
                <>
                  <div className="portal-form-group">
                    <label className="portal-label">Reason for Referral *</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      placeholder="e.g. Secondary Specialist consult"
                      value={referralForm.title}
                      onChange={e => setReferralForm({ ...referralForm, title: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">Referral Target Hospital / Specialist *</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      placeholder="Hospital Name"
                      value={referralForm.to}
                      onChange={e => setReferralForm({ ...referralForm, to: e.target.value })}
                      required 
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">Hospital Address</label>
                    <input 
                      type="text" 
                      className="portal-input" 
                      placeholder="Hospital address details..."
                      value={referralForm.address}
                      onChange={e => setReferralForm({ ...referralForm, address: e.target.value })}
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label">Clinical Details / Diagnostic Summary</label>
                    <textarea 
                      className="portal-input" 
                      rows={2} 
                      placeholder="Patient medical details to pass along..."
                      value={referralForm.details}
                      onChange={e => setReferralForm({ ...referralForm, details: e.target.value })}
                    ></textarea>
                  </div>
                </>
              )}

              <button 
                type="submit" 
                className="portal-btn-primary" 
                style={{ width: '100%', background: 'var(--portal-success)', borderColor: 'var(--portal-success)', marginTop: 10 }}
                disabled={submitting}
              >
                {submitting ? 'Registering...' : 'Save Medical Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
