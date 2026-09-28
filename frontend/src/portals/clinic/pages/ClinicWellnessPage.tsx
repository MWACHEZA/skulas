import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';

export type WellnessTab = 'appointments' | 'vaccines';

export default function ClinicWellnessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as WellnessTab) || 'appointments';
  const [activeTab, setActiveTab] = useState<WellnessTab>(currentTab);

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [vaccines, setVaccines] = useState<any[]>([]);

  // Search/Filter
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    const tabParam = searchParams.get('tab') as WellnessTab;
    if (tabParam && ['appointments', 'vaccines'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: WellnessTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [appRes, vacRes] = await Promise.all([
        api.get('/clinic/wellness/appointments'),
        api.get('/clinic/wellness/vaccines')
      ]);
      setAppointments(appRes.data || []);
      setVaccines(vacRes.data || []);
    } catch (err) {
      console.error('Failed to load wellness data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAppointments = appointments.filter((app) =>
    (app.user?.name || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (app.reason || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (app.type || '').toLowerCase().includes(filterQuery.toLowerCase())
  );

  const filteredVaccines = vaccines.filter((vac) =>
    (vac.user?.name || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (vac.vaccineName || '').toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-heartbeat" style={{ color: 'var(--portal-primary, #4f46e5)' }} />
          Preventative Care & Wellness
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Manage scheduled routine health screenings, immunization registers, and ministry health compliance tracking.
        </p>
      </div>

      {/* Tabs */}
      <div className="portal-tabs" style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          onClick={() => handleTabChange('appointments')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'appointments' ? 600 : 400,
            color: activeTab === 'appointments' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'appointments' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-calendar-alt" />
          Scheduled Appointments ({appointments.length})
        </button>

        <button
          onClick={() => handleTabChange('vaccines')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'vaccines' ? 600 : 400,
            color: activeTab === 'vaccines' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'vaccines' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-syringe" />
          Immunization & Vaccine Register ({vaccines.length})
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 16, maxWidth: 400 }}>
        <input
          type="text"
          placeholder="Filter by student name, reason, or vaccine..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem' }}
        />
      </div>

      {/* TAB 1: Appointments */}
      {activeTab === 'appointments' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b' }}>Wellness & Screening Appointments</h2>
            <button
              onClick={loadData}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <i className="fas fa-sync-alt" /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <i className="fas fa-spinner fa-spin fa-2x" />
              <p style={{ marginTop: 10 }}>Loading appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <i className="fas fa-calendar-check" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }} />
              <p>No wellness appointments scheduled.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>Student / Staff</th>
                    <th style={{ padding: '12px 16px' }}>Appointment Type</th>
                    <th style={{ padding: '12px 16px' }}>Scheduled Date</th>
                    <th style={{ padding: '12px 16px' }}>Reason / Purpose</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((app) => (
                    <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{app.user?.name || 'Student'}</td>
                      <td style={{ padding: '12px 16px', color: '#4f46e5', fontWeight: 500 }}>{app.type || 'Routine Checkup'}</td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {new Date(app.date).toLocaleDateString()} {new Date(app.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '300px' }}>{app.reason || 'Annual Health Screening'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: app.status === 'COMPLETED' ? '#dcfce7' : '#dbeafe',
                          color: app.status === 'COMPLETED' ? '#166534' : '#1e40af'
                        }}>
                          {app.status || 'SCHEDULED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Vaccines & Immunization Register */}
      {activeTab === 'vaccines' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b' }}>Immunization Register & Ministry Compliance</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
                Track student vaccination coverage for mandatory national immunization schedules.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="fas fa-file-export" /> Export Compliance Ledger
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <i className="fas fa-spinner fa-spin fa-2x" />
              <p style={{ marginTop: 10 }}>Loading immunization register...</p>
            </div>
          ) : filteredVaccines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <i className="fas fa-shield-virus" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }} />
              <p>No immunization doses logged yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>Student Name</th>
                    <th style={{ padding: '12px 16px' }}>Vaccine</th>
                    <th style={{ padding: '12px 16px' }}>Dose Number</th>
                    <th style={{ padding: '12px 16px' }}>Administered Date</th>
                    <th style={{ padding: '12px 16px' }}>Batch / Lot</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVaccines.map((vac) => (
                    <tr key={vac.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{vac.user?.name || 'Student'}</td>
                      <td style={{ padding: '12px 16px', color: '#1e40af', fontWeight: 600 }}>{vac.vaccineName}</td>
                      <td style={{ padding: '12px 16px' }}>Dose #{vac.doseNumber || 1}</td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {new Date(vac.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{vac.batchNumber || 'N/A'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
                          Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
