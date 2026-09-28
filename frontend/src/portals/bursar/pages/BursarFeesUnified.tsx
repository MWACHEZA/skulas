import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import FeesBillingPage from '../../shared/pages/FeesBillingPage';
import ManageInvoicesPage from '../../shared/pages/ManageInvoicesPage';
import StudentLedgersPage from '../../shared/pages/StudentLedgersPage';
import BulkInvoicesPage from '../../shared/pages/BulkInvoicesPage';

export type BursarFeesTab = 'billing' | 'invoices' | 'ledgers' | 'bulk-invoices';

export default function BursarFeesUnified() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as BursarFeesTab) || 'billing';
  const [activeTab, setActiveTab] = useState<BursarFeesTab>(currentTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as BursarFeesTab;
    if (tabParam && ['billing', 'invoices', 'ledgers', 'bulk-invoices'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: BursarFeesTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-file-invoice-dollar" style={{ color: 'var(--school-primary, #0284c7)' }} />
          Bursar Fees & Billing Center
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Fee structure billing, individual and bulk invoice generation, and real-time student ledger balances.
        </p>
      </div>

      {/* Tabs */}
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
          <i className="fas fa-receipt" />
          Fee Billing & Structures
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('invoices')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'invoices' ? 700 : 500,
            color: activeTab === 'invoices' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'invoices' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-file-invoice" />
          Invoices & Receipts
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('ledgers')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'ledgers' ? 700 : 500,
            color: activeTab === 'ledgers' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'ledgers' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-book-open" />
          Student Ledgers
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('bulk-invoices')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'bulk-invoices' ? 700 : 500,
            color: activeTab === 'bulk-invoices' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'bulk-invoices' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-mail-bulk" />
          Bulk Invoicing
        </button>
      </div>

      <div>
        {activeTab === 'billing' && <FeesBillingPage />}
        {activeTab === 'invoices' && <ManageInvoicesPage />}
        {activeTab === 'ledgers' && <StudentLedgersPage />}
        {activeTab === 'bulk-invoices' && <BulkInvoicesPage />}
      </div>
    </div>
  );
}
