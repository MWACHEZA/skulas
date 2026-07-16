import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';
import '../../../../styles/portal.css';

export default function Appointments() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [printNoteAppointment, setPrintNoteAppointment] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]); // For staff to select patients
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [templateConfig, setTemplateConfig] = useState<any>({});

  const CONSULTATION_BUILTIN = [
    { id: 'medical-classic', name: 'Medical Classic', color: '#1e40af', accent: '#eff6ff', icon: 'fa-stethoscope' },
    { id: 'modern-health',   name: 'Modern Health',   color: '#059669', accent: '#ecfdf5', icon: 'fa-heartbeat' },
    { id: 'clean-clinical',  name: 'Clean Clinical',  color: '#374151', accent: '#f3f4f6', icon: 'fa-notes-medical' },
  ];

  const [formData, setFormData] = useState({
    appointment: 'General Checkup',
    date: new Date().toISOString().substring(0, 10),
    symptoms: '',
    medicine: '',
    targetUserId: ''
  });

  const isStaff = ['SCHOOL_ADMIN', 'CLINIC', 'TEACHER'].includes(user?.role || '');

  useEffect(() => {
    fetchAppointments();
    if (isStaff) {
      fetchUsers();
    }
    fetchSchoolInfo();
    fetchTemplate();
  }, [isStaff]);

  const fetchTemplate = async () => {
    try {
      const { data } = await api.get('/api/reports/template');
      if (data && data.config) setTemplateConfig(data.config);
    } catch (err) {
      console.error('Failed to load template info:', err);
    }
  };

  const fetchSchoolInfo = async () => {
    try {
      const res = await api.get('/api/schools/me');
      setSchoolInfo(res.data);
    } catch (err) {
      console.error('Failed to load school info:', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/api/clinic/appointments');
      setAppointments(res.data);
    } catch (err) {
      showToast('Failed to load appointments', 'error');
    
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
    if (!formData.symptoms) {
      showToast('Please provide symptoms/reasons.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/clinic/appointments', formData);
      showToast('Appointment booked successfully!', 'success');
      setShowModal(false);
      setFormData({
        appointment: 'General Checkup',
        date: new Date().toISOString().substring(0, 10),
        symptoms: '',
        medicine: '',
        targetUserId: ''
      });
      fetchAppointments();
    } catch (err) {
      showToast('Failed to book appointment', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Delete this appointment record?'))) return;
    try {
      await api.delete(`/api/clinic/appointments/${id}`);
      showToast('Record deleted.', 'success');
      fetchAppointments();
    } catch (err) {
      showToast('Failed to delete appointment', 'error');
    
    }
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .clinic-print-area, .clinic-print-area * {
            visibility: visible;
          }
          .clinic-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 24px !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Clinic Appointments & Visit Notes</h1>
          <p>Book medical visits and access your clinical treatment notes.</p>
        </div>
        <button 
          className="portal-btn-primary" 
          onClick={() => setShowModal(true)}
          style={{ background: 'var(--school-primary, #0056b3)' }}
        >
          <i className="fas fa-plus mr-2"></i>Book Visit
        </button>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ background: 'var(--school-primary, #0056b3)', color: 'white' }}>
          <h2 style={{ color: 'white' }}><i className="fas fa-notes-medical" style={{ marginRight: 8 }}></i>Appointment & Visit Log</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--school-primary, #0056b3)' }}></i>
              <p style={{ marginTop: 10 }}>Loading records...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
              <i className="fas fa-folder-open fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
              <p>No clinic visits recorded.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    {isStaff && <th>Patient</th>}
                    <th>Type</th>
                    <th>Date</th>
                    <th>Symptoms</th>
                    <th>Prescribed Medicine</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a: any) => (
                    <tr key={a.id}>
                      {isStaff && <td style={{ fontWeight: 600 }}>{a.user?.name || 'Unknown'} ({a.user?.role})</td>}
                      <td>{a.appointment}</td>
                      <td>{new Date(a.date).toLocaleDateString()}</td>
                      <td>{a.symptoms}</td>
                      <td>{a.medicine || <span style={{ color: '#a0aec0', fontStyle: 'italic' }}>None</span>}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className="portal-btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--school-primary, #0056b3)', borderColor: 'var(--school-primary, #0056b3)' }} 
                            onClick={() => setPrintNoteAppointment(a)}
                          >
                            <i className="fas fa-print mr-1"></i> Print Note
                          </button>
                          {isStaff && (
                            <button 
                              className="portal-btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--portal-danger)', borderColor: '#feb2b2' }} 
                              onClick={() => handleDelete(a.id)}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          )}
                        </div>
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
              <h3 style={{ color: 'white', margin: 0 }}>Book Clinic Visit</h3>
              <button className="portal-modal-close" onClick={() => setShowModal(false)} style={{ color: 'white' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="portal-modal-body" style={{ padding: '20px' }}>
                {isStaff && (
                  <div className="form-group" style={{ marginBottom: 15 }}>
                    <label className="portal-label">Target Patient (User)</label>
                    <select 
                      className="portal-input"
                      value={formData.targetUserId} 
                      onChange={e => setFormData({ ...formData, targetUserId: e.target.value })}
                      required
                    >
                      <option value="">Select a patient...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Reason / Type of Visit</label>
                  <select 
                    className="portal-input"
                    value={formData.appointment} 
                    onChange={e => setFormData({ ...formData, appointment: e.target.value })}
                  >
                    <option value="General Checkup">General Checkup</option>
                    <option value="Fever / Malaria Treatment">Fever / Malaria Treatment</option>
                    <option value="Injury / First Aid">Injury / First Aid</option>
                    <option value="Medical Consultation">Medical Consultation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Preferred Date</label>
                  <input 
                    type="date" className="portal-input"
                    value={formData.date} 
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 15 }}>
                  <label className="portal-label">Symptoms / Reasons</label>
                  <textarea 
                    className="portal-input" style={{ height: '80px', resize: 'none' }}
                    placeholder="Describe symptoms or reasons for appointment..."
                    value={formData.symptoms} 
                    onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
                    required
                  />
                </div>

                {isStaff && (
                  <div className="form-group" style={{ marginBottom: 15 }}>
                    <label className="portal-label">Medicine Taken / Prescribed</label>
                    <input 
                      type="text" className="portal-input"
                      placeholder="e.g. Paracetamol, Cough Syrup"
                      value={formData.medicine} 
                      onChange={e => setFormData({ ...formData, medicine: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <div className="portal-modal-footer">
                <button type="button" className="portal-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: 'var(--school-primary, #0056b3)' }} disabled={saving}>
                  {saving ? 'Saving...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printNoteAppointment && (
        <div className="portal-modal-backdrop" onClick={() => setPrintNoteAppointment(null)}>
          <div className="portal-modal-content clinic-print-area" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', padding: '30px', border: '1px solid #cbd5e0', borderRadius: '8px', background: 'white' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: 'var(--school-primary, #0056b3)' }}>Clinic Consultation Note</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="portal-btn-primary" 
                  style={{ background: 'var(--school-primary, #0056b3)', border: 'none', padding: '6px 16px' }}
                  onClick={() => window.print()}
                >
                  <i className="fas fa-print mr-2"></i> Print Note
                </button>
                <button 
                  className="portal-btn-secondary" 
                  onClick={() => setPrintNoteAppointment(null)}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Area Starts */}
            <div className="printable-area" style={{ border: '2px solid #e2e8f0', padding: '24px', borderRadius: '4px', position: 'relative', background: 'white' }}>
              {(() => {
                const cBuiltin = CONSULTATION_BUILTIN.find(c => c.id === templateConfig?.consultationDesign) || CONSULTATION_BUILTIN[0];
                const primaryCol = cBuiltin.color;
                const accentCol = cBuiltin.accent;
                const logoUrl = templateConfig?.consultationLogo || schoolInfo?.logo;

                return (
                  <>
              {/* Letterhead Header */}
              <div style={{ textAlign: 'center', borderBottom: `2px solid ${primaryCol}`, paddingBottom: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {logoUrl && (
                  <img src={`/api/storage/file/${logoUrl}`} alt="School Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '10px' }} />
                )}
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.6rem', color: primaryCol, fontWeight: 'bold' }}>{schoolInfo?.name ? `${schoolInfo.name.toUpperCase()} CLINIC` : 'SKULAS ACADEMY CLINIC'}</h2>
                <p style={{ margin: 0, color: '#4a5568', fontSize: '0.9rem' }}>School Infirmary & Student Health Services</p>
                <p style={{ margin: '4px 0 0 0', color: '#718096', fontSize: '0.8rem', fontStyle: 'italic' }}>Official Medical Consultation Report</p>
                {(schoolInfo?.address || schoolInfo?.phone) && (
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#718096' }}>
                    {schoolInfo.address && <span>{schoolInfo.address}</span>}
                    {schoolInfo.address && schoolInfo.phone && <span style={{ margin: '0 8px' }}>|</span>}
                    {schoolInfo.phone && <span>{schoolInfo.phone}</span>}
                  </div>
                )}
              </div>

              {/* Consultation Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.95rem', marginBottom: '20px', background: accentCol, padding: '12px', borderRadius: '4px' }}>
                <div>
                  <strong style={{ color: primaryCol }}>Patient Name:</strong> {printNoteAppointment.user?.name || 'Self'}
                </div>
                <div>
                  <strong style={{ color: primaryCol }}>Role:</strong> {printNoteAppointment.user?.role || user?.role}
                </div>
                <div>
                  <strong style={{ color: primaryCol }}>Date of Visit:</strong> {new Date(printNoteAppointment.date).toLocaleDateString()}
                </div>
                <div>
                  <strong style={{ color: primaryCol }}>Consultation Type:</strong> {printNoteAppointment.appointment}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 6px 0', color: primaryCol, borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>PRESENTING SYMPTOMS & CLINICAL FINDINGS</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#2d3748', minHeight: '60px' }}>
                  {printNoteAppointment.symptoms}
                </p>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ margin: '0 0 6px 0', color: primaryCol, borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>TREATMENT & MEDICINE PRESCRIBED</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#2d3748', minHeight: '40px', fontWeight: printNoteAppointment.medicine ? 'bold' : 'normal' }}>
                  {printNoteAppointment.medicine || 'No prescription specified / Observational monitoring only.'}
                </p>
              </div>

              {/* Signatures */}
              {templateConfig?.showStamp !== false && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: `1px solid ${primaryCol}` }}>
                <div>
                  <div style={{ width: '150px', borderBottom: '1px solid #718096', height: '30px' }}></div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: primaryCol }}>Patient Signature</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ width: '180px', borderBottom: '1px solid #718096', height: '30px', display: 'inline-block' }}></div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: primaryCol }}>Attending Nurse / Officer Stamp</p>
                </div>
              </div>
              )}
                  </>
                );
              })()}
            </div>
            {/* Printable Area Ends */}
          </div>
        </div>
      )}
    </>
  );
}
