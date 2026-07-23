import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';

export default function TriageDashboard() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    targetUserId: '',
    patientId: '',
    temperature: '',
    bloodPressure: '',
    heartRate: '',
    respiratoryRate: '',
    weight: '',
    height: '',
    oxygenSaturation: '',
    presentingComplaint: '',
    triageLevel: 'GREEN',
    conditionDetails: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: '',
    status: 'OPEN'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{patients: any[], users: any[]}>({patients: [], users: []});
  const [showRegistration, setShowRegistration] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [registering, setRegistering] = useState(false);
  const [regData, setRegData] = useState({
    firstName: '', lastName: '', dob: '', gender: '', contactNumber: '', address: '', medicalHistory: ''
  });

  const [icdSearch, setIcdSearch] = useState('');
  const [icdResults, setIcdResults] = useState<any[]>([]);
  const [showIcdResults, setShowIcdResults] = useState(false);

  const handleIcdSearch = async (query: string) => {
    setIcdSearch(query);
    if (query.length < 2) {
      setIcdResults([]);
      setShowIcdResults(false);
      return;
    }
    try {
      const res = await api.get(`/api/icd10/search?q=${encodeURIComponent(query)}`);
      setIcdResults(res.data);
      setShowIcdResults(true);
    } catch (e) {
      console.error(e);
    }
  };

  const selectIcdCode = (code: any) => {
    setFormData({...formData, diagnosis: `[${code.code}] ${code.description}`});
    setIcdSearch('');
    setShowIcdResults(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults({patients: [], users: []});
      return;
    }
    try {
      const res = await api.get(`/api/clinic/patients/search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const selectPatient = (patient: any, type: 'patient' | 'user') => {
    setSelectedPatient({...patient, type});
    if (type === 'patient') {
      setFormData({...formData, patientId: patient.id, targetUserId: patient.userId || ''});
    } else {
      setFormData({...formData, targetUserId: patient.id, patientId: ''});
    }
    setSearchQuery('');
    setSearchResults({patients: [], users: []});
  };

  const handleRegisterPatient = async () => {
    if (!regData.firstName || !regData.lastName) {
      toast.error('First and Last name are required');
      return;
    }
    setRegistering(true);
    try {
      const res = await api.post('/api/clinic/patients', regData);
      toast.success('Patient registered successfully!');
      selectPatient(res.data, 'patient');
      setShowRegistration(false);
      setRegData({firstName: '', lastName: '', dob: '', gender: '', contactNumber: '', address: '', medicalHistory: ''});
    } catch (e) {
      toast.error('Failed to register patient');
    } finally {
      setRegistering(false);
    }
  };

  // Automatically calculate triage level based on vitals
  useEffect(() => {
    let level = 'GREEN'; // Default to Green / Minimal
    const temp = parseFloat(formData.temperature);
    const hr = parseInt(formData.heartRate, 10);
    const rr = parseInt(formData.respiratoryRate, 10);
    const spo2 = parseFloat(formData.oxygenSaturation);
    
    let sys = 0;
    let dia = 0;
    if (formData.bloodPressure && formData.bloodPressure.includes('/')) {
      const parts = formData.bloodPressure.split('/');
      sys = parseInt(parts[0], 10);
      dia = parseInt(parts[1], 10);
    }

    // Critical conditions -> RED (Immediate)
    if (
      (temp && (temp > 40.0 || temp < 35.0)) ||
      (hr && (hr > 130 || hr < 40)) ||
      (rr && (rr > 30 || rr < 8)) ||
      (spo2 && spo2 < 90) ||
      (sys && (sys > 200 || sys < 80)) ||
      (dia && dia > 120)
    ) {
      level = 'RED';
    } 
    // Urgent conditions -> YELLOW (Delayed)
    else if (
      (temp && (temp > 38.5 || temp < 36.0)) ||
      (hr && (hr > 110 || hr < 50)) ||
      (rr && (rr > 24 || rr < 12)) ||
      (spo2 && spo2 < 95) ||
      (sys && (sys > 160 || sys < 90)) ||
      (dia && dia > 100)
    ) {
      level = 'YELLOW';
    }

    // Note: BLACK and WHITE are usually manual overrides based on clinician assessment

    if (formData.triageLevel !== level && formData.triageLevel !== 'BLACK' && formData.triageLevel !== 'WHITE') {
      setFormData(prev => ({ ...prev, triageLevel: level }));
    }
  }, [
    formData.temperature, 
    formData.heartRate, 
    formData.respiratoryRate, 
    formData.oxygenSaturation, 
    formData.bloodPressure
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.targetUserId && !formData.patientId) {
      toast.error('Please specify a patient');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/api/clinic/visits', formData);
      toast.success('Clinic visit recorded successfully!');
      setFormData({
        targetUserId: '',
        patientId: '',
        temperature: '',
        bloodPressure: '',
        heartRate: '',
        respiratoryRate: '',
        weight: '',
        height: '',
        oxygenSaturation: '',
        presentingComplaint: '',
        triageLevel: 'ROUTINE',
        conditionDetails: '',
        diagnosis: '',
        treatment: '',
        prescription: '',
        notes: '',
        status: 'OPEN'
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record visit');
    } finally {
      setLoading(false);
    }
  };

  const hasVitals = !!(
    formData.temperature || 
    formData.bloodPressure || 
    formData.heartRate || 
    formData.respiratoryRate || 
    formData.oxygenSaturation
  );

  return (
    <div className="portal-page">
      <div className="portal-header">
        <h1>Triage & Clinic Visit</h1>
      </div>

      <div className="portal-content">
        <form onSubmit={handleSubmit} className="portal-form">
          <div className="portal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0 }}>Patient Details</h2>
              {!formData.targetUserId && !formData.patientId && !showRegistration && (
                <button type="button" onClick={() => setShowRegistration(true)} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-plus"></i> New Walk-in Patient
                </button>
              )}
            </div>

            {selectedPatient ? (
              <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#1f2937' }}>{selectedPatient.name || `${selectedPatient.firstName} ${selectedPatient.lastName}`}</h3>
                  <p style={{ margin: 0, color: '#6b7280' }}>
                    {selectedPatient.type === 'user' ? `Role: ${selectedPatient.role || 'User'}` : 'Walk-in Patient'} 
                    {selectedPatient.contactNumber ? ` | Contact: ${selectedPatient.contactNumber}` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => {
                  setSelectedPatient(null);
                  setFormData(prev => ({...prev, targetUserId: '', patientId: ''}));
                }} style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Change Patient
                </button>
              </div>
            ) : showRegistration ? (
              <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ marginTop: 0, color: '#374151' }}>Register Walk-in Patient</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <input type="text" placeholder="First Name *" value={regData.firstName} onChange={e => setRegData({...regData, firstName: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  <input type="text" placeholder="Last Name *" value={regData.lastName} onChange={e => setRegData({...regData, lastName: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  <input type="date" placeholder="Date of Birth" value={regData.dob} onChange={e => setRegData({...regData, dob: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  <select value={regData.gender} onChange={e => setRegData({...regData, gender: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <input type="text" placeholder="Contact Number" value={regData.contactNumber} onChange={e => setRegData({...regData, contactNumber: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                  <input type="text" placeholder="Address" value={regData.address} onChange={e => setRegData({...regData, address: e.target.value})} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db' }} />
                </div>
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={handleRegisterPatient} disabled={registering} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background-color 0.2s' }}>
                    <i className="fas fa-save"></i> {registering ? 'Saving...' : 'Save Patient'}
                  </button>
                  <button type="button" onClick={() => setShowRegistration(false)} style={{ padding: '10px 20px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="form-group" style={{ position: 'relative' }}>
                <label style={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px', display: 'block' }}>Search Patient (Name, ID, Contact) *</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}></i>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Start typing to search existing students, staff, or walk-ins..."
                    style={{ width: '100%', padding: '12px 12px 12px 35px', boxSizing: 'border-box', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '1em', transition: 'border-color 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                {(searchResults.patients.length > 0 || searchResults.users.length > 0) && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 10, border: '1px solid #e5e7eb', borderRadius: '4px', maxHeight: '250px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    {searchResults.patients.map(p => (
                      <div key={`p-${p.id}`} onClick={() => selectPatient(p, 'patient')} style={{ padding: '12px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
                        <strong style={{ color: '#111827' }}>{p.firstName} {p.lastName}</strong> <span style={{ color: '#6b7280', fontSize: '0.9em' }}>(Walk-in)</span>
                      </div>
                    ))}
                    {searchResults.users.map(u => (
                      <div key={`u-${u.id}`} onClick={() => selectPatient(u, 'user')} style={{ padding: '12px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
                        <strong style={{ color: '#111827' }}>{u.name}</strong> <span style={{ color: '#6b7280', fontSize: '0.9em' }}>({u.role})</span>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.length > 2 && searchResults.patients.length === 0 && searchResults.users.length === 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 10, border: '1px solid #e5e7eb', padding: '12px', color: '#6b7280' }}>
                    No matching patients found.
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Presenting Complaint</label>
              <input 
                type="text" 
                value={formData.presentingComplaint}
                onChange={e => setFormData({...formData, presentingComplaint: e.target.value})}
                placeholder="Why are they here?"
              />
            </div>
          </div>

          <div className="portal-card" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Vitals</h2>
              {hasVitals && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#6b7280' }}>Calculated Triage:</span>
                  <select 
                    value={formData.triageLevel}
                    onChange={e => setFormData({...formData, triageLevel: e.target.value})}
                    style={{ 
                      backgroundColor: 
                        formData.triageLevel === 'RED' ? '#fee2e2' : 
                        formData.triageLevel === 'YELLOW' ? '#fef3c7' : 
                        formData.triageLevel === 'GREEN' ? '#dcfce7' :
                        formData.triageLevel === 'BLACK' ? '#e5e7eb' :
                        '#ffffff',
                      fontWeight: 'bold',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '20px',
                      outline: 'none',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="RED">🔴 RED (Immediate)</option>
                    <option value="YELLOW">🟡 YELLOW (Delayed)</option>
                    <option value="GREEN">🟢 GREEN (Minimal)</option>
                    <option value="BLACK">⚫ BLACK (Expectant)</option>
                    <option value="WHITE">⚪ WHITE (Dismiss)</option>
                  </select>
                </div>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div className="form-group" style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#374151' }}>
                  <i className="fas fa-thermometer-half" style={{ color: '#ef4444' }}></i> Temperature (°C)
                </label>
                <input type="number" step="0.1" value={formData.temperature} onChange={e => setFormData({...formData, temperature: e.target.value})} style={{ border: 'none', borderBottom: '2px solid #e5e7eb', backgroundColor: 'transparent', borderRadius: 0, padding: '8px 0', fontSize: '1.2em', width: '100%', outline: 'none' }} placeholder="e.g. 36.5" onFocus={e => e.target.style.borderBottomColor = '#3b82f6'} onBlur={e => e.target.style.borderBottomColor = '#e5e7eb'} />
              </div>
              <div className="form-group" style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#374151' }}>
                  <i className="fas fa-tint" style={{ color: '#b91c1c' }}></i> Blood Pressure
                </label>
                <input type="text" value={formData.bloodPressure} onChange={e => setFormData({...formData, bloodPressure: e.target.value})} style={{ border: 'none', borderBottom: '2px solid #e5e7eb', backgroundColor: 'transparent', borderRadius: 0, padding: '8px 0', fontSize: '1.2em', width: '100%', outline: 'none' }} placeholder="e.g. 120/80" onFocus={e => e.target.style.borderBottomColor = '#3b82f6'} onBlur={e => e.target.style.borderBottomColor = '#e5e7eb'} />
              </div>
              <div className="form-group" style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#374151' }}>
                  <i className="fas fa-heartbeat" style={{ color: '#dc2626' }}></i> Heart Rate (bpm)
                </label>
                <input type="number" value={formData.heartRate} onChange={e => setFormData({...formData, heartRate: e.target.value})} style={{ border: 'none', borderBottom: '2px solid #e5e7eb', backgroundColor: 'transparent', borderRadius: 0, padding: '8px 0', fontSize: '1.2em', width: '100%', outline: 'none' }} placeholder="e.g. 80" onFocus={e => e.target.style.borderBottomColor = '#3b82f6'} onBlur={e => e.target.style.borderBottomColor = '#e5e7eb'} />
              </div>
              <div className="form-group" style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#374151' }}>
                  <i className="fas fa-lungs" style={{ color: '#0284c7' }}></i> Respiratory Rate
                </label>
                <input type="number" value={formData.respiratoryRate} onChange={e => setFormData({...formData, respiratoryRate: e.target.value})} style={{ border: 'none', borderBottom: '2px solid #e5e7eb', backgroundColor: 'transparent', borderRadius: 0, padding: '8px 0', fontSize: '1.2em', width: '100%', outline: 'none' }} placeholder="e.g. 16" onFocus={e => e.target.style.borderBottomColor = '#3b82f6'} onBlur={e => e.target.style.borderBottomColor = '#e5e7eb'} />
              </div>
              <div className="form-group" style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#374151' }}>
                  <i className="fas fa-wind" style={{ color: '#0ea5e9' }}></i> SpO2 (%)
                </label>
                <input type="number" step="0.1" value={formData.oxygenSaturation} onChange={e => setFormData({...formData, oxygenSaturation: e.target.value})} style={{ border: 'none', borderBottom: '2px solid #e5e7eb', backgroundColor: 'transparent', borderRadius: 0, padding: '8px 0', fontSize: '1.2em', width: '100%', outline: 'none' }} placeholder="e.g. 98" onFocus={e => e.target.style.borderBottomColor = '#3b82f6'} onBlur={e => e.target.style.borderBottomColor = '#e5e7eb'} />
              </div>
              <div className="form-group" style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#374151' }}>
                  <i className="fas fa-weight" style={{ color: '#4b5563' }}></i> Weight (kg)
                </label>
                <input type="number" step="0.1" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} style={{ border: 'none', borderBottom: '2px solid #e5e7eb', backgroundColor: 'transparent', borderRadius: 0, padding: '8px 0', fontSize: '1.2em', width: '100%', outline: 'none' }} placeholder="e.g. 65" onFocus={e => e.target.style.borderBottomColor = '#3b82f6'} onBlur={e => e.target.style.borderBottomColor = '#e5e7eb'} />
              </div>
              <div className="form-group" style={{ backgroundColor: '#ffffff', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#374151' }}>
                  <i className="fas fa-ruler-vertical" style={{ color: '#4b5563' }}></i> Height (cm)
                </label>
                <input type="number" step="0.1" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} style={{ border: 'none', borderBottom: '2px solid #e5e7eb', backgroundColor: 'transparent', borderRadius: 0, padding: '8px 0', fontSize: '1.2em', width: '100%', outline: 'none' }} placeholder="e.g. 170" onFocus={e => e.target.style.borderBottomColor = '#3b82f6'} onBlur={e => e.target.style.borderBottomColor = '#e5e7eb'} />
              </div>
            </div>
          </div>

          <div className="portal-card" style={{ marginTop: '20px' }}>
            <h2>Consultation & Treatment</h2>
            <div className="form-group">
              <label>Condition Details / Notes</label>
              <textarea value={formData.conditionDetails} onChange={e => setFormData({...formData, conditionDetails: e.target.value})} rows={3} />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Diagnosis (ICD-10)</label>
              <input 
                type="text" 
                value={formData.diagnosis} 
                onChange={e => setFormData({...formData, diagnosis: e.target.value})} 
                placeholder="Selected diagnosis or free text"
                style={{ marginBottom: '10px' }}
              />
              <input 
                type="text"
                value={icdSearch}
                onChange={e => handleIcdSearch(e.target.value)}
                placeholder="Search ICD-10 code or description..."
                style={{ border: '1px solid #d1d5db', padding: '8px', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}
              />
              {showIcdResults && icdResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #d1d5db', zIndex: 10, maxHeight: '200px', overflowY: 'auto', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  {icdResults.map(code => (
                    <div 
                      key={code.id} 
                      onClick={() => selectIcdCode(code)}
                      style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    >
                      <strong>{code.code}</strong> - {code.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Treatment Provided</label>
              <input type="text" value={formData.treatment} onChange={e => setFormData({...formData, treatment: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Prescription</label>
              <input type="text" value={formData.prescription} onChange={e => setFormData({...formData, prescription: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="OPEN">OPEN - Under Observation</option>
                <option value="ADMITTED">ADMITTED - To Sickbay</option>
                <option value="REFERRED">REFERRED - To Hospital</option>
                <option value="DISCHARGED">DISCHARGED - Sent back to class/home</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="portal-btn" 
              disabled={loading}
              style={{ padding: '12px 30px', fontSize: '1.1em', fontWeight: 'bold', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)', transition: 'all 0.2s' }}
              onMouseEnter={e => { if(!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.4)'; } }}
              onMouseLeave={e => { if(!loading) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(59, 130, 246, 0.4)'; } }}
            >
              <i className="fas fa-file-medical-alt"></i>
              {loading ? 'Saving Record...' : 'Record Visit & Vitals'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
