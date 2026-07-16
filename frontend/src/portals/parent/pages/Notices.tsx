export default function ParentNotices() {
  const notices = [
    { title: 'Term 2 Opening Date', date: '2024-10-22', category: 'Academic', priority: 'high', content: 'School opens on January 14, 2025. All students must report by 8:00am with full school uniform and stationery.' },
    { title: 'Uniform Policy Update', date: '2024-10-18', category: 'General', priority: 'medium', content: 'New blazer design available from the school shop. Current blazers accepted until end of Term 2.' },
    { title: 'Parent-Teacher Conference', date: '2024-10-15', category: 'Event', priority: 'high', content: 'The bi-annual parent-teacher conference is scheduled for November 2, 2024 from 9am to 1pm.' },
    { title: 'Sports Day Volunteer Request', date: '2024-10-10', category: 'Sports', priority: 'low', content: 'We are seeking parent volunteers for the upcoming Sports Day event on November 8, 2024.' },
  ];

  const pColor: Record<string, string> = { high: 'danger', medium: 'warning', low: 'info' };

  return (
    <>
      <div className="portal-page-header">
        <h1>School Announcements</h1>
        <p>Stay updated with official school communications and event notices.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {notices.map((n, i) => (
          <div key={i} className="portal-card" style={{ marginBottom: 0, borderLeft: `5px solid var(--portal-${pColor[n.priority]})` }}>
            <div className="portal-card-body" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span className="portal-badge info" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{n.category}</span>
                    <span style={{ fontSize: '0.8rem', color: '#718096' }}><i className="fas fa-calendar-alt" style={{ marginRight: 6 }}></i>{n.date}</span>
                  </div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', color: '#2d3748' }}>{n.title}</h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <span className={`portal-badge ${pColor[n.priority]}`} style={{ fontSize: '0.7rem' }}>{n.priority} Priority</span>
                </div>
              </div>
              <p style={{ margin: 0, color: '#4a5568', lineHeight: 1.8, fontSize: '0.95rem' }}>{n.content}</p>
              
              <div style={{ marginTop: 20, paddingTop: 15, borderTop: '1px solid #edf2f7', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="portal-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                    <i className="fas fa-share-alt" style={{ marginRight: 6 }}></i> Share
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

