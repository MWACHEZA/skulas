import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';

interface LessonPlanItem {
  id: string;
  date: string;
  period: number;
  objectives: string;
  introduction?: string;
  development?: string;
  conclusion?: string;
  aids?: string;
  evaluation?: string;
  status: 'draft' | 'submitted' | 'hod_reviewed' | 'taught' | 'missed';
  missedReason?: string;
  subject?: { id: string; name: string; code?: string };
  schoolClass?: { id: string; name: string };
  teacher?: { user?: { name: string } };
  coverTeacher?: { user?: { name: string } };
  hodReviewedBy?: { name: string };
  hodFeedback?: string;
  scheme?: { id: string; status: string; form: string; term: number };
  schemeItem?: {
    id: string;
    week: number;
    subTopic?: string;
    syllabusTopic?: { topic: string; code?: string };
  };
}

interface ApprovedScheme {
  id: string;
  form: string;
  term: number;
  year: number;
  status: string;
  subject: { id: string; name: string };
  schoolClass?: { id: string; name: string };
  items: Array<{
    id: string;
    week: number;
    subTopic?: string;
    syllabusTopic?: { id: string; topic: string };
  }>;
}

export default function TeacherLessonPlanner() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [plans, setPlans] = useState<LessonPlanItem[]>([]);
  const [approvedSchemes, setApprovedSchemes] = useState<ApprovedScheme[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTaughtModalOpen, setIsTaughtModalOpen] = useState(false);
  const [isMissedModalOpen, setIsMissedModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlanItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    schemeId: '',
    schemeItemId: '',
    date: new Date().toISOString().split('T')[0],
    period: 1,
    objectives: '',
    introduction: '',
    development: '',
    conclusion: '',
    aids: '',
    homework: '',
    differentiation: ''
  });

  const [evaluationText, setEvaluationText] = useState('');
  const [missedReasonText, setMissedReasonText] = useState('');
  const [coverTeacherId, setCoverTeacherId] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');

  const isHodOrAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN' ||
    user?.secondaryRoles?.some((r: string) => ['HOD', 'DEPARTMENT_HEAD', 'SUPERVISOR'].includes(r.toUpperCase()));

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, schemesRes, teachersRes] = await Promise.all([
        api.get('/api/lesson-plans'),
        api.get('/api/schemes'),
        api.get('/api/teachers').catch(() => ({ data: [] }))
      ]);

      setPlans(plansRes.data?.lessonPlans || []);

      // Filter only schemes that are HOD-approved or locked
      const allSchemes = schemesRes.data?.schemes || [];
      const valid = allSchemes.filter((s: any) => s.status === 'hod_approved' || s.status === 'locked');
      setApprovedSchemes(valid);
      setTeachers(teachersRes.data || []);
    } catch (err: any) {
      console.error('Failed to load lesson plans:', err);
      showToast('Failed to load lesson plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schemeId) {
      showToast('Please select an HOD-approved Scheme of Work', 'error');
      return;
    }
    if (!formData.objectives.trim()) {
      showToast('Lesson objectives are required', 'error');
      return;
    }

    try {
      await api.post('/api/lesson-plans', formData);
      showToast('Lesson plan created successfully!', 'success');
      setIsCreateOpen(false);
      setFormData({
        schemeId: '',
        schemeItemId: '',
        date: new Date().toISOString().split('T')[0],
        period: 1,
        objectives: '',
        introduction: '',
        development: '',
        conclusion: '',
        aids: '',
        homework: '',
        differentiation: ''
      });
      await loadData();
    } catch (err: any) {
      console.error('Error creating plan:', err);
      showToast(err.response?.data?.error || 'Failed to create lesson plan', 'error');
    }
  };

  const handleSubmitForReview = async (id: string) => {
    try {
      await api.post(`/api/lesson-plans/${id}/submit`);
      showToast('Lesson plan submitted for HOD review', 'success');
      await loadData();
    } catch (err: any) {
      showToast('Failed to submit lesson plan', 'error');
    }
  };

  const handleReviewPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
      await api.post(`/api/lesson-plans/${selectedPlan.id}/review`, { feedback: reviewFeedback });
      showToast('Lesson plan reviewed and approved by HOD', 'success');
      setIsReviewModalOpen(false);
      setReviewFeedback('');
      await loadData();
    } catch (err: any) {
      showToast('Failed to review lesson plan', 'error');
    }
  };

  const handleMarkTaught = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!evaluationText.trim()) {
      showToast('Teacher evaluation is required when marking lesson taught', 'error');
      return;
    }

    try {
      await api.post(`/api/lesson-plans/${selectedPlan.id}/taught`, { evaluation: evaluationText });
      showToast('Lesson marked as taught with evaluation recorded!', 'success');
      setIsTaughtModalOpen(false);
      setEvaluationText('');
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to mark lesson taught', 'error');
    }
  };

  const handleMarkMissed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!missedReasonText.trim()) {
      showToast('Reason is required when recording an untaught lesson', 'error');
      return;
    }

    try {
      await api.post(`/api/lesson-plans/${selectedPlan.id}/missed`, {
        missedReason: missedReasonText,
        coverTeacherId: coverTeacherId || null
      });
      showToast('Lesson marked as missed. HOD alerted for relief cover.', 'info');
      setIsMissedModalOpen(false);
      setMissedReasonText('');
      setCoverTeacherId('');
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to mark lesson missed', 'error');
    }
  };

  const selectedSchemeObj = approvedSchemes.find(s => s.id === formData.schemeId);

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Lesson Execution & Pedagogical Plans
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Structured introduction, development, aids, conclusion, and post-lesson teacher evaluations.
          </p>
        </div>
        <button
          className="portal-btn-primary"
          onClick={() => {
            if (approvedSchemes.length === 0) {
              showToast('Cannot create lesson plan: An approved Scheme of Work is required first.', 'error');
            } else {
              setIsCreateOpen(true);
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-plus"></i> New Lesson Plan
        </button>
      </div>

      {/* Scheme of Work Gate Warning Banner if none approved */}
      {approvedSchemes.length === 0 && !loading && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <i className="fas fa-exclamation-triangle" style={{ color: '#dc2626', fontSize: '1.4rem' }}></i>
          <div>
            <strong style={{ color: '#991b1b', display: 'block', fontSize: '0.95rem' }}>
              Academic Chain Gating Active: Approved Scheme of Work Required
            </strong>
            <span style={{ color: '#7f1d1d', fontSize: '0.85rem' }}>
              Lesson plans cannot be drafted without an HOD-approved Scheme of Work. Go to the "Schemes of Work" tab to build and submit your term scheme for departmental sign-off.
            </span>
          </div>
        </div>
      )}

      {/* Plans Table */}
      <div className="portal-card" style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div className="portal-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
            <i className="fas fa-chalkboard-teacher mr-2" style={{ color: 'var(--school-primary, #0284c7)' }}></i>
            Teaching Schedule & Lesson Status
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {plans.length} Lessons Planned
          </span>
        </div>

        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Date & Period</th>
                <th style={{ padding: '12px 16px' }}>Subject & Class</th>
                <th style={{ padding: '12px 16px' }}>Curriculum Objective</th>
                <th style={{ padding: '12px 16px' }}>Scheme Pacing</th>
                <th style={{ padding: '12px 16px', width: 130 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    <i className="fas fa-calendar-times" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                    No lesson plans recorded yet. Click "New Lesson Plan" to prepare your classroom delivery.
                  </td>
                </tr>
              ) : (
                plans.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.date ? new Date(p.date).toISOString().slice(0, 10) : 'Date'}</div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Period {p.period || 1}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{p.subject?.name || 'Subject'}</div>
                      <span className="portal-badge neutral" style={{ fontSize: '0.75rem', padding: '2px 6px' }}>
                        {p.schoolClass?.name || 'Class'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 280, fontSize: '0.85rem', color: '#334155' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {p.schemeItem?.subTopic || p.schemeItem?.syllabusTopic?.topic || 'Lesson Topic'}
                      </div>
                      <span style={{ color: '#64748b' }}>{p.objectives}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                      {p.schemeItem ? (
                        <span style={{ color: '#0284c7', fontWeight: 600 }}>Week {p.schemeItem.week}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Custom</span>
                      )}
                      {p.hodFeedback && (
                        <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: 2 }}>
                          <i className="fas fa-comment mr-1" /> HOD: {p.hodFeedback}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`portal-badge ${
                        p.status === 'taught' ? 'success' :
                        p.status === 'missed' ? 'danger' :
                        p.status === 'hod_reviewed' ? 'info' :
                        p.status === 'submitted' ? 'warning' : 'neutral'
                      }`}>
                        {p.status === 'taught' ? 'Taught' :
                         p.status === 'missed' ? 'Missed' :
                         p.status === 'hod_reviewed' ? 'Reviewed' :
                         p.status === 'submitted' ? 'Submitted' : 'Draft'}
                      </span>
                      {p.status === 'missed' && p.coverTeacher && (
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 2 }}>
                          Relief: {p.coverTeacher.user?.name}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {p.status === 'draft' && (
                          <button
                            className="portal-btn-ghost"
                            onClick={() => handleSubmitForReview(p.id)}
                            style={{ fontSize: '0.8rem', padding: '4px 8px', color: '#0284c7' }}
                          >
                            Submit
                          </button>
                        )}
                        {p.status === 'submitted' && isHodOrAdmin && (
                          <button
                            className="portal-btn-ghost"
                            onClick={() => { setSelectedPlan(p); setIsReviewModalOpen(true); }}
                            style={{ fontSize: '0.8rem', padding: '4px 8px', color: '#16a34a' }}
                          >
                            Review
                          </button>
                        )}
                        {p.status !== 'taught' && p.status !== 'missed' && (
                          <>
                            <button
                              className="portal-btn-ghost"
                              onClick={() => { setSelectedPlan(p); setIsTaughtModalOpen(true); }}
                              style={{ fontSize: '0.8rem', padding: '4px 8px', color: '#15803d' }}
                            >
                              <i className="fas fa-check mr-1" /> Taught
                            </button>
                            <button
                              className="portal-btn-ghost"
                              onClick={() => { setSelectedPlan(p); setIsMissedModalOpen(true); }}
                              style={{ fontSize: '0.8rem', padding: '4px 8px', color: '#dc2626' }}
                            >
                              <i className="fas fa-times mr-1" /> Missed
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE LESSON PLAN MODAL */}
      {isCreateOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 650, background: '#fff', borderRadius: 8 }}>
            <div className="portal-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>New Structured Lesson Plan</h2>
              <button className="portal-btn-ghost" onClick={() => setIsCreateOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleCreatePlan} style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Approved Scheme *</label>
                  <select
                    className="portal-input"
                    required
                    value={formData.schemeId}
                    onChange={e => setFormData({ ...formData, schemeId: e.target.value, schemeItemId: '' })}
                  >
                    <option value="">Select Scheme of Work...</option>
                    {approvedSchemes.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.subject?.name} • {s.form} (Term {s.term}, {s.year})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Weekly Scheme Item</label>
                  <select
                    className="portal-input"
                    value={formData.schemeItemId}
                    onChange={e => setFormData({ ...formData, schemeItemId: e.target.value })}
                  >
                    <option value="">Select Week / Subtopic...</option>
                    {(selectedSchemeObj?.items || []).map(it => (
                      <option key={it.id} value={it.id}>
                        Week {it.week}: {it.subTopic || it.syllabusTopic?.topic || 'Topic'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Execution Date *</label>
                  <input
                    type="date"
                    className="portal-input"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Timetable Period *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="portal-input"
                    value={formData.period}
                    onChange={e => setFormData({ ...formData, period: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="portal-form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Learning Objectives *</label>
                <textarea
                  className="portal-input"
                  rows={2}
                  placeholder="Specific, measurable learning objectives..."
                  value={formData.objectives}
                  onChange={e => setFormData({ ...formData, objectives: e.target.value })}
                  required
                />
              </div>

              {/* Pedagogical flow */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.85rem' }}>1. Introduction (5-10m)</label>
                  <textarea
                    className="portal-input"
                    rows={2}
                    placeholder="Hook, prior knowledge recall..."
                    value={formData.introduction}
                    onChange={e => setFormData({ ...formData, introduction: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.85rem' }}>2. Development (25-30m)</label>
                  <textarea
                    className="portal-input"
                    rows={2}
                    placeholder="Direct instruction, student activity..."
                    value={formData.development}
                    onChange={e => setFormData({ ...formData, development: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.85rem' }}>3. Conclusion (5m)</label>
                  <textarea
                    className="portal-input"
                    rows={2}
                    placeholder="Exit ticket, summary..."
                    value={formData.conclusion}
                    onChange={e => setFormData({ ...formData, conclusion: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Teaching Aids / Apparatus</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. Models, projector, worksheet"
                    value={formData.aids}
                    onChange={e => setFormData({ ...formData, aids: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Homework / Extension</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. Exercise 3 pg 42"
                    value={formData.homework}
                    onChange={e => setFormData({ ...formData, homework: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary">Save Lesson Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARK TAUGHT MODAL (Requires Teacher Evaluation) */}
      {isTaughtModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 500, background: '#fff', borderRadius: 8 }}>
            <div className="portal-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Record Lesson Evaluation (Taught)</h2>
              <button className="portal-btn-ghost" onClick={() => setIsTaughtModalOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleMarkTaught} style={{ padding: 20 }}>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 0 }}>
                Marking a lesson as taught requires pedagogical evaluation on learning mastery, comprehension, and student progress.
              </p>
              <div className="portal-form-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Teacher Evaluation & Reflection *</label>
                <textarea
                  className="portal-input"
                  rows={4}
                  required
                  placeholder="e.g. 85% of students demonstrated mastery in derivation equations. Five students struggled with unit conversion and will receive targeted starter practice next period."
                  value={evaluationText}
                  onChange={e => setEvaluationText(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setIsTaughtModalOpen(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: '#16a34a' }}>
                  Confirm & Mark Taught
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARK MISSED MODAL (Requires Reason & Optional Cover Relief) */}
      {isMissedModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 500, background: '#fff', borderRadius: 8 }}>
            <div className="portal-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#dc2626' }}>Record Missed Lesson & Relief Cover</h2>
              <button className="portal-btn-ghost" onClick={() => setIsMissedModalOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleMarkMissed} style={{ padding: 20 }}>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 0 }}>
                Missed lessons automatically alert the Head of Department (HOD) and log into the teacher relief load register.
              </p>
              <div className="portal-form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Missed Reason *</label>
                <textarea
                  className="portal-input"
                  rows={3}
                  required
                  placeholder="e.g. Teacher absent due to district workshop, illness, official school trip, or emergency."
                  value={missedReasonText}
                  onChange={e => setMissedReasonText(e.target.value)}
                />
              </div>
              <div className="portal-form-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Assign Relief / Cover Teacher</label>
                <select
                  className="portal-input"
                  value={coverTeacherId}
                  onChange={e => setCoverTeacherId(e.target.value)}
                >
                  <option value="">No cover teacher assigned</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.user?.name || t.name} ({t.staffId || ''})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setIsMissedModalOpen(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: '#dc2626' }}>
                  Log Missed Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HOD REVIEW MODAL */}
      {isReviewModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 500, background: '#fff', borderRadius: 8 }}>
            <div className="portal-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>HOD Lesson Plan Sign-off</h2>
              <button className="portal-btn-ghost" onClick={() => setIsReviewModalOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleReviewPlan} style={{ padding: 20 }}>
              <div className="portal-form-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Departmental Feedback</label>
                <textarea
                  className="portal-input"
                  rows={3}
                  placeholder="e.g. Well aligned with weekly pacing. Ensure lab apparatus safety check prior to period start."
                  value={reviewFeedback}
                  onChange={e => setReviewFeedback(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setIsReviewModalOpen(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: '#0284c7' }}>
                  Sign-off & Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
