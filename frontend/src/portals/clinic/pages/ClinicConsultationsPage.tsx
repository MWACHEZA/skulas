import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { SearchInput, ExportButton } from '../../../components/shared';

export type ConsultationTab = 'queue' | 'consultation' | 'icd10';

export default function ClinicConsultationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as ConsultationTab) || 'queue';
  const [activeTab, setActiveTab] = useState<ConsultationTab>(currentTab);

  // Queue state
  const [queue, setQueue] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);

  // Beds list for admission disposition
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);

  // Pharmacy catalog for prescriptions
  const [drugsCatalog, setDrugsCatalog] = useState<any[]>([]);

  // Consult Workspace form state
  const [examNotes, setExamNotes] = useState('');
  const [icd10Search, setIcd10Search] = useState('');
  const [icd10Results, setIcd10Results] = useState<any[]>([]);
  const [selectedIcd10, setSelectedIcd10] = useState<any>(null);
  const [parentNote, setParentNote] = useState('');
  
  // Prescriptions list
  const [prescriptions, setPrescriptions] = useState<Array<{ drugName: string; dosage: string; frequency: string; duration: string }>>([]);
  const [currentRx, setCurrentRx] = useState({ drugName: '', dosage: '1 tablet', frequency: 'TDS (8-hourly)', duration: '3 days' });

  // Disposition
  const [disposition, setDisposition] = useState<'DISCHARGE_CLASS' | 'ADMIT_SICK_BAY' | 'REFER_HOSPITAL' | 'EXCUSE_SPORTS'>('DISCHARGE_CLASS');
  const [bedId, setBedId] = useState('');
  const [dietNotes, setDietNotes] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [referralReason, setReferralReason] = useState('');

  // Status
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Tab: ICD-10 Search & Directory
  const [dirSearch, setDirSearch] = useState('');
  const [dirResults, setDirResults] = useState<any[]>([]);
  const [loadingDir, setLoadingDir] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as ConsultationTab;
    if (tabParam && ['queue', 'consultation', 'icd10'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ConsultationTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const loadQueue = async () => {
    try {
      setLoadingQueue(true);
      const res = await api.get('/clinic/consultations/queue');
      setQueue(res.data);
    } catch (err) {
      console.error('Failed to load consultation queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const loadBeds = async () => {
    try {
      const res = await api.get('/clinic/hospitalization/overview');
      const freeBeds = (res.data?.beds || []).filter((b: any) => b.status === 'AVAILABLE');
      setAvailableBeds(freeBeds);
      if (freeBeds.length > 0 && !bedId) {
        setBedId(freeBeds[0].id);
      }
    } catch (err) {
      console.error('Failed to load beds:', err);
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await api.get('/clinic/pharmacy/catalog');
      setDrugsCatalog(res.data || []);
    } catch (err) {
      console.error('Failed to load drug catalog:', err);
    }
  };

  useEffect(() => {
    loadQueue();
    loadBeds();
    loadCatalog();
  }, []);

  const handleStartConsult = (visit: any) => {
    setSelectedVisit(visit);
    setExamNotes('');
    setSelectedIcd10(null);
    setParentNote('');
    setPrescriptions([]);
    setDisposition('DISCHARGE_CLASS');
    setSuccessMsg('');
    setErrorMsg('');
    handleTabChange('consultation');
  };

  const handleSearchIcd10 = async (q: string) => {
    setIcd10Search(q);
    if (q.trim().length < 2) {
      setIcd10Results([]);
      return;
    }
    try {
      const res = await api.get(`/clinic/icd10/search?q=${encodeURIComponent(q.trim())}`);
      setIcd10Results(res.data);
    } catch (err) {
      console.error('ICD10 search failed:', err);
    }
  };

  const handleSelectIcd10 = (item: any) => {
    setSelectedIcd10(item);
    setIcd10Results([]);
    setIcd10Search(`${item.code} - ${item.description}`);
    if (item.parentLabel?.plainLabel) {
      setParentNote(item.parentLabel.plainLabel);
    }
  };

  const handleAddRx = () => {
    if (!currentRx.drugName) {
      setErrorMsg('Please select or specify a medication');
      return;
    }
    setPrescriptions([...prescriptions, { ...currentRx }]);
    setCurrentRx({ drugName: '', dosage: '1 tablet', frequency: 'TDS (8-hourly)', duration: '3 days' });
    setErrorMsg('');
  };

  const handleRemoveRx = (idx: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== idx));
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) {
      setErrorMsg('No active consultation selected');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');
      setSuccessMsg('');

      const payload = {
        visitId: selectedVisit.id,
        examNotes,
        icd10Code: selectedIcd10?.code || null,
        parentNote: parentNote || (selectedIcd10 ? selectedIcd10.description : 'Standard clinical care provided'),
        prescriptions,
        disposition,
        bedId: disposition === 'ADMIT_SICK_BAY' ? bedId : null,
        dietNotes: disposition === 'ADMIT_SICK_BAY' ? dietNotes : null,
        hospitalName: disposition === 'REFER_HOSPITAL' ? hospitalName : null,
        referralReason: disposition === 'REFER_HOSPITAL' ? referralReason : null
      };

      await api.post('/clinic/consultations/finalize', payload);

      setSuccessMsg('Consultation successfully finalized! Attendance records and care instructions updated.');
      setSelectedVisit(null);
      loadQueue();
      loadBeds();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to finalize consultation');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!dirSearch.trim()) {
      setDirResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setLoadingDir(true);
        const res = await api.get(`/clinic/icd10/search?q=${encodeURIComponent(dirSearch.trim())}`);
        setDirResults(res.data);
      } catch (err) {
        console.error('ICD10 dir query failed:', err);
      } finally {
        setLoadingDir(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [dirSearch]);

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-user-md" style={{ color: 'var(--portal-primary, #4f46e5)' }} />
          Clinical Consultations & Diagnostics
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Manage doctor & nurse consult queues, diagnose with ICD-10 coding, prescribe medications, and assign admissions.
        </p>
      </div>

      {/* Tabs */}
      <div className="portal-tabs" style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          onClick={() => handleTabChange('queue')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'queue' ? 600 : 400,
            color: activeTab === 'queue' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'queue' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-list-ol" />
          Consultation Queue
          {queue.length > 0 && (
            <span style={{ background: '#4f46e5', color: '#fff', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 10 }}>
              {queue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('consultation')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'consultation' ? 600 : 400,
            color: activeTab === 'consultation' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'consultation' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-stethoscope" />
          Active Consult Desk
          {selectedVisit && (
            <span style={{ background: '#10b981', color: '#fff', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 10 }}>
              Active
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('icd10')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'icd10' ? 600 : 400,
            color: activeTab === 'icd10' ? '#4f46e5' : '#64748b',
            borderBottom: activeTab === 'icd10' ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-book-medical" />
          ICD-10 Diagnostic Catalog
        </button>
      </div>

      {/* TAB 1: Queue */}
      {activeTab === 'queue' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Patients Awaiting Consultation</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ExportButton
                data={queue.map(item => ({
                  visitCode: item.visitCode,
                  patientName: item.user?.name || 'Walk-in Student',
                  confidential: item.isConfidential ? 'Yes' : 'No',
                  acuity: item.acuity,
                  vitals: item.vitalsRecord
                    ? `T: ${item.vitalsRecord.temp || '-'}°C | BP: ${item.vitalsRecord.bp || '-'} | HR: ${item.vitalsRecord.pulse || '-'} bpm`
                    : 'None logged',
                  complaint: item.presentingComplaint,
                  waitingSince: new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }))}
                columns={[
                  { header: 'Visit Code', key: 'visitCode', width: 15 },
                  { header: 'Patient Name', key: 'patientName', width: 22 },
                  { header: 'Confidential', key: 'confidential', width: 14 },
                  { header: 'Acuity', key: 'acuity', width: 12 },
                  { header: 'Vitals', key: 'vitals', width: 25 },
                  { header: 'Chief Complaint', key: 'complaint', width: 25 },
                  { header: 'Waiting Since', key: 'waitingSince', width: 16 }
                ]}
                filename="clinical_consultation_queue"
                title="Clinical Consultation Waitlist"
                subtitle="Doctor & Nurse Triage Queue"
              />
              <button
                onClick={loadQueue}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.85rem' }}
              >
                <i className="fas fa-sync-alt" /> Refresh
              </button>
            </div>
          </div>

          {loadingQueue ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <i className="fas fa-spinner fa-spin fa-2x" />
              <p style={{ marginTop: 10 }}>Loading queue...</p>
            </div>
          ) : queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <i className="fas fa-check-circle" style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: 12 }} />
              <p style={{ fontWeight: 500 }}>No patients currently waiting in consultation queue.</p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Patients triaged from the triage desk appear here automatically.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>Episode Code</th>
                    <th style={{ padding: '12px 16px' }}>Patient</th>
                    <th style={{ padding: '12px 16px' }}>Acuity</th>
                    <th style={{ padding: '12px 16px' }}>Vitals</th>
                    <th style={{ padding: '12px 16px' }}>Chief Complaint</th>
                    <th style={{ padding: '12px 16px' }}>Waiting Since</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#3b82f6' }}>{item.visitCode}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                        {item.user?.name || 'Walk-in Student'}
                        {item.isConfidential && (
                          <span style={{ marginLeft: 6, fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4 }}>
                            Confidential
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: item.acuity === 'RED' ? '#fee2e2' : item.acuity === 'YELLOW' ? '#fef3c7' : '#dcfce7',
                          color: item.acuity === 'RED' ? '#991b1b' : item.acuity === 'YELLOW' ? '#92400e' : '#166534'
                        }}>
                          {item.acuity}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>
                        {item.vitalsRecord ? (
                          <span>
                            {item.vitalsRecord.temp ? `T: ${item.vitalsRecord.temp}°C ` : ''}
                            {item.vitalsRecord.bp ? `BP: ${item.vitalsRecord.bp} ` : ''}
                            {item.vitalsRecord.pulse ? `HR: ${item.vitalsRecord.pulse} ` : ''}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>None logged</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: '250px' }}>{item.presentingComplaint || 'Routine consult'}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleStartConsult(item)}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.85rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >
                          <i className="fas fa-stethoscope" style={{ marginRight: 6 }} /> Start Consult
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

      {/* TAB 2: Active Consult Desk */}
      {activeTab === 'consultation' && (
        <div>
          {!selectedVisit ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 40, textAlign: 'center' }}>
              <i className="fas fa-inbox" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: 16 }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#334155' }}>No Patient Currently In Consultation</h3>
              <p style={{ color: '#64748b', maxWidth: 450, margin: '8px auto 20px' }}>
                Select a patient from the Consultation Queue to open clinical examination notes, ICD-10 diagnostics, and medication prescriptions.
              </p>
              <button
                onClick={() => handleTabChange('queue')}
                style={{ padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
              >
                Go to Queue
              </button>
            </div>
          ) : (
            <form onSubmit={handleFinalize} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Patient Banner */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{selectedVisit.user?.name || 'Walk-in Patient'}</h2>
                    <span style={{ fontSize: '0.8rem', background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: 4 }}>
                      Episode: {selectedVisit.visitCode}
                    </span>
                    {selectedVisit.isConfidential && (
                      <span style={{ fontSize: '0.8rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                        <i className="fas fa-user-shield" /> CONFIDENTIAL
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: '0.9rem', color: '#475569' }}>
                    <span><strong>Chief Complaint:</strong> {selectedVisit.presentingComplaint}</span>
                    {selectedVisit.vitalsRecord && (
                      <span>
                        <strong>Vitals:</strong> T: {selectedVisit.vitalsRecord.temp || '-'}°C | BP: {selectedVisit.vitalsRecord.bp || '-'} | Pulse: {selectedVisit.vitalsRecord.pulse || '-'} bpm | SpO2: {selectedVisit.vitalsRecord.spo2 || '-'}%
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedVisit(null)}
                  style={{ background: 'none', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}
                >
                  Change Patient
                </button>
              </div>

              {/* Error / Success Messages */}
              {errorMsg && (
                <div style={{ padding: 12, background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 8, color: '#991b1b', fontSize: '0.9rem' }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }} /> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{ padding: 12, background: '#dcfce7', border: '1px solid #22c55e', borderRadius: 8, color: '#166534', fontSize: '0.9rem' }}>
                  <i className="fas fa-check-circle" style={{ marginRight: 6 }} /> {successMsg}
                </div>
              )}

              {/* Consultation Sections: SOAP & ICD10 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Section 1: Clinical Notes (SOAP) */}
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-notes-medical" style={{ color: '#4f46e5' }} /> Clinical Notes & Physical Examination
                  </h3>
                  <textarea
                    rows={6}
                    value={examNotes}
                    onChange={(e) => setExamNotes(e.target.value)}
                    placeholder="Enter clinical examination findings, symptoms progression, systemic reviews, and assessment..."
                    style={{ width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', resize: 'vertical' }}
                  />

                  {/* Sanitized Parent Note */}
                  <div style={{ marginTop: 14 }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                      Parent Portal Plain-Language Summary (Strictly NO raw ICD-10 or clinical jargon):
                    </label>
                    <input
                      type="text"
                      value={parentNote}
                      onChange={(e) => setParentNote(e.target.value)}
                      placeholder="e.g. Mild headache, rested in sick bay with water"
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* Section 2: ICD-10 Diagnosis Search */}
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-barcode" style={{ color: '#4f46e5' }} /> ICD-10 Primary Diagnosis
                  </h3>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={icd10Search}
                      onChange={(e) => handleSearchIcd10(e.target.value)}
                      placeholder="Type ICD code or condition (e.g. R51 for headache, J00 for cold)..."
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem' }}
                    />
                    {icd10Results.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        {icd10Results.map((item) => (
                          <div
                            key={item.code}
                            onClick={() => handleSelectIcd10(item)}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                          >
                            <strong>{item.code}</strong> — {item.description}
                            {item.parentLabel && (
                              <span style={{ display: 'block', fontSize: '0.75rem', color: '#10b981' }}>
                                Parent Plain Label: {item.parentLabel.plainLabel}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedIcd10 && (
                    <div style={{ marginTop: 12, padding: 12, background: '#eff6ff', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                      <div style={{ fontWeight: 600, color: '#1e40af' }}>
                        Selected: [{selectedIcd10.code}] {selectedIcd10.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Prescriptions */}
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-pills" style={{ color: '#4f46e5' }} /> Prescriptions & Medications
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr auto', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <input
                      type="text"
                      list="medications-list"
                      placeholder="Medication name..."
                      value={currentRx.drugName}
                      onChange={(e) => setCurrentRx({ ...currentRx, drugName: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}
                    />
                    <datalist id="medications-list">
                      {drugsCatalog.map((drug) => (
                        <option key={drug.id} value={drug.drugName}>
                          Available: {drug.totalQty} {drug.unit}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 500mg)"
                      value={currentRx.dosage}
                      onChange={(e) => setCurrentRx({ ...currentRx, dosage: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <select
                      value={currentRx.frequency}
                      onChange={(e) => setCurrentRx({ ...currentRx, frequency: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}
                    >
                      <option value="STAT (Immediately)">STAT (Immediately)</option>
                      <option value="OD (Once daily)">OD (Once daily)</option>
                      <option value="BD (Twice daily)">BD (Twice daily)</option>
                      <option value="TDS (8-hourly)">TDS (8-hourly)</option>
                      <option value="QDS (6-hourly)">QDS (6-hourly)</option>
                      <option value="PRN (As needed)">PRN (As needed)</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Duration (e.g. 3 days)"
                      value={currentRx.duration}
                      onChange={(e) => setCurrentRx({ ...currentRx, duration: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem' }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRx}
                    style={{ padding: '8px 16px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    + Add Rx
                  </button>
                </div>

                {prescriptions.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                        <th style={{ padding: 8 }}>Drug Name</th>
                        <th style={{ padding: 8 }}>Dosage</th>
                        <th style={{ padding: 8 }}>Frequency</th>
                        <th style={{ padding: 8 }}>Duration</th>
                        <th style={{ padding: 8, textAlign: 'right' }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((rx, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 8, fontWeight: 500 }}>{rx.drugName}</td>
                          <td style={{ padding: 8 }}>{rx.dosage}</td>
                          <td style={{ padding: 8 }}>{rx.frequency}</td>
                          <td style={{ padding: 8 }}>{rx.duration}</td>
                          <td style={{ padding: 8, textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveRx(idx)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            >
                              <i className="fas fa-trash-alt" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Section 4: Clinical Disposition */}
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-door-open" style={{ color: '#4f46e5' }} /> Disposition & Next Action
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { key: 'DISCHARGE_CLASS', label: 'Discharge to Class / Hostel', icon: 'fa-check' },
                    { key: 'ADMIT_SICK_BAY', label: 'Admit to Sick Bay Bed', icon: 'fa-bed' },
                    { key: 'REFER_HOSPITAL', label: 'Refer to Hospital', icon: 'fa-ambulance' },
                    { key: 'EXCUSE_SPORTS', label: 'Excuse from Sports / PE', icon: 'fa-running' }
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => setDisposition(item.key as any)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: 8,
                        border: disposition === item.key ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                        background: disposition === item.key ? '#eef2ff' : '#fff',
                        color: disposition === item.key ? '#3730a3' : '#475569',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <i className={`fas ${item.icon}`} style={{ fontSize: '1.1rem' }} />
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Conditional Fields based on Disposition */}
                {disposition === 'ADMIT_SICK_BAY' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, background: '#f8fafc', padding: 16, borderRadius: 8 }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Assign Bed:
                      </label>
                      <select
                        value={bedId}
                        onChange={(e) => setBedId(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem' }}
                      >
                        {availableBeds.length === 0 ? (
                          <option value="">No beds available</option>
                        ) : (
                          availableBeds.map((b) => (
                            <option key={b.id} value={b.id}>{b.bedNumber} ({b.ward})</option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Dietary / Special Needs for Kitchen:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bland diet, light porridge only, plenty of fluids"
                        value={dietNotes}
                        onChange={(e) => setDietNotes(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                )}

                {disposition === 'REFER_HOSPITAL' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, background: '#f8fafc', padding: 16, borderRadius: 8 }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Hospital / Health Facility:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. General Hospital Pediatric Wing"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Referral Reason / Urgent Instructions:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Suspected acute appendicitis; urgent ultrasound recommended"
                        value={referralReason}
                        onChange={(e) => setReferralReason(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Finalize */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setSelectedVisit(null)}
                  style={{ padding: '10px 20px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    border: 'none',
                    background: '#4f46e5',
                    color: '#fff',
                    borderRadius: 6,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check-double" />}
                  Finalize Consultation
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: ICD-10 Diagnostic Catalog */}
      {activeTab === 'icd10' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>ICD-10 Diagnostic & Parent Translation Index</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
            Standard medical codes are automatically mapped to plain-language parent notifications so that no clinical jargon leaks to parents.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ width: '100%', maxWidth: 450 }}>
              <SearchInput
                value={dirSearch}
                onChange={setDirSearch}
                placeholder="Search code or diagnosis (e.g. fever, headache, asthma, fracture)..."
                loading={loadingDir}
              />
            </div>
            {dirResults.length > 0 && (
              <ExportButton
                data={dirResults.map(r => ({
                  code: r.code,
                  description: r.description,
                  parentTranslation: r.parentTranslation || r.description,
                  status: 'Active'
                }))}
                columns={[
                  { header: 'ICD-10 Code', key: 'code', width: 16 },
                  { header: 'Clinical Term', key: 'description', width: 30 },
                  { header: 'Plain-English Parent Translation', key: 'parentTranslation', width: 30 },
                  { header: 'Status', key: 'status', width: 12 }
                ]}
                filename="icd10_translation_index"
                title="ICD-10 Diagnostic & Parent Translation Index"
                subtitle="Clinical Code Mapping"
              />
            )}
          </div>

          {dirResults.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>ICD-10 Code</th>
                  <th style={{ padding: '12px 16px' }}>Clinical Term</th>
                  <th style={{ padding: '12px 16px' }}>Plain-English Parent Translation</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dirResults.map((item) => (
                  <tr key={item.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#3b82f6' }}>{item.code}</td>
                    <td style={{ padding: '12px 16px' }}>{item.description}</td>
                    <td style={{ padding: '12px 16px', color: '#059669', fontWeight: 500 }}>
                      {item.parentLabel?.plainLabel || 'General medical care'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 4 }}>
                        Mapped
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
