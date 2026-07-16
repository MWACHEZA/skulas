import React from 'react';

export default function parentWellbeing() {
  const conduct = [
    { date: '2024-03-15', type: 'Merit', category: 'Leadership', points: +5, description: 'Organized a successful charity drive for the junior school.' },
    { date: '2024-03-02', type: 'Notice', category: 'Uniform', points: 0, description: 'Incomplete uniform (no blazer) during morning assembly.' },
    { date: '2024-02-18', type: 'Merit', category: 'Helpfulness', points: +2, description: 'Assisted a new student with navigating the campus.' },
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>Health & Conduct</h1>
        <p>Monitor your child's wellbeing, behavioral records, and medical updates.</p>
      </div>

      <div className="portal-grid-2">
        {/* Health Section */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-heartbeat" style={{ marginRight: 8, color: 'var(--portal-danger)' }}></i>Medical Information</h2>
          </div>
          <div className="portal-card-body">
             <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 10, padding: 15, marginBottom: 20 }}>
                <strong style={{ color: '#c53030', display: 'block', marginBottom: 5 }}>Allergies:</strong>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Peanuts, Shellfish</p>
             </div>
             <div className="portal-grid-2" style={{ gap: 15 }}>
                <div>
                   <small style={{ color: '#718096' }}>Blood Group</small>
                   <p style={{ fontWeight: 700 }}>O Positive</p>
                </div>
                <div>
                   <small style={{ color: '#718096' }}>Last Clinic Visit</small>
                   <p style={{ fontWeight: 700 }}>12 Jan 2024</p>
                </div>
             </div>
             <button className="portal-btn-secondary" style={{ width: '100%', marginTop: 20 }} onClick={() => alert('This feature is currently under development or disabled.')}>
                Update Medical Records
             </button>
          </div>
        </div>

        {/* Conduct Summary */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-certificate" style={{ marginRight: 8, color: 'var(--portal-warning)' }}></i>Conduct Summary</h2>
          </div>
          <div className="portal-card-body">
             <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--portal-success)' }}>124</div>
                <p style={{ margin: 0, color: '#718096' }}>Total Positive Merits</p>
             </div>
             <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #edf2f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                   <span>Behavior Score</span>
                   <span style={{ fontWeight: 700 }}>Excellent</span>
                </div>
                <div style={{ background: '#edf2f7', borderRadius: 10, height: 10 }}>
                   <div style={{ width: '92%', height: '100%', background: 'var(--portal-success)', borderRadius: 10 }} />
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Recent Log */}
      <div className="portal-card" style={{ marginTop: 24 }}>
        <div className="portal-card-header">
          <h2><i className="fas fa-list-ul" style={{ marginRight: 8, color: '#718096' }}></i>Recent Conduct Log</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
             <thead>
                <tr>
                   <th>Date</th>
                   <th>Type</th>
                   <th>Category</th>
                   <th>Impact</th>
                   <th>Description</th>
                </tr>
             </thead>
             <tbody>
                {conduct.map((c, i) => (
                   <tr key={i}>
                      <td style={{ fontSize: '0.85rem' }}>{c.date}</td>
                      <td>
                         <span className={`portal-badge ${c.type === 'Merit' ? 'success' : 'warning'}`}>{c.type}</span>
                      </td>
                      <td>{c.category}</td>
                      <td style={{ fontWeight: 700, color: c.points > 0 ? 'var(--portal-success)' : '#718096' }}>
                         {c.points > 0 ? `+${c.points}` : c.points}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#4a5568' }}>{c.description}</td>
                   </tr>
                ))}
             </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
