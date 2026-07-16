export default function AncillaryHR() {
  const leaves = [
    { id: '1', type: 'Annual Leave', start: '2024-12-20', end: '2025-01-05', status: 'approved' },
    { id: '2', type: 'Sick Leave', start: '2024-10-10', end: '2024-10-12', status: 'approved' },
    { id: '3', type: 'Study Leave', start: '2025-02-01', end: '2025-02-14', status: 'pending' },
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>HR Services</h1>
        <p>Manage leave applications, payslips, and HR documentation.</p>
      </div>
      <div className="portal-grid-2">
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-calendar-minus" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Leave Applications</h2>
            <button style={{ padding: '6px 14px', background: 'var(--portal-primary)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Apply for Leave</button>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead><tr><th>Type</th><th>Period</th><th>Status</th></tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.type}</td>
                    <td style={{ color: '#718096' }}>{l.start} → {l.end}</td>
                    <td><span className={`portal-badge ${l.status === 'approved' ? 'success' : 'warning'}`}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-file-pdf" style={{ marginRight: 8, color: 'var(--portal-danger)' }}></i>Payslips & Documents</h2>
          </div>
          <div className="portal-card-body">
            {['October 2024 Payslip', 'September 2024 Payslip', 'Employment Contract'].map((doc, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 2 ? '1px solid #e2e8f0' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-file-pdf" style={{ color: 'var(--portal-danger)' }}></i>
                  <span style={{ fontWeight: 500 }}>{doc}</span>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => alert('This feature is currently under development or disabled.')}>Download</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
