import { useAuth } from '../../../contexts/AuthContext';
import PortalGate from '../../../components/portals/shared/PortalGate';

export default function SupplierInvoices() {
  const { activeEntity } = useAuth();
  const invoices = [
    { no: 'INV-2024-045', po: 'PO-2024-078', amount: 450, due: '2024-11-01', status: 'paid' },
    { no: 'INV-2024-051', po: 'PO-2024-089', amount: 1200, due: '2024-11-15', status: 'pending' },
  ];

  return (
    <PortalGate>
      <div className="portal-page-header">
        <h1>Invoices</h1>
        <p>Submit and track invoices for <strong>{activeEntity?.schoolName}</strong>.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-file-invoice-dollar" style={{ marginRight: 8, color: 'var(--portal-warning)' }}></i>My Invoices</h2>
          <button style={{ padding: '8px 16px', background: 'var(--portal-success)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }} onClick={() => alert('This feature is currently under development or disabled.')}>
            <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Submit Invoice
          </button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead><tr><th>Invoice #</th><th>Linked PO</th><th>Amount</th><th>Due Date</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.no}>
                  <td style={{ fontWeight: 600 }}>{inv.no}</td>
                  <td style={{ color: 'var(--portal-primary)' }}>{inv.po}</td>
                  <td style={{ fontWeight: 700 }}>${inv.amount.toLocaleString()}</td>
                  <td style={{ color: '#718096' }}>{inv.due}</td>
                  <td><span className={`portal-badge ${inv.status === 'paid' ? 'success' : 'warning'}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PortalGate>
  );
}
