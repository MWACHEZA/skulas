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
  const [targetUserId, setTargetUserId] = useState('');
  const [history, setHistory] = useState<any>(null);

  const fetchHistory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetUserId) {
      toast.error('Please enter a Patient User ID');
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.get(`/api/clinic/patient/${targetUserId}/history`);
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
        <form onSubmit={fetchHistory} className="portal-form" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={targetUserId}
            onChange={e => setTargetUserId(e.target.value)}
            placeholder="Enter Patient User ID"
            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <button type="submit" className="portal-btn" disabled={loading}>
            {loading ? 'Loading...' : 'View History'}
          </button>
        </form>

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
                          <td>{format(new Date(v.visitDate), 'MMM dd, yyyy HH:mm')}</td>
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
