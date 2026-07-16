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

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: Category;
  paymentMode: string;
  currency: string;
}

const ExpensesPage: React.FC = () => {
  const { t } = useTerminology();
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submittingCategory, setSubmittingCategory] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    categoryId: '',
    paymentMode: '',
    currency: 'USD'
  });

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSubmittingCategory(true);
    try {
      await api.post('/api/accounts/categories', { name: newCategoryName.trim(), type: 'EXPENSE' });
      toast.success('Expenditure category cataloged');
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
      if (data) {
        if (data.baseCurrencySymbol) setCurrencySymbol(data.baseCurrencySymbol);
        if (data.baseCurrency) {
          setBaseCurrency(data.baseCurrency);
          setFormData(prev => ({ ...prev, currency: data.baseCurrency }));
        }
      }
    } catch (err) {
      console.error('Failed to load currency settings:', err);
    
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expenseRes, catRes] = await Promise.all([
        api.get('/api/accounts/expenses'),
        api.get('/api/accounts/categories')
      ]);
      setExpenses(Array.isArray(expenseRes.data) ? expenseRes.data : []);
      setCategories((Array.isArray(catRes.data) ? catRes.data : []).filter((c: any) => c.type === 'EXPENSE'));
    } catch (error) {
      toast.error('Failed to fetch expenditure data');
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
    if (!formData.title || !formData.amount || !formData.categoryId) {
      return toast.error('Please fill required fields');
    }
    try {
      await api.post('/api/accounts/expenses', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      toast.success('Institutional expense recorded');
      setFormData({ ...formData, title: '', amount: '' });
      setShowEntryModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to record expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record? This action cannot be undone.')) return;
    try {
      await api.delete(`/api/accounts/expenses/${id}`);
      toast.success('Record purged from ledger');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete record');
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Expenditure Management</h1>
          <p>Comprehensive tracking and auditing of institutional operational costs and utility settlements.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="status-badge" style={{ padding: '8px 20px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', fontWeight: 900 }}>
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
            onClick={() => setShowEntryModal(true)}
            className="portal-btn-primary" 
            style={{ padding: '12px 28px', fontWeight: 900, background: '#dc2626' }}
          >
            <i className="fas fa-plus-circle mr-2"></i>Authorize Expenditure
          </button>
        </div>
      </div>

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Institutional Expense Audit Ledger</h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Comprehensive history of operational cost outflows.</p>
          </div>
          <span className="status-badge" style={{ fontWeight: 900, background: '#f8fafc', color: '#475569', border: '1px solid #f1f5f9', padding: '8px 16px' }}>
            {(Array.isArray(expenses) ? expenses : []).length} AUTHORIZED TRANSACTIONS
          </span>
        </div>
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '32px' }}>Date</th>
                <th>Expense Detail</th>
                <th>Transaction Amount</th>
                <th>Cost Center</th>
                <th>Mode</th>
                <th>Currency</th>
                <th style={{ textAlign: 'right', paddingRight: '32px' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="portal-spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p style={{ fontWeight: 800, color: '#64748b' }}>Auditing ledger records...</p>
                  </td>
                </tr>
              ) : (Array.isArray(expenses) ? expenses : []).length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '100px', color: '#94a3b8' }}>
                    <i className="fas fa-receipt" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>No expenditure transactions identified</p>
                  </td>
                </tr>
              ) : (Array.isArray(expenses) ? expenses : []).map((row) => (
                <tr key={row.id}>
                  <td style={{ paddingLeft: '32px', color: '#64748b', fontWeight: 700 }}>{format(new Date(row.date), 'dd MMM yyyy')}</td>
                  <td>
                    <div style={{ fontWeight: 800, color: '#1e293b' }}>{row.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>REF: {row.id.slice(0, 8).toUpperCase()}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 900, color: '#dc2626' }}>{currencySymbol}{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </td>
                  <td>
                    <span className="status-badge" style={{ background: '#f8fafc', color: '#475569', fontWeight: 900, padding: '6px 14px', border: '1px solid #f1f5f9' }}>
                      {row.category?.name}
                    </span>
                  </td>
                  <td><span style={{ fontWeight: 700, color: '#64748b' }}>{row.paymentMode}</span></td>
                  <td style={{ fontWeight: 900, color: '#94a3b8' }}>{row.currency}</td>
                  <td style={{ textAlign: 'right', paddingRight: '32px' }}>
                    <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                      <button className="portal-btn-ghost" title="Audit / Edit" style={{ color: '#2563eb', padding: '8px' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-pencil-alt"></i></button>
                      <button onClick={() => handleDelete(row.id)} className="portal-btn-ghost" title="Purge Record" style={{ color: '#dc2626', padding: '8px' }}><i className="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEntryModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '640px', padding: 0 }}>
            <div className="portal-modal-header" style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>Secure Transaction Entry</h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Authorize institutional expenditure and operational cost settlements.</p>
              </div>
              <button onClick={() => setShowEntryModal(false)} className="portal-btn-ghost" style={{ padding: '12px' }}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="portal-modal-body" style={{ padding: '40px' }}>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="portal-label">Expense Description</label>
                  <input 
                    type="text" 
                    className="portal-input"
                    placeholder="e.g. Utility Settle - Electricity Q1"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{ fontWeight: 700, height: '56px' }}
                    required
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="portal-label">Settlement Date</label>
                    <input 
                      type="date" 
                      className="portal-input"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      style={{ fontWeight: 700, height: '56px' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Transaction Amount ({currencySymbol})</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 900, fontSize: '1.1rem' }}>{currencySymbol}</span>
                      <input 
                        type="number" 
                        step="0.01"
                        className="portal-input"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        style={{ paddingLeft: `${(currencySymbol.length * 8) + 24}px`, fontWeight: 900, color: '#dc2626', height: '56px', fontSize: '1.1rem' }}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="portal-label">Expenditure Category</label>
                  <select 
                    className="portal-input"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    style={{ fontWeight: 700, height: '56px' }}
                    required
                  >
                    <option value="">-- Select Strategic Cost Center --</option>
                    {(Array.isArray(categories) ? categories : []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div className="form-group">
                    <label className="portal-label">Payment Gateway / Mode</label>
                    <input 
                      type="text" 
                      placeholder="e.g. RTGS Transfer, Petty Cash"
                      className="portal-input"
                      value={formData.paymentMode}
                      onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                      style={{ fontWeight: 700, height: '56px' }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Ledger Currency</label>
                    <select 
                      className="portal-input"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      style={{ fontWeight: 700, height: '56px' }}
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="ZWL">ZWL - Zimbabwe Dollar</option>
                      <option value="ZiG">ZiG - Zimbabwe Gold</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="portal-modal-footer" style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowEntryModal(false)} className="portal-btn-ghost" style={{ padding: '14px 32px', fontWeight: 800 }}>Abort Transaction</button>
                <button 
                  type="submit"
                  className="portal-btn-primary"
                  style={{ padding: '14px 40px', background: '#dc2626', fontWeight: 900 }}
                >
                  <i className="fas fa-save mr-2"></i> Authorize Expenditure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoriesModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '520px', padding: 0 }}>
            <div className="portal-modal-header" style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Manage Expenditure Classifications</h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Configure classification groups for institutional expenditures.</p>
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
                  style={{ padding: '0 24px', whiteSpace: 'nowrap', fontWeight: 900, background: '#dc2626', border: '1px solid #dc2626' }}
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

export default ExpensesPage;
