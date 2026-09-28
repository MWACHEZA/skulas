import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';

export type HospitalizationTab = 'admitted' | 'bed-map' | 'discharge';

export default function ClinicHospitalizationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as HospitalizationTab) || 'admitted';
  const [activeTab, setActiveTab] = useState<HospitalizationTab>(currentTab);

  const [loading, setLoading] = useState(true);
  const [beds, setBeds] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);

  // Monitoring Log Modal state
  const [selectedAdmission, setSelectedAdmission] = useState<any>(null);
  const [logTemp, setLogTemp] = useState('');
  const [logBp, setLogBp] = useState('');
  const [logPulse, setLogPulse] = useState('');
  const [logSpo2, setLogSpo2] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  // Discharge modal state
  const [dischargeAdmission, setDischargeAdmission] = useState<any>(null);
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [savingDischarge, setSavingDischarge] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as HospitalizationTab;
    if (tabParam && ['admitted', 'bed-map', 'discharge'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: HospitalizationTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clinic/hospitalization/overview');
      setBeds(res.data?.beds || []);
      setAdmissions(res.data?.admissions || []);
    } catch (err) {
      console.error('Failed to load hospitalization data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveMonitoring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    try {
      setSavingLog(true);
      setFeedback(null);
      await api.post('/clinic/hospitalization/monitoring-log', {
        admissionId: selectedAdmission.id,
        temp: logTemp,
        bp: logBp,
        pulse: logPulse,
        spo2: logSpo2,
        notes: logNotes
      });
      setFeedback({ type: 'success', message: 'Vitals & clinical monitoring log recorded successfully.' });
      setSelectedAdmission(null);
      setLogTemp('');
      setLogBp('');
      setLogPulse('');
      setLogSpo2('');
      setLogNotes('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to record monitoring log' });
    } finally {
      setSavingLog(false);
    }
  };

  const handleConfirmDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeAdmission) return;
    try {
      setSavingDischarge(true);
      setFeedback(null);
      await api.post('/clinic/hospitalization/discharge', {
        admissionId: dischargeAdmission.id,
        dischargeNotes
      });
      setFeedback({ type: 'success', message: 'Patient successfully discharged and bed marked available.' });
      setDischargeAdmission(null);
      setDischargeNotes('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to discharge patient' });
    } finally {
      setSavingDischarge(false);
    }
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-procedures" style={{ color: 'var(--portal-primary, #4f46e5)' }} />
          Hospitalization & Sick Bay Management
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Live sick bay bed occupancy map, inpatient monitoring logs, dietary instructions, and clinical discharge workflows.
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
          onClick={() => handleTabChange('admitted')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'admitted' ? 600 : 400,
            color: activeTab === 'admitted' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'admitted' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-user-injured" />
          Currently Admitted ({admissions.length})
        </button>

        <button
          onClick={() => handleTabChange('bed-map')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'bed-map' ? 600 : 400,
            color: activeTab === 'bed-map' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'bed-map' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-th" />
          Sick Bay Bed Map ({beds.filter(b => b.status === 'AVAILABLE').length} Available)
        </button>

        <button
          onClick={() => handleTabChange('discharge')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'discharge' ? 600 : 400,
            color: activeTab === 'discharge' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'discharge' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-sign-out-alt" />
          Discharge & Inpatient History
        </button>
      </div>

      {/* TAB 1: Currently Admitted Patients */}
      {activeTab === 'admitted' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b' }}>Inpatients in Sick Bay</h2>
            <button
              onClick={loadData}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
            >
              <i className="fas fa-sync-alt" /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <i className="fas fa-spinner fa-spin fa-2x" />
              <p style={{ marginTop: 10 }}>Loading inpatient records...</p>
            </div>
          ) : admissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <i className="fas fa-check-circle" style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: 12 }} />
              <p style={{ fontWeight: 500 }}>No students currently admitted in the sick bay.</p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Patients can be admitted from the Active Consult Desk.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>Bed</th>
                    <th style={{ padding: '12px 16px' }}>Student Patient</th>
                    <th style={{ padding: '12px 16px' }}>Hostel / Class</th>
                    <th style={{ padding: '12px 16px' }}>Admitted At</th>
                    <th style={{ padding: '12px 16px' }}>Dietary / Kitchen Needs</th>
                    <th style={{ padding: '12px 16px' }}>Latest Vitals</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((adm) => {
                    const latestLog = adm.logs?.[0];
                    return (
                      <tr key={adm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4f46e5' }}>
                          {adm.bed?.bedNumber || 'Unassigned'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                          {adm.student?.name}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>
                          {adm.student?.hostel?.name || 'Day Student'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {new Date(adm.admittedAt).toLocaleDateString()} {new Date(adm.admittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: '200px' }}>
                          {adm.dietNotes ? (
                            <span style={{ fontSize: '0.85rem', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: 4 }}>
                              {adm.dietNotes}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Regular food</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                          {latestLog ? (
                            <span>
                              {latestLog.temp ? `T: ${latestLog.temp}°C ` : ''}
                              {latestLog.bp ? `BP: ${latestLog.bp} ` : ''}
                              {latestLog.pulse ? `HR: ${latestLog.pulse} ` : ''}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>No logs yet</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              onClick={() => setSelectedAdmission(adm)}
                              style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                            >
                              <i className="fas fa-heartbeat" style={{ marginRight: 4 }} /> Log Vitals
                            </button>
                            <button
                              onClick={() => setDischargeAdmission(adm)}
                              style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                            >
                              <i className="fas fa-sign-out-alt" style={{ marginRight: 4 }} /> Discharge
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Sick Bay Bed Map */}
      {activeTab === 'bed-map' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b' }}>Visual Sick Bay Bed Layout</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
                Real-time bed availability status across clinic observation wards.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
                <span>Available</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                <span>Occupied</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {beds.map((bed) => {
              const isOccupied = bed.status === 'OCCUPIED';
              const activeAdmission = bed.admissions?.[0];
              return (
                <div
                  key={bed.id}
                  style={{
                    border: isOccupied ? '2px solid #fca5a5' : '2px solid #86efac',
                    borderRadius: 10,
                    padding: 16,
                    background: isOccupied ? '#fef2f2' : '#f0fdf4',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: isOccupied ? '#991b1b' : '#166534' }}>
                      <i className="fas fa-bed" style={{ marginRight: 6 }} /> {bed.bedNumber}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: isOccupied ? '#fee2e2' : '#dcfce7',
                      color: isOccupied ? '#991b1b' : '#166534'
                    }}>
                      {bed.status}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 12 }}>Ward: {bed.ward || 'Main Ward'}</p>

                  {isOccupied && activeAdmission ? (
                    <div style={{ borderTop: '1px dashed #fca5a5', paddingTop: 10, fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{activeAdmission.student?.name}</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 2 }}>
                        Class: {activeAdmission.student?.class?.name || 'Standard'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 2 }}>
                        Admitted: {new Date(activeAdmission.admittedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <div style={{ borderTop: '1px dashed #86efac', paddingTop: 10, fontSize: '0.85rem', color: '#166534' }}>
                      Bed is sanitized and ready for patient intake.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Discharge & Historical Overview */}
      {activeTab === 'discharge' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Inpatient Discharge Log & Bed History</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
            Every inpatient admission is recorded and attendance records are automatically excused for the duration of the admission.
          </p>

          <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', color: '#64748b' }}>
            <i className="fas fa-file-medical-alt" style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: 8 }} />
            <p>Discharge records and clinical summaries are archived in each student's medical dossier.</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Search a student in the Reports & Files portal to view full inpatient chronological history.</p>
          </div>
        </div>
      )}

      {/* MODAL: Record Monitoring Log */}
      {selectedAdmission && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 12 }}>
              Record Inpatient Vitals — {selectedAdmission.student?.name}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
              Bed: {selectedAdmission.bed?.bedNumber} | Main Sick Bay Observation
            </p>

            <form onSubmit={handleSaveMonitoring}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="37.0"
                    value={logTemp}
                    onChange={(e) => setLogTemp(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Blood Pressure
                  </label>
                  <input
                    type="text"
                    placeholder="120/80"
                    value={logBp}
                    onChange={(e) => setLogBp(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    Pulse / HR (bpm)
                  </label>
                  <input
                    type="number"
                    placeholder="75"
                    value={logPulse}
                    onChange={(e) => setLogPulse(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    SpO2 (%)
                  </label>
                  <input
                    type="number"
                    placeholder="98"
                    value={logSpo2}
                    onChange={(e) => setLogSpo2(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Observation & Clinical Progression Notes:
                </label>
                <textarea
                  rows={3}
                  placeholder="Patient sleeping quietly; fluids accepted; oral rehydration continuing..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setSelectedAdmission(null)}
                  style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLog}
                  style={{ padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >
                  {savingLog ? <i className="fas fa-spinner fa-spin" /> : 'Save Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Discharge Patient */}
      {dischargeAdmission && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 12 }}>
              Discharge Patient — {dischargeAdmission.student?.name}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
              Discharging will free Bed {dischargeAdmission.bed?.bedNumber} and record attendance excuse for this period.
            </p>

            <form onSubmit={handleConfirmDischarge}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Discharge Summary / Return to Class Instructions:
                </label>
                <textarea
                  rows={3}
                  placeholder="Recovered, fever subsided. Advised to stay hydrated and avoid strenuous activities for 24h."
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setDischargeAdmission(null)}
                  style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDischarge}
                  style={{ padding: '8px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >
                  {savingDischarge ? <i className="fas fa-spinner fa-spin" /> : 'Confirm Discharge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
