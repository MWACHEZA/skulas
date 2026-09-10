import { useState, useEffect, useCallback } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { generateShortCode } from '../../../lib/utils';
import { useAcademicConfig } from '../../../hooks/useAcademicConfig';

export interface DepartmentItem {
  id: string;
  name: string;
  code?: string;
  deptCode?: string;
}

export interface ActiveTeacherItem {
  id: string;
  name: string;
  email?: string;
  classes?: string[];
}

export interface CreatorItem {
  id: string;
  name: string;
  role?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  code?: string;
  department?: string;
  departmentId?: string;
  credits?: number | string;
  isIndustrial?: boolean;
  isProject?: boolean;
  isSubsidiary?: boolean;
  caWeight?: number | string;
  examWeight?: number | string;
  dept?: DepartmentItem | null;
  creator?: CreatorItem | null;
  activeTeachers?: ActiveTeacherItem[];
  canEdit?: boolean;
  isAssignedToCaller?: boolean;
  _count?: {
    teachers?: number;
  };
}

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    code: '', 
    department: '', 
    departmentId: '', 
    credits: '0',
    isIndustrial: false,
    isProject: false,
    isSubsidiary: false,
    caWeight: '30',
    examWeight: '70'
  });
  
  const { showToast } = useToast();
  const { t, isUniversity, subjectLabel } = useAcademicConfig();

  const fetchData = useCallback(async () => {
    try {
      const [subsRes, deptsRes] = await Promise.all([
        api.get('/api/subjects'),
        api.get('/api/departments')
      ]);
      setSubjects(subsRes.data);
      setDepartments(deptsRes.data);
    } catch (err) {
      console.error('Failed to load subjects data:', err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (sub: SubjectItem | null = null) => {
    if (sub) {
      setEditingSubject(sub);
      setFormData({ 
        name: sub.name, 
        code: sub.code || '', 
        department: sub.department || '',
        departmentId: sub.departmentId || '',
        credits: sub.credits?.toString() || '0',
        isIndustrial: !!sub.isIndustrial,
        isProject: !!sub.isProject,
        isSubsidiary: !!sub.isSubsidiary,
        caWeight: sub.caWeight?.toString() || '30',
        examWeight: sub.examWeight?.toString() || '70'
      });
    } else {
      setEditingSubject(null);
      setFormData({ 
        name: '', 
        code: '', 
        department: '', 
        departmentId: '', 
        credits: '0',
        isIndustrial: false,
        isProject: false,
        isSubsidiary: false,
        caWeight: '30',
        examWeight: '70'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await api.put(`/api/subjects/${editingSubject.id}`, formData);
        showToast('Subject updated!', 'success');
      } else {
        await api.post('/api/subjects', formData);
        showToast('Subject created!', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save subject:', err);
      showToast('Action failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Are you sure? This will remove the subject from all curriculums.'))) return;
    try {
      await api.delete(`/api/subjects/${id}`);
      showToast('Subject removed', 'success');
      fetchData();
    } catch (err) {
      console.error('Failed to delete subject:', err);
      showToast('Failed to delete subject', 'error');
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Subjects Catalogue</h1>
        <p>Define and manage the curriculum subjects for your school.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-book" style={{ marginRight: 8, color: '#805ad5' }}></i>System Subjects</h2>
          <button 
            onClick={() => handleOpenModal()}
            className="portal-btn-primary"
            style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <i className="fas fa-plus-circle"></i> ADD SUBJECT
          </button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>{subjectLabel || t('subject')} Name</th>
                  <th>Code</th>
                  {isUniversity && <th>Credits</th>}
                  <th>Department</th>
                  <th>Active Teachers</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjects.length > 0 ? subjects.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{s.code || 'N/A'}</td>
                    {isUniversity && <td style={{ fontWeight: 700, color: 'var(--portal-primary)' }}>{s.credits || 0}</td>}
                    <td><span className="portal-badge neutral">{s.dept?.name || s.department || 'General'}</span></td>
                    <td>
                      {s.activeTeachers && s.activeTeachers.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {s.activeTeachers.map(at => (
                            <span 
                              key={at.id} 
                              className="portal-badge success" 
                              style={{ fontSize: '0.75rem', fontWeight: 600 }}
                              title={at.classes && at.classes.length > 0 ? `Classes: ${at.classes.join(', ')}` : 'Assigned Teacher'}
                            >
                              <i className="fas fa-chalkboard-teacher" style={{ marginRight: 4 }}></i>
                              {at.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="portal-badge neutral" style={{ opacity: 0.6, fontSize: '0.75rem' }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td>
                      {s.creator ? (
                        <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                          <span style={{ fontWeight: 600 }}>{s.creator.name}</span>
                          {s.creator.role && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.creator.role}</div>}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>System Admin</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
                        <button 
                          onClick={() => s.canEdit !== false && handleOpenModal(s)} 
                          className="portal-btn-ghost" 
                          title={s.canEdit === false ? "A teacher can only edit this subject if formally assigned to teach it." : "Edit"}
                          disabled={s.canEdit === false}
                          style={{ 
                            width: 36, 
                            height: 36, 
                            padding: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: s.canEdit === false ? '#94a3b8' : '#eab308',
                            cursor: s.canEdit === false ? 'not-allowed' : 'pointer',
                            opacity: s.canEdit === false ? 0.4 : 1
                          }}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          onClick={() => handleDelete(s.id)} 
                          className="portal-btn-ghost" 
                          title="Delete"
                          style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#718096' }}>No {subjectLabel.toLowerCase()}s defined in your catalog.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>{editingSubject ? 'Edit Subject' : 'New Subject'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="close-modal">&times;</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label>Subject Name</label>
                <input 
                  className="form-control" 
                  value={formData.name} 
                  required
                  placeholder="e.g. Mathematics"
                  onChange={e => {
                    const name = e.target.value;
                    setFormData({
                      ...formData, 
                      name,
                      code: generateShortCode(name)
                    });
                  }} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 15 }}>
                <label>{t('subject')} Code</label>
                <input 
                  className="form-control" 
                  value={formData.code} 
                  placeholder="e.g. CS101"
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              {isUniversity && (
                <div className="form-group" style={{ marginBottom: 15 }}>
                   <label>Course Credits (Units)</label>
                   <input 
                    type="number"
                    className="form-control" 
                    value={formData.credits} 
                    onChange={e => setFormData({ ...formData, credits: e.target.value })}
                    step="0.5"
                    min="0"
                  />
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>{t('department')}</label>
                <select 
                  className="form-control" 
                  value={formData.departmentId}
                  onChange={e => {
                    const dept = departments.find(d => d.id === e.target.value);
                    setFormData({
                      ...formData, 
                      departmentId: e.target.value,
                      department: dept ? dept.name : ''
                    });
                  }}
                >
                  <option value="">No Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} {d.deptCode ? `(${d.deptCode})` : ''}</option>
                  ))}
                </select>
              </div>

              {isUniversity && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginBottom: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input type="checkbox" checked={formData.isIndustrial} onChange={e => setFormData({...formData, isIndustrial: e.target.checked})} />
                      Industrial
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input type="checkbox" checked={formData.isProject} onChange={e => setFormData({...formData, isProject: e.target.checked})} />
                      Project
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input type="checkbox" checked={formData.isSubsidiary} onChange={e => setFormData({...formData, isSubsidiary: e.target.checked})} />
                      Subsidiary
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
                    <div className="form-group">
                      <label>CA Weight (%)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={formData.caWeight} 
                        onChange={e => {
                          const ca = e.target.value;
                          setFormData({ ...formData, caWeight: ca, examWeight: (100 - parseInt(ca || '0')).toString() });
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Exam Weight (%)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={formData.examWeight} 
                        readOnly
                        style={{ background: '#f7fafc' }}
                      />
                    </div>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="portal-btn-primary">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
