import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReportDocument from '../../../components/portals/shared/ReportDocument';
import '../../../styles/portal.css';

export default function ProgressReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);

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
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${report.student?.name || 'Student'}_Report_${report.term}.pdf`);
    } catch (err) {
      alert('Failed to authorize PDF generation');
    }
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
          <button className="portal-btn-ghost" style={{ fontWeight: 800, color: '#2563eb' }} onClick={() => alert('This feature is currently under development or disabled.')}>
            <i className="fas fa-chart-line mr-2"></i> View Performance Analytics
          </button>
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
                  <th style={{ width: '25%' }}>Recipient Entity</th>
                  <th style={{ width: '15%' }}>Designated Level</th>
                  <th style={{ textAlign: 'center', width: '10%' }}>Composite GPA</th>
                  <th style={{ width: '15%' }}>Authorization Date</th>
                  <th style={{ textAlign: 'right', width: '10%' }}>Management</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(reports) ? reports : []).map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div style={{ fontWeight: 900, color: '#1e293b' }}>{report.term} {report.year}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>OFFICIAL RECORD</div>
                    </td>
                    <td style={{ fontWeight: 800, color: '#475569' }}>{report.student?.name || 'Self-Entity'}</td>
                    <td><span className="status-badge" style={{ background: '#f8fafc', color: '#64748b', fontWeight: 900, border: '1px solid #f1f5f9' }}>{report.data?.student?.class?.name || 'N/A'}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 900, color: '#2563eb', fontSize: '1.1rem' }}>{report.data?.gpa || '0.00'}</span>
                    </td>
                    <td style={{ color: '#94a3b8', fontWeight: 800 }}>{new Date(report.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="portal-btn-primary" onClick={() => setSelectedReport(report)} style={{ padding: '8px 20px', fontSize: '0.75rem', fontWeight: 900 }}>
                        <i className="fas fa-eye mr-2"></i> Audit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal for viewing the report */}
      {selectedReport && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '960px' }}>
            <div className="portal-modal-header" style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Academic Transcript Preview</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Archived Performance Metrics - {selectedReport.term} {selectedReport.year}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="portal-btn-primary" onClick={() => handleDownload(selectedReport)} style={{ padding: '12px 24px', fontWeight: 900 }}>
                  <i className="fas fa-download mr-2"></i> Authorize PDF
                </button>
                <button className="portal-btn-ghost" onClick={() => setSelectedReport(null)} style={{ padding: '12px 24px', fontWeight: 800 }}>
                  Dismiss
                </button>
              </div>
            </div>
            
            <div className="portal-modal-body" style={{ padding: '40px', background: 'transparent' }}>
              <ReportDocument 
                data={{
                  ...selectedReport.data,
                  id: selectedReport.id,
                  term: selectedReport.term,
                  year: selectedReport.year,
                  student: selectedReport.student || selectedReport.data?.student
                }}
                template={template}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
