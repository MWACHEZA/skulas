import { useState } from 'react';
import { useToast } from '../../../context/ToastContext';

export default function SupplierTenders() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [submitting, setSubmitting] = useState<string | null>(null);

  const tenders = [
    { id: 'TND-2024-012', title: 'School Bus Fleet Servicing', category: 'Transport', closes: '2024-11-30', budget: 15000, status: 'open', desc: 'Comprehensive maintenance and parts replacement for three 65-seater school buses.' },
    { id: 'TND-2024-013', title: 'Dining Hall Furniture Supply', category: 'Furniture', closes: '2024-12-15', budget: 22000, status: 'open', desc: 'Supply and delivery of 200 heavy-duty plastic chairs and 50 dining tables.' },
    { id: 'TND-2024-015', title: 'IT Lab Network Infrastructure', category: 'ICT', closes: '2024-04-15', budget: 45000, status: 'open', desc: 'Installation of structured cabling and enterprise-grade Wi-Fi access points.' },
    { id: 'TND-2024-010', title: 'Sports Grounds Maintenance', category: 'General', closes: '2024-10-01', budget: 8000, status: 'closed', desc: 'Landscaping and grass management for the main sports oval.' },
  ];

  const handleBid = (id: string, title: string) => {
    setSubmitting(id);
    setTimeout(() => {
        showToast(`Quotation for "${title}" submitted successfully!`, 'success');
        setSubmitting(null);
    }, 1500);
  };

  const filteredTenders = tenders.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Available Tenders</h1>
          <p>Browse and bid on open school procurement opportunities.</p>
        </div>
        <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}></i>
            <input 
                type="text" 
                className="portal-input" 
                placeholder="Search by Title or ID..." 
                style={{ paddingLeft: 40, width: 300 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
      </div>

      <div className="portal-card" style={{ marginBottom: 24 }}>
        <div className="portal-card-body" style={{ padding: '12px 24px', display: 'flex', gap: 15 }}>
            <button className={`portal-btn-${filter === 'all' ? 'primary' : 'secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setFilter('all')}>All Tenders</button>
            <button className={`portal-btn-${filter === 'open' ? 'primary' : 'secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setFilter('open')}>Open</button>
            <button className={`portal-btn-${filter === 'closed' ? 'primary' : 'secondary'}`} style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setFilter('closed')}>Closed</button>
        </div>
      </div>

      <div className="portal-grid-2">
        {filteredTenders.map(t => {
           const daysLeft = Math.ceil((new Date(t.closes).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
           const isExpired = daysLeft < 0;

           return (
            <div key={t.id} className="portal-card" style={{ marginBottom: 0 }}>
              <div className="portal-card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <span className="portal-badge info">{t.category}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#718096' }}>{t.id}</span>
              </div>
              <div className="portal-card-body" style={{ paddingTop: 10 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem' }}>{t.title}</h3>
                <p style={{ fontSize: '0.85rem', color: '#718096', lineHeight: 1.6, marginBottom: 20 }}>{t.desc}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#f8f9fc', padding: 15, borderRadius: 10, marginBottom: 20 }}>
                    <div>
                        <small style={{ color: '#718096', display: 'block' }}>Deadline</small>
                        <strong style={{ fontSize: '0.9rem' }}>{t.closes}</strong>
                    </div>
                    <div>
                        <small style={{ color: '#718096', display: 'block' }}>Status</small>
                        <strong style={{ fontSize: '0.9rem', color: isExpired ? 'var(--portal-danger)' : 'var(--portal-success)' }}>
                            {isExpired ? 'Expired' : `${daysLeft} days remaining`}
                        </strong>
                    </div>
                </div>

                {t.status === 'open' && !isExpired ? (
                  <button 
                    className="portal-btn-primary" 
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => handleBid(t.id, t.title)}
                    disabled={submitting === t.id}
                  >
                    <i className={submitting === t.id ? "fas fa-spinner fa-spin" : "fas fa-gavel"}></i>
                    {submitting === t.id ? ' Submitting Bid...' : ' Submit Bid / Quotation'}
                  </button>
                ) : (
                   <button className="portal-btn-secondary" style={{ width: '100%', justifyContent: 'center', cursor: 'not-allowed', opacity: 0.6 }} disabled onClick={() => alert('This feature is currently under development or disabled.')}>
                      <i className="fas fa-lock"></i> Tender Closed
                   </button>
                )}
              </div>
            </div>
           );
        })}
      </div>
    </>
  );
}

