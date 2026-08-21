import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useAccountingQuery, invalidateAllAccountingKeys } from '../../../hooks/useAccountingQuery';

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

interface WalletData {
  id: string;
  balance: number;
  transactions: WalletTransaction[];
}

export default function ParentWallet() {
  const { activeEntity } = useAuth();
  const { showToast } = useToast();
  
  // Topup state
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const { data: wallet = null, isLoading: loading, refetch: fetchWallet } = useAccountingQuery<WalletData | null>({
    key: `wallets:${activeEntity?.id}`,
    enabled: !!activeEntity?.id,
    fetcher: async () => {
      const res = await api.get(`/api/wallets/${activeEntity?.id}`);
      return res.data;
    }
  });

  const handleTopup = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return showToast('Enter a valid amount', 'warning');
    
    setIsProcessing(true);
    try {
      const res = await api.post('/api/wallets/fund', {
        studentId: activeEntity?.id,
        amount: val,
        paymentMethod: 'Online Payment'
      });
      setAmount('');
      showToast('Wallet funded successfully!', 'success');
      setAmount('');
      invalidateAllAccountingKeys();
    } catch (e) {
      showToast('Failed to process payment', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!activeEntity) {
    return <div style={{ padding: 20 }}>Please select a student to view their wallet.</div>;
  }

  return (
    <>
      <div className="portal-page-header">
        <h1>Tuckshop & Uniform Wallet</h1>
        <p>Manage digital funds for <strong>{activeEntity.name}</strong> to use at the school tuckshop and uniform shop.</p>
      </div>

      {loading ? (
        <div style={{ padding: 20 }}>Loading wallet data...</div>
      ) : (
        <>
          <div className="portal-stats-grid">
             <div className="portal-stat-card">
                <div className="portal-stat-icon orange"><i className="fas fa-wallet"></i></div>
                <div className="portal-stat-info">
                   <h3>${(wallet?.balance || 0).toFixed(2)}</h3>
                   <p>Current Balance</p>
                </div>
             </div>
             <div className="portal-stat-card">
                <div className="portal-stat-icon green"><i className="fas fa-chart-line"></i></div>
                <div className="portal-stat-info">
                   <h3>${wallet?.transactions.filter(t => t.type === 'PURCHASE').reduce((s, t) => s + Math.abs(t.amount), 0).toFixed(2)}</h3>
                   <p>Total Spent</p>
                </div>
             </div>
             <div className="portal-stat-card">
                <div className="portal-stat-icon blue"><i className="fas fa-exchange-alt"></i></div>
                <div className="portal-stat-info">
                   <h3>{wallet?.transactions.length || 0}</h3>
                   <p>Total Transactions</p>
                </div>
             </div>
          </div>

          <div className="portal-grid-1-2" style={{ marginTop: 24 }}>
             {/* Top up */}
             <div className="portal-card">
                <div className="portal-card-header">
                   <h2><i className="fas fa-plus-circle" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>Quick Top-up</h2>
                </div>
                <div className="portal-card-body">
                   <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: '#718096' }}>Amount ($)</label>
                      <input 
                        type="text" inputMode="decimal" pattern="[0-9]*" 
                        className="portal-input" 
                        placeholder="e.g. 50" 
                        style={{ width: '100%' }} 
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                      />
                   </div>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                      {[10, 20, 50, 100].map(val => (
                         <button 
                           key={val} 
                           className="portal-btn-secondary" 
                           style={{ flex: 1, padding: '8px 0', fontSize: '0.85rem' }}
                           onClick={() => setAmount(val.toString())}
                         >
                           +${val}
                         </button>
                      ))}
                   </div>
                   <button 
                     className="portal-btn-primary" 
                     style={{ width: '100%', justifyContent: 'center' }}
                     onClick={handleTopup}
                     disabled={isProcessing || !amount}
                   >
                      {isProcessing ? 'Processing...' : 'Add Funds to Wallet'}
                   </button>
                </div>
             </div>

             {/* Recent Transactions */}
             <div className="portal-card">
                <div className="portal-card-header">
                   <h2>Recent Transactions</h2>
                   <button className="portal-btn-secondary" onClick={() => setShowFilterModal(true)}><i className="fas fa-filter"></i> Filter</button>
                </div>
                <div className="portal-card-body" style={{ padding: 0 }}>
                   <table className="portal-table">
                      <thead>
                         <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Type</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                         </tr>
                      </thead>
                      <tbody>
                         {wallet?.transactions.length === 0 ? (
                            <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>No transactions found</td></tr>
                         ) : wallet?.transactions.map(txn => (
                            <tr key={txn.id}>
                               <td>{new Date(txn.createdAt).toLocaleDateString()}</td>
                               <td style={{ fontWeight: 600 }}>{txn.description}</td>
                               <td>
                                  <span className={`portal-badge ${txn.type === 'DEPOSIT' ? 'success' : 'neutral'}`}>
                                    {txn.type}
                                  </span>
                               </td>
                               <td style={{ textAlign: 'right', fontWeight: 600, color: txn.amount > 0 ? 'var(--portal-success)' : 'var(--portal-danger)' }}>
                                  {txn.amount > 0 ? '+' : ''}{txn.amount.toFixed(2)}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        </>
      )}

      {showFilterModal && (
        <div className="portal-modal-overlay">
           <div className="portal-modal-card">
              <div className="portal-modal-header">
                 <h2>Filter Transactions</h2>
                 <button onClick={() => setShowFilterModal(false)} className="portal-btn-ghost" style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
              </div>
              <div className="portal-modal-body">
                 <div className="portal-form-group">
                    <label>Transaction Type</label>
                    <select className="portal-input">
                       <option value="">All Types</option>
                       <option value="DEPOSIT">Deposits</option>
                       <option value="PURCHASE">Purchases</option>
                    </select>
                 </div>
                 <div className="portal-form-group">
                    <label>Date Range</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <input type="date" className="portal-input" />
                       <input type="date" className="portal-input" />
                    </div>
                 </div>
              </div>
              <div className="portal-modal-footer">
                 <button className="portal-btn-secondary" onClick={() => setShowFilterModal(false)}>Clear</button>
                 <button className="portal-btn-primary" onClick={() => setShowFilterModal(false)}>Apply Filter</button>
              </div>
           </div>
        </div>
      )}
    </>
  );
}
