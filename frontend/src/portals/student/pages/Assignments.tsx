import React, { useEffect, useState, useMemo } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { SkeletonLoader } from '../../../components/shared';
import './assignments.css';

interface Attachment {
  name: string;
  url: string;
}

interface SubmissionHistoryItem {
  version: number;
  submittedAt: string;
  files?: Attachment[];
  submissionText?: string | null;
  grade?: number | null;
  feedback?: string | null;
  status?: string;
}

interface Submission {
  id: string;
  submittedAt: string;
  startedAt?: string;
  status: string;
  attachments?: Attachment[] | any;
  submissionText?: string | null;
  submissionHistory?: SubmissionHistoryItem[];
  grade?: number | null;
  autoScore?: number | null;
  feedback?: string | null;
  gradesReleased?: boolean;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  category: 'ASSIGNMENT' | 'QUIZ' | 'TEST' | 'MIDTERM' | 'FINAL_EXAM';
  type?: string;
  totalMarks?: number;
  timeLimit?: number;
  allowLate: boolean;
  latePenaltyPercent?: number;
  allowResubmission?: boolean;
  isAccepting: boolean;
  status?: string;
  gradesReleased?: boolean;
  subject?: { id: string; name: string };
  teacher?: { user?: { name: string } };
  questions?: {
    id: string;
    type: 'MCQ' | 'TF' | 'WRITTEN';
    text: string;
    options?: string[];
    points: number;
  }[];
  attachments?: Attachment[];
  files?: Attachment[];
  submissions: Submission[];
}

