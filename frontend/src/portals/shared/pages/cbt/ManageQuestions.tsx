import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';

export default function ManageQuestions() {
  const { id: examId } = useParams();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [questionType, setQuestionType] = useState('Single choice');
  const [mark, setMark] = useState(1);
  const [questionText, setQuestionText] = useState('');
  
  // For options (Single/Multiple choice)
  const [numOptions, setNumOptions] = useState(4);
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctSingle, setCorrectSingle] = useState<number>(0);
  const [correctMultiple, setCorrectMultiple] = useState<boolean[]>([false, false, false, false]);
  
  // For True/False
  const [correctTF, setCorrectTF] = useState('true');

  // For Fill in the blank
  const [blankAnswer, setBlankAnswer] = useState('');

  const fetchExam = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/cbt/${examId}`);
      setExam(res.data);
    } catch (err: any) {
      showToast('Failed to fetch exam details', 'error');
      navigate(-1);
    
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) fetchExam();
  }, [examId]);

  const handleNumOptionsChange = (num: number) => {
    setNumOptions(num);
    const newOptions = [...options];
    const newMultiple = [...correctMultiple];
    while (newOptions.length < num) {
      newOptions.push('');
      newMultiple.push(false);
    }
    setOptions(newOptions.slice(0, num));
    setCorrectMultiple(newMultiple.slice(0, num));
  };

  const handleOptionChange = (index: number, val: string) => {
    const newOptions = [...options];
    newOptions[index] = val;
    setOptions(newOptions);
  };

  const handleMultipleChange = (index: number, val: boolean) => {
    const newMultiple = [...correctMultiple];
    newMultiple[index] = val;
    setCorrectMultiple(newMultiple);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText) {
      showToast('Question text is required', 'error');
      return;
    }

    let answerData: any;
    if (questionType === 'Single choice') {
      answerData = [options[correctSingle]];
    } else if (questionType === 'Multiple choice') {
      answerData = options.filter((_, idx) => correctMultiple[idx]);
    } else if (questionType === 'True or false') {
      answerData = [correctTF === 'true'];
    } else {
      answerData = [blankAnswer];
    }

    try {
      await api.post(`/api/cbt/${examId}/questions`, {
        type: questionType,
        mark,
        question: questionText,
        options: (questionType.includes('choice') || questionType === 'True or false') 
          ? (questionType === 'True or false' ? ['True', 'False'] : options) 
          : [],
        answer: answerData
      });
      showToast('Question added successfully', 'success');
      
      // Reset form
      setQuestionText('');
      setOptions(Array(numOptions).fill(''));
      fetchExam();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to add question', 'error');
    
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`/api/cbt/${examId}/questions/${qId}`);
      showToast('Question deleted', 'success');
      fetchExam();
    } catch (err) {
      showToast('Failed to delete question', 'error');
    
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!exam) return null;

  return (
    <>
      <div className="portal-page-header">
        <h1>Manage Questions: {exam.title}</h1>
        <p>Add and manage questions for this exam.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        
        {/* Left Column: Exam Info */}
        <div className="portal-card">
          <div className="portal-card-header">
            <h2>Exam Summary</h2>
          </div>
          <div className="portal-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div>
              <strong>Exam Name:</strong> <br /> {exam.title}
            </div>
            <div>
              <strong>Class & Section:</strong> <br /> {exam.class?.name || 'Any'} / {exam.section?.name || 'Any'}
            </div>
            <div>
              <strong>Subject:</strong> <br /> {exam.subject?.name || 'Any'}
            </div>
            <div>
              <strong>Date & Time:</strong> <br /> {new Date(exam.date).toLocaleDateString()} at {exam.time}
            </div>
            <div>
              <strong>Passing Percentage:</strong> <br /> {exam.passingPercent}%
            </div>
            <div>
              <strong>Total Marks:</strong> <br /> {exam.totalMarks}
            </div>
            <div>
              <strong>Questions Added:</strong> <br /> {exam.questions?.length || 0}
            </div>
            
            <button className="portal-btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: 20 }}>
              <i className="fas fa-arrow-left" style={{ marginRight: 8 }}></i> Back to Manage CBT
            </button>
          </div>
        </div>

        {/* Right Column: Add Question Form */}
        <div className="portal-card">
          <div className="portal-card-header" style={{ background: '#2c5282', color: 'white' }}>
            <h2 style={{ color: 'white' }}><i className="fas fa-plus" style={{ marginRight: 8 }}></i>Add Question</h2>
          </div>
          <div className="portal-card-body">
            <form onSubmit={handleAddQuestion}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div className="portal-form-group">
                  <label>Question Type <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    className="portal-input" 
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                  >
                    <option value="Single choice">Single choice</option>
                    <option value="Multiple choice">Multiple choice</option>
                    <option value="True or false">True or false</option>
                    <option value="Fill in the blanks">Fill in the blanks</option>
                  </select>
                </div>
                <div className="portal-form-group">
                  <label>Mark <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="number" 
                    className="portal-input" 
                    value={mark}
                    onChange={(e) => setMark(Number(e.target.value))}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="portal-form-group">
                <label>Question <span style={{ color: 'red' }}>*</span></label>
                <textarea 
                  className="portal-input" 
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter the question text here..."
                  required
                />
              </div>

              {/* Dynamic options based on question type */}
              {(questionType === 'Single choice' || questionType === 'Multiple choice') && (
                <>
                  <div className="portal-form-group">
                    <label>Number of options</label>
                    <input 
                      type="number" 
                      className="portal-input" 
                      value={numOptions}
                      onChange={(e) => handleNumOptionsChange(Number(e.target.value))}
                      min="2" max="10"
                      style={{ width: '100px' }}
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginTop: 15 }}>
                    {options.map((opt, idx) => (
                      <div key={idx} className="portal-form-group" style={{ background: '#f7fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                          {questionType === 'Single choice' ? (
                            <input 
                              type="radio" 
                              name="correctOption" 
                              checked={correctSingle === idx}
                              onChange={() => setCorrectSingle(idx)}
                              style={{ marginRight: 8, transform: 'scale(1.2)' }}
                            />
                          ) : (
                            <input 
                              type="checkbox" 
                              checked={correctMultiple[idx]}
                              onChange={(e) => handleMultipleChange(idx, e.target.checked)}
                              style={{ marginRight: 8, transform: 'scale(1.2)' }}
                            />
                          )}
                          <label style={{ margin: 0, fontWeight: 'bold' }}>Option {idx + 1} (Check if correct)</label>
                        </div>
                        <input 
                          type="text" 
                          className="portal-input" 
                          placeholder={`Option ${idx + 1} text`}
                          value={opt}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          required
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {questionType === 'True or false' && (
                <div className="portal-form-group" style={{ background: '#f7fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label>Correct Answer <span style={{ color: 'red' }}>*</span></label>
                  <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="tfAnswer" 
                        value="true" 
                        checked={correctTF === 'true'}
                        onChange={() => setCorrectTF('true')}
                        style={{ transform: 'scale(1.2)' }}
                      /> True
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="tfAnswer" 
                        value="false" 
                        checked={correctTF === 'false'}
                        onChange={() => setCorrectTF('false')}
                        style={{ transform: 'scale(1.2)' }}
                      /> False
                    </label>
                  </div>
                </div>
              )}

              {questionType === 'Fill in the blanks' && (
                <div className="portal-form-group">
                  <label>Correct Answer <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    value={blankAnswer}
                    onChange={(e) => setBlankAnswer(e.target.value)}
                    placeholder="Enter the correct answer"
                    required
                  />
                </div>
              )}

              <button type="submit" className="portal-btn-primary" style={{ marginTop: 20 }}>
                <i className="fas fa-plus"></i> Save Question
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Added Questions Table */}
      <div className="portal-card" style={{ marginTop: 24 }}>
        <div className="portal-card-header">
          <h2>Added Questions ({exam.questions?.length || 0})</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {(!exam.questions || exam.questions.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
              No questions added yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>Type</th>
                    <th>Question</th>
                    <th style={{ width: 100 }}>Mark</th>
                    <th style={{ width: 100 }}>Options</th>
                  </tr>
                </thead>
                <tbody>
                  {exam.questions.map((q: any, index: number) => (
                    <tr key={q.id}>
                      <td>{index + 1}</td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', background: '#ebf8ff', color: '#2b6cb0', fontWeight: 600 }}>
                          {q.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{q.question}</div>
                        <div style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: 4 }}>
                          Answer: {Array.isArray(q.answer) ? q.answer.map((a: any) => String(a)).join(', ') : ''}
                        </div>
                      </td>
                      <td>{q.mark}</td>
                      <td>
                        <button className="portal-btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleDeleteQuestion(q.id)}>
                          <i className="fas fa-trash" style={{ color: 'var(--portal-danger)' }}></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
