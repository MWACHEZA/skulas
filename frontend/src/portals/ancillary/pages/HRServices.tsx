import { useState } from 'react';

export default function AncillaryHRServices() {
  const [leaves] = useState([
    { id: 'LV-01', type: 'Annual Leave', start: '2024-12-15', end: '2024-12-30', status: 'Approved' },
    { id: 'LV-02', type: 'Sick Leave', start: '2024-10-10', end: '2024-10-12', status: 'Completed' },
  ]);

  return (
    <>
      <div className="portal-page-header">
        <h1>HR Services</h1>
        <p>Access your employment records, request leave, and view payslip history.</p>
      </div>

      <div className="portal-grid-2">
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-calendar-plus" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Request Leave</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>Leave Type</label>
              <select className="portal-select" style={{ width: '100%', padding: '10px' }}>
                <option>Annual Leave</option>
                <option>Sick Leave</option>
                <option>Maternity/Paternity</option>
                <option>Special Leave</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>Start Date</label>
                <input type="date" className="portal-input" style={{ width: '100%', padding: '8px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>End Date</label>
                <input type="date" className="portal-input" style={{ width: '100%', padding: '8px' }} />
              </div>
            </div>
            <button className="portal-btn-primary" style={{ width: '100%', padding: '12px' }} onClick={() => alert('This feature is currently under development or disabled.')}>Submit Request</button>
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-file-invoice-dollar" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Recent Payslips</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Date Issued</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>September 2024</td>
                  <td>2024-09-25</td>
                  <td><button style={{ background: 'none', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-download"></i></button></td>
                </tr>
                <tr>
                  <td>August 2024</td>
                  <td>2024-08-25</td>
                  <td><button style={{ background: 'none', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-download"></i></button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="portal-card" style={{ marginTop: 24 }}>
        <div className="portal-card-header">
          <h2><i className="fas fa-history" style={{ marginRight: 8, color: '#805ad5' }}></i>My Leave History</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.type}</td>
                  <td style={{ color: '#718096' }}>{l.start} — {l.end}</td>
                  <td><span className={`portal-badge ${l.status === 'Approved' ? 'success' : 'info'}`}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
