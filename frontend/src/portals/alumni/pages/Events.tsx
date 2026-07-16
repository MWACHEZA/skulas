export default function AlumniEvents() {
  const events = [
    { id: '1', title: 'Class of 2010 — 15 Year Reunion Gala', date: '2025-12-15', venue: 'Embakwe Main Hall', type: 'Reunion', status: 'upcoming' },
    { id: '2', title: 'Annual Charity Fun Run 2025', date: '2025-03-22', venue: 'School Grounds', type: 'Fundraiser', status: 'upcoming' },
    { id: '3', title: 'Career Day Guest Speaker Programme', date: '2024-09-10', venue: 'Science Block', type: 'Academic', status: 'past' },
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>Events & Reunions</h1>
        <p>Stay connected through alumni events, fundraisers, and reunions.</p>
      </div>
      <div className="portal-grid-3">
        {events.map(e => (
          <div key={e.id} className="portal-card" style={{ marginBottom: 0, borderTop: `4px solid ${e.status === 'upcoming' ? 'var(--portal-success)' : '#a0aec0'}` }}>
            <div className="portal-card-body" style={{ padding: 24 }}>
              <span className={`portal-badge ${e.status === 'upcoming' ? 'success' : 'neutral'}`} style={{ marginBottom: 12, display: 'inline-block' }}>{e.status}</span>
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>{e.title}</h3>
              <div style={{ fontSize: '0.85rem', color: '#718096', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                <div><i className="fas fa-calendar" style={{ width: 20 }}></i> {e.date}</div>
                <div><i className="fas fa-map-marker-alt" style={{ width: 20 }}></i> {e.venue}</div>
                <div><i className="fas fa-tag" style={{ width: 20 }}></i> {e.type}</div>
              </div>
              {e.status === 'upcoming' && (
                <button style={{ width: '100%', padding: '10px', background: 'var(--portal-primary)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                  <i className="fas fa-ticket-alt" style={{ marginRight: 8 }}></i>Register / RSVP
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
