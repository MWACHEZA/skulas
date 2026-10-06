import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function QuestionBank() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Question Modal State
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    type: 'MULTIPLE_CHOICE',
    subjectId: '',
    form: 'Form 3',
    text: '',
    marks: 2,
    difficulty: 'MEDIUM',
    explanation: '',
    options: 'A) Option 1\nB) Option 2\nC) Option 3\nD) Option 4'
  });

  // Paper Modal State
  const [showPaperModal, setShowPaperModal] = useState(false);
  const [submittingPaper, setSubmittingPaper] = useState(false);
  const [paperForm, setPaperForm] = useState({
    title: '',
    subjectId: '',
    duration: 60,
    totalMarks: 100,
    description: '',
    instructions: 'Answer all questions in Section A and two in Section B.'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [qRes, pRes, sRes] = await Promise.all([
        api.get('/api/question-bank/questions'),
        api.get('/api/question-bank/papers'),
        api.get('/api/subjects').catch(() => ({ data: [] }))
      ]);
      setQuestions(Array.isArray(qRes.data) ? qRes.data : []);
      setPapers(Array.isArray(pRes.data) ? pRes.data : []);
      const subList = Array.isArray(sRes.data) ? sRes.data : (sRes.data?.subjects || []);
      setSubjects(subList);
      if (subList.length > 0) {
        setQuestionForm(prev => ({ ...prev, subjectId: prev.subjectId || subList[0].id }));
        setPaperForm(prev => ({ ...prev, subjectId: prev.subjectId || subList[0].id }));
      }
    } catch (err) {
      showToast('Failed to load question bank data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.text.trim()) {
      showToast('Please enter the question text', 'error');
      return;
    }
    setSubmittingQuestion(true);
    try {
      const optionsArray = questionForm.type === 'MULTIPLE_CHOICE'
        ? questionForm.options.split('\n').map(o => o.trim()).filter(Boolean)
        : null;

      await api.post('/api/question-bank/questions', {
        ...questionForm,
        marks: parseFloat(String(questionForm.marks)) || 1,
        options: optionsArray
      });
      showToast('Question added successfully', 'success');
      setShowQuestionModal(false);
      setQuestionForm(prev => ({ ...prev, text: '', explanation: '' }));
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create question', 'error');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleCreatePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paperForm.title.trim()) {
      showToast('Please enter the paper title', 'error');
      return;
    }
    setSubmittingPaper(true);
    try {
      await api.post('/api/question-bank/papers', {
        ...paperForm,
        duration: parseInt(String(paperForm.duration)) || 60,
        totalMarks: parseInt(String(paperForm.totalMarks)) || 100
      });
      showToast('Question paper designed successfully', 'success');
      setShowPaperModal(false);
      setPaperForm(prev => ({ ...prev, title: '', description: '' }));
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create paper', 'error');
    } finally {
      setSubmittingPaper(false);
    }
  };

  const convertToCbt = async (paperId: string) => {
    try {
      await api.post(`/api/question-bank/papers/${paperId}/convert-to-cbt`, {
        classId: null,
        startTime: null,
        endTime: null,
        durationMinutes: 60,
        passingPercentage: 50
      });
      showToast('Paper converted to CBT exam successfully', 'success');
    } catch (err) {
      showToast('Failed to convert to CBT', 'error');
    }
  };

  if (loading) {
    return (
      <div className="portal-container" style={{ padding: 40, textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin mr-2" /> Loading Question Bank...
      </div>
    );
  }

  return (
    <div className="portal-container">
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1><i className="fas fa-database mr-2" style={{ color: 'var(--school-primary, #0284c7)' }} />Question Bank</h1>
          <p>Author questions, organize test items by syllabus topic, and design exam papers.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="portal-btn-ghost" onClick={() => setShowQuestionModal(true)}>
            <i className="fas fa-plus mr-2" /> Add Question
          </button>
          <button className="portal-btn-primary" onClick={() => setShowPaperModal(true)}>
            <i className="fas fa-file-signature mr-2" /> Design Paper
          </button>
        </div>
      </div>

      <div className="portal-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Questions Column */}
        <div className="portal-card" style={{ background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #e2e8f0' }}>
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              <i className="fas fa-question-circle mr-2" style={{ color: '#0284c7' }} />
              Repository Questions ({questions.length})
            </h3>
            <button className="portal-btn-primary" style={{ fontSize: '0.85rem', padding: '6px 12px' }} onClick={() => setShowQuestionModal(true)}>
              <i className="fas fa-plus mr-1" /> Add Question
            </button>
          </div>
          {questions.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
              No questions found in repository. Click "Add Question" to create one.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 600, overflowY: 'auto' }}>
              {questions.map((q: any) => (
                <li key={q.id} style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', background: '#fafafa', borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1' }}>
                      {q.type}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                      {q.marks} Mark{q.marks !== 1 ? 's' : ''} • {q.difficulty || 'MEDIUM'}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>{q.text}</p>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: 12 }}>
                    <span>{q.subject?.name || 'General Subject'}</span>
                    {q.form && <span>Form: {q.form}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Papers Column */}
        <div className="portal-card" style={{ background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #e2e8f0' }}>
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              <i className="fas fa-file-alt mr-2" style={{ color: '#059669' }} />
              Question Papers ({papers.length})
            </h3>
            <button className="portal-btn-primary" style={{ fontSize: '0.85rem', padding: '6px 12px' }} onClick={() => setShowPaperModal(true)}>
              <i className="fas fa-plus mr-1" /> Design Paper
            </button>
          </div>
          {papers.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
              No exam papers designed yet. Click "Design Paper" to author one.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 600, overflowY: 'auto' }}>
              {papers.map((p: any) => (
                <li key={p.id} style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', background: '#fafafa', borderRadius: 6, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>{p.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                      {p.subject?.name || 'Subject'} • {p.totalMarks || 100} Marks • {p.duration || 60} Mins
                    </p>
                  </div>
                  <button className="portal-btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 10px' }} onClick={() => convertToCbt(p.id)}>
                    <i className="fas fa-laptop-code mr-1" /> Convert CBT
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add Question Modal */}
      {showQuestionModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1050, padding: 20
        }}>
          <div style={{ background: '#fff', borderRadius: 8, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Add Question to Bank</h3>
              <button type="button" onClick={() => setShowQuestionModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleCreateQuestion} style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Subject *</label>
                  <select
                    className="portal-input"
                    style={{ width: '100%' }}
                    value={questionForm.subjectId}
                    onChange={e => setQuestionForm({ ...questionForm, subjectId: e.target.value })}
                    required
                  >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code || ''})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Question Type</label>
                  <select
                    className="portal-input"
                    style={{ width: '100%' }}
                    value={questionForm.type}
                    onChange={e => setQuestionForm({ ...questionForm, type: e.target.value })}
                  >
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="ESSAY">Essay / Structured</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Form / Level</label>
                  <input
                    type="text"
                    className="portal-input"
                    style={{ width: '100%' }}
                    value={questionForm.form}
                    onChange={e => setQuestionForm({ ...questionForm, form: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Marks</label>
                  <input
                    type="number"
                    min="1"
                    className="portal-input"
                    style={{ width: '100%' }}
                    value={questionForm.marks}
                    onChange={e => setQuestionForm({ ...questionForm, marks: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Difficulty</label>
                  <select
                    className="portal-input"
                    style={{ width: '100%' }}
                    value={questionForm.difficulty}
                    onChange={e => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Question Prompt / Text *</label>
                <textarea
                  className="portal-input"
                  style={{ width: '100%', minHeight: 70 }}
                  value={questionForm.text}
                  onChange={e => setQuestionForm({ ...questionForm, text: e.target.value })}
                  required
                  placeholder="Enter the complete question prompt..."
                />
              </div>

              {questionForm.type === 'MULTIPLE_CHOICE' && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Choices (one per line)</label>
                  <textarea
                    className="portal-input"
                    style={{ width: '100%', minHeight: 70 }}
                    value={questionForm.options}
                    onChange={e => setQuestionForm({ ...questionForm, options: e.target.value })}
                  />
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Marking Scheme / Model Explanation</label>
                <input
                  type="text"
                  className="portal-input"
                  style={{ width: '100%' }}
                  value={questionForm.explanation}
                  onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Key concepts or correct answer indicator"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowQuestionModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={submittingQuestion}>
                  {submittingQuestion ? 'Saving...' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Design Paper Modal */}
      {showPaperModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1050, padding: 20
        }}>
          <div style={{ background: '#fff', borderRadius: 8, maxWidth: 520, width: '100%' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Design Question Paper</h3>
              <button type="button" onClick={() => setShowPaperModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleCreatePaper} style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Paper Title *</label>
                <input
                  type="text"
                  className="portal-input"
                  style={{ width: '100%' }}
                  value={paperForm.title}
                  onChange={e => setPaperForm({ ...paperForm, title: e.target.value })}
                  placeholder="e.g. Form 3 Mid-Term Examination Paper 1"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Subject *</label>
                  <select
                    className="portal-input"
                    style={{ width: '100%' }}
                    value={paperForm.subjectId}
                    onChange={e => setPaperForm({ ...paperForm, subjectId: e.target.value })}
                    required
                  >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Duration (Minutes)</label>
                  <input
                    type="number"
                    min="10"
                    className="portal-input"
                    style={{ width: '100%' }}
                    value={paperForm.duration}
                    onChange={e => setPaperForm({ ...paperForm, duration: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Total Marks</label>
                <input
                  type="number"
                  min="1"
                  className="portal-input"
                  style={{ width: '100%' }}
                  value={paperForm.totalMarks}
                  onChange={e => setPaperForm({ ...paperForm, totalMarks: Number(e.target.value) })}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>Instructions to Candidates</label>
                <textarea
                  className="portal-input"
                  style={{ width: '100%', minHeight: 60 }}
                  value={paperForm.instructions}
                  onChange={e => setPaperForm({ ...paperForm, instructions: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowPaperModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={submittingPaper}>
                  {submittingPaper ? 'Designing...' : 'Save Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
