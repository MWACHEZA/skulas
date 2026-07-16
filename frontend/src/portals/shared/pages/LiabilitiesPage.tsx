import React, { useState, useEffect } from "react";
import api from "../../../lib/api";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { useTerminology } from "../../../hooks/useTerminology";
import '../../../styles/portal.css';

interface Category {
  id: string;
  name: string;
}

interface Liability {
  id: string;
  name: string;
  amount: number;
  settled: number;
  date: string;
  status: string;
  category: Category;
}

const LiabilitiesPage: React.FC = () => {
  const { t } = useTerminology();
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState<{id: string, name: string} | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSubmittingCategory(true);
    try {
      await api.post('/api/accounts/categories', { name: newCategoryName.trim(), type: 'LIABILITY' });
      toast.success('Liability category cataloged');
      setNewCategoryName('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create category');
    } finally {
      setSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to purge this classification category? Existing records using this category may be impacted.')) return;
    try {
      await api.delete(`/api/accounts/categories/${id}`);
      toast.success('Classification category purged');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to purge category');
    }
  };

  const fetchCurrencySettings = async () => {
    try {
      const { data } = await api.get('/api/schools/settings');
      if (data && data.baseCurrencySymbol) {
        setCurrencySymbol(data.baseCurrencySymbol);
      }
    } catch (err) {
      console.error(err);
    
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [liabRes, catRes] = await Promise.all([
        api.get('/api/accounts/liabilities'),
        api.get('/api/accounts/categories')
      ]);
      setLiabilities(Array.isArray(liabRes.data) ? liabRes.data : []);
      setCategories((Array.isArray(catRes.data) ? catRes.data : []).filter((c: any) => c.type === 'LIABILITY'));
    } catch (error) {
      toast.error('Failed to fetch institutional liabilities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCurrencySettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/accounts/liabilities', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success('Institutional liability cataloged');
      setShowAddModal(false);
      setFormData({
        name: '',
        categoryId: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd')
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to catalog liability');
    }
  };

  const handleSettle = async () => {
    if (!showSettleModal || !settleAmount) return;
    try {
      await api.patch(`/api/accounts/liabilities/${showSettleModal.id}/settle`, {
        amount: parseFloat(settleAmount)
      });
      toast.success('Liability settlement archived');
      setShowSettleModal(null);
      setSettleAmount('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Settlement processing failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to purge this liability record? This action is irreversible.')) return;
    try {
      await api.delete(`/api/accounts/liabilities/${id}`);
      toast.success('Record purged from ledger');
      fetchData();
    } catch (error) {
      toast.error('Failed to purge record');
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Liability Management</h1>
          <p>Strategic oversight and auditing of institutional debts, supplier obligations, and fiscal liabilities.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="status-badge" style={{ padding: '8px 20px', background: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6', fontWeight: 900 }}>
            <i className="fas fa-balance-scale-right mr-2"></i>DEBIT LEDGER
          </div>
          <button 
            onClick={() => setShowCategoriesModal(true)}
            className="portal-btn-secondary" 
            style={{ padding: '12px 28px', fontWeight: 900 }}
          >
            <i className="fas fa-tags mr-2"></i>Manage Categories
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="portal-btn-primary"
            style={{ padding: '12px 28px', fontWeight: 900 }}
          >
            <i className="fas fa-plus mr-2"></i>Catalog Liability
          </button>
        </div>
      </div>

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Institutional Obligations Matrix</h3>
        </div>
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Obligation</th>
                <th>Classification</th>
                <th>Principal Sum</th>
                <th>Settled Amt</th>
                <th>Outstanding</th>
                <th style={{ textAlign: 'center' }}>Fiscal Status</th>
                <th>Creation Date</th>
                <th style={{ textAlign: 'right' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="portal-spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p style={{ fontWeight: 800, color: '#64748b' }}>Synchronizing debit ledger...</p>
                  </td>
                </tr>
              ) : (Array.isArray(liabilities) ? liabilities : []).length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '100px', color: '#94a3b8' }}>
                    <i className="fas fa-file-invoice-dollar" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>No institutional liabilities identified</p>
                  </td>
                </tr>
              ) : (Array.isArray(liabilities) ? liabilities : []).map((row) => {
                const balance = row.amount - row.settled;
                return (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: '#1e293b' }}>{row.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>REF: {row.id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td>
                      <span className="status-badge" style={{ background: '#f8fafc', color: '#475569', fontWeight: 900, padding: '6px 14px', border: '1px solid #f1f5f9' }}>
                        {row.category?.name}
                      </span>
                    </td>
                    <td><span style={{ fontWeight: 800, color: '#1e293b' }}>{currencySymbol}{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td><span style={{ fontWeight: 900, color: '#059669' }}>{currencySymbol}{row.settled.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td><span style={{ fontWeight: 900, color: '#e11d48' }}>{currencySymbol}{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="status-badge" style={{ 
                        fontWeight: 900,
                        padding: '6px 12px',
                        background: row.status === 'Settled' ? '#ecfdf5' : row.status === 'Partially Settled' ? '#fffbeb' : '#fef2f2',
                        color: row.status === 'Settled' ? '#059669' : row.status === 'Partially Settled' ? '#d97706' : '#dc2626',
                        border: `1px solid ${row.status === 'Settled' ? '#d1fae5' : row.status === 'Partially Settled' ? '#fef3c7' : '#fee2e2'}`
                      }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontWeight: 700 }}>{format(new Date(row.date), 'dd MMM yyyy')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                        {row.status !== 'Settled' && (
                          <button 
                            onClick={() => setShowSettleModal({id: row.id, name: row.name})}
                            className="portal-btn-ghost"
                            style={{ color: '#059669', padding: '8px' }}
                            title="Authorize Settlement"
                          >
                            <i className="fas fa-hand-holding-usd"></i>
                          </button>
                        )}
                        <button className="portal-btn-ghost" style={{ color: '#2563eb', padding: '8px' }} title="Audit / Edit" onClick={() => alert('This feature is currently under development or disabled.')}>
                          <i className="fas fa-pencil-alt"></i>
                        </button>
                        <button 
                          onClick={() => handleDelete(row.id)}
                          className="portal-btn-ghost"
                          style={{ color: '#dc2626', padding: '8px' }}
                          title="Purge Record"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '560px' }}>
            <div className="portal-modal-header" style={{ padding: '24px 32px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Catalog New Institutional Liability</h2>
              <button className="portal-btn-ghost" onClick={() => setShowAddModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="portal-modal-body" style={{ padding: '32px' }}>
                <div style={{ display: 'grid', gap: '24px' }}>
                  <div className="form-group">
                    <label className="portal-label">Canonical Liability Name</label>
                    <input 
                      type="text" 
                      required
                      className="portal-input"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      style={{ fontWeight: 700 }}
                      placeholder="e.g. Infrastructure Expansion Loan, Supplier Debt"
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Strategic Classification</label>
                    <select 
                      required
                      className="portal-input"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                      style={{ fontWeight: 700 }}
                    >
                      <option value="">-- Select Category --</option>
                      {(Array.isArray(categories) ? categories : []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="form-group">
                      <label className="portal-label">Principal Amount ({currencySymbol})</label>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        className="portal-input"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        style={{ fontWeight: 900, color: '#e11d48' }}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group">
                      <label className="portal-label">Incurred Date</label>
                      <input 
                        type="date" 
                        required
                        className="portal-input"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="portal-modal-footer" style={{ padding: '24px 32px', background: '#f8fafc' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="portal-btn-ghost" style={{ fontWeight: 800 }}>Abort Process</button>
                <button type="submit" className="portal-btn-primary" style={{ padding: '12px 32px', fontWeight: 900 }}>Finalize Registry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {showSettleModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '440px' }}>
            <div className="portal-modal-header" style={{ padding: '24px 32px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Authorize Settlement</h2>
              <button className="portal-btn-ghost" onClick={() => setShowSettleModal(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body" style={{ padding: '32px' }}>
              <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                 <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Executing payment for:</p>
                 <p style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: 900, color: '#1e293b' }}>{showSettleModal.name}</p>
              </div>
              <div className="form-group">
                <label className="portal-label">Settlement Amount ({currencySymbol})</label>
                <input 
                  type="number" 
                  step="0.01"
                  autoFocus
                  className="portal-input"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  style={{ fontWeight: 900, fontSize: '1.25rem', color: '#059669', height: '56px', textAlign: 'center' }}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="portal-modal-footer" style={{ padding: '24px 32px', background: '#f8fafc' }}>
              <button onClick={() => setShowSettleModal(null)} className="portal-btn-ghost" style={{ fontWeight: 800 }}>Cancel</button>
              <button 
                onClick={handleSettle}
                className="portal-btn-primary"
                style={{ background: '#059669', border: '1px solid #047857', padding: '12px 32px', fontWeight: 900 }}
              >
                Execute Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoriesModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '520px', padding: 0 }}>
            <div className="portal-modal-header" style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Manage Liability Classifications</h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Configure classification groups for institutional liabilities.</p>
              </div>
              <button onClick={() => setShowCategoriesModal(false)} className="portal-btn-ghost" style={{ padding: '12px' }}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body" style={{ padding: '32px' }}>
              <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <input 
                  type="text" 
                  placeholder="New category name..."
                  className="portal-input"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  style={{ fontWeight: 700, margin: 0 }}
                  required
                />
                <button 
                  type="submit"
                  className="portal-btn-primary"
                  style={{ padding: '0 24px', whiteSpace: 'nowrap', fontWeight: 900, background: '#e11d48', border: '1px solid #e11d48' }}
                  disabled={submittingCategory}
                >
                  {submittingCategory ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>}
                </button>
              </form>

              <div style={{ display: 'grid', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {categories.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
                    <i className="fas fa-folder-open mb-2" style={{ fontSize: '1.5rem', opacity: 0.2 }}></i>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>No categories defined yet</p>
                  </div>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: 800, color: '#334155' }}>{cat.name}</span>
                      <button 
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="portal-btn-ghost"
                        style={{ color: '#e11d48', padding: '6px', borderRadius: '8px' }}
                        title="Purge Category"
                      >
                        <i className="fas fa-trash" style={{ fontSize: '0.85rem' }}></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="portal-modal-footer" style={{ padding: '20px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCategoriesModal(false)} className="portal-btn-ghost" style={{ padding: '10px 24px', fontWeight: 800 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiabilitiesPage;
