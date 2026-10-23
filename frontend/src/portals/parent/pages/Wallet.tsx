import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useAccountingQuery, invalidateAllAccountingKeys } from '../../../hooks/useAccountingQuery';
import EmptyState from '../../../components/shared/EmptyState';
import { Pagination, usePagination, PaginatedTable } from '../../../components/shared';

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

interface TuckshopItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export default function ParentWallet() {
  const { user, activeEntity } = useAuth();
  const currentChild = activeEntity || user?.linkedEntities?.[0];
  const { showToast } = useToast();

  // Top-up state
  const [amount, setAmount] = useState<string>('20');
  const [paymentChannel, setPaymentChannel] = useState<'Paynow Online Gateway' | 'EcoCash Mobile Money' | 'Instant Bank Transfer'>('Paynow Online Gateway');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // Daily limit state & modal
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [dailyLimitInput, setDailyLimitInput] = useState<string>('5.00');
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  // Tuckshop menu catalog state
  const [menuItems, setMenuItems] = useState<TuckshopItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Dietary & POS restrictions state
  const [dietaryPrefs, setDietaryPrefs] = useState({
    noPeanuts: false,
    noPork: false,
    limitSweets: false,
    healthyFirst: true
  });

  // Transaction filter state
  const [filterType, setFilterType] = useState<'ALL' | 'PURCHASE' | 'DEPOSIT'>('ALL');

  const { data: wallet = null, isLoading: loading, refetch: fetchWallet } = useAccountingQuery<WalletData | null>({
    key: `wallets:${currentChild?.id}`,
    enabled: !!currentChild?.id,
    fetcher: async () => {
      const res = await api.get(`/api/wallets/${currentChild?.id}`);
      return res.data;
    }
  });

  useEffect(() => {
    fetchMenuItems();
  }, [currentChild?.id]);

  useEffect(() => {
    if (wallet?.dailyLimit !== undefined) {
      setDailyLimitInput(wallet.dailyLimit.toFixed(2));
    }
  }, [wallet?.dailyLimit]);

  const fetchMenuItems = async () => {
    try {
      setMenuLoading(true);
      const res = await api.get('/api/tuckshop/items');
      if (Array.isArray(res.data)) {
        setMenuItems(res.data);
      }
    } catch (e) {
      console.warn('Could not load tuckshop menu items:', e);
    } finally {
      setMenuLoading(false);
    }
  };

