import { useEffect, useState } from 'react';
import { PaginatedTable } from '../../../components/shared/Pagination';
import { useSearchParams } from 'react-router-dom';
import api, { BASE_URL } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import SkeletonLoader from '../../../components/shared/SkeletonLoader';

interface Attachment {
  name: string;
  url: string;
}

interface SubmissionHistoryItem {
  version: number;
  submittedAt: string;
  files?: Attachment[];
  submissionText?: string;
  grade?: number;
  feedback?: string;
  status: string;
}

interface Submission {
  id: string;
  studentId: string;
  student: { 
    id: string;
    studentId: string;
    name?: string;
    class?: { name: string };
    user: { name: string; email?: string; avatar?: string };
  };
  submittedAt: string;
  attachments?: Attachment[] | Record<string, string>;
  submissionText?: string;
  submissionHistory?: SubmissionHistoryItem[];
  answers?: Record<string, string>;
  status: string;
  isLate?: boolean;
  latePenaltyPercent?: number;
  grade?: number;
  autoScore?: number;
  feedback?: string;
  isResubmission?: boolean;
}

export default function TeacherAssignmentSubmissions() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignment');
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeData, setGradeData] = useState({ grade: '', feedback: '' });
  const [releasing, setReleasing] = useState(false);
  const [applyingBulkZero, setApplyingBulkZero] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<Submission | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    if (assignmentId) {
      fetchData();
    }
  }, [assignmentId]);

  const fetchData = async () => {
    try {
      const [subsRes, assignRes] = await Promise.all([
        api.get(`/api/teachers/assignments/${assignmentId}/submissions`),
        api.get(`/api/teachers/assignments/${assignmentId}`)
      ]);
      setSubmissions(Array.isArray(subsRes.data) ? subsRes.data : []);
      setAssignment(assignRes.data);
    } catch (err) {
      console.error("Fetch submissions error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      const rawGrade = parseFloat(gradeData.grade);
      const isLate = selectedSubmission.isLate;
      const penalty = (isLate && (assignment?.latePenaltyPercent || 0) > 0) ? assignment.latePenaltyPercent : 0;
      const penaltyDeduction = penalty > 0 ? (rawGrade * (penalty / 100)) : 0;
      const finalGrade = Math.max(0, Math.round((rawGrade - penaltyDeduction) * 10) / 10);

      await api.post(`/api/teachers/submissions/${selectedSubmission.id}/grade`, {
        grade: rawGrade,
        penaltyApplied: penaltyDeduction,
        finalGrade: penaltyDeduction > 0 ? finalGrade : rawGrade,
        feedback: gradeData.feedback
      });

      showToast(`Grade recorded for ${selectedSubmission.student?.user?.name || selectedSubmission.student?.name}`, 'success');
      setSelectedSubmission(null);
      fetchData();
    } catch (err) {
      showToast('Failed to record grade', 'error');
    }
  };

  const handleReleaseGrades = async () => {
    if (!assignmentId) return;
    const confirmRelease = window.confirm(
      `Are you sure you want to release grades for "${assignment?.title}"?\n\nThis will publish grades to all learners and synchronize scores into Continuous Assessment.`
    );
    if (!confirmRelease) return;

    setReleasing(true);
    try {
      const res = await api.post(`/api/teachers/assignments/${assignmentId}/release-grades`);
      showToast(res.data?.message || 'Grades released to learners successfully!', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to release grades', 'error');
    } finally {
      setReleasing(false);
    }
  };

  const handleBulkZero = async () => {
    if (!assignmentId) return;
    const confirmBulk = window.confirm(
      'Assign 0 marks to all learners who did not submit work before the deadline?'
    );
    if (!confirmBulk) return;

    setApplyingBulkZero(true);
    try {
      const res = await api.post(`/api/teachers/assignments/${assignmentId}/bulk-zero-unsubmitted`);
      showToast(res.data?.message || 'Bulk 0 marks assigned successfully', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to apply bulk zero', 'error');
    } finally {
      setApplyingBulkZero(false);
    }
  };

  const resolveFileUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const clean = url.replace(/\\/g, '/').replace(/^\/+/, '');
    if (clean.startsWith('api/storage/')) return `${BASE_URL}/${clean}`;
    if (clean.includes('/')) return `${BASE_URL}/api/storage/media/${clean}`;
    return `${BASE_URL}/api/storage/media/${user?.schoolCode || 'global'}/${clean}`;
  };

  const renderFilePreview = (url: string, name: string) => {
    const fullUrl = resolveFileUrl(url);
    const ext = url.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
    const isPDF = ext === 'pdf';

    if (isImage) {
      return (
        <div style={{ height: 160, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          <img src={fullUrl} alt={name} style={{ width: '100%', height: '130px', objectFit: 'cover' }} />
          <div style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        </div>
      );
    }

    if (isPDF) {
      return (
        <div style={{ height: 220, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          <iframe src={fullUrl} title={name} style={{ width: '100%', height: '190px', border: 'none' }} />
          <div style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#475569' }}>{name}</div>
        </div>
      );
    }

    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'center', textDecoration: 'none', color: '#1e293b' }}>
        <i className="fas fa-file-download" style={{ fontSize: '1.8rem', color: '#2563eb', marginBottom: 6, display: 'block' }}></i>
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{name}</span>
      </a>
    );
  };

  if (!assignmentId) return <div className="p-8 text-center text-slate-600">Please select an assignment first.</div>;

  const totalSubmitted = submissions.length;
  const gradedCount = submissions.filter(s => s.status === 'GRADED' && s.grade !== null).length;
  const lateCount = submissions.filter(s => s.isLate).length;
  const pendingCount = totalSubmitted - gradedCount;
  const gradesReleased = assignment?.gradesReleased === true;

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <a href="/teacher/assignments" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.85rem' }}>
              <i className="fas fa-arrow-left mr-1"></i> Back to Assignments
            </a>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#dbeafe', color: '#1d4ed8' }}>
              {assignment?.subject?.name} ({assignment?.class?.name})
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Submissions: {assignment?.title || 'Homework'}</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
            Due: {assignment?.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'No deadline'} 
            {assignment?.latePenaltyPercent > 0 && ` • Late Penalty: ${assignment.latePenaltyPercent}%`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            type="button"
            className="portal-btn-secondary"
            onClick={handleBulkZero}
            disabled={applyingBulkZero}
            style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-user-times mr-1 text-red-500"></i>
            {applyingBulkZero ? 'Assigning...' : 'Zero for Unsubmitted'}
          </button>

          <button 
            type="button"
            onClick={handleReleaseGrades}
            disabled={releasing || gradesReleased}
            className="portal-btn-primary"
            style={{ 
              background: gradesReleased ? '#16a34a' : '#2563eb', 
              borderColor: gradesReleased ? '#16a34a' : '#2563eb',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: gradesReleased ? 'default' : 'pointer'
            }}
          >
            <i className={`fas ${gradesReleased ? 'fa-check-double' : 'fa-bullhorn'} mr-2`}></i>
            {releasing ? 'Releasing...' : gradesReleased ? 'Grades Released' : 'Release Grades to Class'}
          </button>
        </div>
      </div>

      {/* Grade Holding Banner */}
      {!gradesReleased ? (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-lock text-amber-600" style={{ fontSize: '1.2rem' }}></i>
            <div>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.9rem' }}>Grades Currently Held from Students</div>
              <div style={{ color: '#b45309', fontSize: '0.8rem' }}>
                Scores and feedback are invisible to students until you click "Release Grades to Class". This allows whole-class moderation before publication.
              </div>
            </div>
          </div>
          <button 
            onClick={handleReleaseGrades}
            disabled={releasing}
            style={{ background: '#d97706', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Release Now
          </button>
        </div>
      ) : (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fas fa-check-circle text-green-600"></i>
          <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
            Grades released and published to student portal continuous assessment ledger.
          </span>
        </div>
      )}

      {/* Submission Status Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="portal-card" style={{ padding: 16, background: '#fff', borderRadius: 8 }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Submissions</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{totalSubmitted}</div>
        </div>
        <div className="portal-card" style={{ padding: 16, background: '#fff', borderRadius: 8 }}>
          <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>Graded</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', marginTop: 4 }}>
            {gradedCount}
          </div>
        </div>
        <div className="portal-card" style={{ padding: 16, background: '#fff', borderRadius: 8 }}>
          <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>Late Submissions</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>
            {lateCount}
          </div>
        </div>
        <div className="portal-card" style={{ padding: 16, background: '#fff', borderRadius: 8 }}>
          <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>Pending Grading</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c', marginTop: 4 }}>
            {pendingCount}
          </div>
        </div>
      </div>

      <div className="portal-card" style={{ marginBottom: 24, borderRadius: 10 }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h2>Submission Register ({submissions.length})</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ padding: '16px' }}>
               <SkeletonLoader type="table" rows={6} columns={7} />
             </div>
          ) : submissions.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <i className="fas fa-inbox text-3xl mb-2 block"></i>
              No student submissions recorded yet for this assignment.
            </div>
          ) : (
            <PaginatedTable className="portal-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Submission Time</th>
                  <th>Submitted Content</th>
                  <th>Timing</th>
                  <th>Status</th>
                  <th>Grade</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => {
                  const studentName = s.student?.user?.name || s.student?.name || 'Unknown Student';
                  const studentCode = s.student?.studentId || '';
                  const className = s.student?.class?.name || '';
                  const historyCount = s.submissionHistory?.length || 0;

                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{studentName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{studentCode} {className && `• ${className}`}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem', color: '#334155' }}>{new Date(s.submittedAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{new Date(s.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {historyCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowHistoryModal(s)}
                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.68rem', padding: '1px 6px', color: '#475569', marginTop: '2px', cursor: 'pointer' }}
                          >
                            <i className="fas fa-history mr-1"></i>v{historyCount + 1} (History)
                          </button>
                        )}
                      </td>
                      <td>
                        {s.submissionText && (
                          <div style={{ fontSize: '0.78rem', color: '#334155', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                            <i className="fas fa-align-left text-gray-400 mr-1"></i>"{s.submissionText}"
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {Array.isArray(s.attachments) && s.attachments.length > 0 ? (
                            s.attachments.map((file: Attachment, idx: number) => (
                              <a 
                                key={idx} 
                                href={resolveFileUrl(file.url)} 
                                target="_blank" 
                                rel="noreferrer" 
                                style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <i className="fas fa-paperclip"></i>
                                <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                              </a>
                            ))
                          ) : s.answers && typeof s.answers === 'object' ? (
                            <span style={{ color: '#4a5568', fontSize: '0.8rem', fontWeight: 600 }}>
                              <i className="fas fa-tasks text-blue-600 mr-1"></i>
                              Quiz Completed ({Object.keys(s.answers).length} answers)
                            </span>
                          ) : !s.submissionText ? (
                            <span style={{ color: '#a0aec0', fontSize: '0.8rem', fontStyle: 'italic' }}>No files attached</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        {s.isLate ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#dc2626' }}>
                            LATE {assignment?.latePenaltyPercent > 0 ? `(-${assignment.latePenaltyPercent}%)` : ''}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#dcfce7', color: '#16a34a' }}>
                            ON TIME
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`portal-badge ${s.status === 'GRADED' ? 'success' : 'info'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                        {s.grade !== null && s.grade !== undefined 
                          ? `${s.grade} / ${assignment?.maxScore || 100}` 
                          : (s.autoScore !== undefined ? `${s.autoScore}% (Auto)` : '—')}
                      </td>
                      <td>
                        <button 
                          onClick={() => {
                            setSelectedSubmission(s);
                            setGradeData({ grade: String(s.grade || ''), feedback: s.feedback || '' });
                          }}
                          className="btn btn-sm"
                          style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {s.status === 'GRADED' ? 'Edit Grade' : 'Grade Work'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </PaginatedTable>
          )}
        </div>
      </div>

      {/* GRADING MODAL */}
      {selectedSubmission && (
        <div className="portal-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="portal-card" style={{ width: '100%', maxWidth: 960, margin: 'auto', maxHeight: '92vh', overflowY: 'auto', borderRadius: 12 }}>
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '16px 20px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Grade Work: {selectedSubmission.student?.user?.name || selectedSubmission.student?.name}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Submitted {new Date(selectedSubmission.submittedAt).toLocaleString()}
                  {selectedSubmission.isLate && <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: 8 }}>(LATE)</span>}
                </div>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="close-btn" style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>

            <div className="portal-card-body" style={{ padding: 0, display: 'grid', gridTemplateColumns: '1fr 360px' }}>
              {/* Left Column: Submission content */}
              <div style={{ padding: 20, borderRight: '1px solid #e2e8f0', background: '#f8fafc', overflowY: 'auto', maxHeight: '72vh' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 700, marginBottom: 12 }}>Submitted Work</h3>
                
                {selectedSubmission.submissionText && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Written Response:</div>
                    <div style={{ fontSize: '0.88rem', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {selectedSubmission.submissionText}
                    </div>
                  </div>
                )}

                {/* Attachments preview */}
                {Array.isArray(selectedSubmission.attachments) && selectedSubmission.attachments.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
                    {selectedSubmission.attachments.map((f: any, i: number) => (
                      <div key={i} className="preview-container">
                        {renderFilePreview(f.url, f.name)}
                      </div>
                    ))}
                  </div>
                ) : !selectedSubmission.submissionText && !selectedSubmission.answers ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No uploaded files or text found.</div>
                ) : null}

                {/* Quiz Answers Review */}
                {selectedSubmission.answers && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: 700 }}>Quiz Responses:</h4>
                    {assignment?.questions?.map((q: any, idx: number) => {
                      const studentAns = selectedSubmission.answers?.[q.id];
                      const isCorrect = studentAns === q.answer;
                      return (
                        <div key={q.id} style={{ marginBottom: 10, padding: 10, borderRadius: 6, border: `1px solid ${isCorrect ? '#bbf7d0' : '#fecaca'}`, background: isCorrect ? '#f0fdf4' : '#fef2f2' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{idx + 1}. {q.text}</div>
                          <div style={{ fontSize: '0.78rem', marginTop: 4 }}>
                            Learner's Answer: <strong style={{ color: isCorrect ? '#166534' : '#dc2626' }}>{studentAns || '(Blank)'}</strong>
                          </div>
                          {!isCorrect && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>Correct Answer: {q.answer}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Grading form */}
              <form onSubmit={handleGrade} style={{ padding: 20, background: '#fff' }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Score / Marks (out of {assignment?.maxScore || 100})
                  </label>
                  <input 
                    type="number"
                    required
                    min={0}
                    max={assignment?.maxScore || 100}
                    step={0.5}
                    className="portal-input w-full" 
                    value={gradeData.grade} 
                    onChange={e => setGradeData({...gradeData, grade: e.target.value})}
                    placeholder="e.g. 85"
                    style={{ padding: '8px 12px', fontSize: '1rem', fontWeight: 700 }}
                  />
                  {selectedSubmission.isLate && (assignment?.latePenaltyPercent || 0) > 0 && gradeData.grade && (
                    <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#dc2626', background: '#fee2e2', padding: '4px 8px', borderRadius: 4 }}>
                      <i className="fas fa-exclamation-circle mr-1"></i>
                      Late submission: {assignment.latePenaltyPercent}% penalty will adjust final score to {(parseFloat(gradeData.grade) * (1 - assignment.latePenaltyPercent / 100)).toFixed(1)}.
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                    Teacher Feedback &amp; Correction Notes
                  </label>
                  <textarea 
                    className="portal-input w-full"
                    rows={8}
                    value={gradeData.feedback}
                    onChange={e => setGradeData({...gradeData, feedback: e.target.value})}
                    placeholder="Provide constructive feedback for the student..."
                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setSelectedSubmission(null)} className="portal-btn-secondary" style={{ padding: '8px 14px' }}>
                    Cancel
                  </button>
                  <button type="submit" className="portal-btn-primary" style={{ padding: '8px 18px', background: '#2563eb' }}>
                    Save Grade
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {showHistoryModal && (
        <div className="portal-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="portal-card" style={{ width: '100%', maxWidth: 640, margin: 'auto', maxHeight: '80vh', overflowY: 'auto', borderRadius: 10 }}>
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                Submission History: {showHistoryModal.student?.user?.name || showHistoryModal.student?.name}
              </h3>
              <button onClick={() => setShowHistoryModal(null)} className="close-btn" style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
                Prior versions submitted by this student before their latest attempt:
              </p>
              {showHistoryModal.submissionHistory && showHistoryModal.submissionHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {showHistoryModal.submissionHistory.map((h, i) => (
                    <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>Version #{h.version || i + 1}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(h.submittedAt).toLocaleString()}</span>
                      </div>
                      {h.submissionText && (
                        <div style={{ fontSize: '0.8rem', color: '#334155', fontStyle: 'italic', marginBottom: 6 }}>
                          "{h.submissionText}"
                        </div>
                      )}
                      {h.files && h.files.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {h.files.map((f: any, fIdx: number) => (
                            <a 
                              key={fIdx} 
                              href={resolveFileUrl(f.url)} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#1e293b', padding: '2px 6px', borderRadius: 4, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <i className="fas fa-paperclip"></i>{f.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No previous versions recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
