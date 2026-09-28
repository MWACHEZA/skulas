import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';

export type EmergencyTab = 'emergency-log' | 'referrals';

export default function ClinicEmergencyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as EmergencyTab) || 'emergency-log';
  const [activeTab, setActiveTab] = useState<EmergencyTab>(currentTab);

  const [loading, setLoading] = useState(true);
  const [emergencyLogs, setEmergencyLogs] = useState<any[]>([]);

  // Log Emergency Modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const [emergencyTitle, setEmergencyTitle] = useState('');
  const [emergencyDesc, setEmergencyDesc] = useState('');
  const [acuity, setAcuity] = useState('RED');
  const [ambulanceCalled, setAmbulanceCalled] = useState(false);
  const [ambulanceDetails, setAmbulanceDetails] = useState('');
  const [parentContacted, setParentContacted] = useState(false);
  const [parentContactPhone, setParentContactPhone] = useState('');
  const [parentContactNotes, setParentContactNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Selected emergency for detail / printable transfer slip
  const [selectedEmergencySlip, setSelectedEmergencySlip] = useState<any>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as EmergencyTab;
    if (tabParam && ['emergency-log', 'referrals'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: EmergencyTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clinic/emergency/logs');
      setEmergencyLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load emergency logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchStudentQuery.trim()) return;
    try {
      const res = await api.get(`/clinic/reports/patients-search?q=${encodeURIComponent(searchStudentQuery.trim())}`);
      setStudentSearchResults(res.data || []);
    } catch (err) {
      console.error('Failed to search student for emergency:', err);
    }
  };

  const handleCreateEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setFeedback({ type: 'error', message: 'Please select a student for this emergency record.' });
      return;
    }
    try {
      setSaving(true);
      setFeedback(null);
      await api.post('/clinic/emergency/log', {
        studentId: selectedStudent.id,
        title: emergencyTitle,
        description: emergencyDesc,
        acuity,
        ambulanceCalled,
        ambulanceDetails: ambulanceCalled ? ambulanceDetails : null,
        parentContacted,
        parentContactPhone: parentContacted ? parentContactPhone : null,
        parentContactNotes: parentContacted ? parentContactNotes : null
      });

      setFeedback({ type: 'success', message: 'Emergency incident and parent contact log created successfully.' });
      setShowLogModal(false);
      setSelectedStudent(null);
      setEmergencyTitle('');
      setEmergencyDesc('');
      setAmbulanceCalled(false);
      setAmbulanceDetails('');
      setParentContacted(false);
      setParentContactPhone('');
      setParentContactNotes('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to record emergency' });
    } finally {
      setSaving(false);
    }
  };

  const referralsList = emergencyLogs.filter(e => e.ambulanceCalled || e.title.toLowerCase().includes('referral') || e.title.toLowerCase().includes('hospital'));

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-ambulance" />
          Emergency Response & Hospital Referrals
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Immediate critical care tracking, manual parent telephone dispatch logs, paramedic transport, and external facility referrals.
        </p>
      </div>

      {feedback && (
        <div style={{
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: feedback.type === 'success' ? '1px solid #22c55e' : '1px solid #ef4444',
          color: feedback.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <i className={`fas ${feedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`} />
          {feedback.message}
        </div>
      )}

      {/* Tabs */}
      <div className="portal-tabs" style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          onClick={() => handleTabChange('emergency-log')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'emergency-log' ? 600 : 400,
            color: activeTab === 'emergency-log' ? '#dc2626' : '#64748b',
            borderBottom: activeTab === 'emergency-log' ? '2px solid #dc2626' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-exclamation-circle" />
          Emergency Event Logs ({emergencyLogs.length})
        </button>

        <button
          onClick={() => handleTabChange('referrals')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'referrals' ? 600 : 400,
            color: activeTab === 'referrals' ? '#dc2626' : '#64748b',
            borderBottom: activeTab === 'referrals' ? '2px solid #dc2626' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-hospital" />
          External Hospital Referrals ({referralsList.length})
        </button>
      </div>

      {/* TAB 1: Emergency Log */}
      {activeTab === 'emergency-log' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b' }}>Emergency Incidents & Parent Communications</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
                All high-acuity interventions, ambulance alerts, and manual phone records with parents/guardians.
              </p>
            </div>
            <button
              onClick={() => setShowLogModal(true)}
              style={{
                padding: '8px 16px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <i className="fas fa-phone-alt" /> Log Emergency / Parent Call
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <i className="fas fa-spinner fa-spin fa-2x" />
              <p style={{ marginTop: 10 }}>Loading emergency records...</p>
            </div>
          ) : emergencyLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#166534' }}>
              <i className="fas fa-shield-alt fa-3x" style={{ marginBottom: 12 }} />
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>No critical emergencies currently recorded.</p>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Campus medical operations are stable.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>Student Patient</th>
                    <th style={{ padding: '12px 16px' }}>Acuity</th>
                    <th style={{ padding: '12px 16px' }}>Emergency Nature</th>
                    <th style={{ padding: '12px 16px' }}>Ambulance Status</th>
                    <th style={{ padding: '12px 16px' }}>Parent Contact Log</th>
                    <th style={{ padding: '12px 16px' }}>Logged By</th>
                    <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {emergencyLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {log.student?.name}
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                          Class: {log.student?.class?.name || 'Standard'} | Hostel: {log.student?.hostel?.name || 'Day'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: log.acuity === 'RED' ? '#fee2e2' : '#fef3c7',
                          color: log.acuity === 'RED' ? '#991b1b' : '#92400e'
                        }}>
                          {log.acuity}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{log.title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{log.description}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {log.ambulanceCalled ? (
                          <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                            <i className="fas fa-check-circle" /> Called ({log.ambulanceDetails || 'Local EMT'})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Not Required</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                        {log.parentContacted ? (
                          <div>
                            <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                              <i className="fas fa-phone-volume" /> Phoned ({log.parentContactPhone || 'Parent'})
                            </span>
                            {log.parentContactNotes && (
                              <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>{log.parentContactNotes}</p>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>
                            <i className="fas fa-exclamation-triangle" /> Pending Contact
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>{log.loggedBy?.name}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedEmergencySlip(log)}
                          style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
                        >
                          <i className="fas fa-print" /> Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Referrals */}
      {activeTab === 'referrals' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Hospital Referral Transfer Directory</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
            Cases referred to tertiary hospitals, orthopedic clinics, or pediatric emergency wards with clinical handover slips.
          </p>

          {referralsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <i className="fas fa-ambulance fa-2x" style={{ marginBottom: 12, color: '#cbd5e1' }} />
              <p>No active external hospital referrals.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {referralsList.map((ref) => (
                <div key={ref.id} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: 16, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{ref.student?.name}</span>
                    <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                      EXTERNAL REFERRAL
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: 10 }}>{ref.title}</p>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>
                    <strong>EMT / Transport:</strong> {ref.ambulanceDetails || 'Private school transport'}
                  </div>
                  <button
                    onClick={() => setSelectedEmergencySlip(ref)}
                    style={{ width: '100%', padding: '6px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    <i className="fas fa-file-medical" style={{ marginRight: 6 }} /> Print Referral Handover Slip
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Log Emergency Event / Parent Call */}
      {showLogModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626', marginBottom: 14 }}>
              <i className="fas fa-phone-alt" style={{ marginRight: 8 }} />
              Log Emergency & Parent Call
            </h3>

            {/* Student Search */}
            {!selectedStudent ? (
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Find Student</label>
                <form onSubmit={handleSearchStudent} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="Search student name or admission number..."
                    value={searchStudentQuery}
                    onChange={(e) => setSearchStudentQuery(e.target.value)}
                    style={{ flex: 1, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                  <button type="submit" style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    Find
                  </button>
                </form>
                {studentSearchResults.map((stud) => (
                  <div
                    key={stud.id}
                    onClick={() => { setSelectedStudent(stud); setStudentSearchResults([]); }}
                    style={{ padding: 10, borderBottom: '1px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc', borderRadius: 6, marginBottom: 4 }}
                  >
                    <strong>{stud.name}</strong> ({stud.studentId || 'ID'}) — {stud.class?.name || 'Class'}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 10, background: '#eff6ff', borderRadius: 6, border: '1px solid #bfdbfe', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{selectedStudent.name}</strong> ({selectedStudent.studentId || 'Student'})
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Class: {selectedStudent.class?.name || 'General'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Change
                </button>
              </div>
            )}

            {selectedStudent && (
              <form onSubmit={handleCreateEmergency}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Emergency Nature / Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acute severe asthma attack, severe sports fracture, anaphylaxis"
                    value={emergencyTitle}
                    onChange={(e) => setEmergencyTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Incident Details & Immediate Care Given</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Oxygen administered, nebulizer treatment given, patient stabilized..."
                    value={emergencyDesc}
                    onChange={(e) => setEmergencyDesc(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}
                  />
                </div>

                {/* Ambulance */}
                <div style={{ marginBottom: 14, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#1e293b', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={ambulanceCalled}
                      onChange={(e) => setAmbulanceCalled(e.target.checked)}
                    />
                    Ambulance / Emergency Medical Transport Dispatched
                  </label>
                  {ambulanceCalled && (
                    <input
                      type="text"
                      placeholder="Ambulance provider & ETA (e.g. Red Cross EMT - ETA 12 mins)"
                      value={ambulanceDetails}
                      onChange={(e) => setAmbulanceDetails(e.target.value)}
                      style={{ width: '100%', marginTop: 8, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}
                    />
                  )}
                </div>

                {/* Parent Contact Manual Record */}
                <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#1e293b', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={parentContacted}
                      onChange={(e) => setParentContacted(e.target.checked)}
                    />
                    Parent / Guardian Contacted via Telephone Call
                  </label>
                  {parentContacted && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="tel"
                        placeholder="Parent Telephone Number Called"
                        value={parentContactPhone}
                        onChange={(e) => setParentContactPhone(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}
                      />
                      <input
                        type="text"
                        placeholder="Parent response / Instructions given by guardian"
                        value={parentContactNotes}
                        onChange={(e) => setParentContactNotes(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ padding: '8px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                  >
                    {saving ? 'Logging...' : 'Save Emergency Log'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Printable Transfer Slip */}
      {selectedEmergencySlip && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 30, width: '100%', maxWidth: 600, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 14, marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                Emergency Medical Referral & Transfer Slip
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>School Health & Clinical Services Department</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.9rem', marginBottom: 16 }}>
              <div><strong>Patient Name:</strong> {selectedEmergencySlip.student?.name}</div>
              <div><strong>Class / Hostel:</strong> {selectedEmergencySlip.student?.class?.name || 'Standard'} / {selectedEmergencySlip.student?.hostel?.name || 'Day'}</div>
              <div><strong>Date & Time:</strong> {new Date(selectedEmergencySlip.createdAt).toLocaleString()}</div>
              <div><strong>Acuity:</strong> {selectedEmergencySlip.acuity}</div>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>Condition / Provisional Findings:</div>
              <p style={{ margin: '0 0 8px' }}>{selectedEmergencySlip.title} — {selectedEmergencySlip.description}</p>
              <div><strong>Ambulance / EMT:</strong> {selectedEmergencySlip.ambulanceDetails || 'Dispatched'}</div>
              <div><strong>Parent Contact Status:</strong> {selectedEmergencySlip.parentContacted ? `Phoned (${selectedEmergencySlip.parentContactNotes || 'Informed'})` : 'Under notification'}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 14, borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Handover Clinician: <strong>{selectedEmergencySlip.loggedBy?.name || 'School Nurse'}</strong>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setSelectedEmergencySlip(null)}
                  style={{ padding: '6px 14px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{ padding: '6px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >
                  <i className="fas fa-print" style={{ marginRight: 6 }} /> Print Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
