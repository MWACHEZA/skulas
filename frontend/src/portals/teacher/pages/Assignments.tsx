import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  isAccepting: boolean;
  category: string;
  type?: string;
  status?: string;
  allowResubmission?: boolean;
  latePenaltyPercent?: number;
  targetType?: string;
  targetStudentIds?: string[];
  includeInTermReport?: boolean;
  term?: string;
  gradesReleased?: boolean;
  gradesReleasedAt?: string | null;
  class: { id: string; name: string; _count?: { students: number } };
  subject: { id: string; name: string };
  totalTargetCount?: number;
  submittedCount?: number;
  gradedCount?: number;
  files?: Array<{ name: string; url: string }>;
  _count: { submissions: number };
}

interface Question {
  id: string;
  type: 'MCQ' | 'TF' | 'WRITTEN';
  text: string;
  options?: string[];
  answer: string;
  points: number;
}

interface StudentOption {
  id: string;
  name: string;
  studentId: string;
}

export default function TeacherAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Form state
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    classId: '',
    subjectId: '',
    dueDate: '',
    dueTime: '23:59',
    maxScore: 100,
    type: 'homework',
    category: 'ASSIGNMENT',
    targetType: 'class', // 'class' | 'student'
    targetStudentIds: [] as string[],
    allowLate: true,
    latePenaltyPercent: 10,
    allowResubmission: true,
    includeInTermReport: true,
    term: 'Term 1',
    status: 'published', // 'published' | 'draft'
    timeLimit: 0
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignmentFiles, setAssignmentFiles] = useState<File[]>([]);
  
  const { showToast } = useToast();

  useEffect(() => {
    fetchAssignments();
    fetchMetadata();
  }, []);

  // When class changes in form, load students if needed
  useEffect(() => {
    if (newAssignment.classId && newAssignment.targetType === 'student') {
      fetchClassStudents(newAssignment.classId);
    }
  }, [newAssignment.classId, newAssignment.targetType]);

  const fetchAssignments = async () => {
    try {
      const { data } = await api.get('/api/teachers/assignments');
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [clsRes, subRes] = await Promise.all([
        api.get('/api/teachers/my-classes').catch(() => ({ data: [] })),
        api.get('/api/subjects').catch(() => ({ data: [] }))
      ]);
      setClasses(Array.isArray(clsRes.data) ? clsRes.data : []);
      setSubjects(Array.isArray(subRes.data) ? subRes.data : []);
    } catch (err) {
      console.error('Failed to fetch metadata', err);
    }
  };

  const fetchClassStudents = async (classId: string) => {
    setLoadingStudents(true);
    try {
      const res = await api.get(`/api/students?classId=${classId}&limit=100`);
      const list = res.data?.students || (Array.isArray(res.data) ? res.data : []);
      setClassStudents(list);
    } catch {
      setClassStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.classId || !newAssignment.subjectId) {
      showToast('Please select target class and subject', 'warning');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', newAssignment.title);
      formData.append('description', newAssignment.description || '');
      formData.append('classId', newAssignment.classId);
      formData.append('subjectId', newAssignment.subjectId);

      // Combine date and time
      const combinedDateTime = newAssignment.dueDate 
        ? `${newAssignment.dueDate}T${newAssignment.dueTime || '23:59'}:00`
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      formData.append('dueDate', combinedDateTime);

      formData.append('maxScore', String(newAssignment.maxScore));
      formData.append('type', newAssignment.type);
      formData.append('category', newAssignment.type === 'quiz' ? 'QUIZ' : 'ASSIGNMENT');
      formData.append('targetType', newAssignment.targetType);
      formData.append('targetStudentIds', JSON.stringify(newAssignment.targetStudentIds));
      formData.append('allowLate', String(newAssignment.allowLate));
      formData.append('latePenaltyPercent', String(newAssignment.latePenaltyPercent));
      formData.append('allowResubmission', String(newAssignment.allowResubmission));
      formData.append('includeInTermReport', String(newAssignment.includeInTermReport));
      formData.append('term', newAssignment.term);
      formData.append('status', newAssignment.status);
      formData.append('timeLimit', String(newAssignment.timeLimit || 0));

      if (newAssignment.type === 'quiz' || questions.length > 0) {
        formData.append('questions', JSON.stringify(questions));
      }

      assignmentFiles.forEach(file => {
        formData.append('files', file);
      });

      await api.post('/api/teachers/assignments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      showToast(
        newAssignment.status === 'draft' 
          ? 'Assignment saved as Draft' 
          : 'Assignment published to students successfully!', 
        'success'
      );
      setShowModal(false);
      resetForm();
      fetchAssignments();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create assignment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewAssignment({
      title: '',
      description: '',
      classId: '',
      subjectId: '',
      dueDate: '',
      dueTime: '23:59',
      maxScore: 100,
      type: 'homework',
      category: 'ASSIGNMENT',
      targetType: 'class',
      targetStudentIds: [],
      allowLate: true,
      latePenaltyPercent: 10,
      allowResubmission: true,
      includeInTermReport: true,
      term: 'Term 1',
      status: 'published',
      timeLimit: 0
    });
    setQuestions([]);
    setAssignmentFiles([]);
  };

  const toggleAccepting = async (id: string, current: boolean) => {
    try {
      await api.patch(`/api/teachers/assignments/${id}/toggle-status`, { isAccepting: !current });
      showToast(current ? 'Submissions closed' : 'Submissions opened', 'info');
      fetchAssignments();
    } catch {
      showToast('Failed to change status', 'error');
    }
  };

  const addQuestion = () => {
    const newQ: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'MCQ',
      text: '',
      options: ['', '', '', ''],
      answer: '',
      points: 10
    };
    setQuestions([...questions, newQ]);
  };

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Homework &amp; Assignments</h1>
          <p>Assign tasks, review student submissions, hold and release grades, and sync with Continuous Assessment.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="portal-btn-primary"
          style={{ padding: '9px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className="fas fa-plus"></i> Create Assignment
        </button>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><i className="fas fa-tasks mr-2 text-blue-600"></i>Assignment Register ({assignments.length})</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}><i className="fas fa-spinner fa-spin mr-2"></i> Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <i className="fas fa-book-open" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: 16 }}></i>
              <h3 style={{ color: '#1e293b', marginBottom: 6 }}>No Assignments Created Yet</h3>
              <p style={{ maxWidth: 420, margin: '0 auto 20px' }}>Create homework, class projects, or quizzes to assign work to your learners.</p>
              <button onClick={() => setShowModal(true)} className="portal-btn-primary" style={{ padding: '8px 16px', background: '#2563eb' }}>
                + Hand Out First Assignment
              </button>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Type &amp; Title</th>
                  <th>Subject &amp; Class</th>
                  <th>Target Scope</th>
                  <th>Due Date</th>
                  <th>Submissions</th>
                  <th>Grades Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => {
                  const isOverdue = a.dueDate ? new Date(a.dueDate) < new Date() : false;
                  const targetCount = a.totalTargetCount || a.class?._count?.students || 0;
                  const submittedCount = a.submittedCount ?? a._count?.submissions ?? 0;
                  const gradedCount = a.gradedCount ?? 0;
                  const typeLabel = (a.type || a.category || 'homework').toUpperCase();

                  const typeBadgeColor = 
                    typeLabel.includes('HOMEWORK') ? '#2563eb' :
                    typeLabel.includes('PROJECT') ? '#7c3aed' :
                    typeLabel.includes('QUIZ') ? '#0891b2' :
                    typeLabel.includes('CLASSWORK') ? '#059669' : '#d97706';

                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: `${typeBadgeColor}15`, color: typeBadgeColor, border: `1px solid ${typeBadgeColor}33` }}>
                            {typeLabel}
                          </span>
                          {a.status === 'draft' && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309' }}>
                              DRAFT
                            </span>
                          )}
                          {!a.isAccepting && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626' }}>
                              CLOSED
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>{a.title}</div>
                        {a.includeInTermReport && (
                          <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '2px' }}>
                            <i className="fas fa-check-circle mr-1"></i>Linked to Continuous Assessment ({a.term || 'Term 1'})
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{a.subject?.name || 'Subject'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{a.class?.name || 'All Classes'}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                          {a.targetType === 'student' ? (
                            <span><i className="fas fa-user-tag text-purple-600 mr-1"></i>{a.targetStudentIds?.length || 0} Learners</span>
                          ) : (
                            <span><i className="fas fa-users text-blue-600 mr-1"></i>Whole Class ({targetCount})</span>
                          )}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isOverdue ? '#dc2626' : '#1e293b' }}>
                          {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No date'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {a.dueDate ? new Date(a.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                            {submittedCount} / {targetCount}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            ({targetCount > 0 ? Math.round((submittedCount / targetCount) * 100) : 0}%)
                          </span>
                        </div>
                        <div style={{ height: '4px', width: '90px', background: '#e2e8f0', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${targetCount > 0 ? Math.min(100, Math.round((submittedCount / targetCount) * 100)) : 0}%`,
                            background: '#2563eb'
                          }} />
                        </div>
                      </td>
                      <td>
                        {a.gradesReleased ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fas fa-check-double"></i> Grades Released
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fas fa-clock"></i> {gradedCount}/{submittedCount} Graded (Held)
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button 
                            onClick={() => window.location.href = `/teacher/submissions?assignment=${a.id}`}
                            className="btn btn-sm"
                            style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            <i className="fas fa-pen-alt mr-1"></i> Grade &amp; Review
                          </button>
                          <button 
                            onClick={() => toggleAccepting(a.id, a.isAccepting)}
                            title={a.isAccepting ? "Lock submissions" : "Open submissions"}
                            style={{ background: 'none', border: 'none', color: a.isAccepting ? '#16a34a' : '#dc2626', cursor: 'pointer', padding: '4px' }}
                          >
                            <i className={a.isAccepting ? "fas fa-lock-open" : "fas fa-lock"}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE ASSIGNMENT MODAL */}
      {showModal && (
        <div className="portal-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="portal-card" style={{ width: '100%', maxWidth: 740, margin: 'auto', maxHeight: '92vh', overflowY: 'auto', borderRadius: '12px' }}>
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', padding: '16px 20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                <i className="fas fa-plus-circle text-blue-600 mr-2"></i>Create New Assignment
              </h2>
              <button onClick={() => setShowModal(false)} className="close-btn" style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '20px' }}>
              {/* Type & Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Assignment Type</label>
                  <select
                    className="portal-input w-full"
                    value={newAssignment.type}
                    onChange={e => setNewAssignment({...newAssignment, type: e.target.value})}
                    style={{ padding: '8px 10px', borderRadius: '6px' }}
                  >
                    <option value="homework">Homework</option>
                    <option value="classwork">Classwork</option>
                    <option value="project">Project</option>
                    <option value="group_work">Group Work</option>
                    <option value="quiz">Online Quiz</option>
                    <option value="test">Periodic Test</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Assignment Title <span className="text-red-500">*</span></label>
                  <input 
                    required
                    className="portal-input w-full" 
                    value={newAssignment.title} 
                    onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                    placeholder="e.g. Linear Equations Homework #3"
                    style={{ padding: '8px 12px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              {/* Class & Subject */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Target Class <span className="text-red-500">*</span></label>
                  <select 
                    required
                    className="portal-input w-full"
                    value={newAssignment.classId}
                    onChange={e => setNewAssignment({...newAssignment, classId: e.target.value, targetStudentIds: []})}
                    style={{ padding: '8px 10px', borderRadius: '6px' }}
                  >
                    <option value="">-- Choose Class --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Subject <span className="text-red-500">*</span></label>
                  <select 
                    required
                    className="portal-input w-full"
                    value={newAssignment.subjectId}
                    onChange={e => setNewAssignment({...newAssignment, subjectId: e.target.value})}
                    style={{ padding: '8px 10px', borderRadius: '6px' }}
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Targeting Scope */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Assign To
                </label>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="targetType" 
                      checked={newAssignment.targetType === 'class'} 
                      onChange={() => setNewAssignment({...newAssignment, targetType: 'class', targetStudentIds: []})}
                    />
                    <span>Entire Class (All Learners)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="targetType" 
                      checked={newAssignment.targetType === 'student'} 
                      onChange={() => setNewAssignment({...newAssignment, targetType: 'student'})}
                    />
                    <span>Specific Selected Students</span>
                  </label>
                </div>

                {newAssignment.targetType === 'student' && (
                  <div style={{ marginTop: '10px' }}>
                    {!newAssignment.classId ? (
                      <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>Please select a class above first to load student roster.</p>
                    ) : loadingStudents ? (
                      <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}><i className="fas fa-spinner fa-spin mr-1"></i> Loading students...</p>
                    ) : (
                      <div style={{ maxHeight: '130px', overflowY: 'auto', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px' }}>
                        {classStudents.map(s => {
                          const isChecked = newAssignment.targetStudentIds.includes(s.id);
                          return (
                            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', fontSize: '0.82rem', cursor: 'pointer' }}>
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  const updated = e.target.checked 
                                    ? [...newAssignment.targetStudentIds, s.id]
                                    : newAssignment.targetStudentIds.filter(id => id !== s.id);
                                  setNewAssignment({...newAssignment, targetStudentIds: updated});
                                }}
                              />
                              <span>{s.name} ({s.studentId})</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Due Date, Time, Max Score */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Due Date <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="date"
                    className="portal-input w-full"
                    value={newAssignment.dueDate}
                    onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                    style={{ padding: '8px 12px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Due Time</label>
                  <input 
                    type="time"
                    className="portal-input w-full"
                    value={newAssignment.dueTime}
                    onChange={e => setNewAssignment({...newAssignment, dueTime: e.target.value})}
                    style={{ padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Total Marks</label>
                  <input 
                    type="number"
                    min={1}
                    className="portal-input w-full"
                    value={newAssignment.maxScore}
                    onChange={e => setNewAssignment({...newAssignment, maxScore: parseInt(e.target.value) || 100})}
                    style={{ padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
              </div>

              {/* Late Policy & Resubmission Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: '#334155' }}>
                    <input 
                      type="checkbox" 
                      checked={newAssignment.allowLate} 
                      onChange={e => setNewAssignment({...newAssignment, allowLate: e.target.checked})} 
                    />
                    <span>Allow Late Submissions</span>
                  </label>
                  {newAssignment.allowLate && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Penalty:</span>
                      <input 
                        type="number"
                        min={0}
                        max={100}
                        value={newAssignment.latePenaltyPercent}
                        onChange={e => setNewAssignment({...newAssignment, latePenaltyPercent: parseInt(e.target.value) || 0})}
                        style={{ width: '60px', padding: '3px 6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>% mark deduction</span>
                    </div>
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: '#334155' }}>
                    <input 
                      type="checkbox" 
                      checked={newAssignment.allowResubmission} 
                      onChange={e => setNewAssignment({...newAssignment, allowResubmission: e.target.checked})} 
                    />
                    <span>Allow Resubmissions</span>
                  </label>
                  <small style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', marginTop: '4px' }}>
                    Retains previous submission versions for teacher review.
                  </small>
                </div>
              </div>

              {/* Continuous Assessment Integration */}
              <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#1e40af', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={newAssignment.includeInTermReport} 
                      onChange={e => setNewAssignment({...newAssignment, includeInTermReport: e.target.checked})} 
                    />
                    <span>Include in Continuous Assessment Term Report</span>
                  </label>
                  <select
                    disabled={!newAssignment.includeInTermReport}
                    value={newAssignment.term}
                    onChange={e => setNewAssignment({...newAssignment, term: e.target.value})}
                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #93c5fd', fontSize: '0.8rem' }}
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
                <small style={{ color: '#3b82f6', fontSize: '0.75rem', display: 'block', marginTop: '4px' }}>
                  When grades are released, scores will automatically feed into the Marks Entry continuous assessment ledger.
                </small>
              </div>

              {/* File Attachments */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Teacher Attachments (Worksheets, Instructions, Reference Docs — Max 50MB)
                </label>
                <input 
                  type="file" 
                  multiple
                  className="portal-input w-full" 
                  onChange={e => setAssignmentFiles(Array.from(e.target.files || []))}
                  style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                />
                {assignmentFiles.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '4px' }}>
                    <i className="fas fa-paperclip mr-1"></i>{assignmentFiles.length} file(s) attached
                  </div>
                )}
              </div>

              {/* Instructions text */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Instructions &amp; Description</label>
                <textarea 
                  className="portal-input w-full"
                  rows={3}
                  value={newAssignment.description}
                  onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                  placeholder="Provide detailed guidance, reference chapters, or questions for learners..."
                  style={{ padding: '8px 12px', borderRadius: '6px' }}
                />
              </div>

              {/* Online Quiz Section (if Quiz selected) */}
              {newAssignment.type === 'quiz' && (
                <div style={{ padding: 15, background: '#f7fafc', borderRadius: 10, border: '1px dashed #cbd5e0', marginBottom: '16px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                     <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#1e293b' }}><i className="fas fa-question-circle mr-1 text-blue-600"></i>Online Questions ({questions.length})</h4>
                     <button type="button" onClick={addQuestion} className="portal-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>+ Add Question</button>
                   </div>
                   
                   {questions.map((q, idx) => (
                     <div key={q.id} style={{ marginBottom: 12, padding: 10, background: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                         <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Question {idx + 1}</span>
                         <select 
                           value={q.type}
                           onChange={e => {
                             const newQs = [...questions];
                             newQs[idx].type = e.target.value as any;
                             setQuestions(newQs);
                           }}
                           style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                         >
                           <option value="MCQ">Multiple Choice</option>
                           <option value="TF">True/False</option>
                           <option value="WRITTEN">Written Answer</option>
                         </select>
                       </div>
                       <input 
                         className="portal-input w-full mb-2" 
                         placeholder="Type question here..." 
                         value={q.text}
                         onChange={e => {
                           const newQs = [...questions];
                           newQs[idx].text = e.target.value;
                           setQuestions(newQs);
                         }}
                         style={{ padding: '6px 10px', fontSize: '0.85rem', marginBottom: '6px' }}
                       />
                       
                       {q.type === 'MCQ' && (
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                            {q.options?.map((opt, oIdx) => (
                              <input 
                                key={oIdx}
                                className="portal-input" 
                                placeholder={`Option ${oIdx + 1}`} 
                                value={opt}
                                onChange={e => {
                                  const newQs = [...questions];
                                  newQs[idx].options![oIdx] = e.target.value;
                                  setQuestions(newQs);
                                }}
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                              />
                            ))}
                         </div>
                       )}

                       <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                          className="portal-input" 
                          placeholder="Correct Answer" 
                          value={q.answer}
                          onChange={e => {
                            const newQs = [...questions];
                            newQs[idx].answer = e.target.value;
                            setQuestions(newQs);
                          }}
                          style={{ padding: '4px 8px', fontSize: '0.8rem', flex: 1 }}
                        />
                        <input 
                          type="number"
                          placeholder="Points" 
                          value={q.points}
                          onChange={e => {
                            const newQs = [...questions];
                            newQs[idx].points = parseInt(e.target.value) || 0;
                            setQuestions(newQs);
                          }}
                          style={{ width: '70px', padding: '4px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                        <button type="button" onClick={() => setQuestions(questions.filter(qu => qu.id !== q.id))} style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <i className="fas fa-trash"></i>
                        </button>
                       </div>
                     </div>
                   ))}
                </div>
              )}

              {/* Publishing Switch & Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    value={newAssignment.status}
                    onChange={e => setNewAssignment({...newAssignment, status: e.target.value})}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="published">Publish Immediately</option>
                    <option value="draft">Save as Draft</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="portal-btn-secondary" style={{ padding: '8px 16px', borderRadius: '6px' }}>
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="portal-btn-primary"
                    style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600 }}
                  >
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : newAssignment.status === 'draft' ? 'Save Draft' : 'Hand Out Assignment'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
