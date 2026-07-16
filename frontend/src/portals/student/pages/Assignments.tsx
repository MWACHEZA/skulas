import { useEffect, useState } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import './assignments.css';

interface Attachment {
  name: string;
  url: string;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  category: 'ASSIGNMENT' | 'QUIZ' | 'TEST' | 'MIDTERM' | 'FINAL_EXAM';
  timeLimit?: number;
  allowLate: boolean;
  isAccepting: boolean;
  questions?: {
    id: string;
    type: 'MCQ' | 'TF' | 'WRITTEN';
    text: string;
    options?: string[];
    points: number;
  }[];
  attachments?: Attachment[];
  submissions: {
    id: string;
    submittedAt: string;
    startedAt?: string;
    status: string;
    attachments?: any; // Can be files or quiz answers
    grade?: number;
    autoScore?: number;
    feedback?: string;
  }[];
}


export default function StudentAssignments() {
  const { user } = useAuth();

  const renderFilePreview = (url: string, name: string, type: 'assignment' | 'submission') => {
    const baseUrl = `${BASE_URL}/api/storage/media/${user?.schoolCode}/`;
    const subFolder = type === 'assignment' ? 'assignments' : 'submissions';
    const fullUrl = url.startsWith('http') ? url : baseUrl + (url.startsWith('file-') ? 'images/' : `${subFolder}/`) + url;
    const ext = url.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
    const isPDF = ext === 'pdf';

    if (isImage) {
        return (
            <div className="file-preview-card image-preview">
                <img src={fullUrl} alt={name} />
                <div className="preview-label">{name}</div>
            </div>
        );
    }

    if (isPDF) {
        return (
            <div className="file-preview-card pdf-preview">
                <iframe src={fullUrl} title={name} />
                <div className="preview-label">{name}</div>
            </div>
        );
    }

    return (
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="file-preview-card generic-file">
            <i className="fas fa-file-alt"></i>
            <span>{name}</span>
            <div className="preview-label">Click to Open</div>
        </a>
    );
  };
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Quiz State
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const { showToast } = useToast();

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    let timer: any;
    if (quizStarted && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0) ? prev - 1 : 0);
      }, 1000);
    } else if (timeLeft === 0 && quizStarted) {
      handleQuizSubmit();
    }
    return () => clearInterval(timer);
  }, [quizStarted, timeLeft]);

  const fetchAssignments = async () => {
    try {
      const { data } = await api.get('/api/students/assignments');
      setAssignments(data);
    } catch (err) {
      showToast('Failed to load assignments', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    if (!selectedAssignment) return;
    try {
      const { data } = await api.post(`/api/students/assignments/${selectedAssignment.id}/start`);
      // Calculate remaining time if timeLimit exists
      if (selectedAssignment.timeLimit) {
        const start = new Date(data.startedAt).getTime();
        const limitMs = selectedAssignment.timeLimit * 60000;
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
        setTimeLeft(remaining);
      }
      setQuizStarted(true);
    } catch (err) {
      showToast('Failed to start assessment', 'error');
    
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    if (files.length === 0) return showToast('Please select at least one file', 'error');

    setSubmitting(true);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      await api.post(`/api/students/assignments/${selectedAssignment.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('Work submitted successfully!', 'success');
      closeModal();
      fetchAssignments();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit work', 'error');
    
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuizSubmit = async () => {
    if (!selectedAssignment) return;
    setSubmitting(true);
    try {
      await api.post(`/api/students/assignments/${selectedAssignment.id}/submit`, {
        answers: JSON.stringify(answers)
      });
      showToast('Assessment submitted!', 'success');
      closeModal();
      fetchAssignments();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit', 'error');
    
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedAssignment(null);
    setQuizStarted(false);
    setAnswers({});
    setCurrentQ(0);
    setTimeLeft(null);
    setFiles([]);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getStatusBadge = (a: Assignment) => {
    const submission = a.submissions[0];
    const isSubmitted = a.submissions.length > 0;
    const isGraded = submission?.status === 'GRADED' || submission?.grade !== undefined;
    const isOverdue = new Date(a.dueDate) < new Date() && !isSubmitted;
    
    if (isGraded) return <span className="assignment-badge success">Graded: {submission.grade}%</span>;
    if (isSubmitted) return <span className="assignment-badge info">Submitted</span>;
    if (isOverdue) return <span className="assignment-badge danger">Overdue</span>;
    return <span className="assignment-badge warning">Pending</span>;
  };

  return (
    <div className="assignments-container">
      <div className="portal-page-header">
        <h1>My Assignments</h1>
        <p>View your classwork and submit your responses</p>
      </div>

      <div className="assignments-grid">
        {loading ? (
          <div className="loading-state"><i className="fas fa-spinner fa-spin"></i> Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-clipboard-check"></i>
            <p>No assignments found for your class.</p>
          </div>
        ) : (
          assignments.map(a => (
            <div key={a.id} className="assignment-card" onClick={() => setSelectedAssignment(a)}>
              <div className="assignment-card-header">
                <span className="subject-tag">{a.category}</span>
                {getStatusBadge(a)}
              </div>
              <h3 className="assignment-title">{a.title}</h3>
              <div className="assignment-meta">
                <span><i className="far fa-calendar-alt"></i> Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                {!a.isAccepting && <span className="text-danger" style={{fontSize: '0.7rem', fontWeight: 'bold'}}><i className="fas fa-lock"></i> Closed</span>}
                {a.submissions.length > 0 && (
                  <span className={`submission-meta ${a.submissions[0].grade !== undefined || a.submissions[0].autoScore !== undefined ? 'graded' : ''}`}>
                    <i className={(a.submissions[0].grade !== undefined || a.submissions[0].autoScore !== undefined) ? "fas fa-award" : "fas fa-check-double"}></i> 
                    {a.submissions[0].grade !== undefined ? ` Score: ${a.submissions[0].grade}%` : 
                     a.submissions[0].autoScore !== undefined ? ` Results: ${a.submissions[0].autoScore}%` : ' Finished'}
                  </span>
                )}
              </div>
              <button className="view-btn" onClick={() => alert('This feature is currently under development or disabled.')}>
                {a.submissions.length > 0 ? 'View Results' : a.questions ? 'Take Quiz' : 'View Details'} 
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Detail & Submission Modal */}
      {selectedAssignment && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="assignment-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={closeModal}>&times;</button>
            
            <div className="modal-scroll-area">
                <div className="modal-header">
                    <span className="modal-subject">{selectedAssignment.category}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2>{selectedAssignment.title}</h2>
                      {timeLeft !== null && (
                        <div className={`timer-box ${timeLeft < 60 ? 'critical' : ''}`}>
                          <i className="fas fa-hourglass-half"></i> {formatTime(timeLeft)}
                        </div>
                      )}
                    </div>
                    <div className="modal-meta">
                        <span><i className="fas fa-clock"></i> Deadline: {new Date(selectedAssignment.dueDate).toLocaleString()}</span>
                        <span><i className="fas fa-star"></i> Max Points: 100</span>
                        {selectedAssignment.timeLimit && <span><i className="fas fa-stopwatch"></i> Limit: {selectedAssignment.timeLimit} mins</span>}
                    </div>
                </div>

                {/* Conditional View: Quiz Taking vs Assignment Details */}
                {(() => {
                  const qs = selectedAssignment.questions;
                  if (quizStarted && qs) {
                    return (
                      <div className="quiz-view">
                        <div className="quiz-progress-bar">
                          <div className="progress-fill" style={{ width: `${((currentQ + 1) / qs.length) * 100}%` }}></div>
                        </div>
                        
                        <div className="question-container mt-6">
                           <h4 className="flex items-center gap-2">
                             <span className="q-badge">Q{currentQ + 1}</span>
                             {qs[currentQ].text}
                           </h4>
                           <p className="text-sm text-gray-500 mb-4">{qs[currentQ].points} Points</p>
    
                           <div className="options-grid">
                              {qs[currentQ].type === 'MCQ' && (
                                qs[currentQ].options?.map((opt, i) => (
                                  <button 
                                    key={i} 
                                    className={`option-btn ${answers[qs[currentQ].id] === opt ? 'selected' : ''}`}
                                    onClick={() => setAnswers({...answers, [qs[currentQ].id]: opt})}
                                  >
                                    <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
                                    {opt}
                                  </button>
                                ))
                              )}
                              {qs[currentQ].type === 'TF' && (
                                ['True', 'False'].map(opt => (
                                  <button 
                                    key={opt} 
                                    className={`option-btn ${answers[qs[currentQ].id] === opt ? 'selected' : ''}`}
                                    onClick={() => setAnswers({...answers, [qs[currentQ].id]: opt})}
                                  >
                                    {opt}
                                  </button>
                                ))
                              )}
                              {qs[currentQ].type === 'WRITTEN' && (
                                <textarea 
                                  className="portal-input w-full"
                                  rows={4}
                                  placeholder="Type your answer here..."
                                  value={answers[qs[currentQ].id] || ''}
                                  onChange={e => setAnswers({...answers, [qs[currentQ].id]: e.target.value})}
                                />
                              )}
                           </div>
                        </div>
    
                        <div className="quiz-navigation flex justify-between mt-8">
                           <button className="portal-btn-secondary" disabled={currentQ === 0} onClick={() => setCurrentQ(currentQ - 1)}>Previous</button>
                           {currentQ < qs.length - 1 ? (
                             <button className="portal-btn-primary" onClick={() => setCurrentQ(currentQ + 1)}>Next Question</button>
                           ) : (
                             <button className="portal-btn-primary success-btn" onClick={handleQuizSubmit} disabled={submitting}>
                               {submitting ? 'Submitting...' : 'Complete Assessment'}
                             </button>
                           )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {!quizStarted && (
                  <>
                    <div className="modal-section">
                        <h3>Instructions & Info</h3>
                        <div className="instruction-box">
                            {selectedAssignment.description || 'No additional instructions provided.'}
                        </div>
                    </div>

                    {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
                        <div className="modal-section">
                            <h3>Teacher Attachments</h3>
                            <div className="preview-gallery">
                                {selectedAssignment.attachments.map((file, idx) => (
                                    <div key={idx} className="preview-container">
                                        {renderFilePreview(file.url, file.name, 'assignment')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="modal-divider"></div>

                    <div className="modal-section submission-section">
                        <h3>{selectedAssignment.submissions.length > 0 ? 'Your Results/Submission' : 'Submit Your Work'}</h3>
                        
                        {selectedAssignment.submissions.length > 0 ? (
                            <div className="submitted-view">
                                <div className="submission-status-card">
                                    <i className="fas fa-check-circle"></i>
                                    <div>
                                        <h4>{selectedAssignment.submissions[0].status === 'GRADED' ? 'Results Published' : 'Work Submitted'}</h4>
                                        <p>Finished on {new Date(selectedAssignment.submissions[0].submittedAt).toLocaleString()}</p>
                                    </div>
                                </div>
                                
                                {selectedAssignment.submissions[0].attachments && typeof selectedAssignment.submissions[0].attachments === 'object' && !Array.isArray(selectedAssignment.submissions[0].attachments) && (
                                   <div className="quiz-recap mt-4">
                                      <h5>Your Answers:</h5>
                                      <div className="text-sm p-3 bg-gray-50 rounded border">
                                        {Object.entries(selectedAssignment.submissions[0].attachments).map(([qid, ans]: any) => (
                                          <div key={qid} className="mb-1"><strong>{qid}:</strong> {ans}</div>
                                        ))}
                                      </div>
                                   </div>
                                )}

                                {Array.isArray(selectedAssignment.submissions[0].attachments) && selectedAssignment.submissions[0].attachments.length > 0 && (
                                    <div className="submitted-files">
                                        <h5>Your Uploaded Files:</h5>
                                        <div className="preview-gallery">
                                            {selectedAssignment.submissions[0].attachments.map((f, i) => (
                                                <div key={i} className="preview-container">
                                                    {renderFilePreview(f.url, f.name, 'submission')}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(selectedAssignment.submissions[0].feedback || selectedAssignment.submissions[0].grade !== undefined || selectedAssignment.submissions[0].autoScore !== undefined) && (
                                    <div className="teacher-feedback">
                                        <div className="feedback-header">
                                            <h5>Assessment Results:</h5>
                                            {(selectedAssignment.submissions[0].grade !== undefined || selectedAssignment.submissions[0].autoScore !== undefined) && (
                                                <div className="grade-pill">
                                                  Grade: {selectedAssignment.submissions[0].grade ?? selectedAssignment.submissions[0].autoScore}%
                                                </div>
                                            )}
                                        </div>
                                        {selectedAssignment.submissions[0].feedback && (
                                            <blockquote>{selectedAssignment.submissions[0].feedback}</blockquote>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : !selectedAssignment.isAccepting ? (
                           <div className="locked-state">
                              <i className="fas fa-lock fa-3x"></i>
                              <h4>Submissions are Closed</h4>
                              <p>This assignment is no longer accepting submissions. Contact your teacher if you believe this is a mistake.</p>
                           </div>
                        ) : (
                            <div className="upload-view">
                                {selectedAssignment.questions ? (
                                  <div className="quiz-prompt">
                                     <p>This is an online online assessment. Once you click "Start", the timer will begin.</p>
                                     <button className="portal-btn-primary" onClick={startQuiz}>
                                       <i className="fas fa-play" style={{marginRight: 8}}></i> Start Assessment
                                     </button>
                                  </div>
                                ) : (
                                  <>
                                    <p>Upload your response files or images below. You can select multiple files.</p>
                                    <div className="file-upload-zone">
                                        <input type="file" multiple onChange={handleFileChange} id="file-upload" />
                                        <label htmlFor="file-upload">
                                            <i className="fas fa-cloud-upload-alt"></i>
                                            <span>{files.length > 0 ? `${files.length} files selected` : 'Choose Files or Pictures'}</span>
                                        </label>
                                    </div>
                                    {files.length > 0 && (
                                        <div className="selected-files">
                                            {files.map((f, i) => <div key={i} className="file-pips">{f.name}</div>)}
                                        </div>
                                    )}
                                  </>
                                )}
                            </div>
                        )}
                    </div>
                  </>
                )}
            </div>

            {!quizStarted && (
              <div className="modal-footer">
                  <button className="cancel-btn" onClick={closeModal}>Close</button>
                  {selectedAssignment.submissions.length === 0 && !selectedAssignment.questions && selectedAssignment.isAccepting && (
                    <button 
                      className="submit-btn" 
                      onClick={handleSubmit} 
                      disabled={submitting || files.length === 0}
                    >
                        {submitting ? 'Sending...' : 'Send Work'}
                    </button>
                  )}
                  {selectedAssignment.submissions.length > 0 && selectedAssignment.isAccepting && !selectedAssignment.questions && (
                    <button 
                      className="submit-btn" 
                      onClick={handleSubmit} 
                      disabled={submitting || files.length === 0}
                    >
                        {submitting ? 'Resubmit' : 'Update Work'}
                    </button>
                  )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
