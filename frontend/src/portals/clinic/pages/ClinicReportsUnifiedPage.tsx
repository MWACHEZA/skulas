import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { SearchInput, ExportButton } from '../../../components/shared';

export type ReportsTab = 'patients' | 'analytics' | 'billing';

export interface PatientSearchResult {
  id: string;
  name: string;
  studentId?: string;
  class?: { name?: string };
  hostel?: { name?: string };
  healthProfile?: {
    allergies?: string[];
    chronicConditions?: string[];
    bloodGroup?: string;
    emergencyContact?: string;
  };
}

export interface ClinicVisitRecord {
  id: string;
  visitCode?: string;
  createdAt: string;
  presentingComplaint?: string;
  conditionDetails?: string;
  disposition?: string;
}

export interface PatientDossier {
  student: PatientSearchResult;
  visits?: ClinicVisitRecord[];
}

export interface TopAilment {
  name: string;
  count: number;
}

export interface ClinicAnalyticsData {
  topAilments?: TopAilment[];
  visitsBySource?: {
    walkIn?: number;
    teacherReferral?: number;
    studentBooking?: number;
    matronAlert?: number;
  };
}

export default function ClinicReportsUnifiedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as ReportsTab) || 'patients';
  const [activeTab, setActiveTab] = useState<ReportsTab>(currentTab);

  // Tab 1: Patients & Medical Files
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedStudentFile, setSelectedStudentFile] = useState<PatientDossier | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  // Tab 2: Analytics
  const [analyticsData, setAnalyticsData] = useState<ClinicAnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as ReportsTab;
    if (tabParam && ['patients', 'analytics', 'billing'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ReportsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.trim().length < 2) {
      setPatientResults([]);
      setSearchingPatients(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchingPatients(true);
        const res = await api.get(`/clinic/reports/patients-search?q=${encodeURIComponent(patientQuery.trim())}`);
        setPatientResults(res.data || []);
      } catch (err) {
        console.error('Failed to search patients:', err);
      } finally {
        setSearchingPatients(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientQuery]);

  const handleOpenPatientFile = async (student: PatientSearchResult) => {
    try {
      setLoadingFile(true);
      // Fetch full audited patient clinical file
      const res = await api.get(`/clinic/admin/patient-file/${student.id}`);
      setSelectedStudentFile(res.data);
    } catch (err) {
      console.error('Failed to load patient clinical file:', err);
    } finally {
      setLoadingFile(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await api.get('/clinic/reports/analytics');
      setAnalyticsData(res.data);
    } catch (err) {
      console.error('Failed to load clinical analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab]);

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-chart-line" style={{ color: 'var(--portal-primary, #4f46e5)' }} />
          Clinical Reports, Dossiers & Morbidity Analytics
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Comprehensive patient medical records search, epidemiologic morbidity trends, and dispensary billing reconciliation.
        </p>
      </div>

      {/* Tabs */}
      <div className="portal-tabs" style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          onClick={() => handleTabChange('patients')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'patients' ? 600 : 400,
            color: activeTab === 'patients' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'patients' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-id-card-alt" />
          Patient Medical Files
        </button>

        <button
          onClick={() => handleTabChange('analytics')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'analytics' ? 600 : 400,
            color: activeTab === 'analytics' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'analytics' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-chart-pie" />
          Epidemiological Morbidity Analytics
        </button>

        <button
          onClick={() => handleTabChange('billing')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'billing' ? 600 : 400,
            color: activeTab === 'billing' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'billing' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-file-invoice-dollar" />
          Dispensary & Clinic Billing
        </button>
      </div>

      {/* TAB 1: Patients & Medical Files */}
      {activeTab === 'patients' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedStudentFile ? '1fr 2fr' : '1fr', gap: 20 }}>
          {/* Search column */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Search Student Dossier</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
              All views of individual medical dossiers are recorded in the clinic security audit log.
            </p>

            <div style={{ marginBottom: 16 }}>
              <SearchInput
                placeholder="Search student name or admission number..."
                value={patientQuery}
                onChange={setPatientQuery}
                loading={searchingPatients}
                onClear={() => setPatientResults([])}
                width="100%"
              />
            </div>

            {patientResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {patientResults.map((stud) => (
                  <div
                    key={stud.id}
                    onClick={() => handleOpenPatientFile(stud)}
                    style={{
                      padding: 12,
                      border: selectedStudentFile?.student?.id === stud.id ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: selectedStudentFile?.student?.id === stud.id ? '#eef2ff' : '#f8fafc'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{stud.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                      ID: {stud.studentId || 'N/A'} | Class: {stud.class?.name || 'Standard'} | Hostel: {stud.hostel?.name || 'Day'}
                    </div>
                    {(stud.healthProfile?.allergies?.length ?? 0) > 0 && (
                      <div style={{ marginTop: 4, fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                        <i className="fas fa-exclamation-circle" /> Allergies: {stud.healthProfile?.allergies?.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dossier details column */}
          {selectedStudentFile && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
              {loadingFile ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <i className="fas fa-spinner fa-spin fa-2x" />
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 16 }}>
                    <div>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>{selectedStudentFile.student?.name}</h2>
                      <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 2 }}>
                        Admission No: {selectedStudentFile.student?.studentId} | Class: {selectedStudentFile.student?.class?.name} | Blood Group: {selectedStudentFile.student?.healthProfile?.bloodGroup || 'Not specified'}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: 4, fontWeight: 600 }}>
                      Consent on File
                    </span>
                  </div>

                  {/* Medical Alerts */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 8 }}>
                      <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.85rem', marginBottom: 4 }}>
                        <i className="fas fa-allergies" /> Known Allergies
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
                        {(selectedStudentFile.student?.healthProfile?.allergies?.length ?? 0) > 0
                          ? selectedStudentFile.student?.healthProfile?.allergies?.join(', ')
                          : 'No known drug or food allergies'}
                      </div>
                    </div>

                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: 12, borderRadius: 8 }}>
                      <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.85rem', marginBottom: 4 }}>
                        <i className="fas fa-notes-medical" /> Chronic Conditions & Care Plan
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#1e3a8a' }}>
                        {(selectedStudentFile.student?.healthProfile?.chronicConditions?.length ?? 0) > 0
                          ? selectedStudentFile.student?.healthProfile?.chronicConditions?.join(', ')
                          : 'No chronic conditions logged'}
                      </div>
                    </div>
                  </div>

                  {/* Visit History */}
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>
                    Clinical Visit History ({selectedStudentFile.visits?.length || 0})
                  </h3>
                  {selectedStudentFile.visits?.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No clinical visits recorded.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedStudentFile.visits?.map((v: ClinicVisitRecord) => (
                        <div key={v.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <strong>Episode {v.visitCode}</strong>
                            <span style={{ color: '#64748b' }}>{new Date(v.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div><strong>Complaint:</strong> {v.presentingComplaint}</div>
                          {v.conditionDetails && <div style={{ color: '#475569', marginTop: 2 }}><strong>Clinical Notes:</strong> {v.conditionDetails}</div>}
                          {v.disposition && <div style={{ color: '#4f46e5', marginTop: 2 }}><strong>Outcome:</strong> {v.disposition}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Morbidity Analytics */}
      {activeTab === 'analytics' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b' }}>Campus Epidemiological Overview</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
                Diagnostic trends and illness patterns across the school over the past 30 days.
              </p>
            </div>
            <button
              onClick={loadAnalytics}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <i className="fas fa-sync-alt" /> Refresh
            </button>
          </div>

          {loadingAnalytics ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <i className="fas fa-spinner fa-spin fa-2x" />
            </div>
          ) : !analyticsData ? (
            <p>No analytics data available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ExportButton
                  title="Clinic Morbidity & Health Analytics"
                  subtitle="Summary of institutional clinic diagnoses, visits, and patient morbidity"
                  filename={`Clinic_Analytics_${new Date().toISOString().slice(0, 10)}`}
                  columns={[
                    { header: 'Diagnosis / Chief Complaint', key: 'name', width: 30 },
                    { header: 'Case Count', key: 'count', width: 15 },
                  ]}
                  data={analyticsData.topAilments || []}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Top Diagnoses */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>
                    Top Morbidities & Chief Complaints
                  </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {analyticsData.topAilments?.map((a: TopAilment, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 500, color: '#334155' }}>{a.name}</span>
                      <span style={{ background: '#f1f5f9', padding: '2px 10px', borderRadius: 12, fontWeight: 700, color: '#4f46e5' }}>
                        {a.count} cases
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referral Sources */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>
                  Patient Intake Sources
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
                      {analyticsData.visitsBySource?.walkIn || 0}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Walk-in Visits</div>
                  </div>
                  <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4f46e5' }}>
                      {analyticsData.visitsBySource?.teacherReferral || 0}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Teacher Referrals</div>
                  </div>
                  <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#059669' }}>
                      {analyticsData.visitsBySource?.studentBooking || 0}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Wellness Bookings</div>
                  </div>
                  <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#d97706' }}>
                      {analyticsData.visitsBySource?.matronAlert || 0}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Hostel Matron Alerts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}

      {/* TAB 3: Clinic Billing */}
      {activeTab === 'billing' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>Dispensary & Medical Ledger Billing</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
            Postings to school accounts for billable medications, dressings, and special inpatient medical supplies.
          </p>

          <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', color: '#64748b' }}>
            <i className="fas fa-receipt fa-2x" style={{ color: '#94a3b8', marginBottom: 10 }} />
            <p style={{ fontWeight: 500 }}>All standard first-aid, triage, and essential health services are covered by standard health fees.</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Custom billable items are automatically synced to the Bursar / Finance general ledger.</p>
          </div>
        </div>
      )}
    </div>
  );
}
