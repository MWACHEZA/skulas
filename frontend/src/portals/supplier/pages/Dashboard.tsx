import { useAuth } from '../../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import PortalGate from '../../../components/portals/shared/PortalGate';

export default function SupplierDashboard() {
  const { user, activeEntity, updateLinkedEntities, setActiveEntity } = useAuth();

  const taxExpiryStr = (user as any)?.metadata?.taxExpiry;
  let expiringSoon = false;
  let daysLeft = 0;

  if (taxExpiryStr) {
    const expiryDate = new Date(taxExpiryStr);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 30 && daysLeft >= 0) {
      expiringSoon = true;
    }
  }

  return (
    <PortalGate>
      <div className="portal-page-header">
        <h1>Supplier Overview</h1>
        <p>Welcome back, {user?.name}. Managing services for <strong>{activeEntity?.schoolName}</strong>.</p>
      </div>

      {/* Compliance Alert */}
      {expiringSoon && (
        <div className="portal-alert error" style={{ padding: '16px 20px', marginBottom: 24, borderLeft: '5px solid #e53e3e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ width: 45, height: 45, borderRadius: '50%', background: 'rgba(229,62,62,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Compliance Documents Expiring!</h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', opacity: 0.9 }}>
                Your Tax Clearance (ITF263) expires in <strong>{daysLeft} days</strong>. 
                Please update it on the <Link to="/supplier/compliance" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 700 }}>Compliance Page</Link> to stay eligible for tenders.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-file-contract"></i></div>
          <div className="portal-stat-info">
            <h3>5</h3>
            <p>Open Tenders</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon purple"><i className="fas fa-paper-plane"></i></div>
          <div className="portal-stat-info">
            <h3>12</h3>
            <p>Quotations Sent</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-check-circle"></i></div>
          <div className="portal-stat-info">
            <h3>3</h3>
            <p>Approved Quotes</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-shopping-cart"></i></div>
          <div className="portal-stat-info">
            <h3>1</h3>
            <p>Active Orders</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Recent Open Tenders */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2><i className="fas fa-file-invoice-dollar" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Recent Available Tenders</h2>
              <Link to="/supplier/tenders" className="portal-view-all">View All</Link>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Tender Title</th>
                    <th>Category</th>
                    <th>Deadline</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>Science Lab Equipment Supply</div>
                      <div style={{ fontSize: '0.72rem', color: '#718096' }}>REF: TND-2026-042</div>
                    </td>
                    <td><span className="portal-badge info">Science</span></td>
                    <td><span style={{ fontWeight: 600, color: 'var(--portal-danger)' }}>3 Days left</span></td>
                    <td><Link to="/supplier/tenders" className="portal-btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>View</Link></td>
                  </tr>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>School Bus Maintenance Services</div>
                      <div style={{ fontSize: '0.72rem', color: '#718096' }}>REF: TND-2026-045</div>
                    </td>
                    <td><span className="portal-badge info">Transport</span></td>
                    <td><span style={{ fontWeight: 600, color: 'var(--portal-success)' }}>12 Days left</span></td>
                    <td><Link to="/supplier/tenders" className="portal-btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>View</Link></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Awarded Contracts */}
          <div className="portal-card" style={{ borderTop: '4px solid #38a169' }}>
            <div className="portal-card-header">
              <h2 style={{ color: 'var(--portal-success)' }}><i className="fas fa-trophy" style={{ marginRight: 8 }}></i>Awarded Contracts</h2>
            </div>
            <div className="portal-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>IT Department Desktop Upgrades</div>
                  <div style={{ fontSize: '0.8rem', color: '#718096' }}>Awarded Amount: $14,500</div>
                </div>
                <span className="portal-badge success">Awarded</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="portal-card">
            <div className="portal-card-header">
              <h2>Account Status</h2>
            </div>
            <div className="portal-card-body" style={{ textAlign: 'center', padding: '30px 20px' }}>
               <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(56,161,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--school-primary, #3182ce)', fontSize: '1.8rem' }}>
                  <i className="fas fa-user-check"></i>
               </div>
               <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>Approved Supplier</h3>
               <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>Your profile is verified and active.</p>
               <hr style={{ margin: '20px 0', borderColor: '#edf2f7' }} />
               <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Link to="/supplier/quotations" className="portal-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Submit New Quote</Link>
                  <Link to="/supplier/invoices" className="portal-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>Generate Invoice</Link>
               </div>
            </div>
          </div>

          <div className="portal-card" style={{ background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)', color: 'white' }}>
            <div className="portal-card-body" style={{ padding: '25px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>Help & Support</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8, lineHeight: 1.6 }}>
                  Need assistance with your bidding or payment status? Contact our procurement team directly.
                </p>
                <Link to="/supplier/support" style={{ display: 'inline-block', marginTop: 15, color: '#63b3ed', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                  Contact Procurement <i className="fas fa-arrow-right" style={{ fontSize: '0.75rem', marginLeft: 4 }}></i>
                </Link>
            </div>
          </div>
        </div>
      </div>
    </PortalGate>
  );
}
