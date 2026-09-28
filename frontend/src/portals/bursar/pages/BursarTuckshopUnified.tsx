import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import BursarTuckshopSales from './TuckshopSales';
import BursarTuckshopInventory from './TuckshopInventory';
import BursarTuckshopReports from './TuckshopReports';

export type TuckshopTab = 'sales' | 'inventory' | 'reports';

export default function BursarTuckshopUnified() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TuckshopTab) || 'sales';
  const [activeTab, setActiveTab] = useState<TuckshopTab>(currentTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TuckshopTab;
    if (tabParam && ['sales', 'inventory', 'reports'].includes(tabParam)) {
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
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-shopping-basket" style={{ color: 'var(--school-primary, #0284c7)' }} />
          Tuckshop & Canteen Point of Sale
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Log counter cash & wallet sales, track canteen stock levels, and review daily sales reports.
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
        {activeTab === 'inventory' && <BursarTuckshopInventory />}
        {activeTab === 'reports' && <BursarTuckshopReports />}
      </div>
    </div>
  );
}
