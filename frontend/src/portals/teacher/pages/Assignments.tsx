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
  class: { name: string };
  subject: { name: string };
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

export default function TeacherAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    classId: '',
    subjectId: '',
    dueDate: '',
    maxScore: 100,
    category: 'ASSIGNMENT',
    timeLimit: 0,
    allowLate: true
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignmentFiles, setAssignmentFiles] = useState<File[]>([]);
  
  const { showToast } = useToast();

  useEffect(() => {
    fetchAssignments();
    fetchMetadata();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data } = await api.get('/api/teachers/assignments');
      setAssignments(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const { data } = await api.get('/api/teachers/my-classes');
      setClasses(data);
      // Subjects can be fetched from the classes metadata or a separate endpoint
      const resSubjects = await api.get('/api/subjects');
      setSubjects(resSubjects.data);
    } catch (err) {
      console.error('Failed to fetch metadata');
    
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(newAssignment).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });
      
      if (newAssignment.category === 'QUIZ' || questions.length > 0) {
        formData.append('questions', JSON.stringify(questions));
      }

      assignmentFiles.forEach(file => {
        formData.append('files', file);
      });

      await api.post('/api/teachers/assignments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      showToast('Assignment created successfully', 'success');
      setShowModal(false);
      setNewAssignment({ title: '', description: '', classId: '', subjectId: '', dueDate: '', maxScore: 100, category: 'ASSIGNMENT', timeLimit: 0, allowLate: true });
      setQuestions([]);
      setAssignmentFiles([]);
      fetchAssignments();
    } catch (err) {
      showToast('Failed to create assignment', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const toggleAccepting = async (id: string, current: boolean) => {
    try {
      await api.patch(`/api/teachers/assignments/${id}/toggle-status`, { isAccepting: !current });
      showToast(current ? 'Submission Locked' : 'Submission Unlocked', 'info');
      fetchAssignments();
    } catch (err) {
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
      <div className="portal-page-header">
        <h1>Assignments</h1>
        <p>Manage and grade class assignments.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-file-signature" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Active Assignments</h2>
          <button 
            onClick={() => setShowModal(true)}
            style={{ padding: '8px 16px', background: 'var(--portal-success)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            <i className="fas fa-plus" style={{ marginRight: 8 }}></i>Create New
          </button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr><th>Title</th><th>Subject/Class</th><th>Due Date</th><th>Submissions</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{a.title}</div>
                      <div style={{ fontSize: '0.7rem', color: '#718096' }}>{a.category}</div>
                    </td>
                    <td>
                      <div className="text-sm font-medium">{a.subject.name}</div>
                      <div className="text-xs text-gray-500">{a.class.name}</div>
                    </td>
                    <td>
                      <span className={`portal-badge ${new Date(a.dueDate) < new Date() ? 'danger' : 'success'}`}>
                        {new Date(a.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => toggleAccepting(a.id, a.isAccepting)}
                        className={`portal-badge ${a.isAccepting ? 'success' : 'danger'}`}
                        style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                      >
                        <i className={a.isAccepting ? "fas fa-unlock" : "fas fa-lock"} style={{ marginRight: 6 }}></i>
                        {a.isAccepting ? 'Open' : 'Locked'}
                      </button>
                    </td>
                    <td>
                      <button 
                        onClick={() => window.location.href = `/teacher/submissions?assignment=${a.id}`}
                        style={{ background: 'transparent', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        View ({a._count.submissions})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="portal-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="portal-card" style={{ width: '100%', maxWidth: 600, margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-card-header">
              <h2>Create New Assignment</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="portal-card-body" style={{ padding: 20 }}>
              <div className="form-group mb-4">
                <label className="block text-sm font-semibold mb-1">Title</label>
                <input 
                  required
                  className="portal-input w-full" 
                  value={newAssignment.title} 
                  onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                  placeholder="e.g. Algebra Quiz 1"
                />
              </div>
              <div className="form-group mb-4">
                <label className="block text-sm font-semibold mb-1">Target Class</label>
                <select 
                  required
                  className="portal-input w-full"
                  value={newAssignment.classId}
                  onChange={e => setNewAssignment({...newAssignment, classId: e.target.value})}
                >
                  <option value="">Select Class...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="block text-sm font-semibold mb-1">Subject</label>
                <select 
                  required
                  className="portal-input w-full"
                  value={newAssignment.subjectId}
                  onChange={e => setNewAssignment({...newAssignment, subjectId: e.target.value})}
                >
                  <option value="">Select Subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="block text-sm font-semibold mb-1">Attachments (Worksheets/Instructions)</label>
                <input 
                  type="file" 
                  multiple
                  className="portal-input w-full" 
                  onChange={e => setAssignmentFiles(Array.from(e.target.files || []))}
                />
                {assignmentFiles.length > 0 && (
                  <div className="text-xs text-blue-600 mt-1">{assignmentFiles.length} files selected</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="form-group">
                  <label className="block text-sm font-semibold mb-1">Due Date</label>
                  <input 
                    required
                    type="date"
                    className="portal-input w-full"
                    value={newAssignment.dueDate}
                    onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="block text-sm font-semibold mb-1">Max Score</label>
                  <input 
                    type="number"
                    className="portal-input w-full"
                    value={newAssignment.maxScore}
                    onChange={e => setNewAssignment({...newAssignment, maxScore: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="form-group">
                  <label className="block text-sm font-semibold mb-1">Type</label>
                  <select 
                    className="portal-input w-full"
                    value={newAssignment.category}
                    onChange={e => setNewAssignment({...newAssignment, category: e.target.value})}
                  >
                    <option value="ASSIGNMENT">Homework/Assingment</option>
                    <option value="QUIZ">Online Quiz</option>
                    <option value="TEST">Periodic Test</option>
                    <option value="MIDTERM">Midterm Exam</option>
                    <option value="FINAL_EXAM">Final Exam</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="block text-sm font-semibold mb-1">Time Limit (Mins)</label>
                  <input 
                    type="number"
                    className="portal-input w-full"
                    placeholder="0 = Unlimited"
                    value={newAssignment.timeLimit}
                    onChange={e => setNewAssignment({...newAssignment, timeLimit: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              {newAssignment.category === 'QUIZ' && (
                <div className="quiz-builder-section mb-6" style={{ padding: 15, background: '#f7fafc', borderRadius: 12, border: '1px dashed #cbd5e0' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                     <h3 style={{ margin: 0, fontSize: '1rem' }}>Online Questions</h3>
                     <button type="button" onClick={addQuestion} className="portal-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>+ Add Question</button>
                   </div>
                   
                   {questions.map((q, idx) => (
                     <div key={q.id} style={{ marginBottom: 15, padding: 10, background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                       <div className="flex items-center justify-between mb-2">
                         <span className="font-bold text-sm">Question {idx + 1}</span>
                         <select 
                           className="text-xs border rounded"
                           value={q.type}
                           onChange={e => {
                             const newQs = [...questions];
                             newQs[idx].type = e.target.value as any;
                             setQuestions(newQs);
                           }}
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
                       />
                       
                       {q.type === 'MCQ' && (
                         <div className="grid grid-cols-2 gap-2 mt-2">
                            {q.options?.map((opt, oIdx) => (
                              <input 
                                key={oIdx}
                                className="portal-input text-xs" 
                                placeholder={`Option ${oIdx + 1}`} 
                                value={opt}
                                onChange={e => {
                                  const newQs = [...questions];
                                  newQs[idx].options![oIdx] = e.target.value;
                                  setQuestions(newQs);
                                }}
                              />
                            ))}
                         </div>
                       )}

                       <div className="flex gap-4 mt-2">
                        <input 
                          className="portal-input text-xs w-1/2" 
                          placeholder="Correct Answer" 
                          value={q.answer}
                          onChange={e => {
                            const newQs = [...questions];
                            newQs[idx].answer = e.target.value;
                            setQuestions(newQs);
                          }}
                        />
                        <input 
                          type="number"
                          className="portal-input text-xs w-1/4" 
                          placeholder="Points" 
                          value={q.points}
                          onChange={e => {
                            const newQs = [...questions];
                            newQs[idx].points = parseInt(e.target.value);
                            setQuestions(newQs);
                          }}
                        />
                        <button type="button" onClick={() => setQuestions(questions.filter(qu => qu.id !== q.id))} className="text-red-500 text-xs">Remove</button>
                       </div>
                     </div>
                   ))}
                </div>
              )}

              <div className="form-group mb-6">
                <label className="block text-sm font-semibold mb-1">Instructions & Late Policy</label>
                <div className="flex items-center gap-4 mb-2">
                  <label className="text-xs flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newAssignment.allowLate} 
                      onChange={e => setNewAssignment({...newAssignment, allowLate: e.target.checked})} 
                    />
                    Allow Late Submissions
                  </label>
                </div>
                <textarea 
                  className="portal-input w-full"
                  rows={3}
                  value={newAssignment.description}
                  onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                  placeholder="Optional details..."
                />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} className="portal-btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-primary">Hand Out Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
