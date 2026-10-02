import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function QuestionBank() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [qRes, pRes] = await Promise.all([
        api.get('/api/question-bank/questions'),
        api.get('/api/question-bank/papers')
      ]);
      setQuestions(qRes.data);
      setPapers(pRes.data);
    } catch (err) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
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
      showToast('Paper converted to CBT successfully', 'success');
    } catch (err) {
      showToast('Failed to convert to CBT', 'error');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <h1>Question Bank</h1>
        <p>Manage questions and design papers</p>
      </div>

      <div className="portal-grid-2">
        <div className="portal-card">
          <div className="portal-card-header">
            <h3>Questions</h3>
            <button className="portal-btn-primary" onClick={() => showToast('Not implemented', 'info')}>Add Question</button>
          </div>
          <ul>
            {questions.map((q: any) => (
              <li key={q.id} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                <p><strong>{q.type}</strong> - {q.text}</p>
                <small>Marks: {q.marks}</small>
              </li>
            ))}
          </ul>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h3>Question Papers</h3>
            <button className="portal-btn-primary" onClick={() => showToast('Not implemented', 'info')}>Design Paper</button>
          </div>
          <ul>
            {papers.map((p: any) => (
              <li key={p.id} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p><strong>{p.title}</strong></p>
                  <small>Total Marks: {p.totalMarks}</small>
                </div>
                <button className="portal-btn-ghost" onClick={() => convertToCbt(p.id)}>
                  Convert-to-CBT
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
