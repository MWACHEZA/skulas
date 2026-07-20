import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReportDocument from '../../../components/portals/shared/ReportDocument';
import '../../../styles/portal.css';
import { useToast } from '../../../context/ToastContext';

export default function ProgressReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchReports();
    fetchTemplate();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/api/reports/my');
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to synchronize academic report registry');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplate = async () => {
    try {
      const res = await api.get('/api/reports/template');
      setTemplate(res.data);
    } catch (err) {
      console.error('Failed to fetch institutional report architecture');
    }
  };

  const handleDownload = async (report: any) => {
    const element = document.getElementById(`report-${report.id || report.studentId}`);
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${report.student?.name || 'Student'}_Report_${report.term}.pdf`);
    } catch (err) {
      showToast('Failed to generate PDF', 'error');
    }
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
      globalComment: snap.globalComment
    };
  };

  if (loading) return (
    <div className="portal-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <div className="portal-spinner"></div>
    </div>
  );

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Academic Progress Archives</h1>
          <p>Review and download official institutional reports, termly performance summaries, and historical academic audits.</p>
        </div>
        <div className="status-badge" style={{ padding: '8px 20px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', fontWeight: 900 }}>
           <i className="fas fa-file-pdf mr-2"></i>OFFICIAL TRANSCRIPTS
        </div>
      </div>

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
            <i className="fas fa-history mr-3" style={{ color: '#2563eb' }}></i>Report History
          </h2>
        </div>

        <div className="table-responsive">
          {(Array.isArray(reports) ? reports : []).length === 0 ? (
            <div style={{ padding: '120px 24px', textAlign: 'center', color: '#94a3b8' }}>
              <i className="fas fa-file-invoice" style={{ fontSize: '4rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
              <h3 style={{ fontWeight: 800, color: '#64748b', fontSize: '1.25rem' }}>No Reports Published</h3>
              <p style={{ margin: 0, fontWeight: 600 }}>Archived academic reports will be rendered here once authorized.</p>
            </div>
          ) : (
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Reporting Period</th>
                  <th style={{ width: '25%' }}>Student</th>
                  <th style={{ width: '15%' }}>Class</th>
                  <th style={{ width: '15%' }}>Authorization Date</th>
                  <th style={{ textAlign: 'right', width: '20%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(reports) ? reports : []).map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div style={{ fontWeight: 900, color: '#1e293b' }}>{report.term} {report.year}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>OFFICIAL RECORD</div>
                    </td>
                    <td style={{ fontWeight: 800, color: '#475569' }}>{report.student?.name || report.data?.name || 'Self'}</td>
                    <td>
                      <span className="status-badge" style={{ background: '#f8fafc', color: '#64748b', fontWeight: 900, border: '1px solid #f1f5f9' }}>
                        {report.data?.class?.name || report.data?.student?.class?.name || 'N/A'}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8', fontWeight: 800 }}>
                      {new Date(report.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="portal-btn-primary" onClick={() => setSelectedReport(report)} style={{ padding: '8px 20px', fontSize: '0.75rem', fontWeight: 900 }}>
                        <i className="fas fa-eye mr-2"></i> View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Report Preview Modal */}
      {selectedReport && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '960px' }}>
            <div className="portal-modal-header" style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Academic Report Preview</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  {selectedReport.term} {selectedReport.year} — {selectedReport.student?.name || 'Student'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="portal-btn-primary" onClick={() => handleDownload(selectedReport)} style={{ padding: '12px 24px', fontWeight: 900 }}>
                  <i className="fas fa-download mr-2"></i> Download PDF
                </button>
                <button className="portal-btn-ghost" onClick={() => setSelectedReport(null)} style={{ padding: '12px 24px', fontWeight: 800 }}>
                  Close
                </button>
              </div>
            </div>

            <div className="portal-modal-body" style={{ padding: '40px', background: 'transparent' }}>
              <ReportDocument
                data={buildReportData(selectedReport)}
                template={template || { config: { primaryColor: '#2563eb' } }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
