import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import TeacherSyllabusManager from './SyllabusManager';
import TeacherLessonPlanner from './LessonPlanner';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';

export type CurriculumTab = 'syllabus' | 'schemes' | 'lesson-plans' | 'observations';

interface ObservationRecord {
  id: string;
  teacherName: string;
  subject: string;
  class: string;
  topic: string;
  observerName: string;
  date: string;
  ratings: {
    planning: number;
    delivery: number;
    engagement: number;
    management: number;
    assessment: number;
  };
  overallScore: number;
  strengths: string;
  growthAreas: string;
  status: 'Draft' | 'Submitted' | 'Acknowledged';
}

export default function TeacherCurriculum() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as CurriculumTab) || 'syllabus';
  const [activeTab, setActiveTab] = useState<CurriculumTab>(currentTab);
  const { user } = useAuth();
  const { showToast } = useToast();

  const isHodOrAdmin = user?.secondaryRoles?.some((r: string) => 
    ['HOD', 'DEPARTMENT_HEAD', 'SUPERVISOR'].includes(r.toUpperCase())
  ) || user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  // Lesson Observations State
  const [observations, setObservations] = useState<ObservationRecord[]>([
    {
      id: 'OBS-001',
      teacherName: 'C. Moyo',
      subject: 'Mathematics',
      class: 'Form 3A',
      topic: 'Algebraic Equations',
      observerName: 'HOD Science & Maths',
      date: '2026-09-28',
      ratings: { planning: 5, delivery: 4, engagement: 4, management: 5, assessment: 4 },
      overallScore: 4.4,
      strengths: 'Clear learning objectives outlined on board. Excellent use of interactive whiteboard for graphing problems.',
      growthAreas: 'Allocate 5 more minutes at conclusion for individual exit-ticket comprehension check.',
      status: 'Acknowledged'
    },
    {
      id: 'OBS-002',
      teacherName: user?.name || 'Self',
      subject: 'Physical Science',
      class: 'Form 4B',
      topic: 'Kinetic Theory',
      observerName: 'HOD Science & Maths',
      date: '2026-10-02',
      ratings: { planning: 4, delivery: 4, engagement: 5, management: 4, assessment: 4 },
      overallScore: 4.2,
      strengths: 'Outstanding student participation during lab experiment demonstration. Safety protocol rigorously followed.',
      growthAreas: 'Provide differentiated extension tasks for rapid finishers.',
      status: 'Submitted'
    }
  ]);

  const [showObsModal, setShowObsModal] = useState(false);
  const [newObs, setNewObs] = useState({
    teacherName: '',
    subject: '',
    class: '',
    topic: '',
    planning: 4,
    delivery: 4,
    engagement: 4,
    management: 4,
    assessment: 4,
    strengths: '',
    growthAreas: ''
  });

  // Schemes of Work state
  const [schemes, setSchemes] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [syllabi, setSyllabi] = useState<any[]>([]);
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [viewScheme, setViewScheme] = useState<any>(null);
  const [newScheme, setNewScheme] = useState({
    subjectId: '',
    classId: '',
    form: 'Form 3',
    term: 1,
    year: new Date().getFullYear(),
    syllabusId: '',
    weeksCount: 12,
    comments: ''
  });

  const fetchSchemes = async () => {
    try {
      const [schRes, subRes, clsRes, sylRes] = await Promise.all([
        api.get('/api/schemes'),
        api.get('/api/subjects').catch(() => ({ data: [] })),
        api.get('/api/classes').catch(() => ({ data: [] })),
        api.get('/api/syllabus').catch(() => ({ data: { syllabi: [] } }))
      ]);
      setSchemes(schRes.data?.schemes || []);
      setSubjects(subRes.data || []);
      setClasses(clsRes.data || []);
      setSyllabi(sylRes.data?.syllabi || []);
    } catch (err) {
      console.error('Failed to load schemes:', err);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  const handleCreateScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheme.subjectId) {
      showToast('Subject is required', 'error');
      return;
    }
    try {
      const items = Array.from({ length: Number(newScheme.weeksCount) || 12 }, (_, i) => ({
        week: i + 1,
        periodsRequired: 4,
        subTopic: `Week ${i + 1} Teaching Unit`,
        activities: 'Lecture, classroom discussion and guided practice',
        status: 'planned'
      }));

      await api.post('/api/schemes', {
        ...newScheme,
        items
      });
      showToast('Scheme of work draft created successfully!', 'success');
      setShowSchemeModal(false);
      await fetchSchemes();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create scheme', 'error');
    }
  };

  const handleApproveScheme = async (id: string) => {
    try {
      await api.post(`/api/schemes/${id}/approve`);
      showToast('Scheme of work approved by HOD', 'success');
      await fetchSchemes();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to approve scheme', 'error');
    }
  };

  const handleSubmitScheme = async (id: string) => {
    try {
      await api.post(`/api/schemes/${id}/submit`);
      showToast('Scheme submitted for HOD approval', 'success');
      await fetchSchemes();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit scheme', 'error');
    }
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab') as CurriculumTab;
    if (tabParam && ['syllabus', 'schemes', 'lesson-plans', 'observations'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: CurriculumTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleCreateObservation = (e: React.FormEvent) => {
    e.preventDefault();
    const avg = Number(((newObs.planning + newObs.delivery + newObs.engagement + newObs.management + newObs.assessment) / 5).toFixed(1));
    const created: ObservationRecord = {
      id: `OBS-00${observations.length + 1}`,
      teacherName: newObs.teacherName,
      subject: newObs.subject,
      class: newObs.class,
      topic: newObs.topic,
      observerName: user?.name || 'Department Supervisor',
      date: new Date().toISOString().split('T')[0],
      ratings: {
        planning: newObs.planning,
        delivery: newObs.delivery,
        engagement: newObs.engagement,
        management: newObs.management,
        assessment: newObs.assessment
      },
      overallScore: avg,
      strengths: newObs.strengths,
      growthAreas: newObs.growthAreas,
      status: 'Submitted'
    };

    setObservations([created, ...observations]);
    setShowObsModal(false);
    showToast('Lesson observation feedback recorded and published to teacher', 'success');
  };

  const handleAcknowledge = (id: string) => {
    setObservations(observations.map(o => o.id === id ? { ...o, status: 'Acknowledged' } : o));
    showToast('Lesson observation acknowledged', 'success');
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-book-open" style={{ color: 'var(--school-primary, #0284c7)' }} />
            Curriculum, Schemes & Lesson Planning
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
            Design schemes of work, track syllabus coverage, prepare weekly lesson execution plans, and review HOD lesson observations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {activeTab === 'observations' && (
            <button
              data-tour="hod-observation-btn"
              style={{
                background: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
              }}
              onClick={() => setShowObsModal(true)}
            >
              <i className="fas fa-clipboard-check" />
              New Lesson Observation
            </button>
          )}
          <button 
            style={{
              background: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
            }}
            onClick={() => showToast('Exporting term curriculum pack...', 'info')}
          >
            <i className="fas fa-file-export" />
            Export Term Pack
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 24,
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('syllabus')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'syllabus' ? 700 : 500,
            color: activeTab === 'syllabus' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'syllabus' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-layer-group" />
          Syllabus Coverage
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('schemes')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'schemes' ? 700 : 500,
            color: activeTab === 'schemes' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'schemes' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-project-diagram" />
          Schemes of Work
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('lesson-plans')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'lesson-plans' ? 700 : 500,
            color: activeTab === 'lesson-plans' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'lesson-plans' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-calendar-alt" />
          Lesson Plans
        </button>

        <button
          type="button"
          {...(activeTab !== 'observations' ? { 'data-tour': 'hod-observation-btn' } : {})}
          onClick={() => handleTabChange('observations')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'observations' ? 700 : 500,
            color: activeTab === 'observations' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'observations' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-clipboard-check" />
          Lesson Observations (HOD & Peer)
        </button>
      </div>

      <div>
        {activeTab === 'syllabus' && <TeacherSyllabusManager />}

        {activeTab === 'schemes' && (
          <div className="portal-card" style={{ padding: 24, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>Term Schemes of Work</h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0' }}>Approved departmental term pacing guides aligned with national standards.</p>
              </div>
              <button 
                className="portal-btn-primary"
                onClick={() => setShowSchemeModal(true)}
              >
                <i className="fas fa-plus mr-2" /> New Scheme Draft
              </button>
            </div>
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: 12 }}>Subject & Class</th>
                  <th style={{ padding: 12 }}>Term / Year</th>
                  <th style={{ padding: 12 }}>Weeks Planned</th>
                  <th style={{ padding: 12 }}>HOD Review</th>
                  <th style={{ padding: 12 }}>Status</th>
                  <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schemes.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      <i className="fas fa-project-diagram" style={{ fontSize: '2rem', display: 'block', marginBottom: 8 }} />
                      No schemes of work created yet. Click "New Scheme Draft" to set up your term syllabus pacing.
                    </td>
                  </tr>
                ) : (
                  schemes.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 12, fontWeight: 600 }}>
                        {s.subject?.name} &bull; {s.schoolClass?.name || s.form}
                      </td>
                      <td style={{ padding: 12 }}>Term {s.term}, {s.year}</td>
                      <td style={{ padding: 12 }}>{s.weeksPlanned || s.items?.length || 0} Weeks</td>
                      <td style={{ padding: 12 }}>
                        {s.status === 'hod_approved' || s.status === 'locked' ? (
                          <span style={{ color: '#15803d', fontWeight: 600 }}>
                            <i className="fas fa-check-circle mr-1" />
                            Approved {s.hodApprovedBy?.name ? `by ${s.hodApprovedBy.name}` : ''}
                          </span>
                        ) : s.status === 'pending_approval' ? (
                          <span style={{ color: '#b45309', fontWeight: 600 }}>
                            <i className="fas fa-clock mr-1" /> Under HOD Review
                          </span>
                        ) : s.status === 'rejected' ? (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>
                            <i className="fas fa-undo mr-1" /> Revision Requested
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>Draft</span>
                        )}
                      </td>
                      <td style={{ padding: 12 }}>
                        <span className={`portal-badge ${
                          s.status === 'hod_approved' || s.status === 'locked' ? 'success' :
                          s.status === 'pending_approval' ? 'warning' :
                          s.status === 'rejected' ? 'danger' : 'neutral'
                        }`}>
                          {s.status === 'hod_approved' ? 'Approved' :
                           s.status === 'locked' ? 'Locked' :
                           s.status === 'pending_approval' ? 'Under Review' :
                           s.status === 'rejected' ? 'Rejected' : 'Draft'}
                        </span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="portal-btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                            onClick={() => setViewScheme(s)}
                          >
                            View Items
                          </button>
                          {s.status === 'draft' && (
                            <button
                              className="portal-btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '0.85rem', color: '#0284c7' }}
                              onClick={() => handleSubmitScheme(s.id)}
                            >
                              Submit
                            </button>
                          )}
                          {(s.status === 'pending_approval' || s.status === 'draft') && isHodOrAdmin && (
                            <button
                              className="portal-btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '0.85rem', color: '#16a34a' }}
                              onClick={() => handleApproveScheme(s.id)}
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* View Scheme Items Modal */}
            {viewScheme && (
              <div className="portal-modal-overlay">
                <div className="portal-modal-content" style={{ maxWidth: 700, background: '#fff', borderRadius: 8 }}>
                  <div className="portal-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                      Scheme Items: {viewScheme.subject?.name} ({viewScheme.form})
                    </h2>
                    <button className="portal-btn-ghost" onClick={() => setViewScheme(null)}><i className="fas fa-times" /></button>
                  </div>
                  <div style={{ padding: 20, maxHeight: 450, overflowY: 'auto' }}>
                    <table className="portal-table" style={{ width: '100%' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                          <th style={{ padding: 8 }}>Week</th>
                          <th style={{ padding: 8 }}>Topic / SubTopic</th>
                          <th style={{ padding: 8 }}>Activities</th>
                          <th style={{ padding: 8 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewScheme.items || []).map((it: any) => (
                          <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: 8, fontWeight: 700 }}>Wk {it.week}</td>
                            <td style={{ padding: 8 }}>{it.subTopic || it.syllabusTopic?.topic || 'Topic'}</td>
                            <td style={{ padding: 8, fontSize: '0.85rem', color: '#475569' }}>{it.activities || 'Activities'}</td>
                            <td style={{ padding: 8 }}><span className="portal-badge neutral">{it.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* New Scheme Modal */}
            {showSchemeModal && (
              <div className="portal-modal-overlay">
                <div className="portal-modal-content" style={{ maxWidth: 520, background: '#fff', borderRadius: 8 }}>
                  <div className="portal-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>New Scheme of Work Draft</h2>
                    <button className="portal-btn-ghost" onClick={() => setShowSchemeModal(false)}><i className="fas fa-times" /></button>
                  </div>
                  <form onSubmit={handleCreateScheme} style={{ padding: 20 }}>
                    <div className="portal-form-group" style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Subject *</label>
                      <select
                        className="portal-input"
                        required
                        value={newScheme.subjectId}
                        onChange={e => setNewScheme({ ...newScheme, subjectId: e.target.value })}
                      >
                        <option value="">Select subject...</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code || ''})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                      <div className="portal-form-group">
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Class</label>
                        <select
                          className="portal-input"
                          value={newScheme.classId}
                          onChange={e => setNewScheme({ ...newScheme, classId: e.target.value })}
                        >
                          <option value="">Select class (optional)...</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="portal-form-group">
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Form / Grade</label>
                        <input
                          type="text"
                          className="portal-input"
                          value={newScheme.form}
                          onChange={e => setNewScheme({ ...newScheme, form: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                      <div className="portal-form-group">
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Term (1-3) *</label>
                        <input
                          type="number"
                          min="1"
                          max="3"
                          className="portal-input"
                          value={newScheme.term}
                          onChange={e => setNewScheme({ ...newScheme, term: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="portal-form-group">
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Year *</label>
                        <input
                          type="number"
                          className="portal-input"
                          value={newScheme.year}
                          onChange={e => setNewScheme({ ...newScheme, year: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="portal-form-group">
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Weeks</label>
                        <input
                          type="number"
                          min="1"
                          max="15"
                          className="portal-input"
                          value={newScheme.weeksCount}
                          onChange={e => setNewScheme({ ...newScheme, weeksCount: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="portal-form-group" style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Curriculum Syllabus</label>
                      <select
                        className="portal-input"
                        value={newScheme.syllabusId}
                        onChange={e => setNewScheme({ ...newScheme, syllabusId: e.target.value })}
                      >
                        <option value="">Link to Syllabus (optional)...</option>
                        {syllabi.map(s => (
                          <option key={s.id} value={s.id}>{s.subject?.name} • {s.form} ({s.curriculum})</option>
                        ))}
                      </select>
                    </div>

                    <div className="portal-form-group" style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Pedagogical Comments / Goals</label>
                      <textarea
                        className="portal-input"
                        rows={2}
                        placeholder="Departmental objectives and pacing targets..."
                        value={newScheme.comments}
                        onChange={e => setNewScheme({ ...newScheme, comments: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button type="button" className="portal-btn-secondary" onClick={() => setShowSchemeModal(false)}>Cancel</button>
                      <button type="submit" className="portal-btn-primary">Create Scheme Draft</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'lesson-plans' && <TeacherLessonPlanner />}

        {activeTab === 'observations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div className="portal-card" style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Observations</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0', color: '#0f172a' }}>{observations.length}</h3>
                <span style={{ fontSize: '0.85rem', color: '#15803d' }}>Continuous Quality Assurance</span>
              </div>
              <div className="portal-card" style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Department Average</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0', color: '#0284c7' }}>
                  {(observations.reduce((s, o) => s + o.overallScore, 0) / (observations.length || 1)).toFixed(1)} / 5.0
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Target: &gt; 4.0 Standard</span>
              </div>
              <div className="portal-card" style={{ padding: 20, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Your Role</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '8px 0', color: '#334155' }}>
                  {isHodOrAdmin ? 'Observer / Evaluator' : 'Teacher (View Only)'}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {isHodOrAdmin ? 'Full rating & appraisal authority' : 'Receives feedback & acknowledges'}
                </span>
              </div>
            </div>

            <div className="portal-card" style={{ padding: 24, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>Lesson Observation Feedback Records</h2>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Instructional evaluations, rubric scores, and continuous professional development feedback.
                  </p>
                </div>
                <button
                  type="button"
                  className="portal-btn-primary"
                  onClick={() => setShowObsModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontSize: '0.88rem', fontWeight: 700 }}
                >
                  <i className="fas fa-plus" />
                  Record Lesson Observation
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {observations.map(obs => (
                  <div key={obs.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 18, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                            {obs.subject} &mdash; {obs.class} ({obs.topic})
                          </h4>
                          <span className={`portal-badge ${obs.status === 'Acknowledged' ? 'success' : 'info'}`}>
                            {obs.status}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                          Teacher: <strong>{obs.teacherName}</strong> &bull; Observed by: <strong>{obs.observerName}</strong> on {obs.date}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7' }}>{obs.overallScore} / 5.0</div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Overall Appraisal</span>
                      </div>
                    </div>

                    {/* Criteria Rubric */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 14 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Planning</div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{obs.ratings.planning} / 5</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Delivery</div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{obs.ratings.delivery} / 5</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Engagement</div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{obs.ratings.engagement} / 5</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Management</div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{obs.ratings.management} / 5</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Assessment</div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{obs.ratings.assessment} / 5</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                      <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 6, border: '1px solid #bbf7d0' }}>
                        <strong style={{ color: '#166534', fontSize: '0.85rem' }}><i className="fas fa-check-circle mr-1" /> Commendable Strengths</strong>
                        <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#14532d' }}>{obs.strengths}</p>
                      </div>
                      <div style={{ background: '#eff6ff', padding: 12, borderRadius: 6, border: '1px solid #bfdbfe' }}>
                        <strong style={{ color: '#1e40af', fontSize: '0.85rem' }}><i className="fas fa-lightbulb mr-1" /> Actionable Recommendations</strong>
                        <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#1e3a8a' }}>{obs.growthAreas}</p>
                      </div>
                    </div>

                    {obs.status !== 'Acknowledged' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <button 
                          className="portal-btn-primary" 
                          style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                          onClick={() => handleAcknowledge(obs.id)}
                        >
                          <i className="fas fa-check mr-1" /> Acknowledge Feedback
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Observation Modal for HODs */}
      {showObsModal && (
        <div className="portal-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="portal-card" style={{ width: '90%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Record Lesson Observation (HOD Rating)</h3>
              <button onClick={() => setShowObsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
            </div>
            <form onSubmit={handleCreateObservation}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Teacher Name</label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    required 
                    value={newObs.teacherName} 
                    onChange={e => setNewObs({ ...newObs, teacherName: e.target.value })} 
                    placeholder="e.g. C. Moyo"
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Subject</label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    required 
                    value={newObs.subject} 
                    onChange={e => setNewObs({ ...newObs, subject: e.target.value })} 
                    placeholder="e.g. Mathematics"
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Class / Room</label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    required 
                    value={newObs.class} 
                    onChange={e => setNewObs({ ...newObs, class: e.target.value })} 
                    placeholder="e.g. Form 3A"
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Topic / Lesson Plan</label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    required 
                    value={newObs.topic} 
                    onChange={e => setNewObs({ ...newObs, topic: e.target.value })} 
                    placeholder="e.g. Quadratic Functions"
                    style={{ width: '100%', padding: 8, marginTop: 4 }}
                  />
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 12 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#1e293b' }}>Rubric Scores (Scale 1 to 5)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', display: 'block' }}>Planning</label>
                    <input 
                      type="number" min="1" max="5" className="portal-input"
                      value={newObs.planning}
                      onChange={e => setNewObs({ ...newObs, planning: Number(e.target.value) })}
                      style={{ width: '100%', padding: 6 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', display: 'block' }}>Delivery</label>
                    <input 
                      type="number" min="1" max="5" className="portal-input"
                      value={newObs.delivery}
                      onChange={e => setNewObs({ ...newObs, delivery: Number(e.target.value) })}
                      style={{ width: '100%', padding: 6 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', display: 'block' }}>Engagement</label>
                    <input 
                      type="number" min="1" max="5" className="portal-input"
                      value={newObs.engagement}
                      onChange={e => setNewObs({ ...newObs, engagement: Number(e.target.value) })}
                      style={{ width: '100%', padding: 6 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', display: 'block' }}>Management</label>
                    <input 
                      type="number" min="1" max="5" className="portal-input"
                      value={newObs.management}
                      onChange={e => setNewObs({ ...newObs, management: Number(e.target.value) })}
                      style={{ width: '100%', padding: 6 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', display: 'block' }}>Assessment</label>
                    <input 
                      type="number" min="1" max="5" className="portal-input"
                      value={newObs.assessment}
                      onChange={e => setNewObs({ ...newObs, assessment: Number(e.target.value) })}
                      style={{ width: '100%', padding: 6 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Strengths Observed</label>
                <textarea 
                  className="portal-input" rows={2} required
                  value={newObs.strengths}
                  onChange={e => setNewObs({ ...newObs, strengths: e.target.value })}
                  placeholder="Key positive instructional strategies observed..."
                  style={{ width: '100%', padding: 8, marginTop: 4 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Recommendations & Next Steps</label>
                <textarea 
                  className="portal-input" rows={2} required
                  value={newObs.growthAreas}
                  onChange={e => setNewObs({ ...newObs, growthAreas: e.target.value })}
                  placeholder="Concrete actionable improvements for subsequent lessons..."
                  style={{ width: '100%', padding: 8, marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowObsModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary">Submit Evaluation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
