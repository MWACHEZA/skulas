import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export type MarksTab = 'marks-entry' | 'report-preview' | 'analytics';

export default function TeacherMarks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as MarksTab) || 'marks-entry';
  const [activeTab, setActiveTab] = useState<MarksTab>(currentTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as MarksTab;
    if (tabParam && ['marks-entry', 'report-preview', 'analytics'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: MarksTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-pen-alt" style={{ color: 'var(--school-primary, #0284c7)' }} />
          Marks & Reports
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Enter student marks, preview term reports, and view class analytics.
        </p>
      </div>

      <div
        className="portal-tabs"
        style={{
          display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24,
          background: '#fff', padding: '8px 12px 0 12px', borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('marks-entry')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'marks-entry' ? 700 : 500,
            color: activeTab === 'marks-entry' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'marks-entry' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-table" />
          Enter Marks
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('report-preview')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'report-preview' ? 700 : 500,
            color: activeTab === 'report-preview' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'report-preview' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-file-invoice" />
          Report Preview
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('analytics')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'analytics' ? 700 : 500,
            color: activeTab === 'analytics' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'analytics' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-chart-line" />
          Analytics
        </button>
      </div>

      <div>
        {activeTab === 'marks-entry' && <div><h3>Spreadsheet Grid</h3><p>Fast entry of marks here.</p></div>}
        {activeTab === 'report-preview' && <div><h3>Report Preview</h3><p>Preview calculated totals, positions (1, 2, 2, 4).</p></div>}
        {activeTab === 'analytics' && <div><h3>Class Analytics</h3><p>Trend analysis and at-risk students pulling from attendance.</p></div>}
      </div>
    </div>
  );
}