  const handleTopup = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      return showToast('Please enter a valid top-up amount', 'warning');
    }

    setIsProcessing(true);
    try {
      await api.post('/api/wallets/fund', {
        studentId: currentChild?.id,
        amount: val,
        paymentMethod: paymentChannel
      });
      showToast(`$${val.toFixed(2)} added to ${currentChild?.name}'s tuckshop wallet!`, 'success');
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
        studentId: currentChild?.id,
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

  const transactions = wallet?.transactions || [];
  const purchases = transactions.filter(t => t.type === 'PURCHASE');
  const recentPurchases = purchases.slice(0, 10);
  const filteredTransactions = transactions.filter(t => filterType === 'ALL' || t.type === filterType);
  const txnPage = usePagination(filteredTransactions, 10);

  if (!currentChild) {
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

  const uniqueCategories = ['ALL', ...Array.from(new Set(menuItems.map(i => i.category).filter(Boolean)))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Page Header */}
      <div className="portal-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
            <span style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: '#fffbeb',
              color: '#f59e0b',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              border: '1px solid #fde68a'
            }}>
              <i className="fas fa-utensils"></i>
            </span>
            Tuckshop & Dining Wallet
          </h1>
          <p style={{ marginTop: 6, color: '#64748b', fontSize: '0.9rem' }}>
            Digital pocket money, cafeteria menu pricing, and daily meal spend controls for <strong>{currentChild.name}</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #fde68a',
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#f59e0b',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              flexShrink: 0
            }}>
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div>
              <strong style={{ color: '#92400e', display: 'block', fontSize: '0.92rem' }}>
                Low Pocket Money Alert (Under $5.00)
              </strong>
              <span style={{ color: '#b45309', fontSize: '0.84rem' }}>
                Current balance is <strong>${currentBalance.toFixed(2)}</strong>. Top up soon so {currentChild.name} has funds for tuckshop snacks and hot canteen meals.
              </span>
            </div>
          </div>
          <button
            className="portal-btn-primary"
            style={{ background: '#d97706', borderColor: '#b45309', padding: '8px 18px', fontSize: '0.85rem', fontWeight: 700 }}
            onClick={() => setShowPayModal(true)}
          >
            <i className="fas fa-bolt"></i> Top Up Now
          </button>
        </div>
      )}

      {/* 3 Prominent Stat Cards */}
      <div className="portal-stats-grid">
        <div className="portal-stat-card" style={{ borderLeft: `4px solid ${isLow ? '#f59e0b' : '#10b981'}` }}>
          <div className={`portal-stat-icon ${isLow ? 'orange' : 'green'}`}>
            <i className="fas fa-wallet"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '2rem', fontWeight: 900, color: isLow ? '#d97706' : '#0f172a' }}>
              ${currentBalance.toFixed(2)}
            </h3>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Available Spending Balance</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontWeight: 800,
                  background: isLow ? '#fee2e2' : '#dcfce7',
                  color: isLow ? '#b91c1c' : '#15803d'
                }}
              >
                {isLow ? 'Low' : 'Healthy'}
              </span>
            </p>
          </div>
        </div>

        <div className="portal-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="portal-stat-icon blue">
            <i className="fas fa-calendar-week"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '2rem', fontWeight: 900 }}>${weekSpend.toFixed(2)}</h3>
            <p>Spent This Week (Mon – Sun)</p>
          </div>
        </div>

        <div
          className="portal-stat-card"
          style={{ borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }}
          onClick={() => setShowLimitModal(true)}
        >
          <div className="portal-stat-icon purple">
            <i className="fas fa-shield-alt"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '2rem', fontWeight: 900 }}>
              {currentLimit === 0 ? 'Unlimited' : `$${currentLimit.toFixed(2)}`}
            </h3>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Daily Spending Limit</span>
              <span style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.75rem' }}>[Edit]</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Quick Top-Up & Spending Breakdown */}
      <div className="portal-grid-12-18">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Quick Top-Up Card */}
          <div className="portal-card" style={{ borderRadius: 16 }}>
            <div className="portal-card-header">
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                <i className="fas fa-bolt" style={{ marginRight: 8, color: '#f59e0b' }}></i>
                Instant Wallet Top-Up
              </h2>
            </div>
            <div className="portal-card-body">
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}>
                Select or Enter Amount (USD)
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                {[5, 10, 20, 50].map(val => (
                  <button
                    key={val}
                    type="button"
                    className="portal-btn-secondary"
                    style={{
                      padding: '10px 0',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      justifyContent: 'center',
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

              <div style={{ marginBottom: 14 }}>
                <input
                  type="text"
                  inputMode="decimal"
                  className="portal-input"
                  placeholder="Custom Amount (e.g. 15.00)"
                  style={{ width: '100%', fontSize: '1.05rem', fontWeight: 800 }}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                  Payment Method
                </label>
                <select
                  className="portal-input"
                  style={{ width: '100%', fontSize: '0.88rem', fontWeight: 600 }}
                  value={paymentChannel}
                  onChange={e => setPaymentChannel(e.target.value as any)}
                >
                  <option value="Paynow Online Gateway">Paynow Instant Gateway (Visa / EcoCash / Innbucks)</option>
                  <option value="EcoCash Mobile Money">EcoCash Direct USD</option>
                  <option value="Instant Bank Transfer">Bank Transfer / ZIPIT</option>
                </select>
              </div>

              <button
                className="portal-btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '0.95rem', fontWeight: 800 }}
                onClick={handleTopup}
                disabled={isProcessing || !amount}
              >
                {isProcessing ? (
                  <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Processing Deposit...</>
                ) : (
                  <><i className="fas fa-lock" style={{ marginRight: 8 }}></i>Fund ${amount || '0'} Now</>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.75rem', color: '#64748b' }}>
                <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 5 }}></i>
                Reflected immediately at School Tuckshop & Dining POS
              </div>
            </div>
          </div>

          {/* Daily Limit Control Card */}
          <div className="portal-card" style={{ borderRadius: 16 }}>
            <div className="portal-card-header">
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                <i className="fas fa-user-shield" style={{ marginRight: 8, color: '#8b5cf6' }}></i>
                Daily Allowance Cap
              </h2>
            </div>
            <div className="portal-card-body">
              <p style={{ margin: '0 0 14px', fontSize: '0.83rem', color: '#64748b', lineHeight: 1.4 }}>
                Set a daily spending cap so <strong>{currentChild.name}</strong> paces their pocket money across the school week.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'Snack Only', val: 2 },
                  { label: 'Lunch + Drink', val: 5 },
                  { label: 'Full Day Meal', val: 10 },
                  { label: 'No Daily Cap', val: 0 }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    className="portal-btn-secondary"
                    style={{
                      padding: '10px 8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      flexDirection: 'column',
                      background: currentLimit === opt.val ? '#f3e8ff' : '#fff',
                      borderColor: currentLimit === opt.val ? '#8b5cf6' : '#cbd5e1',
                      color: currentLimit === opt.val ? '#6b21a8' : '#334155'
                    }}
                    onClick={() => handleSaveDailyLimit(opt.val)}
                    disabled={isSavingLimit}
                  >
                    <div>{opt.label}</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, marginTop: 2 }}>
                      {opt.val === 0 ? 'Unlimited' : `$${opt.val.toFixed(2)}/day`}
                    </div>
                  </button>
                ))}
              </div>

              <button
                className="portal-btn-secondary"
                style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
                onClick={() => setShowLimitModal(true)}
              >
                <i className="fas fa-Sliders-h"></i> Custom Daily Limit
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Itemized Spending & Full Ledger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Itemized Recent Purchases Breakdown */}
          <div className="portal-card" style={{ borderRadius: 16 }}>
            <div className="portal-card-header">
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                  <i className="fas fa-shopping-basket" style={{ marginRight: 8, color: '#2563eb' }}></i>
                  This Week's Itemized Spending
                </h2>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                  Last {recentPurchases.length} tuckshop & dining POS purchases
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#dc2626', background: '#fef2f2', padding: '5px 12px', borderRadius: 20 }}>
                Total: -${weekSpend.toFixed(2)}
              </div>
            </div>

            <div className="portal-card-body" style={{ padding: 0 }}>
              {recentPurchases.length === 0 ? (
                <div style={{ padding: '36px 20px' }}>
                  <EmptyState
                    icon="fas fa-shopping-basket"
                    title="No Purchases Recorded This Week"
                    description="When your child buys meals or snacks at the school tuckshop till, each item and timestamp will appear here."
                  />
                </div>
              ) : (
                <PaginatedTable className="portal-table">
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
                          <div style={{ fontWeight: 700 }}>{new Date(txn.createdAt).toLocaleDateString()}</div>
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
                              fontSize: '0.72rem',
                              padding: '3px 9px',
                              borderRadius: 12,
                              background: '#f1f5f9',
                              color: '#475569',
                              fontWeight: 700
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
                </PaginatedTable>
              )}
            </div>
          </div>

          {/* Full Transaction History (Deposits & Purchases) */}
          <div className="portal-card" style={{ borderRadius: 16 }}>
            <div className="portal-card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                <i className="fas fa-history" style={{ marginRight: 8, color: '#0284c7' }}></i>
                Wallet Transaction Ledger
              </h2>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['ALL', 'PURCHASE', 'DEPOSIT'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    style={{
                      border: 'none',
                      background: filterType === type ? '#2563eb' : '#f1f5f9',
                      color: filterType === type ? '#fff' : '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '5px 12px',
                      borderRadius: 20,
                      cursor: 'pointer'
                    }}
                    onClick={() => setFilterType(type)}
                  >
                    {type === 'ALL' ? 'All' : type === 'PURCHASE' ? 'Purchases' : 'Deposits'}
                  </button>
                ))}
              </div>
            </div>

            <div className="portal-card-body" style={{ padding: 0 }}>
              {filteredTransactions.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
                  No wallet transactions found for this filter.
                </div>
              ) : (
                <>
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
                    {txnPage.paginatedItems.map(txn => (
                      <tr key={txn.id}>
                        <td style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                          {new Date(txn.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ fontWeight: 700, color: '#1e293b' }}>{txn.description}</td>
                        <td>
                          <span className={`portal-badge ${txn.type === 'DEPOSIT' ? 'success' : 'neutral'}`}>
                            {txn.type}
                          </span>
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 800,
                            color: txn.amount > 0 ? '#16a34a' : '#dc2626'
                          }}
                        >
                          {txn.amount > 0 ? '+' : ''}${txn.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  currentPage={txnPage.currentPage}
                  totalItems={txnPage.totalItems}
                  pageSize={txnPage.pageSize}
                  onPageChange={txnPage.setCurrentPage}
                  onPageSizeChange={txnPage.setPageSize}
                  itemLabel="transactions"
                />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live School Tuckshop & Dining Menu */}
      <div className="portal-card" style={{ borderRadius: 16 }}>
        <div className="portal-card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              <i className="fas fa-utensils" style={{ marginRight: 8, color: '#f59e0b' }}></i>
              School Tuckshop & Canteen Menu Catalogue
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Live items and prices currently stocked at {currentChild.schoolName || 'the school tuckshop'}.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {uniqueCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  border: 'none',
                  background: selectedCategory === cat ? '#f59e0b' : '#f1f5f9',
                  color: selectedCategory === cat ? '#ffffff' : '#475569',
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat === 'ALL' ? 'All Menu Items' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="portal-card-body" style={{ padding: 20 }}>
          {menuLoading ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i> Loading live tuckshop catalogue...
            </div>
          ) : menuItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#64748b' }}>
              <i className="fas fa-cookie-bite fa-2x" style={{ color: '#cbd5e1', marginBottom: 8 }}></i>
              <div style={{ fontWeight: 700, color: '#334155' }}>No tuckshop items published yet</div>
              <div style={{ fontSize: '0.82rem' }}>Items added by the school tuckshop manager will appear here with live pricing.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {menuItems
                .filter(item => selectedCategory === 'ALL' || item.category === selectedCategory)
                .map(item => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 16,
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: '#fffbeb',
                          color: '#b45309',
                          fontWeight: 800,
                          border: '1px solid #fde68a'
                        }}>
                          {item.category || 'Canteen'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: item.stock > 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                          {item.stock > 0 ? `${item.stock} available` : 'Sold out'}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                        {item.name}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#16a34a' }}>
                        ${Number(item.price).toFixed(2)}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                        <i className="fas fa-check-circle" style={{ color: '#10b981', marginRight: 4 }}></i>
                        Wallet POS
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Dietary & Purchase Safety Controls */}
      <div className="portal-card" style={{ borderRadius: 16 }}>
        <div className="portal-card-header">
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              <i className="fas fa-heartbeat" style={{ marginRight: 8, color: '#ef4444' }}></i>
              Dietary & Allergen POS Controls
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Configure health and dietary rules for {currentChild.name} that alert the cashier during tuckshop checkout.
            </p>
          </div>
        </div>
        <div className="portal-card-body" style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
            {[
              { id: 'noPeanuts', label: 'Nut Allergy Alert (No Peanuts)', desc: 'Blocks nut-based snacks at the till' },
              { id: 'noPork', label: 'Halaal / No Pork Products', desc: 'Flags non-compliant items at checkout' },
              { id: 'limitSweets', label: 'Restrict Fizzy & Sugary Drinks', desc: 'Permits water and 100% fruit juice only' },
              { id: 'healthyFirst', label: 'Warm Meal Priority', desc: 'Prioritizes lunch meals over confectionery' }
            ].map(ctrl => (
              <label
                key={ctrl.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  border: (dietaryPrefs as any)[ctrl.id] ? '1px solid #86efac' : '1px solid #e2e8f0',
                  background: (dietaryPrefs as any)[ctrl.id] ? '#f0fdf4' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={(dietaryPrefs as any)[ctrl.id]}
                  onChange={e => {
                    setDietaryPrefs(prev => ({ ...prev, [ctrl.id]: e.target.checked }));
                    showToast(`Dietary control updated: ${ctrl.label}`, 'success');
                  }}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{ctrl.label}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{ctrl.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── MODAL: SET DAILY LIMIT ── */}
      {showLimitModal && (
        <div className="portal-modal-overlay" onClick={() => setShowLimitModal(false)}>
          <div className="portal-modal-card" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="portal-modal-header">
              <h2><i className="fas fa-sliders-h" style={{ marginRight: 8, color: '#8b5cf6' }}></i>Set Daily Spending Limit</h2>
              <button onClick={() => setShowLimitModal(false)} className="portal-btn-ghost">&times;</button>
            </div>
            <div className="portal-modal-body">
              <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
                Choose the maximum amount <strong>{currentChild.name}</strong> can spend per school day at the tuckshop and dining hall.
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
                    style={{ flex: 1, padding: '6px 0', fontSize: '0.8rem', justifyContent: 'center' }}
                    onClick={() => setDailyLimitInput(v.toFixed(2))}
                  >
                    ${v}
                  </button>
                ))}
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-ghost" onClick={() => setShowLimitModal(false)}>Cancel</button>
              <button
                className="portal-btn-primary"
                onClick={() => handleSaveDailyLimit()}
                disabled={isSavingLimit}
              >
                {isSavingLimit ? 'Saving...' : 'Save Limit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: TOP UP WALLET ── */}
      {showPayModal && (
        <div className="portal-modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="portal-modal-card" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="portal-modal-header">
              <h2><i className="fas fa-wallet" style={{ marginRight: 8, color: '#10b981' }}></i>Top Up Tuckshop Wallet</h2>
              <button onClick={() => setShowPayModal(false)} className="portal-btn-ghost">&times;</button>
            </div>
            <div className="portal-modal-body">
              <div
                style={{
                  background: '#f8fafc',
                  padding: 14,
                  borderRadius: 10,
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Student Wallet</div>
                  <div style={{ fontWeight: 800, color: '#1e293b' }}>{currentChild.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Balance</div>
                  <div style={{ fontWeight: 800, color: '#16a34a' }}>${currentBalance.toFixed(2)}</div>
                </div>
              </div>

              <div className="portal-form-group">
                <label>Select Amount ($)</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[5, 10, 20, 50].map(val => (
                    <button
                      key={val}
                      type="button"
                      className="portal-btn-secondary"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        background: amount === val.toString() ? '#eff6ff' : '#fff',
                        borderColor: amount === val.toString() ? '#2563eb' : '#cbd5e1',
                        color: amount === val.toString() ? '#2563eb' : '#1e293b',
                        fontWeight: 700
                      }}
                      onClick={() => setAmount(val.toString())}
                    >
                      +${val}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  className="portal-input"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter custom amount..."
                />
              </div>

              <div className="portal-form-group" style={{ marginTop: 14 }}>
                <label>Payment Channel</label>
                <select
                  className="portal-input"
                  value={paymentChannel}
                  onChange={e => setPaymentChannel(e.target.value as any)}
                >
                  <option value="Paynow Online Gateway">Paynow Instant Gateway (EcoCash / Visa / InnBucks)</option>
                  <option value="EcoCash Mobile Money">EcoCash USD Direct</option>
                  <option value="Instant Bank Transfer">Bank Transfer / ZIPIT</option>
                </select>
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-ghost" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button
                className="portal-btn-primary"
                onClick={handleTopup}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : `Confirm & Pay $${amount || '0'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
