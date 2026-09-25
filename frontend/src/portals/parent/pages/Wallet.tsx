import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useAccountingQuery, invalidateAllAccountingKeys } from '../../../hooks/useAccountingQuery';
import EmptyState from '../../../components/shared/EmptyState';

interface WalletTransaction {
  id: string;
  amount: number;
  type: 'DEPOSIT' | 'PURCHASE' | 'REFUND';
  description: string;
  createdAt: string;
  referenceId?: string;
  referenceType?: string;
}

interface WalletData {
  id: string;
  balance: number;
  dailyLimit?: number;
  weekSpendTotal?: number;
  isLowBalance?: boolean;
  transactions: WalletTransaction[];
}

export default function ParentWallet() {
  const { activeEntity } = useAuth();
  const { showToast } = useToast();

  // Top-up state
  const [amount, setAmount] = useState<string>('20');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // Daily limit state & modal
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [dailyLimitInput, setDailyLimitInput] = useState<string>('5.00');
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState<'ALL' | 'PURCHASE' | 'DEPOSIT'>('ALL');

  const { data: wallet = null, isLoading: loading, refetch: fetchWallet } = useAccountingQuery<WalletData | null>({
    key: `wallets:${activeEntity?.id}`,
    enabled: !!activeEntity?.id,
    fetcher: async () => {
      const res = await api.get(`/api/wallets/${activeEntity?.id}`);
      return res.data;
    }
  });

  useEffect(() => {
    if (wallet?.dailyLimit !== undefined) {
      setDailyLimitInput(wallet.dailyLimit.toFixed(2));
    }
  }, [wallet?.dailyLimit]);

  const handleTopup = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      return showToast('Please enter a valid top-up amount', 'warning');
    }

    setIsProcessing(true);
    try {
      await api.post('/api/wallets/fund', {
        studentId: activeEntity?.id,
        amount: val,
        paymentMethod: 'Paynow Online Gateway'
      });
      showToast(`$${val.toFixed(2)} added to ${activeEntity?.name}'s tuckshop wallet!`, 'success');
      setAmount('20');
      setShowPayModal(false);
      invalidateAllAccountingKeys();
      fetchWallet();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to process wallet top-up', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveDailyLimit = async (customLimit?: number) => {
    const val = customLimit !== undefined ? customLimit : parseFloat(dailyLimitInput);
    if (isNaN(val) || val < 0) {
      return showToast('Please enter a valid daily limit (0 or higher)', 'warning');
    }

    setIsSavingLimit(true);
    try {
      await api.post('/api/wallets/daily-limit', {
        studentId: activeEntity?.id,
        dailyLimit: val
      });
      showToast(`Daily spending limit set to $${val.toFixed(2)}/day`, 'success');
      setShowLimitModal(false);
      invalidateAllAccountingKeys();
      fetchWallet();
    } catch (e: any) {
      showToast(e.response?.data?.error || 'Failed to update daily limit', 'error');
    } finally {
      setIsSavingLimit(false);
    }
  };

  if (!activeEntity) {
    return (
      <div className="portal-container" style={{ padding: 40, textAlign: 'center' }}>
        <EmptyState
          icon="fas fa-utensils"
          title="No Student Selected"
          description="Please select a student from your portal to manage their Tuckshop & Dining wallet."
        />
      </div>
    );
  }

  const currentBalance = wallet?.balance ?? 0;
  const isLow = currentBalance < 5.00;
  const currentLimit = wallet?.dailyLimit ?? 5.00;
  const weekSpend = wallet?.weekSpendTotal ?? 0;

  // Filtered transactions
  const transactions = wallet?.transactions || [];
  const purchases = transactions.filter(t => t.type === 'PURCHASE');
  const recentPurchases = purchases.slice(0, 10);
  const filteredTransactions = transactions.filter(t => filterType === 'ALL' || t.type === filterType);

  return (
    <>
      <div className="portal-page-header">
        <div>
          <h1><i className="fas fa-utensils" style={{ marginRight: 10, color: '#f59e0b' }}></i>Tuckshop & Dining</h1>
          <p>
            Digital pocket money and daily meal spend controls for <strong>{activeEntity.name}</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="portal-btn-secondary" onClick={() => setShowLimitModal(true)}>
            <i className="fas fa-sliders-h"></i> Daily Limit: ${currentLimit.toFixed(2)}/day
          </button>
          <button className="portal-btn-primary" onClick={() => setShowPayModal(true)}>
            <i className="fas fa-plus-circle"></i> Top Up Wallet
          </button>
        </div>
      </div>

      {/* Low Balance Alert Banner */}
      {isLow && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <i className="fas fa-exclamation-triangle" style={{ color: '#d97706', fontSize: '1.25rem' }}></i>
            <div>
              <strong style={{ color: '#92400e' }}>Low Balance Alert (Under $5.00):</strong>
              <span style={{ color: '#92400e', marginLeft: 6 }}>
                Current balance is <strong>${currentBalance.toFixed(2)}</strong>. Top up soon so your child has enough funds for tuckshop snacks and canteen meals.
              </span>
            </div>
          </div>
          <button
            className="portal-btn-primary"
            style={{ background: '#d97706', borderColor: '#b45309', padding: '6px 16px', fontSize: '0.85rem' }}
            onClick={() => setShowPayModal(true)}
          >
            Top Up Now
          </button>
        </div>
      )}

      {/* 3 Prominent Stat Cards */}
      <div className="portal-stats-grid">
        {/* Stat 1: Prominent Balance */}
        <div className="portal-stat-card" style={{ borderLeft: `4px solid ${isLow ? '#f59e0b' : '#10b981'}` }}>
          <div className={`portal-stat-icon ${isLow ? 'orange' : 'green'}`}>
            <i className="fas fa-wallet"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '2rem', fontWeight: 900, color: isLow ? '#d97706' : '#1e293b' }}>
              ${currentBalance.toFixed(2)}
            </h3>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Available Spending Balance</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontWeight: 700,
                  background: isLow ? '#fee2e2' : '#dcfce7',
                  color: isLow ? '#b91c1c' : '#15803d'
                }}
              >
                {isLow ? 'Low' : 'Healthy'}
              </span>
            </p>
          </div>
        </div>

        {/* Stat 2: This Week's Spending */}
        <div className="portal-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="portal-stat-icon blue">
            <i className="fas fa-calendar-week"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '2rem', fontWeight: 900 }}>${weekSpend.toFixed(2)}</h3>
            <p>Spent This Week (Mon – Sun)</p>
          </div>
        </div>

        {/* Stat 3: Daily Limit Control */}
        <div
          className="portal-stat-card"
          style={{ borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }}
          onClick={() => setShowLimitModal(true)}
        >
          <div className="portal-stat-icon purple">
            <i className="fas fa-shield-alt"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '2rem', fontWeight: 900 }}>${currentLimit.toFixed(2)}</h3>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Daily Spending Limit</span>
              <span style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.75rem' }}>[Change]</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Quick Top-Up & Spending Breakdown */}
      <div className="portal-grid-12-18" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Quick Top-Up Card */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2>
                <i className="fas fa-bolt" style={{ marginRight: 8, color: '#f59e0b' }}></i>
                Quick Top-Up
              </h2>
            </div>
            <div className="portal-card-body">
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Select or Enter Top-Up Amount ($)
              </label>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {[10, 20, 50].map(val => (
                  <button
                    key={val}
                    type="button"
                    className="portal-btn-secondary"
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      fontWeight: 700,
                      fontSize: '1rem',
                      background: amount === val.toString() ? '#eff6ff' : '#fff',
                      borderColor: amount === val.toString() ? '#2563eb' : '#cbd5e1',
                      color: amount === val.toString() ? '#2563eb' : '#1e293b'
                    }}
                    onClick={() => setAmount(val.toString())}
                  >
                    +${val}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 20 }}>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  className="portal-input"
                  placeholder="Custom Amount (e.g. 35)"
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>

              <button
                className="portal-btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', fontWeight: 700 }}
                onClick={handleTopup}
                disabled={isProcessing || !amount}
              >
                {isProcessing ? (
                  <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Processing Paynow...</>
                ) : (
                  <><i className="fas fa-lock" style={{ marginRight: 8 }}></i>Pay ${amount || '0'} via Paynow</>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.75rem', color: '#64748b' }}>
                <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 4 }}></i>
                Instant availability at School Tuckshop & Uniform Shop POS
              </div>
            </div>
          </div>

          {/* Daily Limit Control Card */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2>
                <i className="fas fa-user-shield" style={{ marginRight: 8, color: '#8b5cf6' }}></i>
                Daily Allowance Control
              </h2>
            </div>
            <div className="portal-card-body">
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
                Set a daily cap to prevent {activeEntity.name} from exhausting their balance all at once.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Snack Only', val: 2 },
                  { label: 'Lunch + Snack', val: 5 },
                  { label: 'Full Day Dining', val: 10 },
                  { label: 'No Daily Limit', val: 0 }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    className="portal-btn-secondary"
                    style={{
                      padding: '10px 8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: currentLimit === opt.val ? '#f3e8ff' : '#fff',
                      borderColor: currentLimit === opt.val ? '#8b5cf6' : '#cbd5e1',
                      color: currentLimit === opt.val ? '#6b21a8' : '#334155'
                    }}
                    onClick={() => handleSaveDailyLimit(opt.val)}
                    disabled={isSavingLimit}
                  >
                    <div>{opt.label}</div>
                    <div style={{ fontSize: '0.95rem', marginTop: 2 }}>
                      {opt.val === 0 ? 'Unlimited' : `$${opt.val.toFixed(2)}/day`}
                    </div>
                  </button>
                ))}
              </div>

              <button
                className="portal-btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowLimitModal(true)}
              >
                Set Custom Daily Limit
              </button>
            </div>
          </div>
        </div>

        {/* Right column: This Week's Itemized Spending Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Itemized Recent Purchases Breakdown */}
          <div className="portal-card">
            <div className="portal-card-header">
              <div>
                <h2>
                  <i className="fas fa-shopping-basket" style={{ marginRight: 8, color: '#2563eb' }}></i>
                  This Week's Itemized Spending
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                  Last {recentPurchases.length} tuckshop & dining purchases
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#dc2626' }}>
                Total: -${weekSpend.toFixed(2)}
              </div>
            </div>

            <div className="portal-card-body" style={{ padding: 0 }}>
              {recentPurchases.length === 0 ? (
                <div style={{ padding: 40 }}>
                  <EmptyState
                    icon="fas fa-shopping-basket"
                    title="No Purchases This Week"
                    description="No tuckshop purchases recorded this week. Purchases made at the school tuckshop will appear here itemized."
                  />
                </div>
              ) : (
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Item Description</th>
                      <th>Point of Sale</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPurchases.map(txn => (
                      <tr key={txn.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{new Date(txn.createdAt).toLocaleDateString()}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#1e293b' }}>
                          {txn.description || 'Tuckshop Purchase'}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: '#f1f5f9',
                              color: '#475569',
                              fontWeight: 600
                            }}
                          >
                            {txn.referenceType || 'Tuckshop POS'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                          -${Math.abs(txn.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Full Transaction History (Deposits & Purchases) */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2>Full Wallet History</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['ALL', 'PURCHASE', 'DEPOSIT'] as const).map(type => (
                  <button
                    key={type}
                    style={{
                      border: 'none',
                      background: filterType === type ? '#2563eb' : '#f1f5f9',
                      color: filterType === type ? '#fff' : '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                    onClick={() => setFilterType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="portal-card-body" style={{ padding: 0 }}>
              {filteredTransactions.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
                  No transactions matching this filter
                </div>
              ) : (
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
                    {filteredTransactions.slice(0, 15).map(txn => (
                      <tr key={txn.id}>
                        <td>{new Date(txn.createdAt).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 600 }}>{txn.description}</td>
                        <td>
                          <span className={`portal-badge ${txn.type === 'DEPOSIT' ? 'success' : 'neutral'}`}>
                            {txn.type}
                          </span>
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 700,
                            color: txn.amount > 0 ? '#16a34a' : '#dc2626'
                          }}
                        >
                          {txn.amount > 0 ? '+' : ''}${txn.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: SET DAILY LIMIT ── */}
      {showLimitModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: 440 }}>
            <div className="portal-modal-header">
              <h2><i className="fas fa-sliders-h" style={{ marginRight: 8, color: '#8b5cf6' }}></i>Set Daily Spending Limit</h2>
              <button onClick={() => setShowLimitModal(false)} className="portal-btn-ghost">&times;</button>
            </div>
            <div className="portal-modal-body">
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
                Choose the maximum amount <strong>{activeEntity.name}</strong> can spend per school day at the tuckshop and dining hall.
              </p>

              <div className="portal-form-group">
                <label>Daily Spending Cap ($/day)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="portal-input"
                  placeholder="e.g. 5.00 (Enter 0 for unlimited)"
                  value={dailyLimitInput}
                  onChange={e => setDailyLimitInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {[2, 5, 10, 15].map(v => (
                  <button
                    key={v}
                    type="button"
                    className="portal-btn-secondary"
                    style={{ flex: 1, padding: '6px 0', fontSize: '0.8rem' }}
                    onClick={() => setDailyLimitInput(v.toFixed(2))}
                  >
                    ${v}
                  </button>
                ))}
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-secondary" onClick={() => setShowLimitModal(false)}>
                Cancel
              </button>
              <button
                className="portal-btn-primary"
                onClick={() => handleSaveDailyLimit()}
                disabled={isSavingLimit}
              >
                {isSavingLimit ? 'Saving Limit...' : 'Save Daily Limit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: TOP UP DIALOG ── */}
      {showPayModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: 460 }}>
            <div className="portal-modal-header">
              <h2><i className="fas fa-wallet" style={{ marginRight: 8, color: '#10b981' }}></i>Fund Tuckshop Wallet</h2>
              <button onClick={() => setShowPayModal(false)} className="portal-btn-ghost">&times;</button>
            </div>
            <div className="portal-modal-body">
              <div className="portal-form-group">
                <label>Top-up Amount ($)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="portal-input"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {[10, 20, 50, 100].map(v => (
                  <button
                    key={v}
                    type="button"
                    className="portal-btn-secondary"
                    style={{ flex: 1, padding: '8px 0', fontSize: '0.85rem' }}
                    onClick={() => setAmount(v.toString())}
                  >
                    +${v}
                  </button>
                ))}
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, fontSize: '0.85rem', color: '#166534' }}>
                <i className="fas fa-lock" style={{ marginRight: 6 }}></i>
                Secure online payment processed via Paynow Zimbabwe gateway.
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-secondary" onClick={() => setShowPayModal(false)}>
                Cancel
              </button>
              <button className="portal-btn-primary" onClick={handleTopup} disabled={isProcessing || !amount}>
                {isProcessing ? 'Connecting...' : `Proceed to Pay $${amount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
