import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import TeacherGrades from './Grades';
import MarksEntryPage from '../../shared/pages/MarksEntryPage';

export type TeacherGradesTab = 'grades' | 'marks-entry';

export default function TeacherGradesUnified() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TeacherGradesTab) || 'grades';
  const [activeTab, setActiveTab] = useState<TeacherGradesTab>(currentTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TeacherGradesTab;
    if (tabParam && ['grades', 'marks-entry'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TeacherGradesTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-chart-line" style={{ color: 'var(--school-primary, #0284c7)' }} />
          Student Assessment & Grades
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Enter subject marks, manage continuous assessment tests (CATs), and review class grade distributions.
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
          onClick={() => handleTabChange('grades')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'grades' ? 700 : 500,
            color: activeTab === 'grades' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'grades' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-graduation-cap" />
          Grades Overview
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('marks-entry')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'marks-entry' ? 700 : 500,
            color: activeTab === 'marks-entry' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'marks-entry' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-pen-alt" />
          Marks Entry Sheet
        </button>
      </div>

      <div>
        {activeTab === 'grades' && <TeacherGrades />}
        {activeTab === 'marks-entry' && <MarksEntryPage />}
      </div>
    </div>
  );
}
