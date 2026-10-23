import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import { SkeletonLoader, PaginatedTable } from '../../../components/shared';
import '../../../styles/portal.css';
import { useTerminology } from '../../../hooks/useTerminology';

const exportToCSV = (title: string, headers: string[], dataRows: string[][]) => {
  const content = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...dataRows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToWord = (title: string, headers: string[], dataRows: string[][]) => {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <PaginatedTable>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </PaginatedTable>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface BulkInvoice {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  description: string;
  recipientsCount: number;
}

export default function BulkInvoicesPage() {
  const { t } = useTerminology();
  const [invoices, setInvoices] = useState<BulkInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    description: '',
    category: 'General',
    targetType: 'All Students'
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/fees/bulk-invoices');
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      showToast('Failed to synchronize mass billing history registry', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/fees/bulk-invoices', formData);
      showToast('Institutional mass billing process authorized and initiated', 'success');
      setShowModal(false);
      loadInvoices();
    } catch (error) {
      showToast('Failed to authorize institutional mass billing operation', 'error');
    
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!(await toastConfirm('Authorize permanent removal of this invoicing record? Historical financial audit data may be affected.'))) return;
    try {
      await api.delete(`/api/fees/bulk-invoices/${id}`);
      showToast('Operation record purged from institutional registry', 'success');
      loadInvoices();
    } catch (error) {
      showToast('Failed to authorize registry purge', 'error');
    
    }
  };

  const handleAudit = (id: string) => {
    showToast(`Auditing transactional data for invoice ${id}...`, 'info');
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header no-print">
        <div className="header-content">
          <h1>Mass Invoicing Registry</h1>
          <p>Authorize large-scale billing operations, monitor recipient distribution, and audit historical mass invoicing events.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="status-badge" style={{ padding: '8px 20px', background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5', fontWeight: 900 }}>
            <i className="fas fa-layer-group mr-2"></i>FINANCIAL AUDIT
          </div>
        </div>
      </div>

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Institutional Billing History</h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Comprehensive log of all authorized bulk invoicing operations.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
              <button 
                type="button"
                onClick={() => setShowModal(true)}
                className="portal-btn-primary"
                style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <i className="fas fa-plus-circle"></i> INITIATE MASS BILLING
              </button>
              <button 
                onClick={() => {
                  const headers = ['Processing Date', 'Operation Identity', 'Strategic Context', 'Recipients Count', 'Unit Amount'];
                  const rows = invoices.map(inv => [
                    new Date(inv.date).toLocaleDateString(),
                    inv.name,
                    inv.description || 'No context',
                    inv.recipientsCount.toString(),
                    inv.amount.toString()
                  ]);
                  exportToCSV('Bulk_Invoices', headers, rows);
                }}
                className="portal-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                title="Export to CSV"
              >
                <i className="fas fa-file-csv mr-1"></i> CSV
              </button>
              <button 
                onClick={() => {
                  const headers = ['Processing Date', 'Operation Identity', 'Strategic Context', 'Recipients Count', 'Unit Amount'];
                  const rows = invoices.map(inv => [
                    new Date(inv.date).toLocaleDateString(),
                    inv.name,
                    inv.description || 'No context',
                    inv.recipientsCount.toString(),
                    inv.amount.toString()
                  ]);
                  exportToWord('Bulk_Invoices', headers, rows);
                }}
                className="portal-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                title="Export to Word"
              >
                <i className="fas fa-file-word mr-1"></i> Word
              </button>
              <button 
                onClick={() => window.print()}
                className="portal-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                title="Print / PDF"
              >
                <i className="fas fa-print mr-1"></i> Print/PDF
              </button>
            </div>
            <span className="status-badge" style={{ fontWeight: 900, background: '#f8fafc', color: '#475569', border: '1px solid #f1f5f9', padding: '8px 16px' }}>
              {(Array.isArray(invoices) ? invoices : []).length} AUTHORIZED OPERATIONS
            </span>
          </div>
        </div>
        
        <div className="table-responsive">
          <PaginatedTable className="management-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Processing Date</th>
                <th style={{ width: '25%' }}>Operation Identity</th>
                <th style={{ width: '25%' }}>Strategic Context</th>
                <th style={{ textAlign: 'center', width: '12%' }}>Distribution</th>
                <th style={{ width: '12%' }}>Unit Amount</th>
                <th style={{ textAlign: 'right', width: '11%' }} className="no-print">Audit Management</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px' }}>
                    <SkeletonLoader type="table" rows={6} columns={6} />
                  </td>
                </tr>
              ) : (Array.isArray(invoices) ? invoices : []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '120px 24px' }}>
                    <i className="fas fa-file-invoice fa-4x" style={{ color: '#cbd5e1', marginBottom: '24px', display: 'block', opacity: 0.3 }}></i>
                    <h3 style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.5rem' }}>No Billing Operations Identified</h3>
                    <p style={{ color: '#64748b', fontWeight: 700, maxWidth: '400px', margin: '12px auto 0' }}>Archived mass invoicing events and authorized distributions will be logged here for institutional audit.</p>
                  </td>
                </tr>
              ) : (Array.isArray(invoices) ? invoices : []).map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <div style={{ fontWeight: 900, color: '#64748b', fontSize: '0.9rem' }}>
                      {new Date(invoice.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1rem' }}>{invoice.name}</div>
                    <div style={{ marginTop: '4px' }}>
                       <span className="status-badge" style={{ fontSize: '0.65rem', fontWeight: 900, padding: '2px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe' }}>
                          {invoice.category?.toUpperCase() || 'GENERAL'}
                       </span>
                    </div>
                  </td>
                  <td style={{ maxWidth: '250px' }}>
                    <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={invoice.description}>
                      {invoice.description || 'No operational meta-data available'}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                       <span style={{ padding: '8px 16px', background: '#f8fafc', borderRadius: '12px', fontSize: '1rem', fontWeight: 900, color: '#1e293b', border: '1px solid #f1f5f9' }}>
                         {invoice.recipientsCount || 0}
                       </span>
                       <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RECIPIENTS</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 900, color: '#059669', fontSize: '1.1rem' }}>
                      {formatCurrency(invoice.amount)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="no-print">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="portal-btn-ghost" style={{ padding: '8px', minWidth: '36px', height: '36px', color: '#2563eb' }} title="Audit Transactional Data" onClick={() => handleAudit(invoice.id)}><i className="fas fa-search-dollar"></i></button>
                      <button 
                        onClick={() => deleteInvoice(invoice.id)} 
                        className="portal-btn-ghost" 
                        style={{ padding: '8px', minWidth: '36px', height: '36px', color: '#dc2626' }}
                        title="Purge Operational Record"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </PaginatedTable>
        </div>
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              animation: 'fadeIn 0.2s ease-in-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '22px 28px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>
                  📊
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                    Authorize Mass Invoicing
                  </h2>
                  <p style={{ margin: '2px 0 0 0', color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>
                    Initiate an institutional billing cycle across recipient cohorts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '26px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Invoice Identifier / Run Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026 Academic Session - General Levy"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Assessment Amount ($)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#059669', fontWeight: 800, fontSize: '16px' }}>$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 30px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          fontSize: '15px',
                          fontWeight: 800,
                          color: '#059669',
                          boxSizing: 'border-box'
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Financial Classification
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="General">General Levy</option>
                      <option value="Tuition">Tuition Fees</option>
                      <option value="Transport">Transport Services</option>
                      <option value="Uniforms">Uniform Inventory</option>
                      <option value="Other">Miscellaneous Assessment</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Operational Notes / Memo
                  </label>
                  <textarea
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      resize: 'none',
                      fontSize: '13px',
                      fontWeight: 500,
                      padding: '12px',
                      lineHeight: 1.5,
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Provide authoritative context or justification for this institutional billing cycle..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Target Recipient Cohort
                  </label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#0284c7',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="All Students">Entire Institutional Student Registry</option>
                    <option value="Boarders Only">Residential Boarders Only</option>
                    <option value="Day Students Only">Day Scholars Only</option>
                  </select>
                </div>
              </div>

              <div style={{
                padding: '18px 28px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 26px',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  <span>✓</span>
                  <span>AUTHORIZE MASS BILLING CYCLE</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        @media print {
          .no-print, .portal-page-header, .portal-card, .portal-sidebar, .portal-header {
            display: none !important;
          }
          .portal-container {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .management-table-card {
            box-shadow: none !important;
            border: none !important;
          }
          table { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
