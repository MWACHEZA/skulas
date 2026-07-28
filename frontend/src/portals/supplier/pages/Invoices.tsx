import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import PortalGate from '../../../components/portals/shared/PortalGate';
import { formatCurrency } from '../../../utils/formatters';

export default function SupplierInvoices() {
  const { activeEntity } = useAuth();
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState([
    { no: 'INV-2024-045', po: 'PO-2024-078', amount: 450, due: '2024-11-01', status: 'paid' },
    { no: 'INV-2024-051', po: 'PO-2024-089', amount: 1200, due: '2024-11-15', status: 'pending' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    po: '',
    amount: '',
    due: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      const newInvoice = {
        no: `INV-2024-0${invoices.length + 50}`,
        po: formData.po,
        amount: Number(formData.amount),
        due: formData.due,
        status: 'pending'
      };
      setInvoices([newInvoice, ...invoices]);
      setIsSubmitting(false);
      setIsModalOpen(false);
      showToast('Invoice submitted successfully!', 'success');
      setFormData({ po: '', amount: '', due: '' });
    }, 1500);
  };

  return (
    <PortalGate>
      <div className="portal-page-header">
        <h1>Invoices</h1>
        <p>Submit and track invoices for <strong>{activeEntity?.schoolName}</strong>.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-file-invoice-dollar" style={{ marginRight: 8, color: 'var(--portal-warning)' }}></i>My Invoices</h2>
          <button style={{ padding: '8px 16px', background: 'var(--portal-success)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }} onClick={() => setIsModalOpen(true)}>
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
                  <td style={{ fontWeight: 700 }}>{formatCurrency(inv.amount)}</td>
                  <td style={{ color: '#718096' }}>{inv.due}</td>
                  <td><span className={`portal-badge ${inv.status === 'paid' ? 'success' : 'warning'}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 500 }}>
            <div className="portal-modal-header" style={{ padding: 20, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}><i className="fas fa-file-invoice-dollar" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i> Submit New Invoice</h2>
              <button className="portal-btn-ghost" onClick={() => setIsModalOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body" style={{ padding: 20 }}>
              <form onSubmit={handleSubmit}>
                <div className="portal-form-group">
                  <label>Linked Purchase Order (PO)</label>
                  <input type="text" className="portal-input" placeholder="e.g. PO-2024-099" required value={formData.po} onChange={e => setFormData({ ...formData, po: e.target.value })} />
                </div>
                <div className="portal-form-group">
                  <label>Invoice Amount ($)</label>
                  <input type="number" className="portal-input" placeholder="e.g. 1500" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div className="portal-form-group">
                  <label>Due Date</label>
                  <input type="date" className="portal-input" required value={formData.due} onChange={e => setFormData({ ...formData, due: e.target.value })} />
                </div>
                <div className="portal-form-group">
                  <label>Upload Invoice Document (PDF)</label>
                  <input type="file" className="portal-input" accept=".pdf" required />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="button" className="portal-btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isSubmitting}>
                    {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : 'Submit Invoice'}
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
