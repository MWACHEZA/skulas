import { useSearchParams } from 'react-router-dom';
import MarksEntryPage from '../../shared/pages/MarksEntryPage';
import AdminReports from './Reports';
import '../../../styles/portal.css';

type MarksTab = 'marks' | 'reports';

export default function AcademicsMarks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as MarksTab) || 'marks';

  const handleTabChange = (tab: MarksTab) => {
    setSearchParams({ tab });
  };

  return (
    <>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Academic Marks Entry & Report Cards</h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Unified assessment desk: score assignments, continuous assessment, and term examinations, with instant report reflection.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
        {[
          { id: 'marks', label: 'Marks Entry & Grading Grid', icon: 'fas fa-marker' },
          { id: 'reports', label: 'Academic Reports & Card Generator', icon: 'fas fa-file-pdf' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id as MarksTab)}
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

      {/* Content */}
      <div>
        {activeTab === 'marks' && <MarksEntryPage />}
        {activeTab === 'reports' && <AdminReports />}
      </div>
    </>
  );
}
