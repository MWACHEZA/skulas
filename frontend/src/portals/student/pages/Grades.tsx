import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';

interface Grade {
  subject: { name: string; code: string };
  score: number;
  grade: string;
  term: string;
  createdAt: string;
}

interface AssessmentActivity {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  subject: { name: string };
  submissions: Array<{
    grade?: number;
    autoScore?: number;
    status: string;
    submittedAt: string;
  }>;
}

const gradeColor = (score: number) =>
  score >= 80 ? 'success' : score >= 65 ? 'info' : score >= 50 ? 'warning' : 'danger';

const TABS = ['current_grades', 'continuous_assessment', 'progress', 'report_card'];

export default function StudentGrades() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [assessments, setAssessments] = useState<AssessmentActivity[]>([]);
  const [publishedReports, setPublishedReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const { t: trans } = useTranslation();
  const { t, isMedical } = useTerminology();

  useEffect(() => {
    // Parallel fetch for speed
    Promise.all([
      api.get('/api/students/me/dashboard'),
      api.get('/api/reports/my')
    ]).then(([dashRes, reportRes]) => {
      setGrades(dashRes.data.grades || []);
      setAssessments(dashRes.data.assignments || []);
      setPublishedReports(reportRes.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleDownloadReport = (reportId: string) => {
    // Construct the direct URL for download
    const token = localStorage.getItem('acadex_token');
    const downloadUrl = `${api.defaults.baseURL}/api/reports/download/${reportId}?token=${token}`;
    
    // Create a temporary link to trigger native download
    window.open(downloadUrl, '_blank');
  };

  const avgScore = grades.length ? Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length) : 0;
  const highest = grades.length ? Math.max(...grades.map(g => g.score)) : 0;
  const lowest = grades.length ? Math.min(...grades.map(g => g.score)) : 0;

  return (
    <>
      <div className="portal-page-header">
        <h1>{trans('grades_and_results')}</h1>
        <p>{trans('view_performance')} {t('subjects').toLowerCase()}</p>
      </div>

      {/* Summary */}
      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-chart-bar"></i></div>
          <div className="portal-stat-info"><h3>{avgScore}%</h3><p>{trans('avg_score')}</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-arrow-up"></i></div>
          <div className="portal-stat-info"><h3>{highest}%</h3><p>{trans('highest_score')}</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-arrow-down"></i></div>
          <div className="portal-stat-info"><h3>{lowest}%</h3><p>{trans('lowest_score')}</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon purple"><i className={`fas ${isMedical ? 'fa-vials' : 'fa-book-open'}`}></i></div>
          <div className="portal-stat-info"><h3>{grades.length}</h3><p>{t('subjects')} {trans('subjects_assessed').split(' ')[1] || 'Assessed'}</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 20, border: '1px solid #e2e8f0' }}>
        {TABS.map((tabKey, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            flex: 1, padding: '14px', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 600, fontSize: '0.875rem',
            color: tab === i ? 'var(--portal-primary)' : '#718096',
            borderBottom: `3px solid ${tab === i ? 'var(--portal-primary)' : 'transparent'}`,
            background: tab === i ? 'rgba(0,86,179,0.05)' : 'white',
            transition: 'all 0.2s',
          }}>{isMedical && tabKey === 'report_card' ? trans('competency_report') : trans(tabKey)}</button>
        ))}
      </div>

      {/* Current Grades */}
      {tab === 0 && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-chart-line" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>{isMedical ? trans('current_term_results') : trans('current_term_grades')}</h2>
          </div>
          <div className="portal-card-body">
            {loading ? (
              <p style={{ color: '#718096' }}>{trans('loading_grades')}</p>
            ) : grades.length === 0 ? (
              <p style={{ color: '#718096', textAlign: 'center', padding: 30 }}>{trans('no_grades_yet')}</p>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>{t('subject')}</th><th>{trans('code')}</th><th>{trans('score')}</th><th>{trans('result')}</th><th>{trans('term')}</th><th>{trans('performance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{g.subject.name}</td>
                      <td style={{ color: '#718096' }}>{g.subject.code}</td>
                      <td style={{ fontWeight: 700 }}>{g.score}/100</td>
                      <td><span className={`portal-badge ${gradeColor(g.score)}`}>{g.grade}</span></td>
                      <td style={{ color: '#718096' }}>{g.term}</td>
                      <td>
                        <div style={{ background: '#e2e8f0', borderRadius: 4, height: 8, width: 100, overflow: 'hidden' }}>
                          <div style={{ width: `${g.score}%`, height: '100%', borderRadius: 4, background: g.score >= 80 ? 'var(--portal-success)' : g.score >= 65 ? 'var(--school-primary, #3182ce)' : g.score >= 50 ? 'var(--portal-warning)' : 'var(--portal-danger)' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Continuous Assessment */}
      {tab === 1 && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-tasks" style={{ marginRight: 8, color: '#805ad5' }}></i>{trans('activity_results')}</h2>
          </div>
          <div className="portal-card-body">
            {loading ? (
              <p style={{ color: '#718096' }}>{trans('loading_assessments')}</p>
            ) : assessments.filter(a => a.submissions.length > 0).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <i className="fas fa-clipboard-question" style={{ fontSize: '3rem', color: '#e2e8f0', marginBottom: 16 }}></i>
                <p style={{ color: '#718096' }}>{trans('no_assessments_yet')}</p>
              </div>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>{trans('activity')}</th><th>{t('subject')}</th><th>{trans('type')}</th><th>{trans('score')}</th><th>{trans('status')}</th><th>{trans('submitted')}</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.filter(a => a.submissions.length > 0).map((a, i) => {
                    const sub = a.submissions[0];
                    const score = sub.autoScore ?? sub.grade ?? 0;
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{a.title}</td>
                        <td style={{ color: '#718096' }}>{a.subject.name}</td>
                        <td><span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4, background: '#edf2f7', fontWeight: 600 }}>{a.category}</span></td>
                        <td style={{ fontWeight: 700, color: score >= 50 ? '#2f855a' : '#c53030' }}>
                          {score}%
                        </td>
                        <td>
                          <span className={`portal-badge ${sub.status === 'GRADED' ? 'success' : 'info'}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td style={{ color: '#718096', fontSize: '0.875rem' }}>
                          {new Date(sub.submittedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      {tab === 2 && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-trending-up" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>{t('subject')} {trans('subject_progress')}</h2>
          </div>
          <div className="portal-card-body">
            {grades.map((g, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{g.subject.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--portal-primary)' }}>{g.score}%</span>
                </div>
                <div style={{ background: '#e2e8f0', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                  <div style={{
                    width: `${g.score}%`, height: '100%', borderRadius: 8, transition: 'width 1s ease',
                    background: g.score >= 80 ? 'var(--portal-success)' : g.score >= 65 ? 'var(--school-primary, #3182ce)' : g.score >= 50 ? 'var(--portal-warning)' : 'var(--portal-danger)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Card */}
      {tab === 3 && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-file-pdf" style={{ marginRight: 8, color: 'var(--portal-danger)' }}></i>{trans('official_reports')} {isMedical ? trans('competency_report') : t('reports')}</h2>
          </div>
          <div className="portal-card-body">
            {publishedReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <i className="fas fa-clock-rotate-left" style={{ fontSize: '3rem', color: 'var(--portal-warning)', marginBottom: 20 }}></i>
                <h3 style={{ margin: '0 0 8px' }}>{trans('reports_not_published')}</h3>
                <p style={{ color: '#718096', maxWidth: 400, margin: '0 auto' }}>
                  {trans('reports_not_published_desc')}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {publishedReports.map((report) => (
                  <div key={report.id} style={{ 
                    border: '1px solid #e2e8f0', borderRadius: 12, padding: 20,
                    background: '#fff', display: 'flex', flexDirection: 'column', gap: 16,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 48, height: 48, borderRadius: 10, background: 'rgba(229, 62, 62, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--portal-danger)'
                      }}>
                        <i className="fas fa-file-pdf fa-lg"></i>
                      </div>
                      <div>
                        <h4 style={{ margin: 0 }}>{report.term} {report.year}</h4>
                        <span style={{ fontSize: '0.75rem', color: '#718096' }}>{trans('published')} {new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownloadReport(report.id)}
                      className="portal-btn-primary" 
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      <i className="fas fa-download" style={{ marginRight: 8 }}></i> {trans('download_pdf')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
