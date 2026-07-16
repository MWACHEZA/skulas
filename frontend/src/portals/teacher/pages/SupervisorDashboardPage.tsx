import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';

interface SupervisionAssignment {
  id: string;
  role: string;
  student: {
    id: string;
    name: string;
    studentId: string;
    programLevel: string;
    researchTitle: string;
    maxCompletionDate: string;
    progressReports: Array<{
      status: string;
      submittedAt: string;
    }>;
  };
}

export default function SupervisorDashboard() {
  const { t } = useTerminology();
  const [assignments, setAssignments] = useState<SupervisionAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<SupervisionAssignment | null>(null);
  const [reportFeedback, setReportFeedback] = useState('');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/api/supervisors/my-students');
      setAssignments(res.data);
    } catch (err) {
      console.error('Failed to fetch supervised students');
    
    } finally {
      setLoading(false);
    }
  };

  const reviewReport = async (reportId: string, status: string) => {
    try {
      await api.post('/api/supervisors/reports', {
        reportId,
        status,
        supervisorNote: reportFeedback
      });
      setReportFeedback('');
      setSelectedStudent(null);
      fetchAssignments();
    } catch (err) {
      alert('Failed to review report');
    }
  };

  if (loading) return <div className="portal-loader">Loading supervision dashboard...</div>;

  return (
    <div className="supervisor-portal">
      <div className="portal-page-header">
        <h1>Research Supervision</h1>
        <p>Manage postgraduate candidates and academic research progress.</p>
      </div>

      <div className="portal-grid-3">
        {/* Student List Sidebar */}
        <div className="portal-card" style={{ height: 'fit-content' }}>
          <div className="portal-card-header">
            <h3>Supervisees ({assignments.length})</h3>
          </div>
          <div className="portal-list">
            {assignments.map(a => (
              <div 
                key={a.id} 
                className={`portal-list-item ${selectedStudent?.id === a.id ? 'active' : ''}`}
                onClick={() => setSelectedStudent(a)}
                style={{ cursor: 'pointer', padding: '12px', borderBottom: '1px solid #f0f4f8' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong>{a.student.name}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#718096' }}>{a.student.programLevel.replace(/_/g, ' ')}</span>
                  <span className="portal-badge" style={{ alignSelf: 'flex-start', marginTop: 4 }}>{a.role.replace(/_/g, ' ')}</span>
                </div>
              </div>
            ))}
            {assignments.length === 0 && <p className="empty-text">No assigned students.</p>}
          </div>
        </div>

        {/* Detailed View */}
        <div className="portal-card" style={{ gridColumn: 'span 2' }}>
          {selectedStudent ? (
            <div className="portal-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f4f8', paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem' }}>{selectedStudent.student.name}</h2>
                  <p style={{ color: '#718096' }}>{selectedStudent.student.researchTitle || 'No title set'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 600 }}>ID: {selectedStudent.student.studentId}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--portal-danger)' }}>
                    Deadline: {new Date(selectedStudent.student.maxCompletionDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <h3>Progress History</h3>
              <table className="portal-table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudent.student.progressReports.map((report: any) => (
                    <tr key={report.id}>
                      <td>{new Date(report.submittedAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`portal-badge ${report.status === 'SATISFACTORY' ? 'success' : 'warning'}`}>
                          {report.status}
                        </span>
                      </td>
                      <td>
                        {report.status === 'SUBMITTED' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                              className="portal-btn-sm success"
                              onClick={() => {
                                const note = prompt('Add supervisor feedback:');
                                if (note) {
                                  setReportFeedback(note);
                                  reviewReport(report.id, 'SATISFACTORY');
                                }
                              }}
                            >Approve</button>
                            <button className="portal-btn-sm danger" onClick={() => reviewReport(report.id, 'RE_SUBMIT')}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {selectedStudent.student.progressReports.length === 0 && (
                    <tr><td colSpan={3} className="empty-text">No reports submitted yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="portal-card-body" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
              <p>Select a student from the list to view research progress.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .supervisor-portal .active { background: #ebf8ff; border-left: 4px solid var(--school-primary, #3182ce); }
        .portal-btn-sm { padding: 4px 12px; font-size: 0.85rem; border-radius: 4px; border: none; cursor: pointer; }
        .portal-btn-sm.success { background: #c6f6d5; color: #22543d; }
        .portal-btn-sm.danger { background: #fed7d7; color: #822727; }
        .empty-text { text-align: center; color: #a0aec0; margin: 24px 0; }
      `}</style>
    </div>
  );
}
