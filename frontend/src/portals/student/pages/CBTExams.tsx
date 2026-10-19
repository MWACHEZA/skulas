import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { SkeletonLoader } from '../../../components/shared';

export default function CBTExams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const [examsRes, resultsRes] = await Promise.allSettled([
        api.get('/api/cbt'),
        api.get('/api/cbt/my-results')
      ]);

      if (examsRes.status === 'fulfilled') {
        const list = Array.isArray(examsRes.value.data) ? examsRes.value.data : [];
        setExams(list);
      } else {
        console.error('Failed to load exams:', examsRes.reason);
      }

      if (resultsRes.status === 'fulfilled') {
        setResults(Array.isArray(resultsRes.value.data) ? resultsRes.value.data : []);
      } else {
        console.error('Failed to load my results:', resultsRes.reason);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading CBT exams', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredExams = () => {
    return exams.filter(exam => {
      const isCompleted = results.some(r => r.examId === exam.id);
      if (filterTab === 'active') return !isCompleted;
      if (filterTab === 'completed') return isCompleted;
      return true;
    });
  };

  const filtered = getFilteredExams();

  if (loading) {
    return (
      <div className="portal-container" style={{ padding: '24px 0' }}>
        <SkeletonLoader type="card" count={3} />
      </div>
    );
  }

  return (
    <div className="portal-container">
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
            <i className="fas fa-laptop-code mr-2" style={{ color: '#2563eb' }}></i>Online Computer-Based Exams (CBT)
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
            Take scheduled continuous assessments, mock tests, and view instant score evaluations.
          </p>
        </div>
        <button
          onClick={fetchExams}
          className="portal-btn-ghost"
          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          title="Refresh exams"
        >
          <i className="fas fa-sync-alt mr-2"></i>Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
        <button
          onClick={() => setFilterTab('all')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: filterTab === 'all' ? '#2563eb' : '#f1f5f9',
            color: filterTab === 'all' ? '#ffffff' : '#64748b',
            transition: 'all 0.2s'
          }}
        >
          All Exams ({exams.length})
        </button>
        <button
          onClick={() => setFilterTab('active')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: filterTab === 'active' ? '#2563eb' : '#f1f5f9',
            color: filterTab === 'active' ? '#ffffff' : '#64748b',
            transition: 'all 0.2s'
          }}
        >
          Ready to Take ({exams.filter(e => !results.some(r => r.examId === e.id)).length})
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: filterTab === 'completed' ? '#2563eb' : '#f1f5f9',
            color: filterTab === 'completed' ? '#ffffff' : '#64748b',
            transition: 'all 0.2s'
          }}
        >
          Completed ({results.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="portal-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#eff6ff',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            margin: '0 auto 16px'
          }}>
            <i className="fas fa-check-double" />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
            {filterTab === 'completed' ? 'No Completed Exams Yet' : 'No Active Exams Scheduled'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            {filterTab === 'completed' 
              ? 'Once you complete an online test, your score breakdowns and question responses will appear here.'
              : 'You are all caught up! New computer-based assessments will appear here when scheduled by your teachers.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20
        }}>
          {filtered.map(exam => {
            const result = results.find(r => r.examId === exam.id);
            const isCompleted = !!result;
            const qCount = exam._count?.questions ?? (Array.isArray(exam.questions) ? exam.questions.length : 0);

            return (
              <div
                key={exam.id}
                className="portal-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 20,
                  borderRadius: 14,
                  border: isCompleted ? '1.5px solid #bbf7d0' : '1.5px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                {/* Card Top */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#2563eb',
                      background: '#eff6ff',
                      padding: '3px 8px',
                      borderRadius: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: 6
                    }}>
                      {exam.subject?.name || 'General Examination'}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {exam.title}
                    </h3>
                  </div>

                  {isCompleted ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: result.status === 'Pass' ? '#dcfce7' : '#fee2e2',
                      color: result.status === 'Pass' ? '#15803d' : '#b91c1c',
                      padding: '4px 8px',
                      borderRadius: 6
                    }}>
                      <i className={`fas ${result.status === 'Pass' ? 'fa-check' : 'fa-times'}`} />
                      {result.status || 'Graded'}
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: '#dbeafe',
                      color: '#1e40af',
                      padding: '4px 8px',
                      borderRadius: 6
                    }}>
                      <i className="fas fa-play-circle" /> Ready
                    </span>
                  )}
                </div>

                {/* Description */}
                <p style={{
                  fontSize: '0.85rem',
                  color: '#64748b',
                  margin: '0 0 16px',
                  lineHeight: 1.45,
                  minHeight: 38
                }}>
                  {exam.description || 'Standard institutional computer-based assessment.'}
                </p>

                {/* Meta Attributes */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px 12px',
                  background: '#f8fafc',
                  padding: '12px 14px',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  color: '#475569',
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-clock" style={{ color: '#3b82f6', width: 14 }} />
                    <span><strong>{exam.duration || 60}</strong> Mins</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-list-ol" style={{ color: '#8b5cf6', width: 14 }} />
                    <span><strong>{qCount}</strong> Questions</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-bullseye" style={{ color: '#10b981', width: 14 }} />
                    <span>Pass: <strong>{exam.passingPercent || 50}%</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-calendar" style={{ color: '#f59e0b', width: 14 }} />
                    <span>{exam.date ? new Date(exam.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Flexible'}</span>
                  </div>
                </div>

                {/* Result Box if Completed */}
                {isCompleted && (
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: result.status === 'Pass' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${result.status === 'Pass' ? '#bbf7d0' : '#fecaca'}`,
                    marginBottom: 16
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Your Test Score:</span>
                      <span style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: result.status === 'Pass' ? '#15803d' : '#b91c1c'
                      }}>
                        {result.score} / {result.totalMarks} ({result.percentage ?? Math.round((result.score / (result.totalMarks || 1)) * 100)}%)
                      </span>
                    </div>
                  </div>
                )}

                {/* Card CTA */}
                <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                  {isCompleted ? (
                    <button
                      className="portal-btn-ghost"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#64748b',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        cursor: 'default'
                      }}
                      disabled
                    >
                      <i className="fas fa-check-circle mr-2" style={{ color: '#16a34a' }} />
                      Submitted & Logged
                    </button>
                  ) : (
                    <button
                      className="portal-btn-primary"
                      onClick={() => navigate(`/student/cbt/take/${exam.id}`)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                      }}
                    >
                      <i className="fas fa-pen-nib" /> Start Exam Now
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
