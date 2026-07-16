import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import api from '../../../lib/api';

export default function ParentAcademics() {
  const { t: trans } = useTranslation();
  const { t } = useTerminology();
  const { activeEntity } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [activeEntity]);

  const fetchReports = async () => {
    try {
      const res = await api.get('/api/reports/my');
      // Filter reports by active child if one is selected, else show all
      let filtered = res.data;
      if (activeEntity?.id) {
        filtered = filtered.filter((r: any) => r.studentId === activeEntity.id);
      }
      setReports(filtered);
    } catch (error) {
      console.error('Failed to fetch academic reports', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>{trans('loading_reports')}</div>;

  return (
    <>
      <div className="portal-page-header">
        <h1>{trans('academic_performance')}</h1>
        <p>{trans('monitor_grades')}</p>
      </div>

      {reports.length === 0 ? (
         <div style={{ textAlign: 'center', padding: 40, background: '#f8fafc', borderRadius: 8 }}>
            {trans('no_published_reports')}
         </div>
      ) : (
        reports.map((report, ci) => {
          const studentData = report.data?.student || {};
          const grades = studentData.grades || [];
          
          // Calculate overall average from grades
          const validGrades = grades.filter((g: any) => typeof g.score === 'number' && !isNaN(g.score));
          const overallAvg = validGrades.length > 0 
            ? Math.round(validGrades.reduce((sum: number, g: any) => sum + g.score, 0) / validGrades.length) 
            : 0;

          // Attendance calculation
          const attendance = studentData.attendance || [];
          const presentCount = attendance.filter((a: any) => a.status === 'Present').length;
          const attendancePct = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

          return (
            <div key={report.id || ci} style={{ marginBottom: 40 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                  <div style={{ width: 45, height: 45, borderRadius: '50%', background: '#ebf4ff', color: 'var(--school-primary, #3182ce)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    <i className="fas fa-user-graduate"></i>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{report.student?.name || report.data?.name || 'Student'}</h2>
                    <span style={{ fontSize: '0.85rem', color: '#718096' }}>{studentData.class?.name || 'Class'} | {report.term} {report.year}</span>
                  </div>
               </div>

               <div className="portal-stats-grid" style={{ marginBottom: 20 }}>
                 <div className="portal-stat-card">
                   <div className="portal-stat-icon blue"><i className="fas fa-chart-line"></i></div>
                   <div className="portal-stat-info"><h3>{overallAvg}%</h3><p>{trans('overall_avg')}</p></div>
                 </div>
                 <div className="portal-stat-card">
                   <div className="portal-stat-icon green"><i className="fas fa-calendar-check"></i></div>
                   <div className="portal-stat-info"><h3>{attendancePct}%</h3><p>{trans('attendance')}</p></div>
                 </div>
                 <div className="portal-stat-card">
                   <div className="portal-stat-icon orange"><i className="fas fa-trophy"></i></div>
                   <div className="portal-stat-info"><h3>N/A</h3><p>{trans('class_position')}</p></div>
                 </div>
               </div>

               <div className="portal-card">
                 <div className="portal-card-header">
                   <h2><i className="fas fa-list-check" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>{trans('subject_breakdown')}</h2>
                   <button className="portal-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => alert('PDF Download coming soon.')}>
                      <i className="fas fa-download"></i> {trans('download_full_report')}
                   </button>
                 </div>
                 <div className="portal-card-body" style={{ padding: 0 }}>
                   <table className="portal-table">
                     <thead>
                       <tr>
                         <th>{t('subject')}</th>
                         <th>{trans('score')}</th>
                         <th>{trans('result')}</th>
                         <th className="hide-mobile">{trans('teacher_remarks')}</th>
                       </tr>
                     </thead>
                     <tbody>
                       {grades.length === 0 ? (
                         <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>No grades recorded.</td></tr>
                       ) : (
                         grades.map((g: any, gi: number) => (
                           <tr key={gi}>
                             <td>
                               <div style={{ fontWeight: 600 }}>{g.subject?.name || g.subjectId || 'Subject'}</div>
                             </td>
                             <td>
                               <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontWeight: 700, minWidth: 40 }}>{g.score ?? 0}%</span>
                                  <div style={{ background: '#edf2f7', borderRadius: 10, height: 6, width: 80, overflow: 'hidden' }}>
                                      <div style={{ width: `${g.score ?? 0}%`, height: '100%', background: (g.score ?? 0) >= 80 ? 'var(--portal-success)' : (g.score ?? 0) >= 60 ? 'var(--school-primary, #3182ce)' : 'var(--portal-warning)' }} />
                                  </div>
                               </div>
                             </td>
                             <td>
                                <span className={`portal-badge ${(g.score ?? 0) >= 80 ? 'success' : (g.score ?? 0) >= 65 ? 'info' : 'warning'}`}>
                                   Grade {g.grade || 'N/A'}
                                </span>
                             </td>
                             <td className="hide-mobile">
                                <span style={{ fontSize: '0.85rem', color: '#718096', fontStyle: 'italic' }}>"{g.comment || 'Satisfactory'}"</span>
                             </td>
                           </tr>
                         ))
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>
            </div>
          );
        })
      )}
    </>
  );
}

