import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';

export default function CBTExams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const [examsRes, resultsRes] = await Promise.all([
        api.get('/api/cbt'),
        api.get('/api/cbt/my-results')
      ]);
      // Only show Active exams for the student's class, or all active exams if class filtering isn't strict
      const activeExams = examsRes.data.filter((exam: any) => exam.status === 'Active');
      setExams(activeExams);
      setResults(resultsRes.data);
    } catch (err) {
      showToast('Failed to load exams', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="portal-container" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
      </div>
    );
  }

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <h1>Online Exams (CBT)</h1>
        <p>Take your scheduled Computer Based Tests</p>
      </div>

      {exams.length === 0 ? (
        <div className="portal-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <i className="fas fa-laptop-code fa-3x" style={{ opacity: 0.2, marginBottom: '20px' }}></i>
          <h3>No active exams</h3>
          <p>You don't have any exams scheduled at the moment.</p>
        </div>
      ) : (
        <div className="portal-grid-3">
          {exams.map((exam) => {
            const result = results.find(r => r.examId === exam.id);
            const isCompleted = !!result;

            return (
              <div key={exam.id} className="portal-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="portal-card-header">
                  <h3>{exam.title}</h3>
                  {isCompleted ? (
                    <span className="status-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>Completed</span>
                  ) : (
                    <span className="status-badge" style={{ background: '#dcfce7', color: '#166534' }}>Active</span>
                  )}
                </div>
                <div style={{ flex: 1, padding: '20px 0' }}>
                  <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '16px' }}>
                    {exam.description || 'No description provided.'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                    <span><i className="fas fa-calendar mr-2"></i>{new Date(exam.date).toLocaleDateString()} at {exam.time}</span>
                    <span><i className="fas fa-book mr-2"></i>{exam.subject?.name || 'General'}</span>
                    <span><i className="fas fa-check-circle mr-2"></i>Passing Score: {exam.passingPercent}%</span>
                    <span><i className="fas fa-list-ol mr-2"></i>Questions: {exam._count?.questions || 0}</span>
                  </div>
                  {isCompleted && (
                    <div style={{ marginTop: '15px', padding: '10px', background: result.status === 'Pass' ? '#f0fdf4' : '#fff1f2', borderRadius: '6px', border: `1px solid ${result.status === 'Pass' ? '#bbf7d0' : '#fecdd3'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: result.status === 'Pass' ? '#166534' : '#9f1239' }}>Your Score:</span>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: result.status === 'Pass' ? '#166534' : '#9f1239' }}>
                          {result.score} / {result.totalMarks}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem', marginTop: '4px', color: result.status === 'Pass' ? '#166534' : '#9f1239' }}>
                        Status: <strong>{result.status}</strong>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                  {isCompleted ? (
                    <button 
                      className="portal-btn-ghost w-full" 
                      style={{ opacity: 0.7 }}
                      disabled
                    >
                      <i className="fas fa-check mr-2"></i> Exam Submitted
                    </button>
                  ) : (
                    <button 
                      className="portal-btn-primary w-full" 
                      onClick={() => navigate(`/student/cbt/take/${exam.id}`)}
                    >
                      <i className="fas fa-play mr-2"></i> Take Exam
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
