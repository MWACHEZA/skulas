import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';

export default function ManageCBT() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/teacher';

  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Active' | 'Expired' | 'Pending'>('Pending');

  // Creation Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    classId: '',
    sectionId: '',
    subjectId: '',
    date: '',
    time: '',
    passingPercent: 50,
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/cbt');
      setExams(res.data || []);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to fetch exams', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [classRes, subjRes, sectRes] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/subjects'),
        api.get('/api/classes/sections')
      ]);
      setClasses(classRes.data || []);
      setSubjects(subjRes.data || []);
      setSections(sectRes.data || []);
    } catch (error) {
      console.error('Failed to load initial cbt data');
    
    }
  };

  useEffect(() => {
    fetchExams();
    fetchInitialData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.title || !createFormData.date || !createFormData.time || !createFormData.subjectId) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...createFormData,
        classId: createFormData.classId || null,
        sectionId: createFormData.sectionId || null,
        subjectId: createFormData.subjectId || null
      };
      const res = await api.post('/api/cbt', payload);
      if (res.data?.success) {
        showToast('CBT Exam created successfully!', 'success');
        setCreateFormData({
          title: '',
          classId: '',
          sectionId: '',
          subjectId: '',
          date: '',
          time: '',
          passingPercent: 50,
        });
        setIsCreateModalOpen(false);
        fetchExams();
      } else {
        throw new Error(res.data?.error || 'Failed to create exam');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    try {
      await api.delete(`/api/cbt/${id}`);
      showToast('Exam deleted successfully', 'success');
      fetchExams();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete exam', 'error');
    
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await api.put(`/api/cbt/${id}`, { status: 'Active' });
      showToast('Exam published successfully', 'success');
      fetchExams();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to publish exam', 'error');
    
    }
  };

  const filteredExams = exams.filter(e => e.status === activeTab);

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Manage CBT Exams</h1>
          <p>View and manage all computer-based tests.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="portal-btn-primary">
          <i className="fas fa-plus mr-2"></i> Create CBT Exam
        </button>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ padding: 0 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            <button 
              style={{ padding: '15px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'Pending' ? '2px solid var(--school-primary, #3182ce)' : 'none', color: activeTab === 'Pending' ? 'var(--school-primary, #3182ce)' : '#4a5568', fontWeight: activeTab === 'Pending' ? 'bold' : 'normal', cursor: 'pointer' }}
              onClick={() => setActiveTab('Pending')}
            >
              Pending Exams
            </button>
            <button 
              style={{ padding: '15px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'Active' ? '2px solid var(--school-primary, #3182ce)' : 'none', color: activeTab === 'Active' ? 'var(--school-primary, #3182ce)' : '#4a5568', fontWeight: activeTab === 'Active' ? 'bold' : 'normal', cursor: 'pointer' }}
              onClick={() => setActiveTab('Active')}
            >
              Active Exams
            </button>
            <button 
              style={{ padding: '15px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'Expired' ? '2px solid var(--school-primary, #3182ce)' : 'none', color: activeTab === 'Expired' ? 'var(--school-primary, #3182ce)' : '#4a5568', fontWeight: activeTab === 'Expired' ? 'bold' : 'normal', cursor: 'pointer' }}
              onClick={() => setActiveTab('Expired')}
            >
              Expired Exams
            </button>
          </div>
        </div>
        <div className="portal-card-body">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>Loading exams...</div>
          ) : filteredExams.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
              <i className="fas fa-folder-open fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
              <p>No {activeTab.toLowerCase()} exams found.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Exam Name</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Questions</th>
                    <th>Options</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.map(exam => (
                    <tr key={exam.id}>
                      <td style={{ fontWeight: 600 }}>{exam.title}</td>
                      <td>{exam.class?.name || 'Any Class'}</td>
                      <td>{exam.subject?.name || 'Any Subject'}</td>
                      <td>
                        {new Date(exam.date).toLocaleDateString()} at {exam.time}
                      </td>
                      <td>
                        <span style={{ 
                          padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600,
                          backgroundColor: exam.status === 'Active' ? '#c6f6d5' : exam.status === 'Expired' ? '#fed7d7' : '#e2e8f0',
                          color: exam.status === 'Active' ? '#22543d' : exam.status === 'Expired' ? '#822727' : '#4a5568'
                        }}>
                          {exam.status}
                        </span>
                      </td>
                      <td>{exam._count?.questions || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="portal-btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => navigate(`${basePath}/cbt/manage/${exam.id}/questions`)}>
                            <i className="fas fa-plus"></i> Questions
                          </button>
                          {exam.status === 'Pending' && (
                            <button className="portal-btn-primary" style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'var(--portal-success)', borderColor: 'var(--portal-success)' }} onClick={() => handlePublish(exam.id)}>
                              <i className="fas fa-upload"></i> Publish
                            </button>
                          )}
                          <button className="portal-btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => handleDelete(exam.id)}>
                            <i className="fas fa-trash" style={{ color: 'var(--portal-danger)' }}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {isCreateModalOpen && (
        <div className="portal-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div 
            className="portal-modal-card animate-in zoom-in duration-200" 
            style={{ maxWidth: 800, width: '90%', padding: '24px', position: 'relative', background: 'white', color: '#1e293b' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>
                Create CBT Exam
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="portal-form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Exam Title <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" 
                  className="portal-input" 
                  placeholder="e.g. Mid Term Exam" 
                  value={createFormData.title}
                  onChange={e => setCreateFormData({...createFormData, title: e.target.value})}
                  required 
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '16px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Class / Level <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    className="portal-input" 
                    value={createFormData.classId}
                    onChange={e => setCreateFormData({...createFormData, classId: e.target.value})}
                    required
                  >
                    <option value="">Select Class...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Section</label>
                  <select 
                    className="portal-input" 
                    value={createFormData.sectionId}
                    onChange={e => setCreateFormData({...createFormData, sectionId: e.target.value})}
                  >
                    <option value="">All Sections</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="portal-form-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label">Subject <span style={{ color: 'red' }}>*</span></label>
                <select 
                  className="portal-input" 
                  value={createFormData.subjectId}
                  onChange={e => setCreateFormData({...createFormData, subjectId: e.target.value})}
                  required
                >
                  <option value="">Select Subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '24px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Exam Date <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="date" 
                    className="portal-input" 
                    value={createFormData.date}
                    onChange={e => setCreateFormData({...createFormData, date: e.target.value})}
                    required 
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Time <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="time" 
                    className="portal-input" 
                    value={createFormData.time}
                    onChange={e => setCreateFormData({...createFormData, time: e.target.value})}
                    required 
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Passing Percentage (%) <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="number" 
                    className="portal-input" 
                    min="0" max="100"
                    value={createFormData.passingPercent}
                    onChange={e => setCreateFormData({...createFormData, passingPercent: Number(e.target.value)})}
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="portal-btn-ghost" style={{ padding: '10px 20px', fontWeight: 800 }}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={submitting} style={{ padding: '10px 24px', fontWeight: 900 }}>
                  {submitting ? 'Creating...' : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
