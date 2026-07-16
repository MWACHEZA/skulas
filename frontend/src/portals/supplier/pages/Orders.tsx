import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import PortalGate from '../../../components/portals/shared/PortalGate';

export default function SupplierOrders() {
  const { showToast } = useToast();
  const { activeEntity } = useAuth();

  const orders = [
    { po: 'PO-2024-089', desc: 'Science Dept Chemistry Supplies', date: '2024-10-12', total: 1200, status: 'Approved', items: 12 },
    { po: 'PO-2024-092', desc: 'Hostel Mattress Replacements (x40)', date: '2024-10-15', total: 6800, status: 'In Progress', items: 40 },
    { po: 'PO-2024-078', desc: 'IT Lab Desktop Keyboards', date: '2024-09-28', total: 450, status: 'Delivered', items: 15 },
    { po: 'PO-2024-101', desc: 'Admin Stationery Order', date: '2024-11-05', total: 320, status: 'Pending', items: 8 },
  ];

  const handleAction = (po: string, action: string) => {
    showToast(`${action} action triggered for ${po}`, 'info');
  };

  return (
    <PortalGate>
      <div className="portal-page-header">
        <h1>Purchase Orders</h1>
        <p>Manage and fulfill official purchase orders received from <strong>{activeEntity?.schoolName}</strong>.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-file-contract"></i></div>
          <div className="portal-stat-info"><h3>{orders.length}</h3><p>Total Orders</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-clock"></i></div>
          <div className="portal-stat-info"><h3>{orders.filter(o => o.status === 'Pending' || o.status === 'In Progress').length}</h3><p>Active / Pending</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-check-circle"></i></div>
          <div className="portal-stat-info"><h3>{orders.filter(o => o.status === 'Delivered').length}</h3><p>Completed</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon purple"><i className="fas fa-dollar-sign"></i></div>
          <div className="portal-stat-info"><h3>${orders.reduce((acc, o) => acc + o.total, 0).toLocaleString()}</h3><p>Total Value</p></div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-clipboard-list" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Order Fulfilment List</h2>
          <div style={{ display: 'flex', gap: 10 }}>
             <button className="portal-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-download"></i> Export CSV</button>
          </div>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Description</th>
                <th>Items</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.po}>
                  <td style={{ fontWeight: 600, color: '#2d3748' }}>{o.po}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.desc}</div>
                    <div style={{ fontSize: '0.75rem', color: '#718096' }}>Issued: {o.date}</div>
                  </td>
                  <td>{o.items} units</td>
                  <td style={{ fontWeight: 700 }}>${o.total.toLocaleString()}</td>
                  <td>
                    <span className={`portal-badge ${
                      o.status === 'Approved' ? 'success' : 
                      o.status === 'In Progress' ? 'info' : 
                      o.status === 'Delivered' ? 'neutral' : 'warning'
                    }`} style={{ fontSize: '0.65rem' }}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                       <button 
                        className="portal-btn-secondary" 
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        onClick={() => handleAction(o.po, 'View')}
                       >
                        <i className="fas fa-eye"></i>
                       </button>
                       {o.status === 'Approved' && (
                         <button 
                          className="portal-btn-primary" 
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          onClick={() => handleAction(o.po, 'Invoice')}
                          title="Generate Invoice"
                         >
                          <i className="fas fa-file-invoice"></i>
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PortalGate>
  );
}

