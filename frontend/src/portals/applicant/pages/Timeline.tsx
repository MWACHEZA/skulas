import { useState } from 'react';

export default function ApplicantTimeline() {
  const [history] = useState([
    { event: 'National Enrollment Decision', status: 'Pending', date: 'Dec 2024', desc: 'Government placement results.' },
    { event: 'School Interview', status: 'Scheduled', date: '05 Nov 2024', desc: 'Face-to-face with Head of Department.' },
    { event: 'Documents Verified', status: 'Completed', date: '18 Oct 2024', desc: 'All uploaded files confirmed.' },
    { event: 'Application Registered', status: 'Completed', date: '15 Oct 2024', desc: 'Initial registration successful.' },
  ]);

  return (
    <>
      <div className="portal-page-header">
        <h1>Application Status Tracker</h1>
        <p>A step-by-step history and future roadmap of your school application process.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-history" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Activity Roadmap</h2>
        </div>
        <div className="portal-card-body">
          <div style={{ paddingLeft: '20px' }}>
            {history.map((h, i) => (
              <div key={i} style={{ 
                borderLeft: '2px solid #e2e8f0', 
                paddingLeft: '25px', 
                paddingBottom: '30px', 
                position: 'relative' 
              }}>
                <div style={{ 
                  position: 'absolute', 
                  left: '-9px', 
                  top: '0', 
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '50%', 
                  background: h.status === 'Completed' ? 'var(--portal-success)' : h.status === 'Scheduled' ? 'var(--school-primary, #3182ce)' : '#cbd5e0'
                }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px', fontSize: '1.1rem' }}>{h.event}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#718096' }}>{h.desc}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4a5568' }}>{h.date}</div>
                    <span className={`portal-badge ${h.status === 'Completed' ? 'success' : 'info'}`} style={{ fontSize: '0.7rem', marginTop: 5 }}>
                      {h.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
