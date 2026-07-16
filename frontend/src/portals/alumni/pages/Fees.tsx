export default function AlumniFees() {
  return (
    <>
      <div className="portal-page-header"><h1>Donations & Contributions</h1><p>Support Embakwe High School through contributions and the Legacy Scholarship Fund.</p></div>
      <div className="portal-stats-grid">
        <div className="portal-stat-card"><div className="portal-stat-icon green"><i className="fas fa-hand-holding-heart"></i></div><div className="portal-stat-info"><h3>$12,450</h3><p>Raised This Year</p></div></div>
        <div className="portal-stat-card"><div className="portal-stat-icon blue"><i className="fas fa-graduation-cap"></i></div><div className="portal-stat-info"><h3>8</h3><p>Scholars Funded</p></div></div>
      </div>
      <div className="portal-grid-2">
        <div className="portal-card">
          <div className="portal-card-header"><h2><i className="fas fa-donate" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Make a Donation</h2></div>
          <div className="portal-card-body">
            <p style={{ color: '#718096', marginBottom: 16 }}>Your donations go directly towards scholarships, infrastructure, and student resources.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {['$25', '$50', '$100', '$250'].map(a => (
                <button key={a} style={{ padding: '12px', background: '#f8faff', border: '2px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '1rem', color: 'var(--portal-primary)' }} onClick={() => alert('This feature is currently under development or disabled.')}>{a}</button>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#718096', marginBottom: 4 }}>Custom Amount ($)</label>
              <input type="number" placeholder="Enter amount" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e0' }} />
            </div>
            <button style={{ width: '100%', padding: '14px', background: 'var(--portal-success)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-heart" style={{ marginRight: 8 }}></i>Donate Now</button>
          </div>
        </div>
        <div className="portal-card">
          <div className="portal-card-header"><h2><i className="fas fa-history" style={{ marginRight: 8, color: '#805ad5' }}></i>My Contributions</h2></div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead><tr><th>Date</th><th>Amount</th><th>Fund</th><th>Receipt</th></tr></thead>
              <tbody>
                <tr><td>2024-06-15</td><td style={{ fontWeight: 700, color: 'var(--portal-success)' }}>$100</td><td>Legacy Scholarship</td><td><button style={{ background: 'none', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer' }} onClick={() => alert('This feature is currently under development or disabled.')}>Download</button></td></tr>
                <tr><td>2023-12-10</td><td style={{ fontWeight: 700, color: 'var(--portal-success)' }}>$50</td><td>Science Lab Fund</td><td><button style={{ background: 'none', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer' }} onClick={() => alert('This feature is currently under development or disabled.')}>Download</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
