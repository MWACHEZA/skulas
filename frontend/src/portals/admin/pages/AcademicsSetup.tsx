import { useSearchParams } from 'react-router-dom';
import AdminSubjects from './Subjects';
import AdminClasses from './Classes';
import GradingSettingsPage from '../../shared/pages/GradingSettingsPage';
import '../../../styles/portal.css';

type SetupTab = 'subjects' | 'classes' | 'grading';

export default function AcademicsSetup() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as SetupTab) || 'subjects';

  const handleTabChange = (tab: SetupTab) => {
    setSearchParams({ tab });
  };

  return (
    <>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Academic Structure & Setup</h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Configure institutional curricula: subject catalogue, classes and streams, and grading benchmark scales.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
        {[
          { id: 'subjects', label: 'Subjects Catalogue', icon: 'fas fa-book-open' },
          { id: 'classes', label: 'Classes & Sections', icon: 'fas fa-chalkboard' },
          { id: 'grading', label: 'Grading Scales', icon: 'fas fa-sliders-h' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id as SetupTab)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === t.id ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === t.id ? '#2563eb' : '#64748b',
              fontWeight: activeTab === t.id ? 800 : 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className={t.icon}></i>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'subjects' && <AdminSubjects />}
        {activeTab === 'classes' && <AdminClasses />}
        {activeTab === 'grading' && <GradingSettingsPage />}
      </div>
    </>
  );
}
