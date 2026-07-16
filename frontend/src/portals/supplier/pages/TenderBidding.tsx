import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import PortalGate from '../../../components/portals/shared/PortalGate';

export default function TenderBidding() {
  const { activeEntity } = useAuth();
  const [tenders] = useState([
    { id: 'TND-24-001', name: 'Supply of 500 Modern Student Desks', deadline: 'Oct 30, 2024', status: 'Open', category: 'Furniture' },
    { id: 'TND-24-002', name: 'Science Laboratory Refurbishment', deadline: 'Nov 05, 2024', status: 'Open', category: 'Construction' },
    { id: 'TND-24-003', name: 'Catering Services for Annual Sports Day', deadline: 'Oct 25, 2024', status: 'Closed', category: 'Services' },
  ]);

  return (
    <PortalGate>
      <div className="portal-page-header">
        <h1>Active Tenders & Bidding</h1>
        <p>Review open procurement opportunities for <strong>{activeEntity?.schoolName}</strong>.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-bullhorn" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Available Opportunities</h2>
          <button className="portal-btn-secondary" onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-filter"></i> Filter Category</button>
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
              {tenders.map((tender) => (
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
                     onClick={() => alert('This feature is currently under development or disabled.')}>
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
    </PortalGate>
  );
}
