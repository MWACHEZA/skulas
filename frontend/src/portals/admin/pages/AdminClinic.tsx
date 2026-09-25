import React from 'react';
import { useSearchParams } from 'react-router-dom';
import TriageDashboard from '../../shared/pages/clinic/TriageDashboard';
import PharmacyDashboard from '../../shared/pages/clinic/PharmacyDashboard';
import ClinicReportsPage from '../../shared/pages/clinic/ClinicReportsPage';
import '../../../styles/portal.css';

type ClinicTab = 'visits' | 'inventory' | 'reports';

export default function AdminClinic() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: ClinicTab = (searchParams.get('tab') as ClinicTab) || 'visits';

  const handleTabChange = (tab: ClinicTab) => {
    setSearchParams({ tab });
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="portal-page-header" style={{ marginBottom: '20px' }}>
        <div className="header-content">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-notes-medical" style={{ color: '#0d9488' }}></i>
            Clinic & Welfare Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
            Unified student & staff patient triage, pharmacy stock inventory, and clinical surveillance reports.
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '24px',
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('visits')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'visits' ? 700 : 500,
            color: activeTab === 'visits' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'visits' ? '3px solid #0d9488' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <i className="fas fa-stethoscope"></i>
          Patient Visits & Triage
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
            color: activeTab === 'inventory' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'inventory' ? '3px solid #0d9488' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <i className="fas fa-pills"></i>
          Pharmacy & Medical Inventory
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
            color: activeTab === 'reports' ? '#0d9488' : '#64748b',
            borderBottom: activeTab === 'reports' ? '3px solid #0d9488' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <i className="fas fa-chart-line"></i>
          Clinical Reports & Surveillance
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'visits' && <TriageDashboard />}
        {activeTab === 'inventory' && <PharmacyDashboard />}
        {activeTab === 'reports' && <ClinicReportsPage />}
      </div>
    </div>
  );
}
