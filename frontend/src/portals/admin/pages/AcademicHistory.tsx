import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';

export default function AdminAcademicHistory() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const { showToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (studentId) {
      fetchStudentHistory();
    }
  }, [studentId]);

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

  // ── Group grades by term/year ──────────────────────────────────────────────
  // (In a real system, you'd calculate average per term. For now we show subjects)
  const grades = student.grades || [];

  const handlePrintTranscript = () => {
    if (!student) return;
    
    const school = user?.schoolBranding;
    const logoSrc = school?.logo 
      ? (school.logo.startsWith('http') ? school.logo
        : school.logo.startsWith('/api') ? `${window.location.origin}${school.logo}`
        : `${window.location.origin}/api/storage/media/global/${school.logo}`)
      : null;

    const gradesHtml = grades.map((g: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${g.subject?.code || ''}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${g.subject?.name || ''}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${g.score}%</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold;">
          ${g.score >= 75 ? 'A' : g.score >= 60 ? 'B' : g.score >= 50 ? 'C' : g.score >= 40 ? 'D' : 'U'}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${g.comment || '—'}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${student.name} - Official Transcript</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a202c; padding: 40px; margin: 0; }
    @media print { body { padding: 0; margin: 20px; } }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f7fafc; padding: 12px 10px; text-align: left; border-bottom: 2px solid #cbd5e0; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 40px; border-bottom: 4px solid #2b6cb0; padding-bottom: 20px;">
    ${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="height: 100px; margin-bottom: 15px;" crossorigin="anonymous"/>` : ''}
    <h1 style="margin: 0; text-transform: uppercase; letter-spacing: 2px; color: #2b6cb0;">${user?.schoolName || 'ACADEMIC INSTITUTION'}</h1>
    <h2 style="margin: 10px 0 0 0; font-weight: 400; color: #4a5568;">OFFICIAL ACADEMIC TRANSCRIPT</h2>
  </div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 30px; background: #f7fafc; padding: 20px; border-radius: 8px;">
    <div>
      <div style="margin-bottom: 8px;"><strong>STUDENT NAME:</strong> <span style="font-size: 1.1rem;">${student.name}</span></div>
      <div style="margin-bottom: 8px;"><strong>STUDENT ID:</strong> ${student.studentId}</div>
      <div><strong>CURRENT CLASS:</strong> ${student.class?.name || 'N/A'}</div>
    </div>
    <div style="text-align: right;">
      <div style="margin-bottom: 8px;"><strong>DATE OF ISSUE:</strong> ${new Date().toLocaleDateString()}</div>
      <div style="margin-bottom: 8px;"><strong>CUMULATIVE AVERAGE:</strong> ${student.avgScore || '—'}%</div>
      <div><strong>ATTENDANCE RATE:</strong> ${student.attendanceRate || 0}%</div>
    </div>
  </div>

  <h3 style="margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">ACADEMIC RECORD</h3>
  <table>
    <thead>
      <tr>
        <th>Subject Code</th>
        <th>Subject Name</th>
        <th style="text-align: center;">Score</th>
        <th style="text-align: center;">Grade</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${gradesHtml || '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #718096;">No academic records found</td></tr>'}
    </tbody>
  </table>

  <div style="margin-top: 80px; display: flex; justify-content: space-between;">
    <div style="width: 250px; text-align: center;">
      <div style="border-bottom: 1px solid #000; height: 40px;"></div>
      <div style="margin-top: 8px; font-weight: bold; font-size: 0.9rem;">Registrar / Principal</div>
    </div>
    <div style="width: 250px; text-align: center;">
      <div style="border-bottom: 1px solid #000; height: 40px;"></div>
      <div style="margin-top: 8px; font-weight: bold; font-size: 0.9rem;">Official School Seal</div>
    </div>
  </div>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) { alert('Pop-up blocked. Please allow pop-ups.'); return; }
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    printWin.onload = () => setTimeout(() => { printWin.print(); printWin.close(); }, 400);
    setTimeout(() => { try { printWin.print(); printWin.close(); } catch (_) {} }, 1200);
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Academic History: {student.name}</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="portal-btn-secondary" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" style={{ marginRight: 8 }}></i>Back
          </button>
          <button className="portal-btn-primary" onClick={handlePrintTranscript}>
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
    </>
  );
}
