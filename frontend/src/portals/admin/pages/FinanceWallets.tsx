import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';

type WalletTab = 'sales' | 'inventory' | 'topups';

export default function FinanceWallets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const activeTab = (searchParams.get('tab') as WalletTab) || 'sales';
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Data states
  const [sales, setSales] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);

  // Top-up modal state
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [submittingTopup, setSubmittingTopup] = useState(false);

  useEffect(() => {
    fetchTabData();
  }, [activeTab]);

  const fetchTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        const { data } = await api.get('/api/tuckshop/sales');
        setSales(Array.isArray(data) ? data : data.sales || []);
      } else if (activeTab === 'inventory') {
        const { data } = await api.get('/api/tuckshop/items');
        setInventory(Array.isArray(data) ? data : data.items || []);
      } else if (activeTab === 'topups') {
        const { data } = await api.get('/api/wallets');
        setWallets(Array.isArray(data) ? data : data.wallets || []);
      }
    } catch (err) {
      console.error('Failed to load wallet domain data:', err);
      if (activeTab === 'sales') setSales([]);
      else if (activeTab === 'inventory') setInventory([]);
      else setWallets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: WalletTab) => {
    setSearchParams({ tab });
  };

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !topupAmount || parseFloat(topupAmount) <= 0) {
      return showToast('Please enter a valid top-up credit amount', 'error');
    }
    setSubmittingTopup(true);
    try {
      await api.post(`/api/wallets/${selectedWallet.id}/topup`, {
        amount: parseFloat(topupAmount),
        channel: 'CASH_DESK'
      });
      showToast(`Successfully credited ${formatCurrency(parseFloat(topupAmount))} to wallet`, 'success');
      setSelectedWallet(null);
      setTopupAmount('');
      fetchTabData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to top-up wallet', 'error');
    } finally {
      setSubmittingTopup(false);
    }
  };

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Tuckshop & Student Spending Wallets</h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            Consolidated daily student spending, canteen sales, grocery store stock, and wallet credit top-ups.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 20 }}>
        {[
          { id: 'sales', label: 'Tuckshop & Canteen Sales', icon: 'fas fa-cash-register' },
          { id: 'inventory', label: 'Store & Snack Inventory', icon: 'fas fa-boxes' },
          { id: 'topups', label: 'Student Wallets & Top-ups', icon: 'fas fa-wallet' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id as WalletTab)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === t.id ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === t.id ? '#2563eb' : '#64748b',
              fontWeight: activeTab === t.id ? 800 : 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className={t.icon}></i>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="portal-card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }}></i>
          <input
            type="text"
            placeholder="Search items, student names, or reference codes..."
            className="portal-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="portal-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#2563eb', marginBottom: 12 }}></i>
            <p>Loading records...</p>
          </div>
        ) : (
          <>
            {/* View 1: Sales */}
            {activeTab === 'sales' && (
              <div className="portal-card-body portal-card-body-flat">
                {sales.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    No sales recorded for this period.
                  </div>
                ) : (
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Receipt ID</th>
                        <th>Student / Customer</th>
                        <th>Items Purchased</th>
                        <th>Payment Mode</th>
                        <th>Total Amount</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((s, idx) => (
                        <tr key={s.id || idx}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.id?.slice(0, 8) || `SALE-${idx + 1}`}</td>
                          <td><strong>{s.student?.user?.name || s.studentName || 'Walk-in Student'}</strong></td>
                          <td>{s.itemNames || `${s.quantity || 1} items`}</td>
                          <td><span className="portal-badge info">{s.paymentMethod || 'Wallet Debit'}</span></td>
                          <td style={{ fontWeight: 800, color: '#059669' }}>{formatCurrency(s.totalAmount || s.amount || 0)}</td>
                          <td style={{ color: '#64748b' }}>{s.createdAt ? new Date(s.createdAt).toLocaleString() : 'Today'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* View 2: Inventory */}
            {activeTab === 'inventory' && (
              <div className="portal-card-body portal-card-body-flat">
                {inventory.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    No inventory items listed in canteen store.
                  </div>
                ) : (
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Selling Price</th>
                        <th>Stock on Hand</th>
                        <th>Stock Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td style={{ fontWeight: 700 }}>{item.name}</td>
                          <td><span className="portal-badge neutral">{item.category || 'Snack'}</span></td>
                          <td style={{ fontWeight: 700 }}>{formatCurrency(item.price || 0)}</td>
                          <td style={{ fontWeight: 800 }}>{item.stock || 0}</td>
                          <td>
                            <span className={`portal-badge ${(item.stock || 0) <= 5 ? 'danger' : (item.stock || 0) <= 15 ? 'warning' : 'success'}`}>
                              {(item.stock || 0) <= 5 ? 'Critical Stock' : (item.stock || 0) <= 15 ? 'Low Stock' : 'Adequate'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* View 3: Top-ups & Wallets */}
            {activeTab === 'topups' && (
              <div className="portal-card-body portal-card-body-flat">
                {wallets.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    No student wallets created yet.
                  </div>
                ) : (
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Student ID</th>
                        <th>Wallet Balance</th>
                        <th>Daily Limit</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wallets.map((w, idx) => (
                        <tr key={w.id || idx}>
                          <td><strong>{w.student?.user?.name || w.studentName || 'Student'}</strong></td>
                          <td style={{ fontFamily: 'monospace' }}>{w.student?.studentId || w.studentId || '—'}</td>
                          <td style={{ fontSize: '1.05rem', fontWeight: 800, color: (w.balance || 0) > 0 ? '#059669' : '#dc2626' }}>
                            {formatCurrency(w.balance || 0)}
                          </td>
                          <td style={{ color: '#64748b' }}>{w.dailyLimit ? formatCurrency(w.dailyLimit) : 'Unlimited'}</td>
                          <td><span className="portal-badge success">{w.status || 'Active'}</span></td>
                          <td>
                            <button
                              className="portal-btn-primary"
                              style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                              onClick={() => setSelectedWallet(w)}
                            >
                              <i className="fas fa-plus mr-1"></i>Top-Up
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Top-up Modal */}
      {selectedWallet && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: 450 }}>
            <div className="portal-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Credit Student Tuckshop Wallet</h3>
              <button className="portal-btn-ghost" onClick={() => setSelectedWallet(null)}>&times;</button>
            </div>
            <form onSubmit={handleTopupSubmit}>
              <div className="portal-modal-body" style={{ padding: 24 }}>
                <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.9rem' }}>
                  Crediting wallet for <strong>{selectedWallet.student?.user?.name || selectedWallet.studentName}</strong> (Current Balance: {formatCurrency(selectedWallet.balance || 0)})
                </p>
                <div className="form-group">
                  <label className="portal-label">Top-Up Amount ($ / ZiG Equivalent)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    className="portal-input"
                    placeholder="e.g. 20.00"
                    value={topupAmount}
                    onChange={e => setTopupAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="portal-modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setSelectedWallet(null)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={submittingTopup}>
                  {submittingTopup ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-check mr-2"></i>}
                  Authorize Credit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
