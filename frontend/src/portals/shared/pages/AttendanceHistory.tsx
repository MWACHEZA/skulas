import { useState } from 'react';
import '../../../styles/portal.css';

export default function AttendanceHistory() {
  const [history] = useState([
    { date: 'Oct 08, 2024', status: 'Present', subject: 'Mathematics' },
    { date: 'Oct 07, 2024', status: 'Present', subject: 'History' },
    { date: 'Oct 04, 2024', status: 'Absent', subject: 'Physics' },
    { date: 'Oct 03, 2024', status: 'Late', subject: 'General' },
  ]);

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Attendance History</h1>
          <p>A detailed log of daily presence, tardiness, and absences to monitor academic consistency.</p>
        </div>
        <button className="portal-btn-primary" style={{ padding: '12px 24px', fontWeight: 900 }} onClick={() => alert('This feature is currently under development or disabled.')}>
          <i className="fas fa-file-export mr-2"></i>Export Report
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="portal-card" style={{ borderLeft: '4px solid #059669', padding: '32px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Presence Rate</h4>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#059669' }}>94.2%</div>
        </div>
        <div className="portal-card" style={{ borderLeft: '4px solid #f59e0b', padding: '32px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Tardy Incidents</h4>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f59e0b' }}>02</div>
        </div>
        <div className="portal-card" style={{ borderLeft: '4px solid #dc2626', padding: '32px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Authorized Absences</h4>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#dc2626' }}>01</div>
        </div>
      </div>

      <div className="management-table-card">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px', borderBottom: '1px solid #f1f5f9' }}>
           <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}><i className="fas fa-history mr-3" style={{ color: '#2563eb' }}></i>Temporal Activity Log</h3>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Comprehensive breakdown of daily academic attendance.</p>
           </div>
           <button className="portal-btn-ghost" style={{ fontWeight: 800, color: '#2563eb' }} onClick={() => alert('This feature is currently under development or disabled.')}>Request Absence Excuse</button>
        </div>
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '32px' }}>Temporal Identifier</th>
                <th>Validation Status</th>
                <th style={{ paddingRight: '32px' }}>Academic Context</th>
              </tr>
            </thead>
            <tbody>
              {history.map((log, i) => (
                <tr key={i}>
                  <td style={{ paddingLeft: '32px', fontWeight: 800, color: '#1e293b' }}>{log.date}</td>
                  <td>
                    <span className={`status-badge ${
                      log.status === 'Present' ? 'status-active' : 
                      log.status === 'Absent' ? 'status-inactive' : 'status-pending'
                    }`} style={{ fontWeight: 900, padding: '6px 16px' }}>
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ paddingRight: '32px', color: '#64748b', fontWeight: 700 }}>{log.subject}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
