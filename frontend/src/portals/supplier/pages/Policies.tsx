export default function SupplierPolicies() {
  const policies = [
    { title: 'Procurement Policy', desc: 'Guidelines for tendering, quotation submission, and vendor selection processes.', updated: 'September 2024', icon: 'fa-gavel', color: 'var(--school-primary, #3182ce)' },
    { title: 'Payment Terms', desc: 'Standard net-30 payment terms, invoice requirements, and dispute procedures.', updated: 'August 2024', icon: 'fa-credit-card', color: 'var(--portal-success)' },
    { title: 'Supplier Code of Conduct', desc: 'Ethical standards, anti-corruption, and environmental commitments.', updated: 'July 2024', icon: 'fa-handshake', color: '#805ad5' },
    { title: 'Delivery & Logistics', desc: 'Delivery schedules, receiving procedures, and quality inspection requirements.', updated: 'June 2024', icon: 'fa-truck', color: 'var(--portal-warning)' },
  ];
  return (
    <>
      <div className="portal-page-header"><h1>Policies & Procedures</h1><p>Review school procurement policies and supplier requirements.</p></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {policies.map((p, i) => (
          <div key={i} className="portal-card" style={{ marginBottom: 0 }}>
            <div className="portal-card-body" style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 24 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${p.color}15`, color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}><i className={`fas ${p.icon}`}></i></div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem' }}>{p.title}</h3>
                <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#718096' }}>{p.desc}</p>
                <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>Last updated: {p.updated}</span>
              </div>
              <button style={{ padding: '8px 14px', background: '#f0f4f8', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: 'var(--portal-primary)' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-download" style={{ marginRight: 6 }}></i>Download</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
