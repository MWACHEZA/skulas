import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminFees from './Fees';
import AdminFinanceBilling from './FinanceBilling';
import ManagePaymentPlans from '../../shared/pages/human-resources/ManagePaymentPlans';
import AdminFinanceWallets from './FinanceWallets';

export type AdminFinanceTab = 'overview' | 'billing' | 'payment-plans' | 'wallets';

export default function AdminFinance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as AdminFinanceTab) || 'overview';
  const [activeTab, setActiveTab] = useState<AdminFinanceTab>(currentTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as AdminFinanceTab;
    if (tabParam && ['overview', 'billing', 'payment-plans', 'wallets'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: AdminFinanceTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-receipt" style={{ color: 'var(--school-primary, #0284c7)' }} />
          Financial Administration & Billing
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Comprehensive oversight of institutional fees, billing statements, student payment plans, and campus wallets.
        </p>
      </div>

      {/* Level 1 Navigation Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 24,
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('overview')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'overview' ? 700 : 500,
            color: activeTab === 'overview' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'overview' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-chart-pie" />
          Overview
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('billing')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'billing' ? 700 : 500,
            color: activeTab === 'billing' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'billing' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-file-invoice-dollar" />
          Billing & Invoices
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('payment-plans')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'payment-plans' ? 700 : 500,
            color: activeTab === 'payment-plans' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'payment-plans' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-calendar-check" />
          Payment Plans
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('wallets')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'wallets' ? 700 : 500,
            color: activeTab === 'wallets' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'wallets' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-wallet" />
          Wallets & Tuckshop
        </button>
      </div>

      {/* Tab Panels (Nesting Limit: Single Tab + At Most One Segmented Control Inside) */}
      <div>
        {activeTab === 'overview' && <AdminFees />}
        {activeTab === 'billing' && <AdminFinanceBilling />}
        {activeTab === 'payment-plans' && <ManagePaymentPlans />}
        {activeTab === 'wallets' && <AdminFinanceWallets />}
      </div>
    </div>
  );
}
