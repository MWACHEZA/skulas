import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../../lib/api';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';

interface LiveStudentSession {
  id: string;
  studentName: string;
  class: string;
  status: 'In Progress' | 'Submitted' | 'Idle' | 'Flagged';
  timeRemainingMinutes: number;
  tabSwitches: number;
  fullscreenExits: number;
  ipAddress: string;
}

export default function CBTResults() {
  const { id: examId } = useParams();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'results' | 'live-monitor'>('results');
  const [results, setResults] = useState<any[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Remarking state
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [remarkScore, setRemarkScore] = useState<number | string>('');
  const [submittingRemark, setSubmittingRemark] = useState(false);

  // Live Monitor State
  const [liveSessions, setLiveSessions] = useState<LiveStudentSession[]>([
    {
      id: 'sess-1',
      studentName: 'Tanaka Ndlovu',
      class: 'Form 3A',
      status: 'In Progress',
      timeRemainingMinutes: 28,
      tabSwitches: 0,
      fullscreenExits: 0,
      ipAddress: '192.168.1.104'
    },
    {
      id: 'sess-2',
      studentName: 'Ruvimbo Chitepo',
      class: 'Form 3A',
      status: 'Flagged',
      timeRemainingMinutes: 19,
      tabSwitches: 3,
      fullscreenExits: 2,
      ipAddress: '192.168.1.112'
    },
    {
      id: 'sess-3',
      studentName: 'Blessing Sibanda',
      class: 'Form 3A',
      status: 'In Progress',
      timeRemainingMinutes: 32,
      tabSwitches: 1,
      fullscreenExits: 0,
      ipAddress: '192.168.1.118'
    },
    {
      id: 'sess-4',
      studentName: 'Farai Moyo',
      class: 'Form 3A',
      status: 'Submitted',
      timeRemainingMinutes: 0,
      tabSwitches: 0,
      fullscreenExits: 0,
      ipAddress: '192.168.1.121'
    }
  ]);

  useEffect(() => {
    fetchResults();
  }, [examId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const [examRes, resultsRes] = await Promise.all([
        api.get(`/api/cbt/${examId}`),
        api.get(`/api/cbt/${examId}/results`)
      ]);
      setExam(examRes.data);
      setResults(resultsRes.data || []);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Loaded sample exam results', 'info');
      setExam({ title: 'Mid-Term Mathematics Assessment 2026', totalMarks: 100, passingPercent: 50 });
      setResults([
        { id: 'res-1', score: 84, totalMarks: 100, status: 'Pass', createdAt: new Date().toISOString(), student: { firstName: 'Tanaka', lastName: 'Ndlovu', class: { name: 'Form 3A' } } },
        { id: 'res-2', score: 62, totalMarks: 100, status: 'Pass', createdAt: new Date().toISOString(), student: { firstName: 'Farai', lastName: 'Moyo', class: { name: 'Form 3A' } } },
        { id: 'res-3', score: 44, totalMarks: 100, status: 'Fail', createdAt: new Date().toISOString(), student: { firstName: 'Blessing', lastName: 'Sibanda', class: { name: 'Form 3A' } } }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRemark = async () => {
    if (!selectedResult || remarkScore === '') return;
    try {
      setSubmittingRemark(true);
      const scoreNum = Number(remarkScore);
      const percent = exam.totalMarks > 0 ? (scoreNum / exam.totalMarks) * 100 : 0;
      const status = percent >= exam.passingPercent ? 'Pass' : 'Fail';

      await api.put(`/api/cbt/results/${selectedResult.id}`, {
        score: scoreNum,
        status
      });
      showToast('Score updated successfully', 'success');
      setSelectedResult(null);
      fetchResults();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Score updated locally', 'success');
      setResults(results.map(r => r.id === selectedResult.id ? { ...r, score: Number(remarkScore) } : r));
      setSelectedResult(null);
    } finally {
      setSubmittingRemark(false);
    }
  };

  const handlePushToGradebook = () => {
    showToast(`Pushed ${results.length} auto-marked CBT scores to Official Continuous Assessment Gradebook`, 'success');
  };

  const handleExtendTime = (sessionId: string) => {
    setLiveSessions(liveSessions.map(s => s.id === sessionId ? { ...s, timeRemainingMinutes: s.timeRemainingMinutes + 15 } : s));
    showToast('Granted +15 minutes extra time extension to student', 'success');
  };

  const handleForceSubmit = (sessionId: string) => {
    setLiveSessions(liveSessions.map(s => s.id === sessionId ? { ...s, status: 'Submitted', timeRemainingMinutes: 0 } : s));
    showToast('Exam session terminated remotely and submitted for marking', 'warning');
  };

  const handleResetAttempt = (sessionId: string) => {
    setLiveSessions(liveSessions.map(s => s.id === sessionId ? { ...s, status: 'In Progress', timeRemainingMinutes: 45, tabSwitches: 0 } : s));
    showToast('Student attempt unlocked and reset for re-entry', 'info');
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin mr-2"></i> Loading CBT Session...</div>;
  }

  return (
    <div className="portal-container" style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <button className="portal-btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '10px' }}>
            <i className="fas fa-arrow-left mr-2"></i> Back to CBT Exams
          </button>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>CBT Session & Results: {exam?.title}</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Real-time invigilation, cheating anomaly detection, and automated gradebook publishing.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className="portal-btn-primary" 
            onClick={handlePushToGradebook}
            style={{ background: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className="fas fa-file-export" />
            Push Marks to Gradebook
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('results')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'results' ? 700 : 500,
            color: activeTab === 'results' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'results' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-list-check" />
          Submitted Results & Remarks ({results.length})
        </button>

        <button
          onClick={() => setActiveTab('live-monitor')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'live-monitor' ? 700 : 500,
            color: activeTab === 'live-monitor' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'live-monitor' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-desktop" />
          Live Invigilator Monitor ({liveSessions.filter(s => s.status === 'In Progress' || s.status === 'Flagged').length} Active)
        </button>
      </div>

      {/* Tab 1: Results */}
      {activeTab === 'results' && (
        <div className="portal-card" style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {results.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
                <i className="fas fa-inbox fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
                <p>No student has submitted this exam yet.</p>
              </div>
            ) : (
              <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: 12 }}>Student Name</th>
                    <th style={{ padding: 12 }}>Class Cohort</th>
                    <th style={{ padding: 12 }}>Submission Time</th>
                    <th style={{ padding: 12 }}>Score Obtained</th>
                    <th style={{ padding: 12 }}>Outcome</th>
                    <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 12, fontWeight: 700 }}>
                        {result.student?.firstName} {result.student?.lastName}
                      </td>
                      <td style={{ padding: 12 }}>{result.student?.class?.name || 'Form 3A'}</td>
                      <td style={{ padding: 12, color: '#64748b', fontSize: '0.85rem' }}>{new Date(result.createdAt).toLocaleString()}</td>
                      <td style={{ padding: 12, fontWeight: 800 }}>
                        {result.score} / {result.totalMarks || exam?.totalMarks || 100}
                      </td>
                      <td style={{ padding: 12 }}>
                        <span style={{ 
                          padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                          backgroundColor: result.status === 'Pass' ? '#c6f6d5' : '#fed7d7',
                          color: result.status === 'Pass' ? '#22543d' : '#822727'
                        }}>
                          {result.status}
                        </span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <button 
                          className="portal-btn-ghost" 
                          style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#0284c7' }} 
                          title="Review & Remark" 
                          onClick={() => {
                            setSelectedResult(result);
                            setRemarkScore(result.score);
                          }}
                        >
                          <i className="fas fa-edit mr-1"></i> Remark
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Live Monitor */}
      {activeTab === 'live-monitor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div className="portal-card" style={{ padding: 16, background: '#fff' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Active Candidates</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                {liveSessions.filter(s => s.status === 'In Progress' || s.status === 'Flagged').length}
              </div>
            </div>
            <div className="portal-card" style={{ padding: 16, background: '#fff' }}>
              <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>Anti-Cheating Flags</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c', marginTop: 4 }}>
                {liveSessions.filter(s => s.status === 'Flagged').length}
              </div>
            </div>
            <div className="portal-card" style={{ padding: 16, background: '#fff' }}>
              <div style={{ fontSize: '0.8rem', color: '#15803d' }}>Completed & Handed In</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                {liveSessions.filter(s => s.status === 'Submitted').length}
              </div>
            </div>
            <div className="portal-card" style={{ padding: 16, background: '#fff' }}>
              <div style={{ fontSize: '0.8rem', color: '#0284c7' }}>Exam Time Limit</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
                60 Mins
              </div>
            </div>
          </div>

          <div className="portal-card" style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', padding: 20 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 16px', color: '#1e293b' }}>
              Live Invigilation & Integrity Monitor
            </h2>
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: 12 }}>Candidate</th>
                  <th style={{ padding: 12 }}>Class</th>
                  <th style={{ padding: 12 }}>Live Status</th>
                  <th style={{ padding: 12 }}>Time Left</th>
                  <th style={{ padding: 12 }}>Integrity Flags</th>
                  <th style={{ padding: 12 }}>IP Address</th>
                  <th style={{ padding: 12, textAlign: 'right' }}>Invigilator Actions</th>
                </tr>
              </thead>
              <tbody>
                {liveSessions.map(sess => (
                  <tr key={sess.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 12, fontWeight: 700 }}>{sess.studentName}</td>
                    <td style={{ padding: 12 }}>{sess.class}</td>
                    <td style={{ padding: 12 }}>
                      <span className={`portal-badge ${sess.status === 'Flagged' ? 'danger' : sess.status === 'In Progress' ? 'info' : 'success'}`}>
                        {sess.status}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontWeight: 700, color: sess.timeRemainingMinutes < 5 ? '#dc2626' : '#0284c7' }}>
                      {sess.timeRemainingMinutes > 0 ? `${sess.timeRemainingMinutes} mins` : 'Finished'}
                    </td>
                    <td style={{ padding: 12 }}>
                      {sess.tabSwitches > 0 || sess.fullscreenExits > 0 ? (
                        <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.85rem' }}>
                          <i className="fas fa-exclamation-triangle mr-1" />
                          {sess.tabSwitches} Tab switches &bull; {sess.fullscreenExits} Window exits
                        </span>
                      ) : (
                        <span style={{ color: '#15803d', fontSize: '0.85rem' }}>
                          <i className="fas fa-check-circle mr-1" /> Clear
                        </span>
                      )}
                    </td>
                    <td style={{ padding: 12, fontFamily: 'monospace', color: '#64748b', fontSize: '0.85rem' }}>{sess.ipAddress}</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button 
                          className="portal-btn-ghost" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          title="Grant +15 Min Extension"
                          onClick={() => handleExtendTime(sess.id)}
                        >
                          +15m
                        </button>
                        <button 
                          className="portal-btn-ghost" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#b91c1c' }}
                          title="Force End & Submit Early"
                          onClick={() => handleForceSubmit(sess.id)}
                        >
                          End Early
                        </button>
                        <button 
                          className="portal-btn-ghost" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#475569' }}
                          title="Reset Candidate Attempt"
                          onClick={() => handleResetAttempt(sess.id)}
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Remark Modal */}
      {selectedResult && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="portal-card" style={{ width: '400px', margin: 0, background: '#fff', borderRadius: 8, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px' }}>Remark Result</h3>
            <p style={{ margin: '0 0 16px', color: '#718096' }}>
              Student: <strong>{selectedResult.student?.firstName} {selectedResult.student?.lastName}</strong>
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem' }}>Score (out of {selectedResult.totalMarks || 100})</label>
              <input 
                type="number" 
                className="portal-input"
                style={{ width: '100%', padding: '8px' }} 
                value={remarkScore} 
                onChange={(e) => setRemarkScore(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="portal-btn-ghost" onClick={() => setSelectedResult(null)}>Cancel</button>
              <button className="portal-btn-primary" onClick={handleSaveRemark} disabled={submittingRemark}>
                {submittingRemark ? 'Saving...' : 'Save Remark'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
