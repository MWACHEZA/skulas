import { useSearchParams } from 'react-router-dom';
import Timetable from './Timetable';
import Holiday from './Holiday';
import '../../../styles/portal.css';

type TimetableTab = 'schedule' | 'calendar';

export default function AcademicsTimetable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TimetableTab) || 'schedule';

  const handleTabChange = (tab: TimetableTab) => {
    setSearchParams({ tab });
  };

  return (
    <>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Academic Timetable & Institutional Calendar</h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Schedule master period slots across forms and classes, and maintain institutional term dates, holidays, and events.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
        {[
          { id: 'schedule', label: 'Weekly Timetable Schedule', icon: 'fas fa-calendar-alt' },
          { id: 'calendar', label: 'Academic Calendar & Holidays', icon: 'fas fa-calendar-day' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id as TimetableTab)}
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
        {activeTab === 'schedule' && <Timetable />}
        {activeTab === 'calendar' && <Holiday />}
      </div>
    </>
  );
}
