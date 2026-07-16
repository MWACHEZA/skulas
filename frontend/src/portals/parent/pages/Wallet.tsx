import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

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
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Topup state
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (activeEntity?.id) {
      fetchWallet();
    }
  }, [activeEntity]);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/wallets/${activeEntity?.id}`);
      setWallet(res.data);
    } catch (e) {
      console.error('Failed to fetch wallet', e);
    
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return alert('Enter a valid amount');
    
    setIsProcessing(true);
    try {
      // MOCK PAYMENT PROCESS
      const res = await api.post('/api/wallets/fund', {
        studentId: activeEntity?.id,
        amount: val,
        paymentMethod: 'Online Card (Mock)'
      });
      setWallet(res.data);
      setAmount('');
      alert('Wallet funded successfully!');
    } catch (e) {
      console.error('Failed to fund wallet', e);
      alert('Failed to fund wallet');
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
                      {isProcessing ? 'Processing...' : 'Proceed to Payment (Mock)'}
                   </button>
                </div>
             </div>

             {/* Recent Transactions */}
             <div className="portal-card">
                <div className="portal-card-header">
                   <h2>Recent Transactions</h2>
                   <button className="portal-btn-secondary" onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-filter"></i> Filter</button>
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
    </>
  );
}
