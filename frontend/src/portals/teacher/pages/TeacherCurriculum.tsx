import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CreateSyllabus from '../../shared/pages/academics/CreateSyllabus';
import TeacherLessonPlan from '../../shared/pages/academics/TeacherLessonPlan';

export type CurriculumTab = 'syllabus' | 'lesson-plans';

export default function TeacherCurriculum() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as CurriculumTab) || 'syllabus';
  const [activeTab, setActiveTab] = useState<CurriculumTab>(currentTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as CurriculumTab;
    if (tabParam && ['syllabus', 'lesson-plans'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: CurriculumTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-book-open" style={{ color: 'var(--school-primary, #0284c7)' }} />
          Curriculum & Lesson Planning
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Design curriculum schemes of work, monitor syllabus progress, and prepare weekly lesson execution plans.
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
          onClick={() => handleTabChange('syllabus')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'syllabus' ? 700 : 500,
            color: activeTab === 'syllabus' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'syllabus' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-layer-group" />
          Schemes & Syllabus
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('lesson-plans')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'lesson-plans' ? 700 : 500,
            color: activeTab === 'lesson-plans' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'lesson-plans' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-calendar-alt" />
          Weekly Lesson Plans
        </button>
      </div>

      <div>
        {activeTab === 'syllabus' && <CreateSyllabus />}
        {activeTab === 'lesson-plans' && <TeacherLessonPlan />}
      </div>
    </div>
  );
}
