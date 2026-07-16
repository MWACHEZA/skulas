import { useState } from 'react';

export default function ApplicantInterview() {
  const [interview] = useState({
    status: 'Scheduled',
    date: 'Tuesday, 05 November 2024',
    time: '10:00 AM CAT',
    venue: 'Administration Block, Room 4 (Main Campus)',
    requirements: [
      'Original Birth Certificate',
      'Latest School Report Card',
      'Placement Letter (if applicable)',
      'Stationery for a short aptitude test'
    ]
  });

  return (
    <>
      <div className="portal-page-header">
        <h1>Entrance Interview</h1>
        <p>Your official school entrance interview details and preparation checklist.</p>
      </div>

      <div className="portal-grid-2">
        <div className="portal-card" style={{ borderTop: '5px solid var(--school-primary, #3182ce)' }}>
          <div className="portal-card-header">
            <h2>Appointment Details</h2>
            <span className="portal-badge info">{interview.status}</span>
          </div>
          <div className="portal-card-body">
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <i className="fas fa-calendar-alt" style={{ color: 'var(--school-primary, #3182ce)', width: 20 }}></i>
                <span>{interview.date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <i className="fas fa-clock" style={{ color: 'var(--school-primary, #3182ce)', width: 20 }}></i>
                <span>{interview.time}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <i className="fas fa-map-marker-alt" style={{ color: 'var(--portal-danger)', width: 20 }}></i>
                <span>{interview.venue}</span>
              </div>
            </div>
            <button className="portal-btn-secondary" style={{ width: '100%' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-print" style={{ marginRight: 8 }}></i>Print Appointment Slip</button>
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h2>Preparation Checklist</h2>
          </div>
          <div className="portal-card-body">
            <p style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: 15 }}>Please bring the following originals to your interview:</p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {interview.requirements.map((req, i) => (
                <li key={i} style={{ marginBottom: 8, fontSize: '0.9rem', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <i className="far fa-square" style={{ color: '#cbd5e0' }}></i>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="portal-card" style={{ background: '#ebf8ff', border: 'none' }}>
        <div className="portal-card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ fontSize: '2rem', color: 'var(--school-primary, #3182ce)' }}><i className="fas fa-video"></i></div>
          <div>
            <h4 style={{ margin: '0 0 5px' }}>Prefer an Online Interview?</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#2c5282' }}>If you are applying from outside the province, you can request a Zoom interview. Submit your request at least 48 hours before the scheduled time.</p>
          </div>
          <button className="portal-btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => alert('This feature is currently under development or disabled.')}>Request Virtual</button>
        </div>
      </div>
    </>
  );
}
