import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';

interface IcdCode { id: string; code: string; description: string; }
interface PrescriptionItem { medicine: string; dose: string; instructions: string; }

const EMPTY_RX: PrescriptionItem = { medicine: '', dose: '', instructions: '' };

export default function TriageDashboard() {
  const [loading, setLoading] = useState(false);
  const [triageSubmitted, setTriageSubmitted] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);

  // Patient selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{patients: any[]; users: any[]}>({patients:[], users:[]});
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Walk-in registration (modal)
  const [regData, setRegData] = useState({ firstName:'', lastName:'', dob:'', gender:'', contactNumber:'', address:'', medicalHistory:'' });
  const [registering, setRegistering] = useState(false);

  // Vitals
  const [vitals, setVitals] = useState({
    temperature:'', bloodPressure:'', heartRate:'', respiratoryRate:'', oxygenSaturation:'', weight:'', height:'', triageLevel:'GREEN', presentingComplaint:''
  });

  // Consultation (shown after triage)
  const [consultation, setConsultation] = useState({
    conditionDetails:'', treatment:'', status:'OPEN', notes:''
  });
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [icdSearch, setIcdSearch] = useState('');
  const [icdResults, setIcdResults] = useState<IcdCode[]>([]);
  const [showIcdResults, setShowIcdResults] = useState(false);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([{ ...EMPTY_RX }]);

  // Auto triage level
  useEffect(() => {
    let level = 'GREEN';
    const temp = parseFloat(vitals.temperature);
    const hr = parseInt(vitals.heartRate, 10);
    const rr = parseInt(vitals.respiratoryRate, 10);
    const spo2 = parseFloat(vitals.oxygenSaturation);
    let sys = 0;
    if (vitals.bloodPressure?.includes('/')) sys = parseInt(vitals.bloodPressure.split('/')[0], 10);
    if ((temp && (temp > 40 || temp < 35)) || (hr && (hr > 130 || hr < 40)) || (rr && (rr > 30 || rr < 8)) || (spo2 && spo2 < 90) || (sys && (sys > 200 || sys < 80))) level = 'RED';
    else if ((temp && (temp > 38.5 || temp < 36)) || (hr && (hr > 110 || hr < 50)) || (rr && (rr > 24 || rr < 12)) || (spo2 && spo2 < 95) || (sys && (sys > 160 || sys < 90))) level = 'YELLOW';
    if (vitals.triageLevel !== 'BLACK' && vitals.triageLevel !== 'WHITE') {
      setVitals(prev => ({ ...prev, triageLevel: level }));
    }
  }, [vitals.temperature, vitals.heartRate, vitals.respiratoryRate, vitals.oxygenSaturation, vitals.bloodPressure]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults({patients:[], users:[]}); return; }
    try {
      const res = await api.get(`/api/clinic/patients/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data);
    } catch {}
  };

  const selectPatient = (p: any, type: 'patient'|'user') => {
    setSelectedPatient({...p, type});
    setSearchQuery('');
    setSearchResults({patients:[], users:[]});
  };

  const handleRegisterWalkIn = async () => {
    if (!regData.firstName || !regData.lastName) { toast.error('First and last name required'); return; }
    setRegistering(true);
    try {
      const res = await api.post('/api/clinic/patients', regData);
      toast.success('Patient registered!');
      selectPatient(res.data, 'patient');
      setShowWalkInModal(false);
      setRegData({ firstName:'', lastName:'', dob:'', gender:'', contactNumber:'', address:'', medicalHistory:'' });
    } catch { toast.error('Failed to register patient'); }
    finally { setRegistering(false); }
  };

  const handleIcdSearch = async (q: string) => {
    setIcdSearch(q);
    if (q.length < 2) { setIcdResults([]); setShowIcdResults(false); return; }
    try {
      const res = await api.get(`/api/icd10/search?q=${encodeURIComponent(q)}`);
      setIcdResults(res.data); setShowIcdResults(true);
    } catch {}
  };

  const addDiagnosis = (code: IcdCode) => {
    const label = `[${code.code}] ${code.description}`;
    if (!diagnoses.includes(label)) setDiagnoses(prev => [...prev, label]);
    setIcdSearch(''); setShowIcdResults(false);
  };

  const removeDiagnosis = (i: number) => setDiagnoses(prev => prev.filter((_, idx) => idx !== i));

  const addPrescription = () => setPrescriptions(prev => [...prev, { ...EMPTY_RX }]);
  const removePrescription = (i: number) => setPrescriptions(prev => prev.filter((_, idx) => idx !== i));
  const updateRx = (i: number, field: keyof PrescriptionItem, val: string) => {
    setPrescriptions(prev => prev.map((rx, idx) => idx === i ? { ...rx, [field]: val } : rx));
  };

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) { toast.error('Please select a patient'); return; }
    setLoading(true);
    try {
      await api.post('/api/clinic/visits', {
        targetUserId: selectedPatient.type === 'user' ? selectedPatient.id : (selectedPatient.userId || ''),
        patientId: selectedPatient.type === 'patient' ? selectedPatient.id : '',
        ...vitals,
        diagnosis: diagnoses.join(' | '),
        ...consultation,
        prescription: prescriptions.filter(r => r.medicine).map(r => `${r.medicine} — ${r.dose} — ${r.instructions}`).join('\n'),
        status: consultation.status || 'OPEN'
      });
      toast.success('Visit & vitals recorded!');
      setTriageSubmitted(false);
      setSelectedPatient(null);
      setVitals({ temperature:'', bloodPressure:'', heartRate:'', respiratoryRate:'', oxygenSaturation:'', weight:'', height:'', triageLevel:'GREEN', presentingComplaint:'' });
      setDiagnoses([]);
      setPrescriptions([{ ...EMPTY_RX }]);
      setConsultation({ conditionDetails:'', treatment:'', status:'OPEN', notes:'' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record visit');
    } finally { setLoading(false); }
  };

  const tlColor: Record<string,string> = { RED:'#fee2e2', YELLOW:'#fef3c7', GREEN:'#dcfce7', BLACK:'#e5e7eb', WHITE:'#f9fafb' };
  const hasVitals = !!(vitals.temperature || vitals.bloodPressure || vitals.heartRate || vitals.oxygenSaturation);

  return (
    <div className="portal-page">
      {/* Walk-in Modal */}
      {showWalkInModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:32, width:'90%', maxWidth:680, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ margin:0, color:'#1f2937' }}><i className="fas fa-user-plus" style={{ color:'#3b82f6', marginRight:10 }}></i>Register Walk-in Patient</h2>
              <button onClick={() => setShowWalkInModal(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#6b7280' }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {[['First Name *','firstName','text'],['Last Name *','lastName','text'],['Date of Birth','dob','date'],['Contact Number','contactNumber','text'],['Address','address','text']].map(([label, field, type]) => (
                <div key={field}>
                  <label style={{ fontWeight:'bold', color:'#374151', display:'block', marginBottom:4, fontSize:'0.85em' }}>{label}</label>
                  <input type={type} value={(regData as any)[field]} onChange={e => setRegData({...regData, [field]:e.target.value})} style={{ width:'100%', padding:'10px', border:'1px solid #d1d5db', borderRadius:6, boxSizing:'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontWeight:'bold', color:'#374151', display:'block', marginBottom:4, fontSize:'0.85em' }}>Gender</label>
                <select value={regData.gender} onChange={e => setRegData({...regData, gender:e.target.value})} style={{ width:'100%', padding:'10px', border:'1px solid #d1d5db', borderRadius:6 }}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              <label style={{ fontWeight:'bold', color:'#374151', display:'block', marginBottom:4, fontSize:'0.85em' }}>Medical History / Allergies</label>
              <textarea value={regData.medicalHistory} onChange={e => setRegData({...regData, medicalHistory:e.target.value})} rows={2} style={{ width:'100%', padding:'10px', border:'1px solid #d1d5db', borderRadius:6, boxSizing:'border-box' }} />
            </div>
            <div style={{ display:'flex', gap:12, marginTop:20 }}>
              <button onClick={handleRegisterWalkIn} disabled={registering} style={{ flex:1, padding:'12px', background:'#3b82f6', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:'bold', fontSize:'1em' }}>
                <i className="fas fa-save" style={{ marginRight:8 }}></i>{registering ? 'Saving...' : 'Save & Continue to Triage'}
              </button>
              <button onClick={() => setShowWalkInModal(false)} style={{ padding:'12px 24px', background:'#e5e7eb', color:'#374151', border:'none', borderRadius:8, cursor:'pointer', fontWeight:'bold' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="portal-header">
        <h1>Triage &amp; Clinic Visit</h1>
      </div>

      <div className="portal-content">
        <form onSubmit={handleTriageSubmit} className="portal-form">

          {/* STEP 1 — Patient */}
          <div className="portal-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ margin:0 }}>Step 1 — Patient Identification</h2>
              {!selectedPatient && (
                <button type="button" onClick={() => setShowWalkInModal(true)} style={{ padding:'8px 16px', background:'#3b82f6', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontWeight:'bold' }}>
                  <i className="fas fa-plus" style={{ marginRight:6 }}></i>New Walk-in
                </button>
              )}
            </div>
            {selectedPatient ? (
              <div style={{ background:'#f0fdf4', padding:16, borderRadius:8, border:'1px solid #bbf7d0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <strong style={{ fontSize:'1.1em', color:'#166534' }}>{selectedPatient.name || `${selectedPatient.firstName} ${selectedPatient.lastName}`}</strong>
                  <p style={{ margin:'4px 0 0', color:'#6b7280', fontSize:'0.9em' }}>{selectedPatient.type === 'user' ? selectedPatient.role : 'Walk-in Patient'} {selectedPatient.contactNumber ? `· ${selectedPatient.contactNumber}` : ''}</p>
                </div>
                <button type="button" onClick={() => { setSelectedPatient(null); setTriageSubmitted(false); }} style={{ padding:'6px 12px', background:'#ef4444', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>Change</button>
              </div>
            ) : (
              <div style={{ position:'relative' }}>
                <label style={{ fontWeight:'bold', color:'#374151', marginBottom:8, display:'block' }}>Search Patient (name, ID, contact)</label>
                <div style={{ position:'relative' }}>
                  <i className="fas fa-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }}></i>
                  <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} placeholder="Start typing..." style={{ width:'100%', padding:'12px 12px 12px 36px', border:'2px solid #e5e7eb', borderRadius:8, boxSizing:'border-box', fontSize:'1em' }} />
                </div>
                {(searchResults.patients.length > 0 || searchResults.users.length > 0) && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e5e7eb', borderRadius:4, zIndex:10, maxHeight:220, overflowY:'auto', boxShadow:'0 10px 25px rgba(0,0,0,0.1)' }}>
                    {searchResults.patients.map(p => <div key={`p-${p.id}`} onClick={() => selectPatient(p,'patient')} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #f3f4f6' }}><strong>{p.firstName} {p.lastName}</strong> <span style={{ color:'#6b7280', fontSize:'0.85em' }}>(Walk-in)</span></div>)}
                    {searchResults.users.map(u => <div key={`u-${u.id}`} onClick={() => selectPatient(u,'user')} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #f3f4f6' }}><strong>{u.name}</strong> <span style={{ color:'#6b7280', fontSize:'0.85em' }}>({u.role})</span></div>)}
                  </div>
                )}
              </div>
            )}
            {selectedPatient && (
              <div style={{ marginTop:16 }}>
                <label style={{ fontWeight:'bold', color:'#374151', marginBottom:6, display:'block' }}>Presenting Complaint</label>
                <input type="text" value={vitals.presentingComplaint} onChange={e => setVitals({...vitals, presentingComplaint:e.target.value})} placeholder="Why are they here?" style={{ width:'100%', padding:'10px', border:'1px solid #d1d5db', borderRadius:6, boxSizing:'border-box' }} />
              </div>
            )}
          </div>

          {/* STEP 2 — Vitals (only when patient selected) */}
          {selectedPatient && (
            <div className="portal-card" style={{ marginTop:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h2 style={{ margin:0 }}>Step 2 — Vitals &amp; Triage</h2>
                {hasVitals && (
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontWeight:'bold', color:'#6b7280' }}>Triage Level:</span>
                    <select value={vitals.triageLevel} onChange={e => setVitals({...vitals, triageLevel:e.target.value})} style={{ backgroundColor: tlColor[vitals.triageLevel] || '#fff', fontWeight:'bold', border:'none', padding:'8px 12px', borderRadius:20, cursor:'pointer' }}>
                      <option value="RED">🔴 RED (Immediate)</option>
                      <option value="YELLOW">🟡 YELLOW (Delayed)</option>
                      <option value="GREEN">🟢 GREEN (Minimal)</option>
                      <option value="BLACK">⚫ BLACK (Expectant)</option>
                      <option value="WHITE">⚪ WHITE (Dismiss)</option>
                    </select>
                  </div>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16 }}>
                {[
                  { label:'Temperature (°C)', icon:'fa-thermometer-half', color:'#ef4444', key:'temperature', type:'number', step:'0.1', ph:'36.5' },
                  { label:'Blood Pressure', icon:'fa-tint', color:'#b91c1c', key:'bloodPressure', type:'text', ph:'120/80' },
                  { label:'Heart Rate (bpm)', icon:'fa-heartbeat', color:'#dc2626', key:'heartRate', type:'number', ph:'80' },
                  { label:'Respiratory Rate', icon:'fa-lungs', color:'#0284c7', key:'respiratoryRate', type:'number', ph:'16' },
                  { label:'SpO2 (%)', icon:'fa-wind', color:'#0ea5e9', key:'oxygenSaturation', type:'number', step:'0.1', ph:'98' },
                  { label:'Weight (kg)', icon:'fa-weight', color:'#4b5563', key:'weight', type:'number', step:'0.1', ph:'65' },
                  { label:'Height (cm)', icon:'fa-ruler-vertical', color:'#4b5563', key:'height', type:'number', step:'0.1', ph:'170' },
                ].map(f => (
                  <div key={f.key} style={{ background:'#fff', padding:14, borderRadius:10, border:'1px solid #e5e7eb', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontWeight:'bold', color:'#374151', marginBottom:8, fontSize:'0.85em' }}>
                      <i className={`fas ${f.icon}`} style={{ color: f.color }}></i>{f.label}
                    </label>
                    <input type={f.type} step={(f as any).step} value={(vitals as any)[f.key]} onChange={e => setVitals({...vitals, [f.key]: e.target.value})} placeholder={f.ph} style={{ border:'none', borderBottom:'2px solid #e5e7eb', background:'transparent', padding:'6px 0', fontSize:'1.1em', width:'100%', outline:'none' }} />
                  </div>
                ))}
              </div>
              {!triageSubmitted && (
                <div style={{ marginTop:20, display:'flex', justifyContent:'flex-end' }}>
                  <button type="button" onClick={() => { if (!hasVitals) { toast.error('Please record at least one vital sign'); return; } setTriageSubmitted(true); }} style={{ padding:'10px 24px', background:'#0ea5e9', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:'bold', fontSize:'1em' }}>
                    <i className="fas fa-check" style={{ marginRight:8 }}></i>Confirm Triage — Proceed to Consultation
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Consultation (only after triage confirmed) */}
          {selectedPatient && triageSubmitted && (
            <div className="portal-card" style={{ marginTop:20, borderTop:'3px solid #3b82f6' }}>
              <h2 style={{ marginTop:0, color:'#1d4ed8' }}>Step 3 — Consultation &amp; Treatment</h2>

              <div className="form-group">
                <label style={{ fontWeight:'bold', color:'#374151' }}>Condition Details / Notes</label>
                <textarea value={consultation.conditionDetails} onChange={e => setConsultation({...consultation, conditionDetails:e.target.value})} rows={3} style={{ width:'100%', border:'1px solid #d1d5db', borderRadius:6, padding:'10px', boxSizing:'border-box' }} />
              </div>

              {/* Multiple Diagnoses */}
              <div style={{ marginTop:16 }}>
                <label style={{ fontWeight:'bold', color:'#374151', display:'block', marginBottom:8 }}>Diagnosis (ICD-10) — Add Multiple</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 }}>
                  {diagnoses.map((d, i) => (
                    <span key={i} style={{ background:'#dbeafe', color:'#1e40af', padding:'4px 12px', borderRadius:20, fontSize:'0.85em', display:'flex', alignItems:'center', gap:6 }}>
                      {d}
                      <button type="button" onClick={() => removeDiagnosis(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontWeight:'bold', padding:0, fontSize:'1em' }}>✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ position:'relative' }}>
                  <input type="text" value={icdSearch} onChange={e => handleIcdSearch(e.target.value)} placeholder="Search ICD-10 code or description to add..." style={{ width:'100%', padding:'10px', border:'1px solid #d1d5db', borderRadius:6, boxSizing:'border-box' }} />
                  {showIcdResults && icdResults.length > 0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #d1d5db', zIndex:10, maxHeight:200, overflowY:'auto', borderRadius:4, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
                      {icdResults.map(code => (
                        <div key={code.id} onClick={() => addDiagnosis(code)} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #f3f4f6' }}>
                          <strong style={{ color:'#1e40af' }}>{code.code}</strong> — {code.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Treatment */}
              <div style={{ marginTop:16 }}>
                <label style={{ fontWeight:'bold', color:'#374151', display:'block', marginBottom:6 }}>Treatment Provided</label>
                <input type="text" value={consultation.treatment} onChange={e => setConsultation({...consultation, treatment:e.target.value})} style={{ width:'100%', padding:'10px', border:'1px solid #d1d5db', borderRadius:6, boxSizing:'border-box' }} />
              </div>

              {/* Multiple Prescriptions */}
              <div style={{ marginTop:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <label style={{ fontWeight:'bold', color:'#374151' }}>Prescriptions — Add Multiple</label>
                  <button type="button" onClick={addPrescription} style={{ padding:'6px 14px', background:'#10b981', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.85em', fontWeight:'bold' }}>
                    <i className="fas fa-plus" style={{ marginRight:4 }}></i>Add Prescription
                  </button>
                </div>
                {prescriptions.map((rx, i) => (
                  <div key={i} style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:14, marginBottom:10 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 2fr auto', gap:10, alignItems:'center' }}>
                      <div>
                        <label style={{ fontSize:'0.8em', fontWeight:'bold', color:'#6b7280' }}>Medicine / Drug</label>
                        <input type="text" value={rx.medicine} onChange={e => updateRx(i,'medicine',e.target.value)} placeholder="e.g. Paracetamol 500mg" style={{ width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:4, boxSizing:'border-box', marginTop:4 }} />
                      </div>
                      <div>
                        <label style={{ fontSize:'0.8em', fontWeight:'bold', color:'#6b7280' }}>Dose</label>
                        <input type="text" value={rx.dose} onChange={e => updateRx(i,'dose',e.target.value)} placeholder="e.g. 1 tablet" style={{ width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:4, boxSizing:'border-box', marginTop:4 }} />
                      </div>
                      <div>
                        <label style={{ fontSize:'0.8em', fontWeight:'bold', color:'#6b7280' }}>Instructions</label>
                        <input type="text" value={rx.instructions} onChange={e => updateRx(i,'instructions',e.target.value)} placeholder="e.g. 3x daily after meals" style={{ width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:4, boxSizing:'border-box', marginTop:4 }} />
                      </div>
                      {prescriptions.length > 1 && (
                        <button type="button" onClick={() => removePrescription(i)} style={{ background:'#ef4444', color:'#fff', border:'none', borderRadius:4, cursor:'pointer', padding:'8px', marginTop:20 }}>✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div style={{ marginTop:16 }}>
                <label style={{ fontWeight:'bold', color:'#374151', display:'block', marginBottom:6 }}>Visit Status</label>
                <select value={consultation.status} onChange={e => setConsultation({...consultation, status:e.target.value})} style={{ width:'100%', padding:'10px', border:'1px solid #d1d5db', borderRadius:6, boxSizing:'border-box' }}>
                  <option value="OPEN">OPEN — Under Observation</option>
                  <option value="ADMITTED">ADMITTED — To Sickbay</option>
                  <option value="REFERRED">REFERRED — To Hospital</option>
                  <option value="DISCHARGED">DISCHARGED — Sent back</option>
                </select>
              </div>

              {/* Submit */}
              <div style={{ marginTop:24, display:'flex', justifyContent:'flex-end' }}>
                <button type="submit" disabled={loading} style={{ padding:'14px 36px', fontSize:'1.05em', fontWeight:'bold', background:'#3b82f6', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
                  <i className="fas fa-file-medical-alt"></i>
                  {loading ? 'Saving Record...' : 'Record Visit & Vitals'}
                </button>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