export default function StudentAssignments() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Submission Form State
  const [files, setFiles] = useState<File[]>([]);
  const [submissionText, setSubmissionText] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Tab & Search Filter State
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'SUBMITTED' | 'GRADED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  // Quiz State
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    let timer: any;
    if (quizStarted && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timeLeft === 0 && quizStarted) {
      handleQuizSubmit();
    }
    return () => clearInterval(timer);
  }, [quizStarted, timeLeft]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/students/assignments');
      setAssignments(data || []);
    } catch {
      showToast('Failed to load assignments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderFilePreview = (url: string, name: string, type: 'assignment' | 'submission') => {
    if (!url) return null;
    let fullUrl = url;
    if (!url.startsWith('http')) {
      if (url.startsWith('/api/storage/')) {
        fullUrl = `${BASE_URL}${url}`;
      } else if (url.startsWith('api/storage/')) {
        fullUrl = `${BASE_URL}/${url}`;
      } else if (url.includes('/')) {
        fullUrl = `${BASE_URL}/api/storage/media/${url.replace(/^\/+/, '')}`;
      } else {
        const subFolder = type === 'assignment' ? 'assignments/' : 'submissions/';
        fullUrl = `${BASE_URL}/api/storage/media/${user?.schoolCode || 'global'}/${subFolder}${url}`;
      }
    }
    const ext = url.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
    const isPDF = ext === 'pdf';

    if (isImage) {
      return (
        <div className="file-preview-card image-preview">
          <a href={fullUrl} target="_blank" rel="noopener noreferrer">
            <img src={fullUrl} alt={name} />
          </a>
          <div className="preview-label" title={name}>{name}</div>
        </div>
      );
    }

    if (isPDF) {
      return (
        <div className="file-preview-card pdf-preview">
          <iframe src={fullUrl} title={name} />
          <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="preview-label" title={name}>
            <i className="fas fa-external-link-alt mr-1"></i> {name}
          </a>
        </div>
      );
    }

    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="file-preview-card generic-file">
        <i className="fas fa-file-alt"></i>
        <span style={{ maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <div className="preview-label">Click to Open / Download</div>
      </a>
    );
  };

  // Helpers for assignment status checks
  const getEffectiveSubmission = (a: Assignment): Submission | null => {
    return a.submissions && a.submissions.length > 0 ? a.submissions[0] : null;
  };

  const isGradedAndReleased = (a: Assignment): boolean => {
    const sub = getEffectiveSubmission(a);
    if (!sub) return false;
    return sub.gradesReleased === true && (sub.grade !== null && sub.grade !== undefined || sub.autoScore !== null && sub.autoScore !== undefined);
  };

  const isOverdue = (a: Assignment): boolean => {
    const sub = getEffectiveSubmission(a);
    if (sub) return false;
    return new Date(a.dueDate) < new Date();
  };

  // Filter calculations
  const totalCount = assignments.length;
  const pendingCount = assignments.filter(a => a.submissions.length === 0).length;
  const submittedCount = assignments.filter(a => a.submissions.length > 0 && !isGradedAndReleased(a)).length;
  const gradedCount = assignments.filter(a => a.submissions.length > 0 && isGradedAndReleased(a)).length;

  const uniqueSubjects = useMemo(() => {
    const subs = new Set<string>();
    assignments.forEach(a => {
      if (a.subject?.name) subs.add(a.subject.name);
    });
    return Array.from(subs);
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const sub = getEffectiveSubmission(a);
      const isGraded = isGradedAndReleased(a);

      // 1. Tab filter
      if (filterTab === 'PENDING' && a.submissions.length > 0) return false;
      if (filterTab === 'SUBMITTED' && (a.submissions.length === 0 || isGraded)) return false;
      if (filterTab === 'GRADED' && (!sub || !isGraded)) return false;

      // 2. Subject filter
      if (subjectFilter && a.subject?.name !== subjectFilter) return false;

      // 3. Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = a.title.toLowerCase().includes(query);
        const matchesSubject = a.subject?.name?.toLowerCase().includes(query) || false;
        const matchesTeacher = a.teacher?.user?.name?.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesSubject && !matchesTeacher) return false;
      }

      return true;
    });
  }, [assignments, filterTab, subjectFilter, searchTerm]);

  const startQuiz = async () => {
    if (!selectedAssignment) return;
    try {
      const { data } = await api.post(`/api/students/assignments/${selectedAssignment.id}/start`);
      if (selectedAssignment.timeLimit) {
        const start = new Date(data.startedAt).getTime();
        const limitMs = selectedAssignment.timeLimit * 60000;
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
        setTimeLeft(remaining);
      }
      setQuizStarted(true);
    } catch {
      showToast('Failed to start assessment', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      // Enforce 30MB limit per file
      const oversized = selected.filter(f => f.size > 30 * 1024 * 1024);
      if (oversized.length > 0) {
        showToast(`Files cannot exceed 30MB each: ${oversized.map(f => f.name).join(', ')}`, 'error');
        return;
      }
      if (files.length + selected.length > 10) {
        showToast('You can attach a maximum of 10 files per submission.', 'error');
        return;
      }
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    if (files.length === 0 && !submissionText.trim()) {
      return showToast('Please enter your response text or attach at least one file.', 'error');
    }

    setSubmitting(true);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (submissionText.trim()) {
      formData.append('submissionText', submissionText.trim());
    }

    try {
      await api.post(`/api/students/assignments/${selectedAssignment.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(isResubmitting ? 'Work resubmitted successfully!' : 'Work submitted successfully!', 'success');
      closeModal();
      await fetchAssignments();
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
      showToast('Assessment submitted successfully!', 'success');
      closeModal();
      await fetchAssignments();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit assessment', 'error');
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
    setSubmissionText('');
    setIsResubmitting(false);
    setShowHistory(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getStatusBadge = (a: Assignment) => {
    const submission = getEffectiveSubmission(a);
    const isSubmitted = !!submission;
    const isGraded = isGradedAndReleased(a);
    const overdue = isOverdue(a);

    if (isGraded) {
      const score = submission!.grade ?? submission!.autoScore;
      return (
        <span className="assignment-badge success">
          <i className="fas fa-award mr-1"></i> Graded: {score}%
        </span>
      );
    }
    if (isSubmitted) {
      return (
        <span className="assignment-badge info">
          <i className="fas fa-check-double mr-1"></i> Submitted (In Review)
        </span>
      );
    }
    if (overdue) {
      return (
        <span className="assignment-badge danger">
          <i className="fas fa-exclamation-circle mr-1"></i> Overdue
        </span>
      );
    }
    if (!a.isAccepting || a.status === 'closed') {
      return (
        <span className="assignment-badge closed">
          <i className="fas fa-lock mr-1"></i> Closed
        </span>
      );
    }
    return (
      <span className="assignment-badge warning">
        <i className="fas fa-hourglass-start mr-1"></i> Pending
      </span>
    );
  };

  const getRelativeDueNotice = (dueDateStr: string) => {
    const due = new Date(dueDateStr).getTime();
    const now = Date.now();
    const diffHours = Math.round((due - now) / (1000 * 60 * 60));

    if (diffHours < 0) {
      const diffDays = Math.abs(Math.round(diffHours / 24));
      return { text: diffDays === 0 ? 'Overdue today' : `Overdue by ${diffDays} day${diffDays > 1 ? 's' : ''}`, isDanger: true };
    }
    if (diffHours < 24) {
      return { text: diffHours === 0 ? 'Due in less than an hour' : `Due in ${diffHours} hour${diffHours > 1 ? 's' : ''}`, isWarn: true };
    }
    const diffDays = Math.round(diffHours / 24);
    return { text: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`, isNormal: true };
  };

  return (
    <div className="assignments-container">
      {/* Header */}
      <div className="portal-page-header">
        <h1>My Assignments &amp; Homework</h1>
        <p>Complete course tasks, review teacher evaluations, submit your responses, and inspect past versions.</p>
      </div>

      {/* Tabs Bar */}
      <div className="assignment-tabs-bar">
        <button
          className={`assignment-tab-btn ${filterTab === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilterTab('ALL')}
        >
          <i className="fas fa-layer-group"></i>
          All Assignments
          <span className="assignment-tab-counter">{totalCount}</span>
        </button>

        <button
          className={`assignment-tab-btn ${filterTab === 'PENDING' ? 'active' : ''}`}
          onClick={() => setFilterTab('PENDING')}
        >
          <i className="fas fa-clock text-amber-500"></i>
          Pending / Due
          <span className="assignment-tab-counter">{pendingCount}</span>
        </button>

        <button
          className={`assignment-tab-btn ${filterTab === 'SUBMITTED' ? 'active' : ''}`}
          onClick={() => setFilterTab('SUBMITTED')}
        >
          <i className="fas fa-paper-plane text-blue-500"></i>
          Submitted (Under Review)
          <span className="assignment-tab-counter">{submittedCount}</span>
        </button>

        <button
          className={`assignment-tab-btn ${filterTab === 'GRADED' ? 'active' : ''}`}
          onClick={() => setFilterTab('GRADED')}
        >
          <i className="fas fa-check-circle text-emerald-500"></i>
          Graded &amp; Released
          <span className="assignment-tab-counter">{gradedCount}</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="assignments-filter-row">
        <div className="assignment-search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by title, subject, or teacher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              &times;
            </button>
          )}
        </div>

        {uniqueSubjects.length > 0 && (
          <select
            className="portal-input"
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            style={{ minWidth: 180, padding: '8px 12px' }}
          >
            <option value="">All Subjects ({uniqueSubjects.length})</option>
            {uniqueSubjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Assignments Grid */}
      <div className="assignments-grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <SkeletonLoader type="card" count={4} />
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '4rem 1rem', textAlign: 'center' }}>
            <i className="fas fa-clipboard-check fa-3x text-gray-300 mb-3"></i>
            <h3 style={{ color: '#475569', marginBottom: '0.5rem' }}>No assignments found</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              {filterTab !== 'ALL' || searchTerm || subjectFilter
                ? 'Try adjusting your search or tab filters.'
                : 'There are currently no assignments posted for your class.'}
            </p>
          </div>
        ) : (
          filteredAssignments.map(a => {
            const sub = getEffectiveSubmission(a);
            const isGraded = isGradedAndReleased(a);
            const dueInfo = getRelativeDueNotice(a.dueDate);
            const typeLabel = (a.type || a.category || 'homework').toLowerCase();

            return (
              <div
                key={a.id}
                className="assignment-card"
                onClick={() => {
                  setSelectedAssignment(a);
                  setIsResubmitting(false);
                  setShowHistory(false);
                }}
              >
                <div className="assignment-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`type-pill ${typeLabel}`}>
                      {typeLabel.replace('_', ' ')}
                    </span>
                    {a.subject?.name && (
                      <span className="subject-tag">{a.subject.name}</span>
                    )}
                  </div>
                  {getStatusBadge(a)}
                </div>

                <h3 className="assignment-title">{a.title}</h3>

                {a.teacher?.user?.name && (
                  <div className="assignment-teacher-name">
                    <i className="fas fa-chalkboard-teacher"></i>
                    <span>{a.teacher.user.name}</span>
                  </div>
                )}

                <div className="assignment-meta">
                  <span>
                    <i className="far fa-calendar-alt"></i>
                    Due {new Date(a.dueDate).toLocaleDateString()} at {new Date(a.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {!sub && (
                    <span style={{
                      fontWeight: 600,
                      color: dueInfo.isDanger ? '#dc2626' : dueInfo.isWarn ? '#d97706' : '#2563eb'
                    }}>
                      <i className={dueInfo.isDanger ? 'fas fa-exclamation-triangle' : 'far fa-clock'}></i>
                      {dueInfo.text}
                    </span>
                  )}

                  {!a.isAccepting && (
                    <span className="text-danger" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      <i className="fas fa-lock"></i> Submissions Closed
                    </span>
                  )}
                </div>

                <div className="assignment-card-tags">
                  {a.allowResubmission !== false && (
                    <span className="tag-item" title="Resubmission allowed before deadline">
                      <i className="fas fa-redo-alt text-blue-500"></i> Resubmissions Allowed
                    </span>
                  )}
                  {a.latePenaltyPercent && a.latePenaltyPercent > 0 ? (
                    <span className="tag-item penalty" title={`Late submissions subject to -${a.latePenaltyPercent}% deduction`}>
                      <i className="fas fa-percentage"></i> -{a.latePenaltyPercent}% Late Deduction
                    </span>
                  ) : null}
                  {a.totalMarks ? (
                    <span className="tag-item">
                      <i className="fas fa-star text-amber-500"></i> {a.totalMarks} Marks
                    </span>
                  ) : null}
                </div>

                <button
                  className="view-btn"
                  style={{ marginTop: '1rem' }}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedAssignment(a);
                    setIsResubmitting(false);
                    setShowHistory(false);
                  }}
                >
                  {isGraded ? (
                    <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-award"></i> View Evaluation
                    </span>
                  ) : sub ? (
                    <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-check-circle"></i> View My Submission
                    </span>
                  ) : a.questions ? (
                    <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-pen-alt"></i> Take Quiz / Test
                    </span>
                  ) : (
                    <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fas fa-paper-plane"></i> Submit Work
                    </span>
                  )}
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Detail & Submission Modal */}
      {selectedAssignment && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="assignment-modal" onClick={e => e.stopPropagation()}>
            <button className="close-modal" onClick={closeModal}>&times;</button>

            <div className="modal-scroll-area">
              {/* Modal Header */}
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className={`type-pill ${(selectedAssignment.type || selectedAssignment.category || 'homework').toLowerCase()}`}>
                    {(selectedAssignment.type || selectedAssignment.category || 'homework').replace('_', ' ')}
                  </span>
                  {selectedAssignment.subject?.name && (
                    <span className="modal-subject">{selectedAssignment.subject.name}</span>
                  )}
                  {getStatusBadge(selectedAssignment)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>{selectedAssignment.title}</h2>
                  {timeLeft !== null && (
                    <div className={`timer-box ${timeLeft < 60 ? 'critical' : ''}`}>
                      <i className="fas fa-hourglass-half"></i> {formatTime(timeLeft)}
                    </div>
                  )}
                </div>

                <div className="modal-meta" style={{ flexWrap: 'wrap' }}>
                  {selectedAssignment.teacher?.user?.name && (
                    <span><i className="fas fa-chalkboard-teacher"></i> Teacher: {selectedAssignment.teacher.user.name}</span>
                  )}
                  <span><i className="fas fa-clock"></i> Deadline: {new Date(selectedAssignment.dueDate).toLocaleString()}</span>
                  <span><i className="fas fa-star"></i> Max Score: {selectedAssignment.totalMarks || 100} pts</span>
                  {selectedAssignment.timeLimit && (
                    <span><i className="fas fa-stopwatch"></i> Limit: {selectedAssignment.timeLimit} mins</span>
                  )}
                  {selectedAssignment.allowLate && (
                    <span><i className="fas fa-calendar-check"></i> Late Submissions: Allowed {selectedAssignment.latePenaltyPercent ? `(-${selectedAssignment.latePenaltyPercent}%)` : ''}</span>
                  )}
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
                          <span className="q-badge">Q{currentQ + 1} of {qs.length}</span>
                          {qs[currentQ].text}
                        </h4>
                        <p className="text-sm text-gray-500 mb-4">{qs[currentQ].points} Points</p>

                        <div className="options-grid">
                          {qs[currentQ].type === 'MCQ' && (
                            qs[currentQ].options?.map((opt, i) => (
                              <button
                                key={i}
                                className={`option-btn ${answers[qs[currentQ].id] === opt ? 'selected' : ''}`}
                                onClick={() => setAnswers({ ...answers, [qs[currentQ].id]: opt })}
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
                                onClick={() => setAnswers({ ...answers, [qs[currentQ].id]: opt })}
                              >
                                {opt}
                              </button>
                            ))
                          )}
                          {qs[currentQ].type === 'WRITTEN' && (
                            <textarea
                              className="portal-input w-full"
                              rows={5}
                              placeholder="Type your answer here..."
                              value={answers[qs[currentQ].id] || ''}
                              onChange={e => setAnswers({ ...answers, [qs[currentQ].id]: e.target.value })}
                            />
                          )}
                        </div>
                      </div>

                      <div className="quiz-navigation flex justify-between mt-8">
                        <button
                          className="portal-btn-secondary"
                          disabled={currentQ === 0}
                          onClick={() => setCurrentQ(currentQ - 1)}
                        >
                          Previous
                        </button>
                        {currentQ < qs.length - 1 ? (
                          <button className="portal-btn-primary" onClick={() => setCurrentQ(currentQ + 1)}>
                            Next Question
                          </button>
                        ) : (
                          <button
                            className="portal-btn-primary success-btn"
                            onClick={handleQuizSubmit}
                            disabled={submitting}
                          >
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
                  {/* Instructions */}
                  <div className="modal-section">
                    <h3><i className="fas fa-align-left mr-2 text-blue-600"></i>Instructions &amp; Brief</h3>
                    <div className="instruction-box">
                      {selectedAssignment.description || 'No additional instructions provided for this assignment.'}
                    </div>
                  </div>

                  {/* Teacher Attachments */}
                  {((selectedAssignment.files && selectedAssignment.files.length > 0) ||
                    (selectedAssignment.attachments && selectedAssignment.attachments.length > 0)) && (
                    <div className="modal-section">
                      <h3><i className="fas fa-paperclip mr-2 text-blue-600"></i>Teacher Resource Attachments</h3>
                      <div className="preview-gallery">
                        {(selectedAssignment.files || selectedAssignment.attachments || []).map((file, idx) => (
                          <div key={idx} className="preview-container">
                            {renderFilePreview(file.url, file.name, 'assignment')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="modal-divider"></div>

                  {/* Submission and Evaluation Section */}
                  <div className="modal-section submission-section">
                    {(() => {
                      const submission = getEffectiveSubmission(selectedAssignment);
                      const isGraded = isGradedAndReleased(selectedAssignment);
                      const priorHistory = submission?.submissionHistory || [];
                      const canResubmit = selectedAssignment.allowResubmission !== false &&
                        selectedAssignment.isAccepting &&
                        (!isOverdue(selectedAssignment) || selectedAssignment.allowLate);

                      // Case A: Work is already submitted and student is NOT currently entering resubmission mode
                      if (submission && !isResubmitting) {
                        return (
                          <div className="submitted-view">
                            {/* Evaluation Status Banner */}
                            {isGraded ? (
                              <div className="grade-result-card">
                                <div className="score-display">
                                  <div className="score-number">
                                    {submission.grade ?? submission.autoScore}%
                                  </div>
                                  <div>
                                    <h4 style={{ margin: 0, color: '#065f46' }}>Official Grade Released</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#047857' }}>
                                      Evaluated by {selectedAssignment.teacher?.user?.name || 'Class Teacher'}
                                    </p>
                                  </div>
                                </div>
                                <span className="assignment-badge success" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                                  <i className="fas fa-check-circle mr-1"></i> Recorded on Continuous Assessment
                                </span>
                              </div>
                            ) : (
                              <div className="grade-holding-alert">
                                <i className="fas fa-shield-alt"></i>
                                <div>
                                  <h4 style={{ margin: '0 0 4px', fontWeight: 700 }}>Submission Recorded &bull; Pending Teacher Evaluation</h4>
                                  <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
                                    Your response is safely recorded. Official marks and individual feedback will appear here as soon as the teacher releases grades to the class.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Teacher Feedback Quote (if published) */}
                            {isGraded && submission.feedback && (
                              <div className="teacher-feedback mb-4">
                                <div className="feedback-header">
                                  <h5><i className="fas fa-comment-dots mr-2"></i>Teacher Comments &amp; Feedback:</h5>
                                </div>
                                <blockquote>"{submission.feedback}"</blockquote>
                              </div>
                            )}

                            {/* Submission Record Details */}
                            <div className="submission-status-card">
                              <i className="fas fa-check-circle"></i>
                              <div style={{ flex: 1 }}>
                                <h4>
                                  Current Submission (Version {priorHistory.length + 1})
                                </h4>
                                <p>
                                  Submitted on {new Date(submission.submittedAt).toLocaleString()} &bull;{' '}
                                  Status: <strong>{submission.status}</strong>
                                </p>
                              </div>
                            </div>

                            {/* Submitted Typed Response */}
                            {submission.submissionText && (
                              <div style={{ marginTop: '1.25rem' }}>
                                <h5 style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                                  <i className="fas fa-align-left mr-2 text-blue-600"></i>Your Written Response:
                                </h5>
                                <div className="submission-text-card">
                                  {submission.submissionText}
                                </div>
                              </div>
                            )}

                            {/* Submitted Quiz Answers (if quiz) */}
                            {submission.attachments &&
                              typeof submission.attachments === 'object' &&
                              !Array.isArray(submission.attachments) &&
                              submission.attachments.answers && (
                                <div className="quiz-recap mt-4">
                                  <h5>Quiz Responses:</h5>
                                  <div className="text-sm p-3 bg-gray-50 rounded border">
                                    {Object.entries(submission.attachments.answers).map(([qid, ans]: any) => (
                                      <div key={qid} className="mb-1">
                                        <strong>{qid}:</strong> {ans}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {/* Submitted Files */}
                            {Array.isArray(submission.attachments) && submission.attachments.length > 0 && (
                              <div className="submitted-files" style={{ marginTop: '1.25rem' }}>
                                <h5 style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                                  <i className="fas fa-file-download mr-2 text-blue-600"></i>Your Uploaded Files ({submission.attachments.length}):
                                </h5>
                                <div className="preview-gallery">
                                  {submission.attachments.map((f: Attachment, i: number) => (
                                    <div key={i} className="preview-container">
                                      {renderFilePreview(f.url, f.name, 'submission')}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Version History Accordion */}
                            {priorHistory.length > 0 && (
                              <div className="history-toggle-card">
                                <div
                                  className="history-toggle-header"
                                  onClick={() => setShowHistory(prev => !prev)}
                                >
                                  <span>
                                    <i className="fas fa-history mr-2 text-indigo-500"></i>
                                    Submission History ({priorHistory.length} previous version{priorHistory.length > 1 ? 's' : ''})
                                  </span>
                                  <i className={`fas fa-chevron-${showHistory ? 'up' : 'down'}`}></i>
                                </div>

                                {showHistory && (
                                  <div className="history-list">
                                    {priorHistory.map((ver, idx) => (
                                      <div key={idx} className="history-item-card">
                                        <div className="history-version-header">
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="version-pill">Version {ver.version || idx + 1}</span>
                                            <span style={{ color: '#64748b' }}>
                                              {new Date(ver.submittedAt).toLocaleString()}
                                            </span>
                                          </div>
                                          {ver.grade !== undefined && ver.grade !== null && (
                                            <span className="assignment-badge success">Score: {ver.grade}%</span>
                                          )}
                                        </div>

                                        {ver.submissionText && (
                                          <div style={{ fontSize: '0.875rem', color: '#334155', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                                            <strong>Written text:</strong> {ver.submissionText}
                                          </div>
                                        )}

                                        {ver.files && ver.files.length > 0 && (
                                          <div style={{ marginTop: '0.5rem' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                                              Files ({ver.files.length}):
                                            </div>
                                            <div className="preview-gallery">
                                              {ver.files.map((vf, vfi) => (
                                                <div key={vfi} className="preview-container">
                                                  {renderFilePreview(vf.url, vf.name, 'submission')}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Resubmission Banner / Trigger */}
                            {canResubmit && !selectedAssignment.questions && (
                              <div className="resubmit-panel">
                                <div>
                                  <h4 style={{ margin: '0 0 4px', color: '#1e293b' }}>
                                    Need to update or correct your work?
                                  </h4>
                                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                                    Resubmission is enabled by your teacher. Submitting new files or text will create Version {priorHistory.length + 2}.
                                  </p>
                                </div>
                                <button
                                  className="portal-btn-primary"
                                  onClick={() => {
                                    setIsResubmitting(true);
                                    setFiles([]);
                                    setSubmissionText(submission.submissionText || '');
                                  }}
                                  style={{ background: '#4338ca', color: 'white', padding: '9px 18px', borderRadius: 8, fontWeight: 600 }}
                                >
                                  <i className="fas fa-redo-alt mr-2"></i> Resubmit Assignment
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Case B: Closed / locked assignment with no submission
                      if (!selectedAssignment.isAccepting || (isOverdue(selectedAssignment) && !selectedAssignment.allowLate)) {
                        return (
                          <div className="locked-state">
                            <i className="fas fa-lock fa-3x"></i>
                            <h4>Submissions are Closed</h4>
                            <p>
                              This assignment is no longer accepting submissions. Contact your teacher if you believe this is a mistake.
                            </p>
                          </div>
                        );
                      }

                      // Case C: New submission OR active Resubmission form
                      return (
                        <div className="upload-view">
                          {selectedAssignment.questions ? (
                            <div className="quiz-prompt">
                              <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#78350f', marginBottom: '0.5rem' }}>
                                This is an online assessment ({selectedAssignment.questions.length} questions).
                              </p>
                              <p style={{ fontSize: '0.9rem', color: '#92400e', marginBottom: '1.5rem' }}>
                                {selectedAssignment.timeLimit
                                  ? `Once you click "Start Assessment", a countdown timer of ${selectedAssignment.timeLimit} minutes will begin.`
                                  : 'Take your time to answer each question carefully before submitting.'}
                              </p>
                              <button className="portal-btn-primary" onClick={startQuiz}>
                                <i className="fas fa-play" style={{ marginRight: 8 }}></i> Start Assessment
                              </button>
                            </div>
                          ) : (
                            <>
                              {isResubmitting && (
                                <div className="resubmit-badge-notice">
                                  <span>
                                    <i className="fas fa-info-circle mr-2"></i>
                                    Preparing Resubmission (Version {priorHistory.length + 2}). Your earlier submission will be preserved in history.
                                  </span>
                                  <button
                                    onClick={() => setIsResubmitting(false)}
                                    style={{ background: 'none', border: 'none', color: '#1e40af', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}

                              {/* Written Text Field */}
                              <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                  <i className="fas fa-keyboard mr-2 text-blue-600"></i>
                                  Written Response / Notes (Optional if uploading files)
                                </label>
                                <textarea
                                  className="portal-input"
                                  rows={5}
                                  placeholder="Type or paste your response, essay, formulas, or notes to the teacher here..."
                                  value={submissionText}
                                  onChange={e => setSubmissionText(e.target.value)}
                                  style={{ width: '100%', resize: 'vertical' }}
                                />
                              </div>

                              {/* File Upload Zone */}
                              <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                                  <i className="fas fa-file-upload mr-2 text-blue-600"></i>
                                  Upload Response Files or Pictures
                                </label>
                                <div className="file-upload-zone">
                                  <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp"
                                    onChange={handleFileChange}
                                    id="file-upload"
                                  />
                                  <label htmlFor="file-upload">
                                    <i className="fas fa-cloud-upload-alt text-blue-600"></i>
                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                      Click to select files or drag and drop
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                      Supports PDF, Word, Excel, PowerPoint, Text, and Images (Max 30MB each, up to 10 files)
                                    </span>
                                  </label>
                                </div>

                                {files.length > 0 && (
                                  <div style={{ marginTop: '1rem' }}>
                                    <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                      Selected Files ({files.length}):
                                    </h5>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                      {files.map((f, i) => (
                                        <div key={i} className="selected-file-chip">
                                          <i className="fas fa-paperclip text-blue-500"></i>
                                          <span>{f.name}</span>
                                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                            ({(f.size / 1024 / 1024).toFixed(2)} MB)
                                          </span>
                                          <button
                                            type="button"
                                            className="file-remove-btn"
                                            onClick={() => handleRemoveFile(i)}
                                            title="Remove file"
                                          >
                                            &times;
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!quizStarted && (
              <div className="modal-footer">
                <button className="cancel-btn" onClick={closeModal}>
                  Close
                </button>

                {/* Submit button when in submission / resubmission mode */}
                {(!getEffectiveSubmission(selectedAssignment) || isResubmitting) &&
                  !selectedAssignment.questions &&
                  selectedAssignment.isAccepting && (
                    <button
                      className="submit-btn"
                      onClick={handleSubmit}
                      disabled={submitting || (files.length === 0 && !submissionText.trim())}
                      style={{
                        background: isResubmitting ? '#4338ca' : '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {submitting ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> Submitting...
                        </>
                      ) : isResubmitting ? (
                        <>
                          <i className="fas fa-redo-alt"></i> Confirm Resubmission
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane"></i> Submit Assignment
                        </>
                      )}
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
