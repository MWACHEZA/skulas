import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import PortalGate from '../../../components/portals/shared/PortalGate';

export default function TenderBidding() {
  const { activeEntity } = useAuth();
  const { showToast } = useToast();
  const [tenders] = useState([
    { id: 'TND-24-001', name: 'Supply of 500 Modern Student Desks', deadline: 'Oct 30, 2024', status: 'Open', category: 'Furniture' },
    { id: 'TND-24-002', name: 'Science Laboratory Refurbishment', deadline: 'Nov 05, 2024', status: 'Open', category: 'Construction' },
    { id: 'TND-24-003', name: 'Catering Services for Annual Sports Day', deadline: 'Oct 25, 2024', status: 'Closed', category: 'Services' },
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [biddingTender, setBiddingTender] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bidAmount, setBidAmount] = useState('');

  const filteredTenders = selectedCategory === 'All' 
    ? tenders 
    : tenders.filter(t => t.category === selectedCategory);

  const categories = ['All', ...Array.from(new Set(tenders.map(t => t.category)))];

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setBiddingTender(null);
      setBidAmount('');
      showToast('Bid submitted successfully!', 'success');
    }, 1500);
  };

  return (
    <PortalGate>
      <div className="portal-page-header">
        <h1>Active Tenders & Bidding</h1>
        <p>Review open procurement opportunities for <strong>{activeEntity?.schoolName}</strong>.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-bullhorn" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Available Opportunities</h2>
          <select 
            className="portal-input" 
            style={{ width: 'auto', padding: '6px 12px', height: '36px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Tender ID</th>
                <th>Project Name</th>
                <th>Category</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenders.map((tender) => (
                <tr key={tender.id}>
                  <td style={{ fontSize: '0.85rem', color: '#718096' }}>{tender.id}</td>
                  <td style={{ fontWeight: 600 }}>{tender.name}</td>
                  <td><span className="portal-badge neutral">{tender.category}</span></td>
                  <td>{tender.deadline}</td>
                  <td>
                    <span className={`portal-badge ${tender.status === 'Open' ? 'success' : 'neutral'}`}>
                      {tender.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className={tender.status === 'Open' ? 'portal-btn-primary' : 'portal-btn-disabled'}
                      disabled={tender.status !== 'Open'}
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                     onClick={() => setBiddingTender(tender)}>
                      {tender.status === 'Open' ? 'Submit Bid' : 'Closed'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="portal-card" style={{ marginTop: 24 }}>
        <div className="portal-card-header">
          <h2>Bidding Instructions</h2>
        </div>
        <div className="portal-card-body">
          <ul style={{ paddingLeft: 20, margin: 0, color: '#4a5568', lineHeight: '1.6' }}>
            <li>Ensure all tax clearance documents are up to date before bidding.</li>
            <li>Submit technical specifications separately from financial quotes.</li>
            <li>Bids received after the deadline will automatically be rejected by the portal.</li>
          </ul>
        </div>
      </div>

      {biddingTender && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 500 }}>
            <div className="portal-modal-header" style={{ padding: 20, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}><i className="fas fa-gavel" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i> Submit Bid: {biddingTender.id}</h2>
              <button className="portal-btn-ghost" onClick={() => setBiddingTender(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body" style={{ padding: 20 }}>
              <form onSubmit={handleBidSubmit}>
                <div style={{ marginBottom: 20, padding: 15, background: '#f8fafc', borderRadius: 8 }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 600 }}>{biddingTender.name}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>Category: {biddingTender.category} | Deadline: {biddingTender.deadline}</p>
                </div>
                
                <div className="portal-form-group">
                  <label>Proposed Bid Amount ($)</label>
                  <input type="number" className="portal-input" placeholder="e.g. 5000" required value={bidAmount} onChange={e => setBidAmount(e.target.value)} />
                </div>
                <div className="portal-form-group">
                  <label>Technical Proposal (PDF)</label>
                  <input type="file" className="portal-input" accept=".pdf" required />
                </div>
                <div className="portal-form-group">
                  <label>Financial Quote (PDF)</label>
                  <input type="file" className="portal-input" accept=".pdf" required />
                </div>
                
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="button" className="portal-btn-secondary" style={{ flex: 1 }} onClick={() => setBiddingTender(null)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isSubmitting}>
                    {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : 'Submit Bid'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </PortalGate>
  );
}
