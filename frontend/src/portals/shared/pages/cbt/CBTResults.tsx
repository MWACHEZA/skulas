import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../../lib/api';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';

export default function CBTResults() {
  const { id: examId } = useParams();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [results, setResults] = useState<any[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Remarking state
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [remarkScore, setRemarkScore] = useState<number | string>('');
  const [submittingRemark, setSubmittingRemark] = useState(false);

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
      setResults(resultsRes.data);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load results', 'error');
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
      showToast(err.response?.data?.error || 'Failed to update score', 'error');
    } finally {
      setSubmittingRemark(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading results...</div>;
  }

  return (
    <div className="portal-container">
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button className="portal-btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '10px' }}>
            <i className="fas fa-arrow-left mr-2"></i> Back to Exams
          </button>
          <h1>Exam Results: {exam?.title}</h1>
          <p>View and remark student submissions</p>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-body">
          {results.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
              <i className="fas fa-inbox fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
              <p>No student has submitted this exam yet.</p>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Submitted At</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td style={{ fontWeight: 600 }}>
                      {result.student?.firstName} {result.student?.lastName}
                    </td>
                    <td>{result.student?.class?.name || '-'}</td>
                    <td>{new Date(result.createdAt).toLocaleString()}</td>
                    <td style={{ fontWeight: 800 }}>
                      {result.score} / {result.totalMarks}
                    </td>
                    <td>
                      <span style={{ 
                        padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                        backgroundColor: result.status === 'Pass' ? '#c6f6d5' : '#fed7d7',
                        color: result.status === 'Pass' ? '#22543d' : '#822727'
                      }}>
                        {result.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="portal-btn-ghost" 
                        style={{ padding: '8px', width: '36px', height: '36px', color: '#3182ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        title="Review & Remark" 
                        onClick={() => {
                          setSelectedResult(result);
                          setRemarkScore(result.score);
                        }}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Remark Modal */}
      {selectedResult && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="portal-modal-header" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Review Submission - {selectedResult.student?.firstName} {selectedResult.student?.lastName}</h2>
              <button className="portal-btn-ghost" onClick={() => setSelectedResult(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="portal-modal-body" style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>Adjust Score</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <input 
                    type="number" 
                    className="portal-input" 
                    value={remarkScore}
                    onChange={(e) => setRemarkScore(e.target.value)}
                    style={{ width: '100px' }}
                  />
                  <span> / {selectedResult.totalMarks} marks</span>
                  <button 
                    className="portal-btn-primary" 
                    onClick={handleSaveRemark}
                    disabled={submittingRemark}
                  >
                    {submittingRemark ? 'Saving...' : 'Save Updated Score'}
                  </button>
                </div>
              </div>

              <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>Student Responses</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {exam?.questions.map((q: any, idx: number) => {
                  const sAns = selectedResult.responses ? selectedResult.responses[q.id] : null;
                  let cAns = q.answer;
                  
                  if (Array.isArray(cAns) && q.type !== 'Multiple choice') {
                    cAns = cAns[0];
                  }
                  
                  // Simple heuristic for incorrect vs correct UI
                  let isCorrect = false;
                  if (q.type === 'Multiple choice') {
                    if (Array.isArray(sAns) && Array.isArray(cAns)) {
                      isCorrect = sAns.length === cAns.length && sAns.every(v => cAns.includes(v));
                    }
                  } else if (q.type === 'Fill in the blanks') {
                    if (typeof sAns === 'string' && typeof cAns === 'string') {
                      isCorrect = sAns.trim().toLowerCase() === cAns.trim().toLowerCase();
                    }
                  } else {
                    isCorrect = sAns === cAns;
                  }

                  return (
                    <div key={q.id} style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', background: isCorrect ? '#f0fdf4' : '#fff1f2' }}>
                      <div style={{ fontWeight: 600, marginBottom: '10px' }}>
                        {idx + 1}. {q.question} <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 'normal' }}>({q.mark} marks)</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9rem' }}>
                        <div>
                          <strong style={{ color: '#64748b' }}>Student's Answer:</strong>
                          <div style={{ marginTop: '5px', padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                            {Array.isArray(sAns) ? sAns.join(', ') : (sAns !== null && sAns !== undefined ? String(sAns) : <em>No answer</em>)}
                          </div>
                        </div>
                        <div>
                          <strong style={{ color: '#64748b' }}>Correct Answer:</strong>
                          <div style={{ marginTop: '5px', padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                            {Array.isArray(cAns) ? cAns.join(', ') : String(cAns)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
