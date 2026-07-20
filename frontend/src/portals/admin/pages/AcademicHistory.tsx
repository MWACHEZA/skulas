import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReportDocument from '../../../components/portals/shared/ReportDocument';

export default function AdminAcademicHistory() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [reportTemplate, setReportTemplate] = useState<any>(null);
  const { showToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchTemplate();
    if (studentId) {
      fetchStudentHistory();
    }
  }, [studentId]);

  const fetchTemplate = async () => {
    try {
      const res = await api.get('/api/reports/template');
      setReportTemplate(res.data);
    } catch (err) {
      console.error('Failed to load report template');
    }
  };

  const fetchStudentHistory = async () => {
    try {
      const { data } = await api.get(`/api/students/${studentId}`);
      setStudent(data);
    } catch (err) {
      showToast('Failed to load student history', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '3rem', color: 'var(--portal-primary)' }}></i>
        <p style={{ marginTop: 20, color: '#718096' }}>Loading academic records...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="portal-card" style={{ textAlign: 'center', padding: 60 }}>
        <i className="fas fa-exclamation-circle" style={{ fontSize: '3rem', color: 'var(--portal-danger)', marginBottom: 20 }}></i>
        <h2>Student Not Found</h2>
        <p>The academic history you're looking for could not be retrieved.</p>
      </div>
    );
  }

  const grades = student.grades || [];

  const handleDownloadPDF = async () => {
    const element = document.getElementById('academic-history-viewer');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${student.name}_Academic_History.pdf`);
    } catch (err) {
      showToast('Failed to generate PDF', 'error');
    }
  };

  // Compute attendance summary from student record
  const computeAttendance = () => {
    const att = student.attendance || student.student?.attendance;
    if (!Array.isArray(att) || att.length === 0) return null;
    const present = att.filter((a: any) => a.status === 'present' || a.present === true).length;
    const total   = att.length;
    return { present, absent: total - present, total, rate: Math.round((present / total) * 100) };
  };

  const reportData = {
    id: student.id,
    studentId: student.studentId,
    type: 'ACADEMIC',
    name: student.name,
    dob: student.student?.dob || student.dob,
    gender: student.student?.gender || student.gender,
    student: student.student || student,
    class: student.student?.class || student.class,
    term: 'Full Record',
    year: new Date().getFullYear().toString(),
    attendanceSummary: computeAttendance() || undefined,
    principalComment: student.student?.principalComment || student.principalComment,
    classTeacherComment: student.student?.classTeacherComment || student.classTeacherComment,
    grades: grades.map((g: any) => ({
      subject: g.subject?.name || g.subjectName,
      grade: g.score >= 75 ? 'A' : g.score >= 60 ? 'B' : g.score >= 50 ? 'C' : g.score >= 40 ? 'D' : 'U',
      score: g.score,
      comment: g.comment,
      teacher: g.teacher
    }))
  };

  const primaryColor = reportTemplate?.config?.primaryColor || user?.schoolBranding?.primaryColor || '#2563eb';
  const logoUrl = reportTemplate?.school?.logoUrl ||
    (user?.schoolBranding?.logo
      ? (user.schoolBranding.logo.startsWith('http') ? user.schoolBranding.logo
        : `${window.location.origin}/api/storage/media/global/${user.schoolBranding.logo}`)
      : undefined);

  const template = {
    config: { primaryColor },
    signatureUrl: reportTemplate?.signatureUrl
      ? `${window.location.origin}${reportTemplate.signatureUrl}`
      : logoUrl,
    school: reportTemplate?.school || {
      name: user?.school?.name || 'School',
      logoUrl
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Academic History: {student.name}</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="portal-btn-secondary" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" style={{ marginRight: 8 }}></i>Back
          </button>
          <button className="portal-btn-primary" onClick={() => setShowTranscript(true)}>
            <i className="fas fa-file-pdf" style={{ marginRight: 8 }}></i>Full Transcript
          </button>
        </div>
      </div>

      <div className="portal-card" style={{ marginBottom: 24 }}>
        <div className="portal-card-header">
          <h2><i className="fas fa-user-circle" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Student Info</h2>
        </div>
        <div className="portal-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                <div>
                    <label style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 700, textTransform: 'uppercase' }}>Student ID</label>
                    <div style={{ fontWeight: 600 }}>{student.studentId}</div>
                </div>
                <div>
                    <label style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 700, textTransform: 'uppercase' }}>Current Class</label>
                    <div style={{ fontWeight: 600 }}>{student.class?.name || 'N/A'}</div>
                </div>
                <div>
                    <label style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 700, textTransform: 'uppercase' }}>Average Performance</label>
                    <div style={{ fontWeight: 600, color: 'var(--portal-success)' }}>{student.avgScore || '—'}%</div>
                </div>
                <div>
                    <label style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: 700, textTransform: 'uppercase' }}>Attendance Rate</label>
                    <div style={{ fontWeight: 600 }}>{student.attendanceRate}%</div>
                </div>
            </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-graduation-cap" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Most Recent Performance</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Recorded At</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {grades.length > 0 ? grades.map((g: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{g.subject?.code}</td>
                  <td>{g.subject?.name}</td>
                  <td style={{ color: g.score >= 50 ? '#2f855a' : 'var(--portal-danger)', fontWeight: 700 }}>{g.score}%</td>
                  <td>
                    <span className={`portal-badge ${g.score >= 75 ? 'success' : g.score >= 50 ? 'info' : 'danger'}`}>
                      {g.score >= 75 ? 'A' : g.score >= 60 ? 'B' : g.score >= 50 ? 'C' : g.score >= 40 ? 'D' : 'U'}
                    </span>
                  </td>
                  <td>{new Date(g.createdAt).toLocaleDateString()}</td>
                  <td style={{ fontSize: '0.85rem', color: '#718096' }}>{g.comment || '—'}</td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#a0aec0' }}>No academic records found for this student.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showTranscript && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '960px' }}>
            <div className="portal-modal-header" style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Academic Transcript Preview</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Archived Performance Metrics</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="portal-btn-primary" onClick={handleDownloadPDF} style={{ padding: '12px 24px', fontWeight: 900 }}>
                  <i className="fas fa-download mr-2"></i> Download PDF
                </button>
                <button className="portal-btn-ghost" onClick={() => setShowTranscript(false)} style={{ padding: '12px 24px', fontWeight: 800 }}>
                  Dismiss
                </button>
              </div>
            </div>
            
            <div className="portal-modal-body" style={{ padding: '40px', background: 'transparent' }}>
              <div id="academic-history-viewer">
                <ReportDocument data={reportData} template={template} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
