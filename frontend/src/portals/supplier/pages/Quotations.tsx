import { useAuth } from '../../../contexts/AuthContext';
import PortalGate from '../../../components/portals/shared/PortalGate';

export default function SupplierQuotations() {
  const { activeEntity } = useAuth();
  const quotes = [
    { id: 'QT-2024-018', tenderId: 'TND-2024-012', tenderTitle: 'School Bus Fleet Servicing', amount: 14200, delivery: '14 days', submitted: '2024-10-20', status: 'Pending Review' },
    { id: 'QT-2024-015', tenderId: 'TND-2024-010', tenderTitle: 'Sports Grounds Maintenance', amount: 7500, delivery: '7 days', submitted: '2024-09-15', status: 'Awarded' },
    { id: 'QT-2024-014', tenderId: 'TND-2024-008', tenderTitle: 'ICT Lab Desktops', amount: 12500, delivery: '30 days', submitted: '2024-09-01', status: 'Declined' },
  ];

  return (
    <PortalGate>
      <div className="portal-page-header">
        <h1>My Quotations</h1>
        <p>Track your submitted bids and award status for <strong>{activeEntity?.schoolName}</strong>.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
           <h2><i className="fas fa-file-invoice-dollar" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Submission History</h2>
           <div className="portal-badge neutral">{quotes.length} Total Bids</div>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Tender Details</th>
                <th>Bid Amount</th>
                <th>Delivery</th>
                <th>Status</th>
                <th>Date Sent</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 600 }}>{q.id}</td>
                  <td>
                     <div style={{ fontWeight: 600 }}>{q.tenderTitle}</div>
                     <div style={{ fontSize: '0.72rem', color: '#718096' }}>Ref: {q.tenderId}</div>
                  </td>
                  <td style={{ fontWeight: 700, color: '#2d3748' }}>${q.amount.toLocaleString()}</td>
                  <td style={{ fontSize: '0.85rem' }}>{q.delivery}</td>
                  <td>
                    <span className={`portal-badge ${
                      q.status === 'Awarded' ? 'success' : 
                      q.status === 'Declined' ? 'danger' : 'warning'
                    }`} style={{ fontSize: '0.65rem' }}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ color: '#718096', fontSize: '0.85rem' }}>{q.submitted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 24, padding: 20, background: '#f8f9fc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
         <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <i className="fas fa-info-circle" style={{ color: 'var(--school-primary, #3182ce)' }}></i>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#4a5568' }}>
               <strong>Note:</strong> Awarded quotations will automatically generate a Purchase Order. Please monitor the <strong>Purchase Orders</strong> section for fulfillment instructions.
            </p>
         </div>
      </div>
    </PortalGate>
  );
}

