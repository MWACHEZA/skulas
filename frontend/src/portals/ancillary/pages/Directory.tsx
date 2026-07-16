export default function AncillaryDirectory() {
  const staff = [
    { name: 'Mr Dube', role: 'Head of Security', dept: 'Security', phone: '+263 77 111 2222', email: 'dube@embakwehigh.edu.zw' },
    { name: 'Mrs Ncube', role: 'Head Cook', dept: 'Kitchen', phone: '+263 71 333 4444', email: 'ncube@embakwehigh.edu.zw' },
    { name: 'Mr Phiri', role: 'Groundskeeper', dept: 'Grounds', phone: '+263 73 555 6666', email: 'phiri@embakwehigh.edu.zw' },
    { name: 'Ms Nyathi', role: 'Matron', dept: 'Hostels', phone: '+263 78 777 8888', email: 'nyathi@embakwehigh.edu.zw' },
  ];
  return (
    <>
      <div className="portal-page-header"><h1>Staff Directory</h1><p>Contact information for all support staff members.</p></div>
      <div className="portal-grid-2">
        {staff.map((s, i) => (
          <div key={i} className="portal-card" style={{ marginBottom: 0 }}>
            <div className="portal-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #38b2ac, #2d8e87)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>{s.name.split(' ').map(n => n[0]).join('')}</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 2px', fontSize: '0.95rem' }}>{s.name}</h3>
                <div style={{ fontSize: '0.82rem', color: '#718096' }}>{s.role} — {s.dept}</div>
                <div style={{ fontSize: '0.8rem', color: '#a0aec0', marginTop: 4 }}><i className="fas fa-phone" style={{ marginRight: 6 }}></i>{s.phone}</div>
              </div>
              <a href={`mailto:${s.email}`} style={{ padding: '8px 12px', background: '#f0f4f8', border: '1px solid #e2e8f0', borderRadius: 8, color: 'var(--portal-primary)', textDecoration: 'none' }}><i className="fas fa-envelope"></i></a>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
