import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';

export default function TakeExam() {
  const { id: examId } = useParams();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0); // 0 = Cover page
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await api.get(`/api/cbt/${examId}`);
        setExam(res.data);
      } catch (err: any) {
        showToast(err.response?.data?.error || 'Failed to load exam', 'error');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    if (examId) fetchExam();
  }, [examId, navigate, showToast]);

  const handleStart = () => {
    setStarted(true);
    setCurrentPage(1);
  };

  const handleAnswerChange = (qId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: answer
    }));
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit your exam?')) return;
    try {
      setSubmitting(true);
      await api.post(`/api/cbt/${examId}/submit`, { responses: answers });
      showToast('Exam submitted successfully!', 'success');
      navigate('/student/cbt');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit exam', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading exam...</div>;
  }

  if (!exam) return null;

  // Group questions by page
  const totalPages = Math.max(1, ...exam.questions.map((q: any) => q.page || 1));
  const currentQuestions = exam.questions.filter((q: any) => (q.page || 1) === currentPage);
  
  // Group current page questions by section
  const sections = currentQuestions.reduce((acc: any, q: any) => {
    const sectionName = q.section || 'General';
    if (!acc[sectionName]) acc[sectionName] = [];
    acc[sectionName].push(q);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
      
      {currentPage === 0 ? (
        // COVER PAGE
        <div className="portal-card animate-in zoom-in duration-300" style={{ padding: '40px', textAlign: 'center', borderTop: `8px solid ${exam.school?.websiteSettings?.schoolPrimaryColor || '#1e3a8a'}` }}>
          
          {exam.school?.logo && (
            <img src={exam.school.logo} alt="School Logo" style={{ height: '100px', marginBottom: '20px' }} />
          )}
          <h1 style={{ fontSize: '2rem', margin: '0 0 10px', color: '#1e293b' }}>{exam.school?.name}</h1>
          <h2 style={{ fontSize: '1.5rem', color: '#334155', marginBottom: '30px' }}>{exam.title}</h2>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '40px', fontSize: '1.1rem', fontWeight: 600 }}>
            <div>Subject: {exam.subject?.name}</div>
            <div>Date: {new Date(exam.date).toLocaleDateString()}</div>
            <div>Time: {exam.time}</div>
          </div>

          <div style={{ textAlign: 'left', background: '#f8fafc', padding: '30px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '40px' }}>
            <h3 style={{ marginTop: 0 }}>Instructions to Candidates</h3>
            {exam.instructions ? (
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.1rem' }}>
                {exam.instructions}
              </div>
            ) : (
              <ul style={{ paddingLeft: '20px', lineHeight: '1.6', fontSize: '1.1rem' }}>
                <li>Read each question carefully before answering.</li>
                <li>Answer all questions in the sections provided.</li>
                <li>Ensure you review your answers before submitting.</li>
              </ul>
            )}
          </div>

          <button 
            className="portal-btn-primary" 
            style={{ padding: '15px 40px', fontSize: '1.2rem', fontWeight: 'bold' }}
            onClick={handleStart}
          >
            Start Exam
          </button>
        </div>
      ) : (
        // EXAM PAGES
        <div className="portal-card animate-in fade-in duration-300">
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: 0 }}>{exam.title}</h2>
            <div style={{ fontWeight: 600, color: '#64748b' }}>
              Page {currentPage} of {totalPages}
            </div>
          </div>
          
          <div className="portal-card-body" style={{ padding: '30px' }}>
            {Object.keys(sections).map((sectionName) => (
              <div key={sectionName} style={{ marginBottom: '40px' }}>
                {sectionName !== 'General' && (
                  <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', color: '#1e293b' }}>
                    {sectionName}
                  </h3>
                )}
                
                {sections[sectionName].map((q: any) => {
                  // Find global index
                  const globalIdx = exam.questions.findIndex((gq: any) => gq.id === q.id) + 1;
                  
                  return (
                    <div key={q.id} style={{ marginBottom: '30px', padding: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#334155' }}>{globalIdx}.</div>
                        <div style={{ flex: 1, fontSize: '1.1rem', lineHeight: '1.6' }}>{q.question}</div>
                        <div style={{ fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>[{q.mark} mark{q.mark > 1 ? 's' : ''}]</div>
                      </div>

                      <div style={{ paddingLeft: '35px' }}>
                        {q.type === 'Single choice' && q.options && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {q.options.map((opt: string, optIdx: number) => (
                              <label key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px', borderRadius: '4px', background: answers[q.id] === opt ? '#eff6ff' : 'transparent', border: answers[q.id] === opt ? '1px solid #bfdbfe' : '1px solid transparent' }}>
                                <input 
                                  type="radio" 
                                  name={`question_${q.id}`} 
                                  value={opt} 
                                  checked={answers[q.id] === opt}
                                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                  style={{ transform: 'scale(1.2)' }}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        )}

                        {q.type === 'Multiple choice' && q.options && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {q.options.map((opt: string, optIdx: number) => {
                              const isChecked = (answers[q.id] || []).includes(opt);
                              return (
                                <label key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px', borderRadius: '4px', background: isChecked ? '#eff6ff' : 'transparent', border: isChecked ? '1px solid #bfdbfe' : '1px solid transparent' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const current = answers[q.id] || [];
                                      if (e.target.checked) {
                                        handleAnswerChange(q.id, [...current, opt]);
                                      } else {
                                        handleAnswerChange(q.id, current.filter((a: string) => a !== opt));
                                      }
                                    }}
                                    style={{ transform: 'scale(1.2)' }}
                                  />
                                  {opt}
                                </label>
                              )
                            })}
                          </div>
                        )}

                        {q.type === 'True or false' && (
                          <div style={{ display: 'flex', gap: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                name={`question_${q.id}`} 
                                value="true"
                                checked={answers[q.id] === true}
                                onChange={() => handleAnswerChange(q.id, true)}
                                style={{ transform: 'scale(1.2)' }}
                              />
                              True
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                name={`question_${q.id}`} 
                                value="false"
                                checked={answers[q.id] === false}
                                onChange={() => handleAnswerChange(q.id, false)}
                                style={{ transform: 'scale(1.2)' }}
                              />
                              False
                            </label>
                          </div>
                        )}

                        {q.type === 'Fill in the blanks' && (
                          <div>
                            <input 
                              type="text" 
                              className="portal-input"
                              placeholder="Type your answer here..."
                              value={answers[q.id] || ''}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              style={{ maxWidth: '400px' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {currentQuestions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No questions found on this page.
              </div>
            )}
          </div>
          
          <div className="portal-card-footer" style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '20px 30px', borderTop: '1px solid #e2e8f0' }}>
            <button 
              className="portal-btn-ghost" 
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            >
              <i className="fas fa-chevron-left mr-2"></i> Previous
            </button>
            
            {currentPage < totalPages ? (
              <button 
                className="portal-btn-primary" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next <i className="fas fa-chevron-right ml-2"></i>
              </button>
            ) : (
              <button 
                className="portal-btn-primary" 
                style={{ background: '#10b981', borderColor: '#10b981' }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Exam'} <i className="fas fa-check ml-2"></i>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
