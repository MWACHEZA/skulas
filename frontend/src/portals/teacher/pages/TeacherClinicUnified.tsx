import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { SearchInput } from '../../../components/shared/SearchInput';

export default function TeacherClinicUnified() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = (searchParams.get('tab') as 'refer' | 'my-referrals') || 'refer';
  const [activeTab, setActiveTab] = useState<'refer' | 'my-referrals'>(currentTab);

  const [students, setStudents] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State (Tab 1)
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [urgency, setUrgency] = useState('NORMAL');
  const [notes, setNotes] = useState('');

  // Sick Bay Modal State (Accessible from My Referrals tab)
  const [showSickBayModal, setShowSickBayModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSickBayStudent, setSelectedSickBayStudent] = useState<any | null>(null);
  const [sickBaySymptoms, setSickBaySymptoms] = useState('');
  const [sickBayUrgency, setSickBayUrgency] = useState<'URGENT' | 'CRITICAL'>('URGENT');
  const [sickBayNotes, setSickBayNotes] = useState('');
  const [sendingSickBay, setSendingSickBay] = useState(false);

  // Debounce search query ~300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(studentSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [studentSearch]);

  const filteredStudents = useMemo(() => {
    if (!debouncedSearch.trim()) return students.slice(0, 8);
    const q = debouncedSearch.toLowerCase().trim();
    return students.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.studentId && s.studentId.toLowerCase().includes(q)) ||
      (s.class?.name && s.class.name.toLowerCase().includes(q)) ||
      (typeof s.class === 'string' && s.class.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [students, debouncedSearch]);

  useEffect(() => {
    fetchStudents();
    fetchMyReferrals();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/api/teachers/my-students');
      setStudents(Array.isArray(res.data) ? res.data : []);
    } catch {
      // Fallback to general students search if teacher endpoint differs
      api.get('/api/students?limit=100').then(r => {
        setStudents(Array.isArray(r.data?.students) ? r.data.students : (Array.isArray(r.data) ? r.data : []));
      }).catch(() => null);
    }
  };

  const fetchMyReferrals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/clinic/teacher/referrals').catch(() => api.get('/clinic/referrals'));
      setReferrals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load referrals', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'refer' | 'my-referrals') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !symptoms.trim()) {
      showToast('Please select a student and describe symptoms', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const selected = students.find(s => s.id === selectedStudentId || s.userId === selectedStudentId);
      await api.post('/clinic/teacher/refer', {
        studentId: selected?.id || selectedStudentId,
        symptoms,
        urgency,
        notes
      }).catch(() => api.post('/clinic/complaints', {
        title: `[Teacher Referral] ${selected?.name || 'Student'} sent from class`,
        symptoms: `${symptoms}. Urgency: ${urgency}. Note: ${notes}`,
        targetUserId: selected?.userId || selectedStudentId,
        date: new Date()
      }));

      showToast('Student referral submitted to school clinic', 'success');
      setSelectedStudentId('');
      setSymptoms('');
      setNotes('');
      setUrgency('NORMAL');
      handleTabChange('my-referrals');
      fetchMyReferrals();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit referral', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendToSickBay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSickBayStudent) {
      showToast('Please select a student from search results', 'warning');
      return;
    }
    if (!sickBaySymptoms.trim()) {
      showToast('Please describe the symptoms or reason for sending to sick bay', 'warning');
      return;
    }

    setSendingSickBay(true);
    try {
      await api.post('/clinic/teacher/refer', {
        studentId: selectedSickBayStudent.id,
        symptoms: sickBaySymptoms,
        urgency: sickBayUrgency,
        isSickBayAdmission: true,
        notes: sickBayNotes ? `[IMMEDIATE SICK BAY ADMISSION] ${sickBayNotes}` : '[IMMEDIATE SICK BAY ADMISSION]',
        note: sickBaySymptoms
      });

      showToast(`${selectedSickBayStudent.name} successfully referred to Sick Bay`, 'success');
      setShowSickBayModal(false);
      setSelectedSickBayStudent(null);
      setSickBaySymptoms('');
      setSickBayNotes('');
      setStudentSearch('');
      setSickBayUrgency('URGENT');
      // Immediately refresh without full page reload
      await fetchMyReferrals();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send student to Sick Bay', 'error');
    } finally {
      setSendingSickBay(false);
    }
  };

  return (
    <div className="portal-container" style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-stethoscope" style={{ color: 'var(--school-primary, #0284c7)' }} />
          Student Health Referrals
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Send unwell students to the clinic with symptoms notes, and track the status of your referrals.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 24,
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('refer')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'refer' ? 700 : 500,
            color: activeTab === 'refer' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'refer' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-paper-plane" />
          Refer Student to Clinic
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('my-referrals')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'my-referrals' ? 700 : 500,
            color: activeTab === 'my-referrals' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'my-referrals' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-history" />
          My Referrals ({referrals.length})
        </button>
      </div>

      {/* Tab 1: Refer Form */}
      {activeTab === 'refer' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 28, maxWidth: 650 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
            Send Student to School Sick Bay
          </h2>
          <form onSubmit={handleCreateReferral}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Select Student *
              </label>
              <select
                required
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <option value="">-- Choose student from class --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.class ? `(${s.class.name || s.class})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Reported Symptoms *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Headache, severe coughing, stomach cramps, dizziness during lesson..."
                value={symptoms}
                onChange={e => setSymptoms(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Urgency Level
              </label>
              <select
                value={urgency}
                onChange={e => setUrgency(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <option value="NORMAL">Standard Checkup (Walking)</option>
                <option value="URGENT">Urgent (Needs Escort / Immediate Bed)</option>
                <option value="CRITICAL">Critical Emergency (Immediate Nurse Response)</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Classroom Context / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Student sent from Period 3 Physics Lab at 10:15 AM with a classmate."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="portal-btn portal-btn-primary"
              style={{ padding: '11px 24px', fontWeight: 600 }}
            >
              {submitting ? 'Submitting Referral...' : 'Send Referral to Nurse'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: My Referrals */}
      {activeTab === 'my-referrals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Action Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '16px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Classroom Referrals History</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>Track all student clinic visits initiated from your classroom.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSickBayStudent(null);
                setStudentSearch('');
                setSickBaySymptoms('');
                setSickBayNotes('');
                setShowSickBayModal(true);
              }}
              className="portal-btn"
              style={{
                background: '#dc2626',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '10px 20px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <i className="fas fa-ambulance" />
              Send to Sick Bay
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7' }} />
                <p style={{ marginTop: 8 }}>Loading referrals history...</p>
              </div>
            ) : referrals.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                <i className="fas fa-notes-medical fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
                <h3 style={{ fontSize: '1.1rem', color: '#334155', fontWeight: 600 }}>No Active Referrals</h3>
                <p style={{ fontSize: '0.9rem', marginTop: 4 }}>You have not sent any students to the clinic recently.</p>
                <button
                  type="button"
                  onClick={() => setShowSickBayModal(true)}
                  className="portal-btn portal-btn-primary"
                  style={{ marginTop: 16 }}
                >
                  <i className="fas fa-plus mr-2" /> Send Student to Sick Bay
                </button>
              </div>
            ) : (
              <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Student</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Reason & Symptoms</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Urgency</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Time Sent</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Clinic Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(r => {
                    const urg = (r.urgency || 'NORMAL').toUpperCase();
                    const urgBg = urg === 'CRITICAL' ? '#fee2e2' : urg === 'URGENT' ? '#ffedd5' : '#f1f5f9';
                    const urgColor = urg === 'CRITICAL' ? '#b91c1c' : urg === 'URGENT' ? '#c2410c' : '#475569';

                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>
                          {r.studentName || r.user?.name || r.title || 'Student'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                          {r.symptoms || r.details || 'Health consultation'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: urgBg,
                            color: urgColor
                          }}>
                            {urg}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                          {r.date || new Date(r.createdAt || Date.now()).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: 12,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: r.status === 'In Sick Bay' ? '#fef3c7' : r.status === 'Returned to class' ? '#dcfce7' : '#e0f2fe',
                            color: r.status === 'In Sick Bay' ? '#b45309' : r.status === 'Returned to class' ? '#15803d' : '#0369a1'
                          }}>
                            {r.status || 'Under Care / Reviewed'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const found = students.find(s =>
                                (r.studentId && (s.id === r.studentId || s.studentId === r.studentId)) ||
                                (r.studentName && s.name?.toLowerCase() === r.studentName?.toLowerCase())
                              );
                              if (found) {
                                setSelectedSickBayStudent(found);
                              } else {
                                setSelectedSickBayStudent({
                                  id: r.studentId || r.userId || r.id,
                                  name: r.studentName || 'Student',
                                  class: r.className || null
                                });
                              }
                              setSickBayUrgency('URGENT');
                              setSickBaySymptoms(r.symptoms ? `Escalated to Sick Bay: ${r.symptoms}` : '');
                              setShowSickBayModal(true);
                            }}
                            title="Send or escalate student to Sick Bay"
                            style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              borderRadius: 6,
                              padding: '5px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5
                            }}
                          >
                            <i className="fas fa-bed-pulse" /> Send to Sick Bay
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: Send to Sick Bay ── */}
      {showSickBayModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 580,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: '1px solid #f1f5f9',
                background: '#fef2f2'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  <i className="fas fa-ambulance" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#991b1b' }}>Send Student to Sick Bay</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c' }}>Immediate triage and nurse notification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSickBayModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSendToSickBay} style={{ padding: 24 }}>
              {/* Student Live Search */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Find Student *
                </label>

                {selectedSickBayStudent ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eff6ff', padding: '10px 14px', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className="fas fa-user-check" style={{ color: '#2563eb' }} />
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.95rem' }}>{selectedSickBayStudent.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#3b82f6' }}>
                          {selectedSickBayStudent.studentId || ''} {selectedSickBayStudent.class ? `• ${selectedSickBayStudent.class.name || selectedSickBayStudent.class}` : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSickBayStudent(null)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <SearchInput
                      autoFocus
                      placeholder="Type student name, student ID, or class..."
                      value={studentSearch}
                      onChange={setStudentSearch}
                      onClear={() => setStudentSearch('')}
                    />
                    {/* Live search results list */}
                    <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 6, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                      {filteredStudents.length === 0 ? (
                        <div style={{ padding: 14, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                          No students matching "{studentSearch}"
                        </div>
                      ) : (
                        filteredStudents.map(s => (
                          <div
                            key={s.id}
                            onClick={() => setSelectedSickBayStudent(s)}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: '#fff'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                          >
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{s.name}</span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {s.class?.name || s.class || s.studentId || ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Symptoms */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Symptoms / Reason for Sick Bay *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. High fever, fainting spell, vomiting, asthma difficulty, sprained ankle during practical..."
                  value={sickBaySymptoms}
                  onChange={e => setSickBaySymptoms(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              {/* Urgency */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Urgency Level
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `2px solid ${sickBayUrgency === 'URGENT' ? '#ea580c' : '#e2e8f0'}`,
                      background: sickBayUrgency === 'URGENT' ? '#fff7ed' : '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: sickBayUrgency === 'URGENT' ? '#c2410c' : '#475569'
                    }}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value="URGENT"
                      checked={sickBayUrgency === 'URGENT'}
                      onChange={() => setSickBayUrgency('URGENT')}
                    />
                    Urgent (Needs Bed / Escort)
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `2px solid ${sickBayUrgency === 'CRITICAL' ? '#dc2626' : '#e2e8f0'}`,
                      background: sickBayUrgency === 'CRITICAL' ? '#fef2f2' : '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: sickBayUrgency === 'CRITICAL' ? '#991b1b' : '#475569'
                    }}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value="CRITICAL"
                      checked={sickBayUrgency === 'CRITICAL'}
                      onChange={() => setSickBayUrgency('CRITICAL')}
                    />
                    Critical (Immediate Nurse)
                  </label>
                </div>
              </div>

              {/* Context / Escort Notes */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Classroom Context / Escort Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sent with classmate Tendai from Period 4 Science Lab."
                  value={sickBayNotes}
                  onChange={e => setSickBayNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowSickBayModal(false)}
                  className="portal-btn portal-btn-secondary"
                  style={{ padding: '10px 18px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingSickBay || !selectedSickBayStudent}
                  className="portal-btn"
                  style={{
                    padding: '10px 22px',
                    fontWeight: 700,
                    background: '#dc2626',
                    color: '#fff',
                    borderRadius: 8,
                    cursor: (sendingSickBay || !selectedSickBayStudent) ? 'not-allowed' : 'pointer',
                    opacity: (sendingSickBay || !selectedSickBayStudent) ? 0.6 : 1,
                    border: 'none'
                  }}
                >
                  {sendingSickBay ? 'Sending to Sick Bay...' : 'Confirm & Send to Sick Bay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
