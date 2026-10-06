import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import BursarTuckshopSales from './TuckshopSales';
import BursarTuckshopInventory from './TuckshopInventory';
import BursarTuckshopReports from './TuckshopReports';
import TillCashupComponent from './TillCashupComponent';
import FinanceWallets from '../../admin/pages/FinanceWallets';

export type TuckshopTab = 'sales' | 'cashup' | 'inventory' | 'wallets' | 'reports';

export default function BursarTuckshopUnified() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TuckshopTab) || 'sales';
  const [activeTab, setActiveTab] = useState<TuckshopTab>(currentTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TuckshopTab;
    if (tabParam && ['sales', 'cashup', 'inventory', 'wallets', 'reports'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TuckshopTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <i className="fas fa-shopping-basket" style={{ color: 'var(--school-primary, #0284c7)' }} />
              Tuckshop, Tills & Student Wallets
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4, margin: '4px 0 0 0' }}>
              Touchscreen POS counter, till session cash-up reconciliation, inventory procurement, and student wallet deposits.
            </p>
          </div>
          <Link
            to="/tuckshop/pos"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
            }}
          >
            <i className="fas fa-desktop" /> Open POS Terminal
          </Link>
        </div>
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
          onClick={() => handleTabChange('sales')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'sales' ? 700 : 500,
            color: activeTab === 'sales' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'sales' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-cash-register" />
          Point of Sale & Orders
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('cashup')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'cashup' ? 700 : 500,
            color: activeTab === 'cashup' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'cashup' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-calculator" />
          Till Cash-Up & Drawer
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('inventory')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'inventory' ? 700 : 500,
            color: activeTab === 'inventory' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'inventory' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-boxes" />
          Tuckshop Stock Inventory
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
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-wallet" />
          Student Wallets & Top-Ups
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('reports')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'reports' ? 700 : 500,
            color: activeTab === 'reports' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'reports' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-chart-bar" />
          Sales & Revenue Reports
        </button>
      </div>

      <div>
        {activeTab === 'sales' && <BursarTuckshopSales />}
        {activeTab === 'cashup' && <TillCashupComponent />}
        {activeTab === 'inventory' && <BursarTuckshopInventory />}
        {activeTab === 'wallets' && <FinanceWallets />}
        {activeTab === 'reports' && <BursarTuckshopReports />}
      </div>
    </div>
  );
}
