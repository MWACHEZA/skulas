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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const { data } = await api.get('/api/cbt');
      // Only show Active exams for the student's class, or all active exams if class filtering isn't strict
      const activeExams = data.filter((exam: any) => exam.status === 'Active');
      setExams(activeExams);
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
          {exams.map((exam) => (
            <div key={exam.id} className="portal-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="portal-card-header">
                <h3>{exam.title}</h3>
                <span className="status-badge" style={{ background: '#dcfce7', color: '#166534' }}>Active</span>
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
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button 
                  className="portal-btn-primary w-full" 
                  onClick={() => navigate(`/student/cbt/take/${exam.id}`)}
                >
                  <i className="fas fa-play mr-2"></i> Take Exam
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
