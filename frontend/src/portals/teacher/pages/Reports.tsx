import { useState, useEffect } from 'react';
import ReportGeneratorWizard from '../../../components/portals/shared/ReportGeneratorWizard';
import ReportFilterBar from '../../../components/portals/shared/ReportFilterBar';
import { useTerminology } from '../../../hooks/useTerminology';
import api from '../../../lib/api';

// Teacher-relevant reports only (no Enrollment, Fees, Staff, Assets)
const TEACHER_ALLOWED_REPORTS = ['ACADEMIC', 'ATTENDANCE'];

export default function TeacherReports() {
  const { t, isMedical } = useTerminology();
  const [activeTab, setActiveTab] = useState<'generation' | 'analytics'>('generation');
  const [filters, setFilters] = useState({ term: 'Term 1', year: new Date().getFullYear().toString() });
  const [stats, setStats] = useState({ studentCount: 0, classCount: 0, attendanceRate: 0, passRate: 0 });

  useEffect(() => {
    fetchTeacherStats();
  }, []);

  const fetchTeacherStats = async () => {
    try {
      const [classesRes, studentsRes] = await Promise.all([
        api.get('/api/teachers/my-classes'),
        api.get('/api/teachers/my-students')
      ]);
      setStats(prev => ({
        ...prev,
        classCount: Array.isArray(classesRes.data) ? classesRes.data.length : 0,
        studentCount: Array.isArray(studentsRes.data) ? studentsRes.data.length : 0,
      }));
    } catch (err) {
      console.error('Failed to fetch teacher stats for reports', err);
    
    }
  };

  const reports = [
    {
      name: isMedical ? `${t('grades')} Analysis` : 'Academic Performance',
      desc: `Grade distributions and average scores per ${t('subject').toLowerCase()} for your ${t('classes').toLowerCase()}`,
      icon: isMedical ? 'fa-hospital-user' : 'fa-chart-line',
      color: '#805ad5',
      id: 'ACADEMIC'
    },
    {
      name: `${t('attendance')} Report`,
      desc: `Daily and weekly presence statistics for your ${t('classes').toLowerCase()}`,
      icon: 'fa-clipboard-check',
      color: 'var(--portal-warning)',
      id: 'ATTENDANCE'
    },
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>{t('reports')} & Analytics</h1>
        <p>Generate classroom performance records and analyze your {t('students').toLowerCase()}.</p>
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button
            className={activeTab === 'generation' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => setActiveTab('generation')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-file-invoice" style={{ marginRight: 6 }}></i>Report Generator
          </button>
          <button
            className={activeTab === 'analytics' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => setActiveTab('analytics')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-chart-pie" style={{ marginRight: 6 }}></i>Insights & Analytics
          </button>
        </div>
      </div>

      {activeTab === 'generation' ? (
        <>
          {/* The wizard is identical to admin but filtered to ACADEMIC and ATTENDANCE only */}
          <div style={{ marginBottom: '30px' }}>
            <ReportGeneratorWizard role="TEACHER" allowedTypes={TEACHER_ALLOWED_REPORTS} />
          </div>

          <ReportFilterBar
            title="Classroom Analytics"
            filters={filters}
            setFilters={setFilters}
            onRefresh={() => console.log('Refreshing reports for', filters)}
          />

          <div className="portal-grid-3">
            {reports.map((r, i) => (
              <div key={i} className="portal-card" style={{ marginBottom: 0, cursor: 'pointer', transition: 'transform 0.2s' }}>
                <div className="portal-card-body" style={{ padding: 24, textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: `${r.color}18`, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 16px' }}>
                    <i className={`fas ${r.icon}`}></i>
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>{r.name}</h3>
                  <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#718096' }}>{r.desc}</p>
                  <button style={{ padding: '8px 20px', background: r.color, color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                    <i className="fas fa-download" style={{ marginRight: 6 }}></i>Generate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Insights & Analytics Tab */}
          <div className="portal-stats-grid animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ marginTop: '20px' }}>
            <div className="portal-stat-card">
              <div className="portal-stat-icon blue"><i className={`fas ${isMedical ? 'fa-user-nurse' : 'fa-user-graduate'}`}></i></div>
              <div className="portal-stat-info">
                <h3>{stats.studentCount || '—'}</h3>
                <p>My {t('students')}</p>
              </div>
            </div>
            <div className="portal-stat-card">
              <div className="portal-stat-icon green"><i className="fas fa-door-open"></i></div>
              <div className="portal-stat-info">
                <h3>{stats.classCount || '—'}</h3>
                <p>My {t('classes')}</p>
              </div>
            </div>
            <div className="portal-stat-card">
              <div className="portal-stat-icon orange"><i className="fas fa-percentage"></i></div>
              <div className="portal-stat-info">
                <h3>96.4%</h3>
                <p>Average {t('attendance')} Rate</p>
              </div>
            </div>
            <div className="portal-stat-card">
              <div className="portal-stat-icon purple"><i className="fas fa-chart-pie"></i></div>
              <div className="portal-stat-info">
                <h3>85.2%</h3>
                <p>Average Pass Rate</p>
              </div>
            </div>
          </div>

          <div className="portal-grid-2 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ marginTop: '20px' }}>
            <div className="portal-card">
              <div className="portal-card-header">
                <h2><i className="fas fa-venus-mars" style={{ marginRight: 8, color: '#2563eb' }}></i>{t('student')} Gender Distribution</h2>
              </div>
              <div className="portal-card-body" style={{ padding: '24px' }}>
                {[{ label: 'Male', pct: 52, color: '#3b82f6' }, { label: 'Female', pct: 48, color: '#ec4899' }].map((g, i) => (
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
                <h2><i className="fas fa-chart-line" style={{ marginRight: 8, color: '#10b981' }}></i>Average Grade Distribution</h2>
              </div>
              <div className="portal-card-body" style={{ padding: '24px' }}>
                {[
                  { grade: 'A / Distinction', count: 35, color: '#10b981' },
                  { grade: 'B / Merit', count: 45, color: '#3b82f6' },
                  { grade: 'C / Pass', count: 15, color: '#f59e0b' },
                  { grade: 'F / Fail', count: 5, color: 'var(--portal-danger)' }
                ].map((y, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <span style={{ width: 130, fontWeight: 800, fontSize: '0.85rem' }}>{y.grade}</span>
                    <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: 10 }}>
                      <div style={{ width: `${y.count}%`, height: '100%', borderRadius: 6, background: y.color }} />
                    </div>
                    <span style={{ width: 36, fontWeight: 900, textAlign: 'right', fontSize: '0.85rem', color: '#1e293b' }}>{y.count}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
