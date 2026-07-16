import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'BANK' | 'MOBILE_MONEY' | 'CASH';
  details?: {
    accountNumber?: string;
    branch?: string;
    paybill?: string;
    phone?: string;
    provider?: string;
    currency?: string;
    instructions?: string;
  };
  isActive: boolean;
  createdAt: string;
}

export default function PaymentMethodsPage() {
  const { showToast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<Partial<PaymentMethod> | null>(null);
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/api/schools/settings');
      if (data) {
        if (data.baseCurrency) setBaseCurrency(data.baseCurrency);
        if (data.baseCurrencySymbol) setCurrencySymbol(data.baseCurrencySymbol);
      }
    } catch (err) {
      console.error('Failed to load currency settings:', err);
    
    }
  };

  useEffect(() => {
    fetchMethods();
    fetchSettings();
  }, []);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/finance/payment-methods');
      setMethods(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to synchronize institutional account registry', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod?.name) return;

    setSaving(true);
    try {
      if (editingMethod.id) {
        const { data } = await api.post('/api/finance/payment-methods', editingMethod);
        setMethods([...methods.filter(m => m.id !== editingMethod.id), data]);
      } else {
        const { data } = await api.post('/api/finance/payment-methods', editingMethod);
        setMethods([data, ...methods]);
      }
      setShowModal(false);
      setEditingMethod(null);
      showToast('Institutional account archived successfully', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to archive account details', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Are you sure you want to purge this institutional account? Incoming payment reconciliation may be impacted.'))) return;

    try {
      await api.delete(`/api/finance/payment-methods/${id}`);
      setMethods(methods.filter(m => m.id !== id));
      showToast('Institutional account purged', 'success');
    } catch (error) {
      showToast('Failed to purge account record', 'error');
    
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Institutional Financial Endpoints</h1>
          <p>Manage banking gateways, mobile money integration, and physical cash office endpoints for centralized revenue collection.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="status-badge" style={{ padding: '8px 20px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 900 }}>
             <i className="fas fa-university mr-2"></i>TREASURY ENDPOINTS
          </div>
          <button className="portal-btn-primary" onClick={() => { setEditingMethod({ type: 'BANK', isActive: true, details: { currency: baseCurrency } }); setShowModal(true); }} style={{ padding: '12px 28px', fontWeight: 900 }}>
            <i className="fas fa-plus mr-2"></i>Link Financial Account
          </button>
        </div>
      </div>

      {loading ? (
        <div className="portal-card" style={{ padding: '100px 24px', textAlign: 'center' }}>
          <div className="portal-spinner" style={{ margin: '0 auto 24px' }}></div>
          <p style={{ color: '#64748b', fontWeight: 800, fontSize: '1.1rem' }}>Synchronizing account registry...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '32px' }}>
          {(Array.isArray(methods) ? methods : []).length === 0 ? (
            <div className="portal-card animate-in fade-in zoom-in duration-500" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '120px 24px', background: '#f8fafc', border: '2px dashed #e2e8f0' }}>
              <i className="fas fa-university" style={{ fontSize: '4.5rem', color: '#cbd5e1', marginBottom: '32px', opacity: 0.2 }}></i>
              <h3 style={{ color: '#475569', marginBottom: '12px', fontWeight: 900, fontSize: '1.5rem' }}>No Accounts Cataloged</h3>
              <p style={{ color: '#94a3b8', fontWeight: 700, maxWidth: '500px', margin: '0 auto' }}>Link your first bank gateway or mobile money endpoint to authorize institutional revenue collection.</p>
            </div>
          ) : (Array.isArray(methods) ? methods : []).map(method => (
            <div key={method.id} className="portal-card animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ height: 'fit-content' }}>
              <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: method.type === 'BANK' ? '#eff6ff' : method.type === 'MOBILE_MONEY' ? '#ecfdf5' : '#fff7ed',
                    color: method.type === 'BANK' ? '#2563eb' : method.type === 'MOBILE_MONEY' ? '#059669' : '#d97706',
                    fontSize: '1.5rem',
                    border: `1px solid ${method.type === 'BANK' ? '#dbeafe' : method.type === 'MOBILE_MONEY' ? '#d1fae5' : '#ffedd5'}`
                  }}>
                    <i className={
                      method.type === 'BANK' ? 'fas fa-university' : 
                      method.type === 'MOBILE_MONEY' ? 'fas fa-mobile-alt' : 
                      'fas fa-money-bill-wave'
                    }></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#1e293b' }}>{method.name}</h3>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                       <span className={`status-badge ${method.isActive ? 'status-active' : 'status-inactive'}`} style={{ fontSize: '0.65rem', fontWeight: 900 }}>
                        {method.isActive ? 'OPERATIONAL' : 'DORMANT'}
                      </span>
                      <span className="status-badge" style={{ fontSize: '0.65rem', fontWeight: 900, background: '#f8fafc', color: '#64748b', border: '1px solid #f1f5f9' }}>
                        {method.type?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="action-buttons">
                   <button className="portal-btn-ghost" onClick={() => handleDelete(method.id)} title="Purge Record" style={{ color: '#dc2626', padding: '8px' }}>
                      <i className="fas fa-trash"></i>
                   </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '16px', background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                {method.type === 'BANK' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.85rem' }}>ACCOUNT NUMBER</span>
                      <strong style={{ color: '#1e293b', fontWeight: 900, fontSize: '1rem', letterSpacing: '1px' }}>{method.details?.accountNumber || 'NOT DEFINED'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.85rem' }}>BRANCH GATEWAY</span>
                      <strong style={{ color: '#1e293b', fontWeight: 900, fontSize: '0.95rem' }}>{method.details?.branch || 'GENERAL'}</strong>
                    </div>
                  </>
                )}
                {method.type === 'MOBILE_MONEY' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.85rem' }}>GATEWAY PROVIDER</span>
                      <strong style={{ color: '#059669', fontWeight: 900, fontSize: '1rem' }}>{method.details?.provider?.toUpperCase() || 'UNKNOWN'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.85rem' }}>PAYBILL / MERCHANT</span>
                      <strong style={{ color: '#1e293b', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.5px' }}>{method.details?.paybill || method.details?.phone || 'N/A'}</strong>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.85rem' }}>FISCAL CURRENCY</span>
                  <span className="status-badge" style={{ background: '#fff', color: '#1e293b', fontWeight: 900, fontSize: '0.8rem', border: '1px solid #e2e8f0', padding: '4px 12px' }}>
                    {method.details?.currency || 'USD'}
                  </span>
                </div>
              </div>

              {method.details?.instructions && (
                <div style={{ marginTop: '24px', padding: '16px', background: '#eff6ff', borderRadius: '14px', border: '1px solid #dbeafe', display: 'flex', gap: '14px' }}>
                  <i className="fas fa-info-circle" style={{ color: '#2563eb', fontSize: '1.1rem', marginTop: '2px' }}></i>
                  <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0, fontWeight: 700, lineHeight: 1.6 }}>
                    {method.details.instructions}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Account Modal */}
      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '560px' }}>
            <div className="portal-modal-header" style={{ padding: '24px 32px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>{editingMethod?.id ? 'Edit Financial Endpoint' : 'Link Strategic Account'}</h2>
              <button className="portal-btn-ghost" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="portal-modal-body" style={{ padding: '32px' }}>
                <div style={{ display: 'grid', gap: '24px' }}>
                  <div className="form-group">
                    <label className="portal-label">Canonical Account Label *</label>
                    <input 
                      type="text" 
                      className="portal-input"
                      placeholder="e.g. ZB Bank Main Revenue Account"
                      value={editingMethod?.name || ''}
                      onChange={(e) => setEditingMethod(p => ({ ...p, name: e.target.value }))}
                      style={{ fontWeight: 800, height: '56px' }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="portal-label">Strategic Account Type</label>
                    <select 
                      className="portal-input"
                      value={editingMethod?.type}
                      onChange={(e) => setEditingMethod(p => ({ ...p, type: e.target.value as any }))}
                      style={{ fontWeight: 800, height: '56px' }}
                    >
                      <option value="BANK">Traditional Banking Gateway</option>
                      <option value="MOBILE_MONEY">Mobile Money Integrated Endpoint</option>
                      <option value="CASH">Physical Cash Office Vault</option>
                    </select>
                  </div>

                  {editingMethod?.type === 'BANK' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="form-group">
                        <label className="portal-label">Account Number</label>
                        <input 
                          type="text" 
                          className="portal-input"
                          value={editingMethod?.details?.accountNumber || ''}
                          onChange={(e) => setEditingMethod(p => ({ ...p, details: { ...p!.details, accountNumber: e.target.value } }))}
                          style={{ fontWeight: 800, letterSpacing: '1px' }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="portal-label">Branch Metadata</label>
                        <input 
                          type="text" 
                          className="portal-input"
                          placeholder="e.g. First Street Branch"
                          value={editingMethod?.details?.branch || ''}
                          onChange={(e) => setEditingMethod(p => ({ ...p, details: { ...p!.details, branch: e.target.value } }))}
                          style={{ fontWeight: 700 }}
                        />
                      </div>
                    </div>
                  )}

                  {editingMethod?.type === 'MOBILE_MONEY' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="form-group">
                        <label className="portal-label">Gateway Provider</label>
                        <input 
                          type="text" 
                          className="portal-input"
                          placeholder="e.g. EcoCash / M-Pesa"
                          value={editingMethod?.details?.provider || ''}
                          onChange={(e) => setEditingMethod(p => ({ ...p, details: { ...p!.details, provider: e.target.value } }))}
                          style={{ fontWeight: 800, color: '#059669' }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="portal-label">Merchant ID / Paybill</label>
                        <input 
                          type="text" 
                          className="portal-input"
                          value={editingMethod?.details?.paybill || editingMethod?.details?.phone || ''}
                          onChange={(e) => setEditingMethod(p => ({ ...p, details: { ...p!.details, paybill: e.target.value, phone: e.target.value } }))}
                          style={{ fontWeight: 900 }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="portal-label">Account Currency</label>
                    <select 
                      className="portal-input"
                      value={editingMethod?.details?.currency || baseCurrency}
                      onChange={(e) => setEditingMethod(p => ({ ...p, details: { ...p!.details, currency: e.target.value } }))}
                      style={{ fontWeight: 800, height: '56px' }}
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="ZWL">ZWL - Zimbabwe Dollar</option>
                      <option value="ZiG">ZiG - Zimbabwe Gold</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="portal-label">Reconciliation Instructions / Meta-data</label>
                    <textarea 
                      className="portal-input"
                      placeholder="Specify reconciliation rules, e.g. 'Ensure students include Registration Number in reference field'"
                      value={editingMethod?.details?.instructions || ''}
                      onChange={(e) => setEditingMethod(p => ({ ...p, details: { ...p!.details, instructions: e.target.value } }))}
                      style={{ minHeight: '120px', resize: 'none', fontWeight: 600, fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
              </div>
              <div className="portal-modal-footer" style={{ padding: '24px 32px', background: '#f8fafc' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowModal(false)} style={{ fontWeight: 800 }}>Abort Process</button>
                <button type="submit" className="portal-btn-primary" disabled={saving} style={{ padding: '12px 32px', fontWeight: 900 }}>
                  {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-link mr-2"></i>}
                  {saving ? 'AUTHORIZING...' : 'LINK ACCOUNT GATEWAY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
