import { useState } from 'react';
import ReportGeneratorWizard from '../../../components/portals/shared/ReportGeneratorWizard';
import AdminDocumentTemplates from './DocumentTemplates';
import ReportFilterBar from '../../../components/portals/shared/ReportFilterBar';
import { useTerminology } from '../../../hooks/useTerminology';
import LibraryReports from '../../library/pages/Reports';

export default function AdminReports() {
  const { t, isMedical } = useTerminology();
  const [activeTab, setActiveTab] = useState<'generation' | 'designer' | 'analytics' | 'library'>('generation');
  const [filters, setFilters] = useState({ term: 'Term 1', year: new Date().getFullYear().toString() });
  
  const reports = [
    { name: 'Enrollment Summary Report', desc: `Student enrollment by form and gender`, icon: 'fa-user-graduate', color: 'var(--school-primary, #3182ce)' },
    { name: 'Fee Collection Report', desc: 'Breakdown of fees by term and payment method', icon: 'fa-money-bill-wave', color: 'var(--portal-success)' },
    { name: 'Attendance Report', desc: 'Daily, weekly, and term attendance statistics', icon: 'fa-clipboard-check', color: 'var(--portal-warning)' },
    { name: 'Academic Performance', desc: 'Grade distributions per subject and form', icon: 'fa-chart-line', color: '#805ad5' },
    { name: 'Staff Report', desc: 'Teacher and support staff summary', icon: 'fa-users', color: 'var(--portal-danger)' },
    { name: 'Asset Inventory Report', desc: 'School property and equipment register', icon: 'fa-boxes', color: '#38b2ac' },
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>School Reports & Analytics</h1>
        <p>Manage academic records and administrative insights.</p>
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button 
            className={activeTab === 'generation' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => setActiveTab('generation')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-file-invoice" style={{ marginRight: 6 }}></i>Report Generator
          </button>
          <button 
            className={activeTab === 'designer' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => setActiveTab('designer')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-palette" style={{ marginRight: 6 }}></i>Template Designer
          </button>
          <button 
            className={activeTab === 'analytics' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => setActiveTab('analytics')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-chart-pie" style={{ marginRight: 6 }}></i>Insights & Analytics
          </button>
          <button 
            className={activeTab === 'library' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => setActiveTab('library')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-book" style={{ marginRight: 6 }}></i>Library Reports
          </button>
        </div>
      </div>

      {activeTab === 'generation' ? (
        <>
          <div style={{ marginBottom: '30px' }}>
            <ReportGeneratorWizard role="ADMIN" />
          </div>

          <ReportFilterBar 
            title="Administrative Analytics" 
            filters={filters} 
            setFilters={setFilters} 
            onRefresh={() => console.log('Refreshing reports for', filters)} 
          />
          
          <div className="portal-grid-3">
            {reports.map((r, i) => (
              <div key={i} className="portal-card" style={{ marginBottom: 0, cursor: 'pointer', transition: 'transform 0.2s' }}>
                <div className="portal-card-body" style={{ padding: 24, textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: `${r.color}18`, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 16px' }}><i className={`fas ${r.icon}`}></i></div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>{r.name}</h3>
                  <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#718096' }}>{r.desc}</p>
                  <button style={{ padding: '8px 20px', background: r.color, color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-download" style={{ marginRight: 6 }}></i>Generate</button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : activeTab === 'designer' ? (
        <AdminDocumentTemplates />
      ) : activeTab === 'analytics' ? (
        <>
          <div className="portal-stats-grid animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ marginTop: '20px' }}>
            <div className="portal-stat-card">
              <div className="portal-stat-icon blue"><i className="fas fa-user-graduate"></i></div>
              <div className="portal-stat-info">
                <h3>420</h3>
                <p>Total {t('students')}</p>
              </div>
            </div>
            <div className="portal-stat-card">
              <div className="portal-stat-icon green"><i className="fas fa-chalkboard-teacher"></i></div>
              <div className="portal-stat-info">
                <h3>28</h3>
                <p>Total Staff</p>
              </div>
            </div>
            <div className="portal-stat-card">
              <div className="portal-stat-icon orange"><i className="fas fa-percentage"></i></div>
              <div className="portal-stat-info">
                <h3>94%</h3>
                <p>Attendance Rate</p>
              </div>
            </div>
            <div className="portal-stat-card">
              <div className="portal-stat-icon purple"><i className="fas fa-chart-pie"></i></div>
              <div className="portal-stat-info">
                <h3>72%</h3>
                <p>Pass Rate ({isMedical ? 'Clinical' : 'O-Level'})</p>
              </div>
            </div>
          </div>
          
          <div className="portal-grid-2 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ marginTop: '20px' }}>
            <div className="portal-card">
              <div className="portal-card-header">
                <h2><i className="fas fa-venus-mars" style={{ marginRight: 8, color: '#2563eb' }}></i>Gender Distribution</h2>
              </div>
              <div className="portal-card-body" style={{ padding: '24px' }}>
                {[{ label: 'Male', pct: 55, color: '#3b82f6' }, { label: 'Female', pct: 45, color: '#ec4899' }].map((g, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800 }}>{g.label}</span>
                      <span style={{ fontWeight: 900, color: '#1e293b' }}>{g.pct}%</span>
                    </div>
                    <div style={{ background: '#f1f5f9', borderRadius: 6, height: 10 }}>
                      <div style={{ width: `${g.pct}%`, height: '100%', borderRadius: 6, background: g.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="portal-card">
              <div className="portal-card-header">
                <h2><i className="fas fa-chart-line" style={{ marginRight: 8, color: '#10b981' }}></i>Enrollment Trend (3 Years)</h2>
              </div>
              <div className="portal-card-body" style={{ padding: '24px' }}>
                {[{ year: '2024', count: 380 }, { year: '2025', count: 400 }, { year: '2026', count: 420 }].map((y, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <span style={{ width: 44, fontWeight: 800 }}>{y.year}</span>
                    <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: 10 }}>
                      <div style={{ width: `${(y.count / 500) * 100}%`, height: '100%', borderRadius: 6, background: '#10b981' }} />
                    </div>
                    <span style={{ fontWeight: 900, width: 36, textAlign: 'right', color: '#1e293b' }}>{y.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <LibraryReports />
      )}
    </>
  );
}
