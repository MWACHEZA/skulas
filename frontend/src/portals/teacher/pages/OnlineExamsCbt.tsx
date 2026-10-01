import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';

export default function OnlineExamsCbt() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await api.get('/api/cbt');
      setExams(res.data);
    } catch (err) {
      showToast('Failed to load exams', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pushMarks = async (examId: string) => {
    try {
      await api.post(`/api/cbt/${examId}/push-marks`);
      showToast('Marks pushed to grades successfully', 'success');
    } catch (err) {
      showToast('Failed to push marks', 'error');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <h1>Online Exams (CBT)</h1>
        <p>Live monitoring and management</p>
      </div>

      <div className="portal-card">
        <table className="portal-table w-full">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Subject</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam: any) => (
              <tr key={exam.id}>
                <td>{exam.title}</td>
                <td><span className="status-badge">{exam.status}</span></td>
                <td>{exam.subject?.name}</td>
                <td>
                  <button className="portal-btn-ghost" onClick={() => pushMarks(exam.id)}>
                    Push Marks to Grades
                  </button>
                </td>
              </tr>
            ))}
            {exams.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">No exams found. Convert a paper from the Question Bank.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
