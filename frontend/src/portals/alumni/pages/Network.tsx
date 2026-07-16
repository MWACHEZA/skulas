export default function AlumniNetwork() {
  const members = [
    { name: 'John Mupfumi', class: 'Class of 2010', profession: 'Software Engineer', location: 'Harare', avatar: 'JM' },
    { name: 'Sithembile Ncube', class: 'Class of 2012', profession: 'Medical Doctor', location: 'Bulawayo', avatar: 'SN' },
    { name: 'Tatenda Chigumira', class: 'Class of 2008', profession: 'Civil Engineer', location: 'Johannesburg', avatar: 'TC' },
    { name: 'Rufaro Dube', class: 'Class of 2015', profession: 'Teacher', location: 'Plumtree', avatar: 'RD' },
  ];
  return (
    <>
      <div className="portal-page-header"><h1>Alumni Network</h1><p>Connect with fellow alumni from Embakwe High School.</p></div>
      <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
        <input type="text" placeholder="Search alumni by name, class, or profession..." style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #cbd5e0' }} />
        <select style={{ padding: '10px', borderRadius: 8, border: '1px solid #cbd5e0' }}><option>All Years</option><option>2008-2012</option><option>2013-2018</option><option>2019-2024</option></select>
      </div>
      <div className="portal-grid-2">
        {members.map((m, i) => (
          <div key={i} className="portal-card" style={{ marginBottom: 0 }}>
            <div className="portal-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #0056b3, #003d7a)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, flexShrink: 0 }}>{m.avatar}</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem' }}>{m.name}</h3>
                <div style={{ fontSize: '0.82rem', color: '#718096' }}>{m.profession} &middot; {m.location}</div>
                <span className="portal-badge neutral" style={{ marginTop: 4 }}>{m.class}</span>
              </div>
              <button style={{ padding: '8px 14px', background: 'var(--portal-primary)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-envelope" style={{ marginRight: 6 }}></i>Connect</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
