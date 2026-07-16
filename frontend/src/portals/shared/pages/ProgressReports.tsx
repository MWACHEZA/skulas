import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
    const element = document.getElementById(`report-viewer-${report.id}`);
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
            
            <div className="portal-modal-body" style={{ padding: '40px', background: '#f8fafc' }}>
              <div id={`report-viewer-${selectedReport.id}`} style={{ 
                background: 'white', 
                color: '#1e293b', 
                padding: '60px', 
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)',
                border: '1px solid #f1f5f9',
                fontFamily: 'system-ui, -apple-system, sans-serif' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `4px solid ${template?.config?.primaryColor || '#2563eb'}`, paddingBottom: '32px', marginBottom: '40px' }}>
                  <div>
                    <h1 style={{ color: template?.config?.primaryColor || '#2563eb', margin: 0, fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>ACADEX ECOSYSTEM</h1>
                    <p style={{ margin: '4px 0 0 0', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>Institutional Performance Report</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#1e293b' }}>OFFICIAL TRANSCRIPT</div>
                    <div style={{ color: '#64748b', fontWeight: 700, marginTop: '4px' }}>{selectedReport.term} | Academic Cycle {selectedReport.year}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', background: '#f8fafc', padding: '32px', borderRadius: '20px', marginBottom: '40px', border: '1px solid #f1f5f9' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>RECIPIENT IDENTITY</label>
                    <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#1e293b' }}>{selectedReport.data?.name || selectedReport.student?.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>ACADEMIC CLASSIFICATION</label>
                    <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#1e293b' }}>{selectedReport.data?.student?.class?.name || 'UNDEFINED'}</div>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.8rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Subject Discipline</th>
                      <th style={{ textAlign: 'center', padding: '16px 24px', fontSize: '0.8rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Weighted Score</th>
                      <th style={{ textAlign: 'right', padding: '16px 24px', fontSize: '0.8rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Strategic Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReport.data?.grades || []).map((g: any, i: number) => (
                      <tr key={i} style={{ background: '#f8fafc' }}>
                        <td style={{ padding: '20px 24px', borderRadius: '12px 0 0 12px', fontWeight: 800, color: '#1e293b' }}>{g.subject}</td>
                        <td style={{ padding: '20px 24px', textAlign: 'center', fontWeight: 900, color: '#2563eb', fontSize: '1.1rem' }}>{g.score}%</td>
                        <td style={{ padding: '20px 24px', textAlign: 'right', borderRadius: '0 12px 12px 0' }}>
                          <span className="status-badge" style={{ background: '#fff', color: '#1e293b', fontWeight: 900, fontSize: '1.1rem', border: '1px solid #f1f5f9', padding: '8px 20px' }}>{g.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'flex-end', borderTop: '2px dashed #f1f5f9', paddingTop: '40px' }}>
                    <div style={{ textAlign: 'center' }}>
                      {template?.signatureUrl ? <img src={template.signatureUrl} style={{ maxHeight: '80px', marginBottom: '12px' }} /> : <div style={{ height: '80px' }}></div>}
                      <div style={{ borderTop: '2px solid #1e293b', paddingTop: '12px', fontWeight: 900, color: '#1e293b', fontSize: '0.9rem', width: '240px', textTransform: 'uppercase' }}>Institutional Principal</div>
                      <div style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.75rem', marginTop: '4px' }}>ELECTRONICALLY AUTHORIZED</div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
