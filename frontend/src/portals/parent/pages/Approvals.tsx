import React from 'react';

export default function parentApprovals() {
  const pending = [
    { id: 'APP-101', title: 'Museum Trip Consent', date: 'Due By: 28 Mar 2026', type: 'Excursion', description: 'Form 3 History trip to the National Museum. Transport and lunch included.' },
  ];

  const completed = [
    { title: 'Swimming Club Enrollment', date: 'Approved: 10 Feb 2026', type: 'Extra-Curricular' },
    { title: 'Medical Data Policy', date: 'Consent Given: 15 Jan 2026', type: 'Privacy' },
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>Parental Approvals</h1>
        <p>Review and sign consent forms for school trips, extra-curricular activities, and policy updates.</p>
      </div>

      <div className="portal-card" style={{ borderLeft: '5px solid #e53e3e', marginBottom: 30 }}>
        <div className="portal-card-header">
          <h2 style={{ color: 'var(--portal-danger)' }}><i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>Pending Your Action</h2>
        </div>
        <div className="portal-card-body">
          {pending.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff5f5', padding: 20, borderRadius: 12, border: '1px solid #feb2b2' }}>
              <div>
                <span className="portal-badge danger" style={{ marginBottom: 10 }}>Action Required</span>
                <h3 style={{ margin: '0 0 5px' }}>{p.title}</h3>
                <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#4a5568' }}>{p.description}</p>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c53030' }}>{p.date}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="portal-btn-secondary" onClick={() => alert('This feature is currently under development or disabled.')}>View Details</button>
                <button className="portal-btn-primary" onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-signature"></i> Sign Now</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-check-circle" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Completed Approvals</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Item / Description</th>
                <th>Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {completed.map((c, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <small style={{ color: '#a0aec0' }}>{c.date}</small>
                  </td>
                  <td>{c.type}</td>
                  <td>
                    <span className="portal-badge success">Approved</span>
                  </td>
                  <td>
                    <button className="portal-btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>View Receipt</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
