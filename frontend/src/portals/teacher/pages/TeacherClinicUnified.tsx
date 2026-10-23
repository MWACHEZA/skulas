import React, { useState, useEffect, useMemo } from 'react';
import { PaginatedTable } from '../../../components/shared/Pagination';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { SearchInput } from '../../../components/shared/SearchInput';
import SkeletonLoader from '../../../components/shared/SkeletonLoader';

export default function TeacherClinicUnified() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [students, setStudents] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_SICK_BAY' | 'RETURNED' | 'DISCHARGED'>('ALL');

  // Sick Bay Modal State
  const [showSickBayModal, setShowSickBayModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSickBayStudent, setSelectedSickBayStudent] = useState<any | null>(null);
  const [sickBaySymptoms, setSickBaySymptoms] = useState('');
  const [sickBayUrgency, setSickBayUrgency] = useState<'NORMAL' | 'URGENT' | 'CRITICAL'>('URGENT');
  const [sickBayNotes, setSickBayNotes] = useState('');
  const [sendingSickBay, setSendingSickBay] = useState(false);

  // Debounce search query ~300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(studentSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [studentSearch]);

  const filteredModalStudents = useMemo(() => {
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
      }).catch(() => api.post('/clinic/complaints', {
        title: `[Sick Bay Admission] ${selectedSickBayStudent.name}`,
        symptoms: `${sickBaySymptoms}. Urgency: ${sickBayUrgency}. Note: ${sickBayNotes}`,
        targetUserId: selectedSickBayStudent.userId || selectedSickBayStudent.id,
        date: new Date()
      }));

      showToast(`${selectedSickBayStudent.name} successfully sent to Sick Bay`, 'success');
      setShowSickBayModal(false);
      setSelectedSickBayStudent(null);
      setSickBaySymptoms('');
      setSickBayNotes('');
      setStudentSearch('');
      setSickBayUrgency('URGENT');
      await fetchMyReferrals();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send student to Sick Bay', 'error');
    } finally {
      setSendingSickBay(false);
    }
  };

  const displayedReferrals = useMemo(() => {
    return referrals.filter(r => {
      const studentName = (r.studentName || r.user?.name || r.title || '').toLowerCase();
      const sym = (r.symptoms || r.details || '').toLowerCase();
      const q = searchFilter.toLowerCase().trim();
      const matchesSearch = !q || studentName.includes(q) || sym.includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'IN_SICK_BAY') {
        return (r.status || '').toLowerCase().includes('sick bay');
      }
      if (statusFilter === 'RETURNED') {
        return (r.status || '').toLowerCase().includes('returned');
      }
      if (statusFilter === 'DISCHARGED') {
        return (r.status || '').toLowerCase().includes('discharged');
      }
      return true;
    });
  }, [referrals, searchFilter, statusFilter]);

  const inSickBayCount = referrals.filter(r => (r.status || '').toLowerCase().includes('sick bay')).length;

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          color: '#ffffff',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(239, 68, 68, 0.18)', color: '#fca5a5', fontSize: '0.8rem', fontWeight: 700, marginBottom: 10 }}>
            <i className="fas fa-heart-pulse" /> Student Health & Clinical Referrals
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#fff' }}>
            Classroom Health Referrals
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', maxWidth: 600 }}>
            Quickly dispatch unwell or injured students directly to the school clinic, notify the duty nurse, and monitor live medical status.
          </p>
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
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.95rem',
            padding: '12px 24px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
            cursor: 'pointer',
            border: 'none',
            transition: 'transform 0.15s ease'
          }}
        >
          <i className="fas fa-ambulance" style={{ fontSize: '1.1rem' }} />
          Send to Sick Bay
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Referrals</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-stethoscope" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: 8 }}>{referrals.length}</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Currently in Sick Bay</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-bed-pulse" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: 8 }}>{inSickBayCount}</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Duty Nurse Dispatch</span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-user-nurse" />
            </div>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#059669', marginTop: 12 }}>
            <i className="fas fa-circle" style={{ fontSize: '0.6rem', marginRight: 6 }} /> Active On-Call
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        {/* Filter Controls Bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 260, maxWidth: 420 }}>
            <SearchInput
              value={searchFilter}
              onChange={setSearchFilter}
              placeholder="Search by student name or symptoms..."
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(['ALL', 'IN_SICK_BAY', 'RETURNED'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: statusFilter === f ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                  background: statusFilter === f ? '#e0f2fe' : '#ffffff',
                  color: statusFilter === f ? '#0369a1' : '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {f === 'ALL' ? 'All Records' : f === 'IN_SICK_BAY' ? 'In Sick Bay' : 'Returned to Class'}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: '16px' }}>
            <SkeletonLoader type="table" rows={6} columns={6} />
          </div>
        ) : displayedReferrals.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#64748b' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.75rem', marginBottom: 14 }}>
              <i className="fas fa-clipboard-check" />
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#1e293b', fontWeight: 700, margin: '0 0 6px 0' }}>
              No Referrals Found
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: 420, margin: '0 auto 18px auto' }}>
              {searchFilter ? 'No referral records matched your search query.' : 'You have not sent any students to the sick bay recently.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedSickBayStudent(null);
                setStudentSearch('');
                setSickBaySymptoms('');
                setSickBayNotes('');
                setShowSickBayModal(true);
              }}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                background: '#dc2626',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-ambulance mr-1" /> Send Student to Sick Bay
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <PaginatedTable className="portal-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '220px' }}>Student</th>
                  <th>Reason & Symptoms</th>
                  <th style={{ width: '130px' }}>Urgency</th>
                  <th style={{ width: '140px' }}>Time Sent</th>
                  <th style={{ width: '160px' }}>Clinic Status</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedReferrals.map(r => {
                  const urg = (r.urgency || 'NORMAL').toUpperCase();
                  const urgBg = urg === 'CRITICAL' ? '#fee2e2' : urg === 'URGENT' ? '#ffedd5' : '#f1f5f9';
                  const urgColor = urg === 'CRITICAL' ? '#b91c1c' : urg === 'URGENT' ? '#c2410c' : '#475569';

                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                            {(r.studentName || r.user?.name || r.title || 'S').charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>
                              {r.studentName || r.user?.name || r.title || 'Student'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {r.studentClass || r.user?.class?.name || 'Classroom'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#334155', fontSize: '0.9rem' }}>
                        {r.symptoms || r.details || 'General health consultation'}
                      </td>
                      <td>
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
                      <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        {r.date || new Date(r.createdAt || Date.now()).toLocaleDateString()}
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: 12,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: (r.status || '').toLowerCase().includes('sick bay') ? '#fef3c7' : (r.status || '').toLowerCase().includes('returned') ? '#dcfce7' : '#e0f2fe',
                          color: (r.status || '').toLowerCase().includes('sick bay') ? '#b45309' : (r.status || '').toLowerCase().includes('returned') ? '#15803d' : '#0369a1'
                        }}>
                          {r.status || 'Under Review'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            showToast(`${r.studentName || r.title || 'Student'}: ${r.symptoms || r.details || 'Under nursing care'}`, 'info');
                          }}
                          style={{
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            padding: '5px 10px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                        >
                          <i className="fas fa-file-medical" /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </PaginatedTable>
          </div>
        )}
      </div>

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
              borderRadius: 14,
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
                borderBottom: '1px solid #fee2e2',
                background: '#fef2f2'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>
                  <i className="fas fa-ambulance" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#991b1b' }}>Send Student to Sick Bay</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c' }}>Immediate triage notification to clinic nurses</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSickBayModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSendToSickBay} style={{ padding: 24 }}>
              {/* Student Live Search */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
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
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
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
                    <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 6, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                      {filteredModalStudents.length === 0 ? (
                        <div style={{ padding: 14, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                          No students matching "{studentSearch}"
                        </div>
                      ) : (
                        filteredModalStudents.map(s => (
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
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
