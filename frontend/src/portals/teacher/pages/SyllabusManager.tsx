import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

interface SyllabusTopic {
  id: string;
  topic: string;
  topicTitle?: string;
  code?: string;
  term: number;
  week: number;
  expectedWeek?: number;
  objectives?: string;
  content?: string;
  competencies?: string;
  hours?: number;
  status: string;
  isCovered: boolean;
  coveredBy?: { name: string };
  coveredAt?: string;
}

interface SyllabusItem {
  id: string;
  form: string;
  level?: string;
  curriculum: string;
  year?: number;
  totalHours?: number;
  status: string;
  subject: { id: string; name: string; code?: string };
  topics: SyllabusTopic[];
  totalTopics: number;
  coveredTopics: number;
  coveragePercentage: number;
}

export default function TeacherSyllabusManager() {
  const { showToast } = useToast();
  const [syllabi, setSyllabi] = useState<SyllabusItem[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTerm, setActiveTerm] = useState<number>(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showAddTopicModal, setShowAddTopicModal] = useState<boolean>(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    subjectId: '',
    form: 'Form 3',
    level: 'O-Level',
    curriculum: 'ZIMSEC',
    year: new Date().getFullYear(),
    totalHours: 120
  });

  const [topicForm, setTopicForm] = useState({
    term: 1,
    week: 1,
    topicTitle: '',
    code: '',
    objectives: '',
    content: '',
    competencies: '',
    hours: 4
  });

  const fetchSyllabi = async () => {
    try {
      setLoading(true);
      const [sylRes, subjRes] = await Promise.all([
        api.get('/api/syllabus'),
        api.get('/api/subjects')
      ]);

      const sylData = sylRes.data?.syllabi || [];
      setSyllabi(sylData);
      setSubjects(subjRes.data || []);

      if (sylData.length > 0 && !selectedSyllabusId) {
        setSelectedSyllabusId(sylData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load syllabi:', err);
      showToast('Failed to load curriculum syllabi', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyllabi();
  }, []);

  const currentSyllabus = syllabi.find(s => s.id === selectedSyllabusId) || syllabi[0];

  const handleToggleCovered = async (topicId: string, currentStatus: boolean) => {
    if (!currentSyllabus) return;
    try {
      await api.post(`/api/syllabus/${currentSyllabus.id}/topics/${topicId}/mark-covered`, {
        isCovered: !currentStatus
      });
      showToast(!currentStatus ? 'Topic marked as covered' : 'Topic coverage un-marked', 'success');
      await fetchSyllabi();
    } catch (err: any) {
      console.error('Error toggling coverage:', err);
      showToast('Failed to update topic coverage', 'error');
    }
  };

  const handleCreateSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.subjectId) {
      showToast('Please select a subject', 'error');
      return;
    }
    try {
      const res = await api.post('/api/syllabus', createForm);
      showToast('Syllabus created successfully!', 'success');
      setShowCreateModal(false);
      await fetchSyllabi();
      if (res.data?.syllabus?.id) {
        setSelectedSyllabusId(res.data.syllabus.id);
      }
    } catch (err: any) {
      console.error('Error creating syllabus:', err);
      showToast(err.response?.data?.error || 'Failed to create syllabus', 'error');
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSyllabus) return;
    if (!topicForm.topicTitle) {
      showToast('Topic title is required', 'error');
      return;
    }
    try {
      await api.post(`/api/syllabus/${currentSyllabus.id}/topics`, topicForm);
      showToast('Topic added to syllabus!', 'success');
      setShowAddTopicModal(false);
      setTopicForm({
        term: activeTerm,
        week: (currentSyllabus.topics?.filter(t => t.term === activeTerm).length || 0) + 1,
        topicTitle: '',
        code: '',
        objectives: '',
        content: '',
        competencies: '',
        hours: 4
      });
      await fetchSyllabi();
    } catch (err: any) {
      console.error('Error adding topic:', err);
      showToast(err.response?.data?.error || 'Failed to add topic', 'error');
    }
  };

  const termTopics = (currentSyllabus?.topics || []).filter(t => (t.term || 1) === activeTerm);

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Structured Curriculum & Syllabus Coverage
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            National curriculum pacing guides (ZIMSEC / Cambridge) tracked term-by-term and week-by-week.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="portal-btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className="fas fa-plus"></i> New Curriculum Syllabus
          </button>
        </div>
      </div>

      {/* Syllabus Selector & KPI Banner */}
      <div className="portal-card" style={{ padding: 20, marginBottom: 20, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>Select Syllabus:</label>
            <select
              className="portal-input"
              style={{ minWidth: 260, padding: '8px 12px' }}
              value={selectedSyllabusId}
              onChange={e => setSelectedSyllabusId(e.target.value)}
            >
              {syllabi.map(s => (
                <option key={s.id} value={s.id}>
                  {s.subject?.name} • {s.form} ({s.curriculum} {s.level || ''})
                </option>
              ))}
            </select>
          </div>

          {currentSyllabus && (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span className={`portal-badge ${currentSyllabus.curriculum === 'Cambridge' ? 'info' : 'success'}`} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                <i className="fas fa-certificate mr-1"></i> {currentSyllabus.curriculum} ({currentSyllabus.level || 'Standard'})
              </span>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Total Allocated Hours: <strong>{currentSyllabus.totalHours || 120}h</strong>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                  Coverage: {currentSyllabus.coveragePercentage || 0}%
                </span>
                <div style={{ width: 120, height: 10, background: '#edf2f7', borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${currentSyllabus.coveragePercentage || 0}%`,
                      height: '100%',
                      background: 'var(--portal-success, #16a34a)',
                      borderRadius: 5,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Term Pacing Tabs & Topics Table */}
      {currentSyllabus && (
        <div className="portal-card" style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3].map(termNum => (
                <button
                  key={termNum}
                  onClick={() => setActiveTerm(termNum)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: activeTerm === termNum ? 700 : 500,
                    background: activeTerm === termNum ? 'var(--school-primary, #0284c7)' : '#f1f5f9',
                    color: activeTerm === termNum ? '#fff' : '#475569'
                  }}
                >
                  <i className="fas fa-calendar-check mr-2"></i> Term {termNum} Pacing
                </button>
              ))}
            </div>
            <button
              className="portal-btn-secondary"
              onClick={() => {
                setTopicForm(prev => ({
                  ...prev,
                  term: activeTerm,
                  week: termTopics.length + 1
                }));
                setShowAddTopicModal(true);
              }}
              style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="fas fa-plus"></i> Add Term {activeTerm} Topic
            </button>
          </div>

          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', width: 80 }}>Week</th>
                  <th style={{ padding: '12px 16px', minWidth: 220 }}>Topic & Code</th>
                  <th style={{ padding: '12px 16px' }}>Curriculum Objectives</th>
                  <th style={{ padding: '12px 16px' }}>Key Competencies</th>
                  <th style={{ padding: '12px 16px', width: 90 }}>Hours</th>
                  <th style={{ padding: '12px 16px', width: 120 }}>Status</th>
                  <th style={{ padding: '12px 16px', width: 130, textAlign: 'center' }}>Mark Covered</th>
                </tr>
              </thead>
              <tbody>
                {termTopics.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      <i className="fas fa-book-open" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                      No curriculum topics planned for Term {activeTerm} yet. Click "Add Term {activeTerm} Topic" to populate weekly pacing.
                    </td>
                  </tr>
                ) : (
                  termTopics.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', background: t.isCovered ? '#f0fdf4' : 'transparent' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                        Wk {t.week || t.expectedWeek || 1}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{t.topicTitle || t.topic}</div>
                        {t.code && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {t.code}</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569', maxWidth: 300 }}>
                        {t.objectives || 'Standard curriculum objectives defined'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>
                        {t.competencies || 'General competencies'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600 }}>
                        {t.hours ? `${t.hours}h` : '4h'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`portal-badge ${t.isCovered ? 'success' : 'neutral'}`}>
                          {t.isCovered ? 'Covered' : 'Pending'}
                        </span>
                        {t.coveredBy && (
                          <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: 2 }}>
                            By {t.coveredBy.name}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleCovered(t.id, t.isCovered)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: t.isCovered ? '#fee2e2' : '#dcfce7',
                            color: t.isCovered ? '#b91c1c' : '#15803d'
                          }}
                        >
                          <i className={`fas ${t.isCovered ? 'fa-undo' : 'fa-check'} mr-1`}></i>
                          {t.isCovered ? 'Revert' : 'Mark Done'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE SYLLABUS MODAL */}
      {showCreateModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 500, background: '#fff', borderRadius: 8 }}>
            <div className="portal-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>New Curriculum Syllabus</h2>
              <button className="portal-btn-ghost" onClick={() => setShowCreateModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleCreateSyllabus} style={{ padding: 20 }}>
              <div className="portal-form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Subject *</label>
                <select
                  className="portal-input"
                  required
                  value={createForm.subjectId}
                  onChange={e => setCreateForm({ ...createForm, subjectId: e.target.value })}
                >
                  <option value="">Select subject...</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || ''})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Form / Grade *</label>
                  <select
                    className="portal-input"
                    value={createForm.form}
                    onChange={e => setCreateForm({ ...createForm, form: e.target.value })}
                  >
                    <option value="Form 1">Form 1</option>
                    <option value="Form 2">Form 2</option>
                    <option value="Form 3">Form 3</option>
                    <option value="Form 4">Form 4</option>
                    <option value="Lower 6">Lower 6</option>
                    <option value="Upper 6">Upper 6</option>
                  </select>
                </div>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Curriculum Standard *</label>
                  <select
                    className="portal-input"
                    value={createForm.curriculum}
                    onChange={e => setCreateForm({ ...createForm, curriculum: e.target.value })}
                  >
                    <option value="ZIMSEC">ZIMSEC (Zimbabwe)</option>
                    <option value="Cambridge">Cambridge International</option>
                    <option value="National">National Curriculum</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Level</label>
                  <select
                    className="portal-input"
                    value={createForm.level}
                    onChange={e => setCreateForm({ ...createForm, level: e.target.value })}
                  >
                    <option value="Junior">Junior Secondary</option>
                    <option value="O-Level">O-Level</option>
                    <option value="A-Level">A-Level</option>
                  </select>
                </div>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Total Term Hours</label>
                  <input
                    type="number"
                    className="portal-input"
                    value={createForm.totalHours}
                    onChange={e => setCreateForm({ ...createForm, totalHours: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary">Create Syllabus</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TOPIC MODAL */}
      {showAddTopicModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 550, background: '#fff', borderRadius: 8 }}>
            <div className="portal-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Add Topic to Term {topicForm.term}</h2>
              <button className="portal-btn-ghost" onClick={() => setShowAddTopicModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAddTopic} style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Term (1-3) *</label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    className="portal-input"
                    value={topicForm.term}
                    onChange={e => setTopicForm({ ...topicForm, term: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Pacing Week (1-12) *</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    className="portal-input"
                    value={topicForm.week}
                    onChange={e => setTopicForm({ ...topicForm, week: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="portal-form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Topic Title *</label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="e.g. Kinematics & Linear Momentum"
                  value={topicForm.topicTitle}
                  onChange={e => setTopicForm({ ...topicForm, topicTitle: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Curriculum Code</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. ZIM-PHY-3.1"
                    value={topicForm.code}
                    onChange={e => setTopicForm({ ...topicForm, code: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Allocated Hours</label>
                  <input
                    type="number"
                    className="portal-input"
                    value={topicForm.hours}
                    onChange={e => setTopicForm({ ...topicForm, hours: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="portal-form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Learning Objectives</label>
                <textarea
                  className="portal-input"
                  rows={2}
                  placeholder="What students should know and be able to do..."
                  value={topicForm.objectives}
                  onChange={e => setTopicForm({ ...topicForm, objectives: e.target.value })}
                />
              </div>

              <div className="portal-form-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Core Competencies</label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="e.g. Mathematical analysis, problem solving, lab technique"
                  value={topicForm.competencies}
                  onChange={e => setTopicForm({ ...topicForm, competencies: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowAddTopicModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary">Add Topic</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
