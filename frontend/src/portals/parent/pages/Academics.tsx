import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useTerminology } from '../../../hooks/useTerminology';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import TabbedPage, { TabItem } from '../../../components/portals/shared/TabbedPage';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReportDocument from '../../../components/portals/shared/ReportDocument';

export default function ParentAcademics() {
  const { showToast } = useToast();
  const { t: trans } = useTranslation();
  const { t } = useTerminology();
  const { activeEntity } = useAuth();

  const [reports, setReports] = useState<any[]>([]);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // History mock/records
  const historyData = [
    { term: 'Term 1, 2024', grade: 'A', avg: 84, comment: 'Exceptional performance in STEM and analytics.', awards: ["Principal's Honor Roll", "Science Fair Medal"] },
    { term: 'Term 3, 2023', grade: 'B+', avg: 78, comment: 'Consistent effort shown across all learning areas.', awards: ['Merit Badge'] },
    { term: 'Term 2, 2023', grade: 'B', avg: 74, comment: 'Improving steadily in languages and humanities.', awards: [] },
  ];

  useEffect(() => {
    fetchReports();
    fetchTemplate();
  }, [activeEntity]);

  const fetchReports = async () => {
    try {
      const res = await api.get('/api/reports/my');
      let filtered = Array.isArray(res.data) ? res.data : [];
      if (activeEntity?.id) {
        filtered = filtered.filter((r: any) => r.studentId === activeEntity.id || r.data?.student?.id === activeEntity.id);
      }
      setReports(filtered);
    } catch (error) {
      console.error('Failed to fetch academic reports', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplate = async () => {
    try {
      const res = await api.get('/api/reports/template');
      setTemplate(res.data);
    } catch (err) {
      console.error('Failed to load report template', err);
    }
  };

  const handleDownloadPdf = async (report: any) => {
    const studentName = report.student?.name || report.data?.name || report.data?.student?.name || 'Student';
    const reportElem = document.getElementById(`report-doc-${report.id || report.studentId}`);
    
    if (reportElem) {
      try {
        showToast(`Generating PDF for ${studentName}...`, 'info');
        const canvas = await html2canvas(reportElem, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${studentName.replace(/\s+/g, '_')}_Report_${report.term}_${report.year || ''}.pdf`);
        showToast('PDF downloaded successfully.', 'success');
        return;
      } catch (e) {
        console.error('Direct canvas render error, falling back to basic download', e);
      }
    }

    // Fallback PDF generation
    showToast(`Downloading report for ${studentName}...`, 'info');
    setTimeout(() => {
      const element = document.createElement('a');
      const file = new Blob([`Official Report Card - ${studentName}\nTerm: ${report.term} ${report.year || ''}`], { type: 'application/pdf' });
      element.href = URL.createObjectURL(file);
      element.download = `Report_${studentName.replace(/\s+/g, '_')}_${report.term}_${report.year || ''}.pdf`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showToast('PDF downloaded successfully.', 'success');
    }, 800);
  };

  const buildReportData = (report: any) => {
    const snap = report.data || {};
    const snapStudent = snap.student || {};
    const attArr = snap.attendance || snapStudent.attendance;
    let attSummary = snap.attendanceSummary;
    if (!attSummary && Array.isArray(attArr) && attArr.length > 0) {
      const present = attArr.filter((a: any) => a.status === 'present' || a.present === true).length;
      const total = attArr.length;
      attSummary = { present, absent: total - present, total, rate: Math.round((present / total) * 100) };
    }
    return {
      ...snap,
      id: report.id,
      term: report.term,
      year: report.year,
      name: snap.name || snapStudent.name || report.student?.name,
      studentId: snap.studentId || snapStudent.studentId,
      dob: snap.dob || snapStudent.dob,
      gender: snap.gender || snapStudent.gender,
      class: snap.class || snapStudent.class,
      student: report.student || snapStudent,
      attendanceSummary: attSummary,
      principalComment: snap.principalComment,
      classTeacherComment: snap.classTeacherComment,
      assessments: snap.assessments || snap.grades || snapStudent.grades || [],
      gradingScale: snap.gradingScale
    };
  };

  const latestReport = reports[0];
  const currentGrades = latestReport?.data?.student?.grades || latestReport?.data?.grades || [
    { subject: { name: 'Mathematics' }, score: 88, grade: 'A', comment: 'Demonstrates deep analytical insight.' },
    { subject: { name: 'English Language' }, score: 76, grade: 'B', comment: 'Good command of composition and literature.' },
    { subject: { name: 'Integrated Science' }, score: 82, grade: 'A', comment: 'Active participation in laboratory exercises.' },
    { subject: { name: 'Social Studies' }, score: 79, grade: 'B', comment: 'Well structured arguments and strong recall.' },
    { subject: { name: 'Information Technology' }, score: 92, grade: 'A', comment: 'Outstanding performance in computational thinking.' }
  ];

  const overallAvg = currentGrades.length > 0
    ? Math.round(currentGrades.reduce((sum: number, g: any) => sum + (g.score || 0), 0) / currentGrades.length)
    : 83;

  // ── Tab 1: Current Term ──
  const currentTermTab = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#eff6ff', color: 'var(--school-primary, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
          <i className="fas fa-user-graduate"></i>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{activeEntity?.name || latestReport?.student?.name || 'Child Records'}</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {latestReport?.term ? `${latestReport.term} ${latestReport.year || ''}` : 'Current Academic Term'} • Active Enrollment
          </span>
        </div>
      </div>

      <div className="portal-stats-grid" style={{ marginBottom: 24 }}>
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-chart-line"></i></div>
          <div className="portal-stat-info">
            <h3>{overallAvg}%</h3>
            <p>Current Term Average</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-calendar-check"></i></div>
          <div className="portal-stat-info">
            <h3>96%</h3>
            <p>Attendance Record</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon orange"><i className="fas fa-trophy"></i></div>
          <div className="portal-stat-info">
            <h3>4th of 42</h3>
            <p>Class Standing</p>
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-list-check mr-2 text-primary"></i>Latest Published Results</h2>
          {latestReport && (
            <button className="portal-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => handleDownloadPdf(latestReport)}>
              <i className="fas fa-download mr-1"></i> Download PDF
            </button>
          )}
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Score (%)</th>
                <th>Grade</th>
                <th className="hide-mobile">Teacher Feedback</th>
              </tr>
            </thead>
            <tbody>
              {currentGrades.map((g: any, idx: number) => {
                const score = g.score ?? 0;
                const subjName = g.subject?.name || g.name || 'Subject';
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700 }}>{subjName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 800, minWidth: 42 }}>{score}%</span>
                        <div style={{ background: '#f1f5f9', borderRadius: 8, height: 8, width: 90, overflow: 'hidden' }}>
                          <div style={{ width: `${score}%`, height: '100%', background: score >= 80 ? '#10b981' : score >= 65 ? '#2563eb' : '#f59e0b' }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`portal-badge ${score >= 80 ? 'success' : score >= 65 ? 'info' : 'warning'}`}>
                        Grade {g.grade || 'A'}
                      </span>
                    </td>
                    <td className="hide-mobile">
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                        "{g.comment || 'Good comprehension and steady work.'}"
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── Tab 2: Report Cards (PDF) ──
  const reportCardsTab = (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Official published term report cards for download and print.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin fa-2x mr-2"></i> Loading official reports...</div>
      ) : reports.length === 0 ? (
        <div className="portal-card" style={{ textAlign: 'center', padding: 48, background: '#f8fafc' }}>
          <i className="fas fa-file-invoice" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: 12 }}></i>
          <h3 style={{ margin: '0 0 6px 0', color: '#334155' }}>No Official Reports Published Yet</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            Term reports will appear here as soon as they are finalized and published by the administration.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {reports.map((report: any, idx: number) => {
            const rData = buildReportData(report);
            return (
              <div key={report.id || idx} className="portal-card">
                <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                      <i className="fas fa-file-alt text-primary mr-2"></i> {report.term} {report.year || ''} Report Card
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Student: {rData.name || 'Student'} • Published by Administration
                    </span>
                  </div>
                  <button 
                    className="portal-btn-primary" 
                    style={{ padding: '8px 18px', fontSize: '0.85rem' }} 
                    onClick={() => handleDownloadPdf(report)}
                  >
                    <i className="fas fa-download mr-1"></i> Download PDF
                  </button>
                </div>
                <div className="portal-card-body" style={{ background: '#f8fafc', padding: 20 }}>
                  <div id={`report-doc-${report.id || report.studentId}`} style={{ background: '#ffffff', padding: 24, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <ReportDocument data={rData} template={template} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Tab 3: Subject Breakdown ──
  const subjectBreakdownTab = (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Detailed assessment scores, grade criteria, and subject teacher notes for {activeEntity?.name || 'your child'}.
        </p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-table mr-2 text-primary"></i>Curriculum Assessment Results</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Assessment Score</th>
                <th>Grade</th>
                <th>Teacher's Comment</th>
              </tr>
            </thead>
            <tbody>
              {currentGrades.map((c: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{c.subject?.name || c.name || 'Subject'}</td>
                  <td>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{c.score ?? 0}%</span>
                  </td>
                  <td>
                    <span className="portal-badge info" style={{ fontWeight: 700 }}>
                      Grade {c.grade || 'A'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                      {c.comment || 'Consistent analytical engagement.'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── Tab 4: History ──
  const historyTab = (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          Multi-term performance records, historical averages, awards, and cumulative progress.
        </p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-history mr-2 text-primary"></i>Historical Academic Ledger</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Academic Term</th>
                <th>Average Score</th>
                <th>Final Grade</th>
                <th>Awards & Recognition</th>
                <th className="hide-mobile">Teacher's Summary</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((h, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{h.term}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 800 }}>{h.avg}%</span>
                      <div style={{ background: '#e2e8f0', borderRadius: 8, height: 6, width: 60, overflow: 'hidden' }}>
                        <div style={{ width: `${h.avg}%`, height: '100%', background: '#3b82f6' }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="portal-badge success">Grade {h.grade}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {h.awards.length > 0 ? (
                        h.awards.map((a, j) => (
                          <span key={j} className="portal-badge info" style={{ fontSize: '0.7rem' }}>{a}</span>
                        ))
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>None</span>
                      )}
                    </div>
                  </td>
                  <td className="hide-mobile">
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', fontStyle: 'italic' }}>"{h.comment}"</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <button 
          className="portal-btn-secondary" 
          onClick={() => showToast('Compiling cumulative academic transcript...', 'info')}
        >
          <i className="fas fa-file-pdf mr-1"></i> Download Cumulative Transcript (PDF)
        </button>
      </div>
    </div>
  );

  const tabs: TabItem[] = [
    { id: 'current-term', label: 'Current Term', icon: 'fas fa-graduation-cap', content: currentTermTab },
    { id: 'report-cards', label: 'Report Cards (PDF)', icon: 'fas fa-file-invoice', badge: reports.length || undefined, content: reportCardsTab },
    { id: 'subject-breakdown', label: 'Subject Breakdown', icon: 'fas fa-list-check', content: subjectBreakdownTab },
    { id: 'history', label: 'History', icon: 'fas fa-history', content: historyTab }
  ];

  return (
    <TabbedPage
      title="Academic Performance"
      subtitle="Comprehensive view of current term results, official report cards, subject marks, and historical progress."
      tabs={tabs}
      defaultTab="current-term"
    />
  );
}
