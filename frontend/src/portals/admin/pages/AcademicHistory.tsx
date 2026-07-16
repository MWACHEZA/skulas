import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function AdminAcademicHistory() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const { showToast } = useToast();

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

  return (
    <>
      <div className="portal-page-header">
        <h1>Academic History: {student.name}</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="portal-btn-secondary" onClick={() => window.history.back()}>
            <i className="fas fa-arrow-left" style={{ marginRight: 8 }}></i>Back
          </button>
          <button className="portal-btn-primary" onClick={() => alert('This feature is currently under development or disabled.')}>
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
