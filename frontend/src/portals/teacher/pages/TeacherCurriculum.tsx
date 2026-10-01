import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export type CurriculumTab = 'syllabus' | 'schemes' | 'lesson-plans';

export default function TeacherCurriculum() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as CurriculumTab) || 'syllabus';
  const [activeTab, setActiveTab] = useState<CurriculumTab>(currentTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as CurriculumTab;
    if (tabParam && ['syllabus', 'schemes', 'lesson-plans'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: CurriculumTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-book-open" style={{ color: 'var(--school-primary, #0284c7)' }} />
            Curriculum & Lesson Planning
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
            Design curriculum schemes of work, monitor syllabus progress, and prepare weekly lesson execution plans.
          </p>
        </div>
        <button 
          style={{
            background: 'var(--school-primary, #0284c7)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
          }}
          onClick={() => alert('Exporting term pack...')}
        >
          <i className="fas fa-file-export" />
          Export Term Pack
        </button>
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
          onClick={() => handleTabChange('syllabus')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'syllabus' ? 700 : 500,
            color: activeTab === 'syllabus' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'syllabus' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-layer-group" />
          Syllabus
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('schemes')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'schemes' ? 700 : 500,
            color: activeTab === 'schemes' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'schemes' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-project-diagram" />
          Schemes of Work
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('lesson-plans')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'lesson-plans' ? 700 : 500,
            color: activeTab === 'lesson-plans' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'lesson-plans' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-calendar-alt" />
          Lesson Plans
        </button>
      </div>

      <div>
        {activeTab === 'syllabus' && <div><h3>Syllabus List</h3><p>Select a subject and form to view syllabus topics and track coverage.</p></div>}
        {activeTab === 'schemes' && <div><h3>Schemes of Work</h3><p>Create and submit your schemes of work for HOD approval.</p></div>}
        {activeTab === 'lesson-plans' && <div><h3>Lesson Plans</h3><p>Manage your daily/weekly lesson plans linked to approved schemes.</p></div>}
      </div>
    </div>
  );
}
