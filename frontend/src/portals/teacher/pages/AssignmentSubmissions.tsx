import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { BASE_URL } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';

interface Attachment {
  name: string;
  url: string;
}

interface Submission {
  id: string;
  student: { user: { name: string } };
  submittedAt: string;
  attachments?: Attachment[] | Record<string, string>;
  status: string;
  grade?: number;
  autoScore?: number;
  feedback?: string;
}


export default function TeacherAssignmentSubmissions() {
  const { user } = useAuth();

  const renderFilePreview = (url: string, name: string) => {
    const baseUrl = `${BASE_URL}/api/storage/media/${user?.schoolCode}/`;
    const fullUrl = url.startsWith('http') ? url : baseUrl + (url.startsWith('file-') ? 'images/' : 'submissions/') + url;
    const ext = url.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
    const isPDF = ext === 'pdf';

    if (isImage) {
        return (
            <div className="file-preview-card image-preview" style={{ height: 180 }}>
                <img src={fullUrl} alt={name} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                <div className="preview-label" style={{ padding: 6, fontSize: '0.7rem' }}>{name}</div>
            </div>
        );
    }

    if (isPDF) {
        return (
            <div className="file-preview-card pdf-preview" style={{ height: 260 }}>
                <iframe src={fullUrl} title={name} style={{ width: '100%', height: '230px', border: 'none' }} />
                <div className="preview-label" style={{ padding: 6, fontSize: '0.7rem' }}>{name}</div>
            </div>
        );
    }

    return (
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="file-preview-card generic-file" style={{ padding: '20px', textAlign: 'center' }}>
            <i className="fas fa-file-alt" style={{ fontSize: '1.5rem', marginBottom: 8, display: 'block' }}></i>
            <span style={{ fontSize: '0.8rem' }}>{name}</span>
        </a>
    );
  };
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignment');
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeData, setGradeData] = useState({ grade: '', feedback: '' });
  
  const { showToast } = useToast();

  useEffect(() => {
    if (assignmentId) {
      fetchSubmissions();
    }
  }, [assignmentId]);

  const fetchSubmissions = async () => {
    try {
      const [subsRes, assignRes] = await Promise.all([
        api.get(`/api/teachers/assignments/${assignmentId}/submissions`),
        api.get(`/api/teachers/assignments/${assignmentId}`) // We need to ensure this route exists or uses the list
      ]);
      setSubmissions(subsRes.data);
      setAssignment(assignRes.data);
    } catch (err) {
       console.error("Fetch error", err);
    
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      await api.post(`/api/teachers/submissions/${selectedSubmission.id}/grade`, gradeData);
      showToast('Grade recorded successfully', 'success');
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (err) {
      showToast('Failed to record grade', 'error');
    
    }
  };

  if (!assignmentId) return <div className="p-8 text-center">Please select an assignment first.</div>;

  return (
    <>
      <div className="portal-page-header">
        <h1>Assignment Submissions</h1>
        <p>Review student storage, check for plagiarism, and record grades.</p>
      </div>

      <div className="portal-card" style={{ marginBottom: 24 }}>
        <div className="portal-card-header">
           <h2>Submissions</h2>
           <button className="portal-btn-secondary" onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-download" style={{ marginRight: 6 }}></i>Download All</button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr><th>Student</th><th>Submission Date</th><th>File</th><th>Status</th><th>Grade</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.student.user.name}</td>
                    <td style={{ color: '#718096' }}>{new Date(s.submittedAt).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {Array.isArray(s.attachments) && s.attachments.length > 0 ? (
                          s.attachments.map((file: Attachment, idx: number) => (
                            <a 
                              key={idx} 
                              href={`${BASE_URL}/api/storage/media/${user?.schoolCode}/submissions/${file.url}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ color: 'var(--portal-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem' }}
                            >
                              <i className="fas fa-file-download" style={{ marginRight: 6 }}></i>
                              {file.name}
                            </a>
                          ))
                        ) : s.attachments && typeof s.attachments === 'object' ? (
                          <span style={{ color: '#4a5568', fontSize: '0.8rem', fontWeight: 600 }}>
                            <i className="fas fa-tasks" style={{ marginRight: 6 }}></i>
                            Quiz Response
                          </span>
                        ) : (
                          <span style={{ color: '#a0aec0', fontSize: '0.8rem italic' }}>No submissions</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`portal-badge ${s.status === 'GRADED' ? 'success' : 'info'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, textAlign: 'center' }}>
                      {s.grade ?? (s.autoScore !== undefined ? `${s.autoScore}% (Auto)` : '-')}
                    </td>
                    <td>
                      <button 
                        onClick={() => {
                          setSelectedSubmission(s);
                          setGradeData({ grade: String(s.grade || ''), feedback: s.feedback || '' });
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {s.status === 'GRADED' ? 'Edit Grade' : 'Grade Now'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedSubmission && (
        <div className="portal-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="portal-card" style={{ width: '100%', maxWidth: 900, margin: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-card-header">
              <h2>Grade Submission: {selectedSubmission.student.user.name}</h2>
              <button onClick={() => setSelectedSubmission(null)} className="close-btn">&times;</button>
            </div>
            <div className="portal-card-body" style={{ padding: 0, display: 'grid', gridTemplateColumns: '1fr 350px' }}>
               <div style={{ padding: 20, borderRight: '1px solid #e2e8f0', background: '#f7fafc', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#4a5568', marginBottom: 15 }}>Assessment Content</h3>
                
                 {(() => {
                   const atts = selectedSubmission.attachments;
                   if (atts && typeof atts === 'object' && !Array.isArray(atts)) {
                     const quizAnswers = atts as Record<string, string>;
                     return (
                       <div className="quiz-details">
                         <div style={{ background: '#ebf8ff', padding: '15px', borderRadius: 12, marginBottom: 20, border: '1px solid #bee3f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.75rem', color: '#2b6cb0', fontWeight: 600, textTransform: 'uppercase' }}>System Recommendation</span>
                              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2c5282' }}>{selectedSubmission.autoScore}%</div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#4a5568' }}>
                               Based on {assignment?.questions?.length || 0} questions
                            </div>
                         </div>
                         
                         <h4 style={{ fontSize: '0.9rem', marginBottom: 12, fontWeight: 700 }}>Question Review:</h4>
                         {assignment?.questions?.map((q: any, idx: number) => {
                           const studentAns = quizAnswers[q.id];
                           const isCorrect = studentAns === q.answer;
                           return (
                             <div key={q.id} style={{ marginBottom: 15, padding: 12, background: 'white', borderRadius: 8, border: `2px solid ${isCorrect ? '#c6f6d5' : '#fed7d7'}`, position: 'relative' }}>
                               <div style={{ position: 'absolute', top: -10, left: 10, background: isCorrect ? '#48bb78' : 'var(--portal-danger)', color: 'white', fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, fontWeight: 800 }}>
                                 {isCorrect ? 'CORRECT' : 'INCORRECT'}
                               </div>
                               <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>{idx + 1}. {q.text}</div>
                               <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>
                                 Student's Answer: <span style={{ color: isCorrect ? '#2f855a' : '#c53030', fontWeight: 700 }}>{studentAns || '(No Answer)'}</span>
                               </div>
                               {!isCorrect && (
                                 <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: 4, fontStyle: 'italic' }}>
                                   Correct Answer: {q.answer}
                                 </div>
                               )}
                             </div>
                           );
                         })}
                       </div>
                     );
                   }

                   return (
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 15 }}>
                       {Array.isArray(atts) && atts.length > 0 ? (
                         atts.map((f: any, i: number) => (
                           <div key={i} className="preview-container">
                             {renderFilePreview(f.url, f.name)}
                           </div>
                         ))
                       ) : (
                         <div style={{ textAlign: 'center', padding: 40, color: '#a0aec0' }}>No files or quiz data found.</div>
                       )}
                     </div>
                   );
                 })()}
              </div>

              {/* Grading Form */}
              <form onSubmit={handleGrade} style={{ padding: 20 }}>
                <div className="form-group mb-4">
                  <label className="block text-sm font-semibold mb-1">Grade (Score)</label>
                  <input 
                    type="number"
                    required
                    className="portal-input w-full" 
                    value={gradeData.grade} 
                    onChange={e => setGradeData({...gradeData, grade: e.target.value})}
                    placeholder="e.g. 85"
                  />
                </div>
                <div className="form-group mb-6">
                  <label className="block text-sm font-semibold mb-1">Feedback</label>
                  <textarea 
                    className="portal-input w-full"
                    rows={8}
                    value={gradeData.feedback}
                    onChange={e => setGradeData({...gradeData, feedback: e.target.value})}
                    placeholder="Provide detailed feedback..."
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setSelectedSubmission(null)} className="portal-btn-secondary">Cancel</button>
                  <button type="submit" className="portal-btn-primary">Save Grade</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
