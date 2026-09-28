import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';

export default function StudentClinicUnified() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = (searchParams.get('tab') as 'visits' | 'book') || 'visits';
  const [activeTab, setActiveTab] = useState<'visits' | 'book'>(currentTab);

  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Form State
  const [reason, setReason] = useState('');
  const [preferredDate, setPreferredDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMyVisits();
  }, []);

  const fetchMyVisits = async () => {
    setLoading(true);
    try {
      const res = await api.get('/clinic/student-visits').catch(() => api.get('/clinic/visits'));
      setVisits(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load clinic visits', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'visits' | 'book') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please state the reason for your visit', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/clinic/student/book', {
        appointmentReason: reason,
        date: preferredDate
      }).catch(() => api.post('/clinic/appointments', {
        title: `Appointment Request: ${reason}`,
        details: reason,
        date: preferredDate,
        time: 'Morning Clinic',
        targetUserId: user?.id
      }));

      showToast('Appointment requested with the school nurse', 'success');
      setReason('');
      handleTabChange('visits');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to book appointment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="portal-container" style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-heartbeat" style={{ color: 'var(--school-primary, #0284c7)' }} />
          School Clinic & Wellness
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Check your past sick bay visits and book checkups with the school nursing team.
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
          onClick={() => handleTabChange('visits')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'visits' ? 700 : 500,
            color: activeTab === 'visits' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'visits' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-calendar-check" />
          My Clinic Visits ({visits.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('book')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'book' ? 700 : 500,
            color: activeTab === 'book' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'book' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-calendar-plus" />
          Book Appointment
        </button>
      </div>

      {/* Tab 1: Visits */}
      {activeTab === 'visits' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7' }} />
              <p style={{ marginTop: 8 }}>Loading your visits...</p>
            </div>
          ) : visits.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-notes-medical fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <h3 style={{ fontSize: '1.1rem', color: '#334155', fontWeight: 600 }}>No Clinic Records</h3>
              <p style={{ fontSize: '0.9rem', marginTop: 4 }}>You have not visited the school sick bay recently.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Date & Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Reason for Visit</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Care Given</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {visits.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                      {v.date || new Date(v.visitDate || v.createdAt).toLocaleDateString()}
                      {v.time ? ` at ${v.time}` : ''}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontSize: '0.9rem' }}>
                      {v.reason || 'General wellness consultation'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {v.treatment || 'Rested in sick bay with hydration'}
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
                        {v.status || 'Returned to class'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Book */}
      {activeTab === 'book' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 28, maxWidth: 540 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
            Request an Appointment with Nurse
          </h2>
          <form onSubmit={handleBookAppointment}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Preferred Date
              </label>
              <input
                type="date"
                required
                value={preferredDate}
                onChange={e => setPreferredDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Reason for Visit (Describe how you feel) *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Need routine asthma inhaler check, mild headache since morning, toothache..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="portal-btn portal-btn-primary"
              style={{ padding: '11px 24px', fontWeight: 600 }}
            >
              {submitting ? 'Submitting...' : 'Request Appointment'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
