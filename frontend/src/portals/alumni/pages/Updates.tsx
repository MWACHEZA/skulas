export default function AlumniUpdates() {
  const updates = [
    { title: 'New Science Lab Officially Opened', date: '2024-10-18', image: '🔬', content: 'Thanks to the generosity of alumni donors, the newly renovated science laboratory was officially opened by the Minister of Education on October 15th. The facility includes modern equipment for Chemistry, Biology, and Physics practicals.' },
    { title: '2024 O-Level Results: 78% Pass Rate!', date: '2024-02-10', image: '🎓', content: 'We are proud to announce that Embakwe High School achieved a 78% pass rate in the 2024 O-Level examinations, representing a 5% improvement over the previous year.' },
    { title: 'School Infrastructure Development Plan', date: '2024-01-05', image: '🏗️', content: 'A masterplan for school infrastructure development over the next 5 years has been approved by the Board. Key projects include a new IT centre, swimming pool, and dormitory expansion.' },
  ];
  return (
    <>
      <div className="portal-page-header"><h1>School Updates</h1><p>Keep up with the latest news and developments from Embakwe High.</p></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {updates.map((u, i) => (
          <div key={i} className="portal-card" style={{ marginBottom: 0 }}>
            <div className="portal-card-body" style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: 14, background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>{u.image}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem' }}>{u.title}</h3>
                  <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}><i className="fas fa-calendar" style={{ marginRight: 6 }}></i>{u.date}</span>
                  <p style={{ margin: '10px 0 0', color: '#4a5568', lineHeight: 1.7, fontSize: '0.9rem' }}>{u.content}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
