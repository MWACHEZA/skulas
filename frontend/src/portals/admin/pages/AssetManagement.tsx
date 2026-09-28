import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SharedAssetManagement from '../../shared/pages/SharedAssetManagement';
import AdminAssetMaintenance from './AssetMaintenance';

export default function AdminAssetManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as 'registry' | 'maintenance') || 'registry';
  const [activeTab, setActiveTab] = useState<'registry' | 'maintenance'>(currentTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as 'registry' | 'maintenance';
    if (tabParam && ['registry', 'maintenance'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'registry' | 'maintenance') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div>
      {/* Level 1 Tabs for Assets */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 20,
          background: '#fff',
          padding: '12px 20px 0 20px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('registry')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'registry' ? 700 : 500,
            color: activeTab === 'registry' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'registry' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-boxes" />
          Asset Registry
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('maintenance')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'maintenance' ? 700 : 500,
            color: activeTab === 'maintenance' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'maintenance' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: -2,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-tools" />
          Maintenance & Repairs
        </button>
      </div>

      <div>
        {activeTab === 'registry' && <SharedAssetManagement />}
        {activeTab === 'maintenance' && <AdminAssetMaintenance />}
      </div>
    </div>
  );
}
