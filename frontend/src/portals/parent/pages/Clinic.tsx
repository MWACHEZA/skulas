import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import TabbedPage, { TabItem } from '../../../components/portals/shared/TabbedPage';
import HealthComplaints from '../../shared/pages/clinic/HealthComplaints';
import Appointments from '../../shared/pages/clinic/Appointments';
import Emergencies from '../../shared/pages/clinic/Emergencies';

export default function ParentClinic() {
  const { user, activeEntity } = useAuth();
  const { showToast } = useToast();

  // Visits tab state
  const [visits, setVisits] = useState<any[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);

  // Conduct log
  const conductRecords = [
    { date: '2026-03-15', type: 'Merit', category: 'Leadership', points: +5, description: 'Organized a successful charity drive for the junior school.' },
    { date: '2026-03-02', type: 'Notice', category: 'Uniform', points: 0, description: 'Incomplete uniform (no blazer) during morning assembly.' },
    { date: '2026-02-18', type: 'Merit', category: 'Helpfulness', points: +2, description: 'Assisted a new student with navigating campus facilities.' }
  ];

  useEffect(() => {
    fetchVisits();
  }, [activeEntity]);

  const fetchVisits = async () => {
    try {
      const res = await api.get('/api/clinic/visits');
      setVisits(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load clinic visits', err);
    } finally {
      setLoadingVisits(false);
    }
  };

  // ── Tab 1: Clinic Visits ──
  const visitsTab = (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Official clinic visits, consultation notes, and health vital logs recorded by the school medical team.
        </p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><i className="fas fa-stethoscope mr-2 text-primary"></i>Medical Consultations & Vitals</h2>
          <button className="portal-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={fetchVisits}>
            <i className="fas fa-sync-alt mr-1"></i> Refresh
          </button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loadingVisits ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin fa-2x mr-2"></i> Loading clinic visits...
            </div>
          ) : visits.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-notes-medical" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: 12, display: 'block' }}></i>
              <h3 style={{ margin: '0 0 6px 0', color: '#334155' }}>No Recent Clinic Visits</h3>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                Your child has no recorded medical center visits for this term.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Patient</th>
                    <th>Triage Level</th>
                    <th>Diagnosis / Reason</th>
                    <th>Vitals Recorded</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v: any) => {
                    const vitalsSummary = [
                      v.temperature ? `${v.temperature}°C` : null,
                      v.bloodPressure ? `BP: ${v.bloodPressure}` : null,
                      v.heartRate ? `HR: ${v.heartRate} bpm` : null
                    ].filter(Boolean).join(' • ');

                    return (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600 }}>
                          {new Date(v.visitDate || v.createdAt).toLocaleDateString()} {new Date(v.visitDate || v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>{v.user?.name || activeEntity?.name || 'Child'}</td>
                        <td>
                          <span className={`portal-badge ${v.triageLevel === 'RED' ? 'danger' : v.triageLevel === 'YELLOW' ? 'warning' : 'success'}`}>
                            {v.triageLevel || 'Routine'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{v.diagnosis || v.presentingComplaint || 'General Checkup'}</div>
                          {v.treatment && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tx: {v.treatment}</div>}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                            {vitalsSummary || 'Standard vitals checked'}
                          </span>
                        </td>
                        <td>
                          <span className="portal-badge info">
                            {v.status || 'Discharged'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Tab 2: Complaints Log (embedded HealthComplaints) ──
  const complaintsTab = (
    <div>
      <HealthComplaints />
    </div>
  );

  // ── Tab 3: Appointments (embedded Appointments) ──
  const appointmentsTab = (
    <div>
      <Appointments />
    </div>
  );

  // ── Tab 4: Wellbeing & Conduct ──
  const wellbeingTab = (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Personal health details, allergy alerts, and behavioral conduct tracking for {activeEntity?.name || 'your child'}.
        </p>
      </div>

      <div className="portal-grid-2" style={{ gap: 20, marginBottom: 24 }}>
        {/* Medical Summary */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-heartbeat mr-2 text-danger"></i>Registered Medical Info</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <strong style={{ color: '#c53030', display: 'block', marginBottom: 4 }}>Allergies & Medical Alerts:</strong>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#742a2a' }}>Peanuts, Shellfish • Mild Asthmatic (inhaler available at clinic)</p>
            </div>
            <div className="portal-grid-2" style={{ gap: 16 }}>
              <div>
                <small style={{ color: '#64748b' }}>Blood Group</small>
                <p style={{ fontWeight: 800, margin: '2px 0 0 0', fontSize: '1.05rem' }}>O Positive (O+)</p>
              </div>
              <div>
                <small style={{ color: '#64748b' }}>Primary Physician</small>
                <p style={{ fontWeight: 800, margin: '2px 0 0 0', fontSize: '1.05rem' }}>Dr. E. Moyo (Resident)</p>
              </div>
            </div>
            <button 
              className="portal-btn-secondary" 
              style={{ width: '100%', marginTop: 20 }} 
              onClick={() => showToast('Opening medical profile amendment request...', 'info')}
            >
              <i className="fas fa-edit mr-1"></i> Request Medical Record Update
            </button>
          </div>
        </div>

        {/* Conduct & Demerits */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-certificate mr-2 text-warning"></i>Conduct & Merits Summary</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981' }}>+124</div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Total Positive Merits Accumulated</p>
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.875rem' }}>
                <span style={{ color: '#64748b' }}>Behavior & Discipline Score</span>
                <span style={{ fontWeight: 800, color: '#10b981' }}>Exemplary (94%)</span>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 10, height: 10, overflow: 'hidden' }}>
                <div style={{ width: '94%', height: '100%', background: '#10b981', borderRadius: 10 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conduct Log Table */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-list-ul mr-2 text-primary"></i>Term Conduct & Commendation Log</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Points</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {conductRecords.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{c.date}</td>
                  <td>
                    <span className={`portal-badge ${c.type === 'Merit' ? 'success' : 'warning'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td>{c.category}</td>
                  <td style={{ fontWeight: 800, color: c.points > 0 ? '#10b981' : '#64748b' }}>
                    {c.points > 0 ? `+${c.points}` : c.points}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>{c.description}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── Tab 5: Emergencies (Strict Read-Only) ──
  const emergenciesTab = (
    <div>
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <i className="fas fa-info-circle text-danger" style={{ fontSize: '1.25rem' }}></i>
        <div style={{ fontSize: '0.85rem', color: '#991b1b' }}>
          <strong>Notice:</strong> This is a read-only historical registry of campus medical incident reports. Immediate medical emergencies are handled on-site by clinic staff and emergency responders.
        </div>
      </div>

      <Emergencies />
    </div>
  );

  const tabs: TabItem[] = [
    { id: 'visits', label: 'Visits', icon: 'fas fa-stethoscope', content: visitsTab },
    { id: 'complaints', label: 'Complaints Log', icon: 'fas fa-notes-medical', content: complaintsTab },
    { id: 'appointments', label: 'Appointments', icon: 'fas fa-calendar-check', content: appointmentsTab },
    { id: 'wellbeing', label: 'Wellbeing / Conduct', icon: 'fas fa-heartbeat', content: wellbeingTab },
    { id: 'emergencies', label: 'Emergencies', icon: 'fas fa-ambulance', badge: 'Read-only', content: emergenciesTab }
  ];

  return (
    <TabbedPage
      title="Clinic & Wellbeing"
      subtitle="Comprehensive view of clinic consultations, health complaints, appointments, allergies, and conduct records."
      tabs={tabs}
      defaultTab="visits"
    />
  );
}
