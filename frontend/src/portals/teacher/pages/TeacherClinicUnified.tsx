import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';

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

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [urgency, setUrgency] = useState('NORMAL');
  const [notes, setNotes] = useState('');

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
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Student</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Reason & Symptoms</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Time Sent</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Clinic Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {r.user?.name || r.title || 'Student'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                      {r.details || r.symptoms || 'Health consultation'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(r.date || r.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: '#dcfce7',
                        color: '#15803d'
                      }}>
                        Under Care / Reviewed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
