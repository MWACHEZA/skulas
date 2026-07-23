import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const getTriageStyle = (level: string) => {
  switch(level) {
    case 'RED': return { backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' };
    case 'YELLOW': return { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' };
    case 'GREEN': return { backgroundColor: '#dcfce7', color: '#166534', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' };
    case 'BLACK': return { backgroundColor: '#e5e7eb', color: '#111827', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' };
    case 'WHITE': return { backgroundColor: '#ffffff', color: '#374151', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db' };
    default: return { backgroundColor: '#f3f4f6', color: '#374151', padding: '4px 8px', borderRadius: '4px' };
  }
};

export default function PatientHistory() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{patients: any[], users: any[]}>({patients: [], users: []});
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);

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

  const selectPatient = async (patient: any, type: 'patient' | 'user') => {
    setSelectedPatient({...patient, type});
    setSearchQuery('');
    setSearchResults({patients: [], users: []});
    
    setLoading(true);
    try {
      const url = `/api/clinic/patient/${patient.id}/history?type=${type}`;
      const res = await api.get(url);
      setHistory(res.data);
      toast.success('Patient history retrieved');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch history');
      setHistory(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-page">
      <div className="portal-header">
        <h1>Patient Medical History</h1>
      </div>

      <div className="portal-content">
        <div style={{ position: 'relative', marginBottom: '30px' }}>
          {selectedPatient ? (
            <div style={{ backgroundColor: '#f3f4f6', padding: '15px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#1f2937' }}>{selectedPatient.name || `${selectedPatient.firstName} ${selectedPatient.lastName}`}</h3>
                <p style={{ margin: 0, color: '#6b7280' }}>
                  {selectedPatient.type === 'user' ? `Role: ${selectedPatient.role || 'User'}` : 'Walk-in Patient'} 
                  {selectedPatient.contactNumber ? ` | Contact: ${selectedPatient.contactNumber}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => {
                setSelectedPatient(null);
                setHistory(null);
              }} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Change Patient
              </button>
            </div>
          ) : (
            <div className="search-container" style={{ display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <label style={{ fontWeight: 'bold', color: '#374151', marginBottom: '8px', display: 'block' }}>Search Patient (Name, ID, Contact) *</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-search" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}></i>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Start typing to search existing students, staff, or walk-ins..."
                    style={{ width: '100%', padding: '14px 14px 14px 45px', borderRadius: '8px', border: '2px solid #e5e7eb', fontSize: '1.1em', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                {(searchResults.patients.length > 0 || searchResults.users.length > 0) && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 10, border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '5px', maxHeight: '300px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    {searchResults.patients.map(p => (
                      <div key={`p-${p.id}`} onClick={() => selectPatient(p, 'patient')} style={{ padding: '15px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <strong style={{ color: '#111827', fontSize: '1.1em' }}>{p.firstName} {p.lastName}</strong> <span style={{ color: '#6b7280', fontSize: '0.9em' }}>(Walk-in Patient)</span>
                        {p.contactNumber && <div style={{ color: '#6b7280', fontSize: '0.85em', marginTop: '4px' }}>{p.contactNumber}</div>}
                      </div>
                    ))}
                    {searchResults.users.map(u => (
                      <div key={`u-${u.id}`} onClick={() => selectPatient(u, 'user')} style={{ padding: '15px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <strong style={{ color: '#111827', fontSize: '1.1em' }}>{u.name}</strong> <span style={{ color: '#6b7280', fontSize: '0.9em' }}>({u.role})</span>
                        {u.email && <div style={{ color: '#6b7280', fontSize: '0.85em', marginTop: '4px' }}>{u.email}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.length > 2 && searchResults.patients.length === 0 && searchResults.users.length === 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 10, border: '1px solid #e5e7eb', padding: '15px', color: '#6b7280', borderRadius: '8px', marginTop: '5px' }}>
                    No matching patients found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {history && (
          <div className="history-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Triage & Vitals Visits */}
            <div className="portal-card">
              <h2>Recent Clinic Visits (Vitals & Triage)</h2>
              {history.visits && history.visits.length > 0 ? (
                <div className="table-responsive">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Episode</th>
                        <th>Date</th>
                        <th>Complaint</th>
                        <th>Triage</th>
                        <th>Vitals</th>
                        <th>Diagnosis</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.visits.map((v: any) => (
                        <tr key={v.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <strong style={{ color: '#1f2937', fontSize: '1em' }}>
                                Episode: {format(new Date(v.visitDate), 'dd MMM yyyy').toUpperCase()}
                              </strong>
                              <span style={{ color: '#3b82f6', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em', alignSelf: 'flex-start' }}>
                                #{v.visitCode || v.id.slice(0,8)}
                              </span>
                            </div>
                          </td>
                          <td>{format(new Date(v.visitDate), 'HH:mm')}</td>
                          <td>{v.presentingComplaint || 'N/A'}</td>
                          <td>
                            <span style={getTriageStyle(v.triageLevel)}>
                              {v.triageLevel || 'GREEN'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(80px, 1fr))', gap: '6px', fontSize: '0.9em' }}>
                              {v.temperature && <div><i className="fas fa-thermometer-half" style={{ color: '#ef4444', width: '16px', textAlign: 'center', marginRight: '4px' }}></i> {v.temperature}°C</div>}
                              {v.bloodPressure && <div><i className="fas fa-tint" style={{ color: '#b91c1c', width: '16px', textAlign: 'center', marginRight: '4px' }}></i> {v.bloodPressure}</div>}
                              {v.heartRate && <div><i className="fas fa-heartbeat" style={{ color: '#dc2626', width: '16px', textAlign: 'center', marginRight: '4px' }}></i> {v.heartRate} bpm</div>}
                              {v.respiratoryRate && <div><i className="fas fa-lungs" style={{ color: '#0284c7', width: '16px', textAlign: 'center', marginRight: '4px' }}></i> {v.respiratoryRate}</div>}
                              {v.oxygenSaturation && <div><i className="fas fa-wind" style={{ color: '#0ea5e9', width: '16px', textAlign: 'center', marginRight: '4px' }}></i> {v.oxygenSaturation}%</div>}
                              {v.weight && <div><i className="fas fa-weight" style={{ color: '#6b7280', width: '16px', textAlign: 'center', marginRight: '4px' }}></i> {v.weight} kg</div>}
                            </div>
                          </td>
                          <td>{v.diagnosis || 'Pending'}</td>
                          <td>{v.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No clinic visits found.</p>
              )}
            </div>

            {/* Other History Sections (Appointments, Complaints, etc.) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="portal-card">
                <h2>Appointments</h2>
                {history.appointments?.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {history.appointments.map((a: any) => (
                      <li key={a.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                        <strong>{format(new Date(a.date), 'MMM dd, yyyy')}</strong>: {a.appointment} <br/>
                        <small>Symptoms: {a.symptoms}</small>
                      </li>
                    ))}
                  </ul>
                ) : <p>No appointments found.</p>}
              </div>

              <div className="portal-card">
                <h2>Complaints & Illnesses</h2>
                {history.complaints?.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {history.complaints.map((c: any) => (
                      <li key={c.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                        <strong>{format(new Date(c.date), 'MMM dd, yyyy')}</strong>: {c.title} <br/>
                        <small>Symptoms: {c.symptoms}</small>
                      </li>
                    ))}
                  </ul>
                ) : <p>No complaints found.</p>}
              </div>

              <div className="portal-card">
                <h2>Immunizations</h2>
                {history.immunizations?.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {history.immunizations.map((i: any) => (
                      <li key={i.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                        <strong>{format(new Date(i.date), 'MMM dd, yyyy')}</strong>: {i.title}
                      </li>
                    ))}
                  </ul>
                ) : <p>No immunizations found.</p>}
              </div>

              <div className="portal-card">
                <h2>Referrals</h2>
                {history.referrals?.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {history.referrals.map((r: any) => (
                      <li key={r.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                        <strong>{format(new Date(r.date), 'MMM dd, yyyy')}</strong>: Referred to {r.to}
                      </li>
                    ))}
                  </ul>
                ) : <p>No referrals found.</p>}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
