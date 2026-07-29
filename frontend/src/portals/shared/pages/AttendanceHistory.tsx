import { useState } from 'react';
import '../../../styles/portal.css';
import { useToast } from '../../../context/ToastContext';

export default function AttendanceHistory() {
  const { showToast } = useToast();
  const [history] = useState([
    { date: 'Oct 08, 2024', status: 'Present', subject: 'Mathematics' },
    { date: 'Oct 07, 2024', status: 'Present', subject: 'History' },
    { date: 'Oct 04, 2024', status: 'Absent', subject: 'Physics' },
    { date: 'Oct 03, 2024', status: 'Late', subject: 'General' },
  ]);

  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);

  const exportCSV = () => {
    const headers = ['Date,Status,Subject'];
    const rows = history.map(log => `${log.date},${log.status},${log.subject}`);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report generated successfully.', 'success');
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Attendance History</h1>
          <p>A detailed log of daily presence, tardiness, and absences to monitor academic consistency.</p>
        </div>
        <button className="portal-btn-primary" style={{ padding: '12px 24px', fontWeight: 900 }} onClick={exportCSV}>
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
           <button className="portal-btn-ghost" style={{ fontWeight: 800, color: '#2563eb' }} onClick={() => setIsExcuseModalOpen(true)}>Request Absence Excuse</button>
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

      {isExcuseModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal">
            <div className="portal-modal-header">
              <h3 style={{ margin: 0 }}>Request Absence Excuse</h3>
              <button className="portal-btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setIsExcuseModalOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="portal-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="portal-label">Date of Absence</label>
                <input type="date" className="portal-input" />
              </div>
              <div className="form-group">
                <label className="portal-label">Reason</label>
                <textarea className="portal-input" rows={4} placeholder="Please provide details regarding the absence..."></textarea>
              </div>
              <div className="form-group">
                <label className="portal-label">Attachment (Optional)</label>
                <input type="file" className="portal-input" />
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-secondary" onClick={() => setIsExcuseModalOpen(false)}>Cancel</button>
              <button className="portal-btn-primary" onClick={() => { 
                setIsExcuseModalOpen(false); 
                showToast('Excuse request submitted for review.', 'success'); 
              }}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
