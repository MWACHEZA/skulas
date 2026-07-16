import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';

export default function AdminClasses() {
  const { user } = useAuth();

  const getLevelsForSchool = () => {
    const type = (user?.schoolType || '').toLowerCase();
    if (type.includes('university') || type.includes('varsity') || type.includes('tertiary') || type.includes('college')) {
      return [
        'Year 1 Semester 1', 'Year 1 Semester 2',
        'Year 2 Semester 1', 'Year 2 Semester 2',
        'Year 3 Semester 1', 'Year 3 Semester 2',
        'Year 4 Semester 1', 'Year 4 Semester 2',
        'Postgraduate Semester 1', 'Postgraduate Semester 2'
      ];
    }
    if (type.includes('nursing') || type.includes('medical')) {
      return ['First Year', 'Second Year', 'Third Year'];
    }
    if (type.includes('primary')) {
      return ['ECD A', 'ECD B', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'];
    }
    return ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Lower Six', 'Upper Six'];
  };

  const defaultLevel = getLevelsForSchool()[0] || 'Form 1';

  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', level: defaultLevel, teacherId: '', capacity: '', sectionId: '' });
  
  const [assignData, setAssignData] = useState({ subjectId: '', teacherId: '' });
  const [assigning, setAssigning] = useState(false);

  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);
  const [migratingClass, setMigratingClass] = useState<any>(null);
  const [migrateData, setMigrateData] = useState({ targetClassId: '', targetPart: '1' });
  const [isMigrating, setIsMigrating] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
    fetchSections();
  }, []);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName) return;
    setIsAddingSection(true);
    try {
      await api.post('/api/classes/sections', { name: newSectionName });
      showToast('Section created!', 'success');
      setNewSectionName('');
      fetchSections();
    } catch (err) {
      showToast('Failed to create section', 'error');
    
    } finally {
      setIsAddingSection(false);
    }
  };

  const fetchData = async () => {
    try {
      const [clsRes, teaRes, subRes] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/teachers'),
        api.get('/api/subjects')
      ]);
      setClasses(Array.isArray(clsRes.data) ? clsRes.data : []);
      setTeachers(Array.isArray(teaRes.data.teachers) ? teaRes.data.teachers : []);
      setSubjects(Array.isArray(subRes.data) ? subRes.data : []);
    } catch (err) {
      showToast('Failed to load data', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const res = await api.get('/api/classes/sections');
      setSections(res.data);
    } catch (err) {
      console.error('Failed to load sections');
    
    }
  };

  const calculateGenderStats = (students: any[]) => {
    const total = students.length;
    if (total === 0) return { boys: 0, girls: 0, na: 0 };
    
    const boys = students.filter(s => {
      const g = s.gender?.toLowerCase();
      return g === 'male' || g === 'boy' || g === 'm';
    }).length;
    const girls = students.filter(s => {
      const g = s.gender?.toLowerCase();
      return g === 'female' || g === 'girl' || g === 'f';
    }).length;
    const na = total - (boys + girls);
    
    return {
      boys: Math.round((boys / total) * 100),
      girls: Math.round((girls / total) * 100),
      na: Math.round((na / total) * 100),
      counts: { boys, girls, na }
    };
  };

  const handleOpenModal = (cls: any = null) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({ 
        name: cls.name, 
        level: cls.level, 
        teacherId: cls.teacherId || '', 
        capacity: cls.capacity || '',
        sectionId: cls.sectionId || ''
      });
    } else {
      setEditingClass(null);
      setFormData({ name: '', level: defaultLevel, teacherId: '', capacity: '', sectionId: '' });
    }
    setAssignData({ subjectId: '', teacherId: '' });
    setIsModalOpen(true);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fData = new FormData();
    fData.append('file', file);

    setUploading(true);
    try {
      await api.post('/api/classes/bulk-upload', fData);
      showToast('Classes uploaded successfully', 'success');
      fetchData();
    } catch (err) {
      showToast('Bulk upload failed', 'error');
    
    } finally {
      setUploading(false);
    }
  };

  const handleOpenMigrateModal = (cls: any) => {
    setMigratingClass(cls);
    setMigrateData({ targetClassId: '', targetPart: '1' });
    setIsMigrateModalOpen(true);
  };

  const handleMigrate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!migrateData.targetClassId) return showToast('Please select a target class', 'warning');
    
    setIsMigrating(true);
    try {
      const { data: students } = await api.get(`/api/students/by-class/${migratingClass.id}`);
      const studentIds = students.map((s: any) => s.id);
      
      if (studentIds.length === 0) {
        setIsMigrating(false);
        return showToast('No students in this class to migrate.', 'warning');
      }

      await api.post('/api/students/migrate', {
        studentIds,
        targetClassId: migrateData.targetClassId,
        targetPart: migrateData.targetPart
      });

      showToast(`Successfully migrated ${studentIds.length} students to the new class!`, 'success');
      setIsMigrateModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Migration failed', 'error');
    
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClass) {
        await api.put(`/api/classes/${editingClass.id}`, formData);
        showToast('Class updated!', 'success');
      } else {
        await api.post('/api/classes', formData);
        showToast('Class created!', 'success');
      }
      setIsModalOpen(false);
      fetchData();
      setFormData({ name: '', level: defaultLevel, teacherId: '', capacity: '', sectionId: '' });
    } catch (err) {
      showToast('Action failed', 'error');
    
    }
  };

  return (
    <div className="portal-content">
      <div className="portal-header">
        <div className="header-title">
          <h1>Classes Management</h1>
          <p>Organize your institution into manageable academic cohorts.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
          <button className="portal-btn-primary" style={{ background: '#6366f1' }} onClick={() => setIsSectionModalOpen(true)}>
            <i className="fas fa-layer-group mr-2"></i> Manage Sections
          </button>
          <label className="portal-btn-primary" style={{ background: '#059669', cursor: 'pointer', padding: '10px 20px', borderRadius: '12px', fontWeight: 800 }}>
            <i className="fas fa-file-excel mr-2"></i> {uploading ? 'Uploading...' : 'Bulk Upload'}
            <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleBulkUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="portal-grid" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>
            <div className="portal-spinner"></div>
            <p style={{ marginTop: '1rem', color: 'var(--portal-primary)', fontWeight: 600 }}>Gathering academic cohorts...</p>
          </div>
        ) : (
          <>
            {(Array.isArray(classes) ? classes : []).map(c => {
              const stats = calculateGenderStats(c.students || []);
              return (
                <div key={c.id} className="portal-card animate-in" style={{
                  aspectRatio: '1 / 1',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '24px',
                  boxSizing: 'border-box'
                }}>
                  <div className="portal-card-header" style={{ border: 'none', padding: 0, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }} title={c.name}>{c.name}</h3>
                      <div className="portal-badge" style={{ background: 'var(--portal-bg)', color: 'var(--portal-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block' }}>Level: {c.level}</div>
                    </div>
                    <div className="action-buttons">
                      <button className="btn-icon" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', marginRight: '4px' }} onClick={() => handleOpenMigrateModal(c)} title="Migrate Cohort"><i className="fas fa-random"></i></button>
                      <button className="btn-icon btn-edit" onClick={() => handleOpenModal(c)} title="Edit Class"><i className="fas fa-edit"></i></button>
                      <button className="btn-icon btn-delete" title="Delete Class" onClick={async () => {
                          if (await toastConfirm(`Delete class ${c.name}?`)) {
                            try {
                              await api.delete(`/api/classes/${c.id}`);
                              showToast('Class deleted successfully', 'success');
                              fetchData();
                            } catch (err) {
                              showToast('Failed to delete class', 'error');
                            
    }
                          }
                        }}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem', padding: '4px 0' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--portal-primary)', lineHeight: 1 }}>{c._count?.students || 0}</div>
                    <div>
                      <div style={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px', color: '#64748b' }}>Students</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Enrolled</div>
                    </div>
                    <div style={{ flex: 1 }} />
                    <div style={{ textAlign: 'right' }}>
                       <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b' }}>{c.capacity || '∞'}</div>
                       <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Capacity</div>
                    </div>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(0, 86, 179, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-graduation-cap" style={{ fontSize: '1.25rem', color: 'var(--portal-primary)' }}></i>
                    </div>
                  </div>
                  {c.section && (
                    <div style={{ marginBottom: '0.75rem', padding: '6px 12px', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fas fa-clock" style={{ color: '#64748b', fontSize: '0.8rem' }}></i>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Session: {c.section.name}</span>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div className="stat-circle" style={{ borderColor: '#3b82f6', color: '#3b82f6', width: '45px', height: '45px', fontSize: '0.8rem', borderWidth: '3px', margin: '0 auto 4px' }}>{stats.boys}%</div>
                      <div className="stat-label" style={{ fontSize: '0.6rem' }}>Boys</div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{stats.counts?.boys || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="stat-circle" style={{ borderColor: '#ec4899', color: '#ec4899', width: '45px', height: '45px', fontSize: '0.8rem', borderWidth: '3px', margin: '0 auto 4px' }}>{stats.girls}%</div>
                      <div className="stat-label" style={{ fontSize: '0.6rem' }}>Girls</div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{stats.counts?.girls || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="stat-circle" style={{ borderColor: '#94a3b8', color: '#64748b', width: '45px', height: '45px', fontSize: '0.8rem', borderWidth: '3px', margin: '0 auto 4px' }}>{stats.na}%</div>
                      <div className="stat-label" style={{ fontSize: '0.6rem' }}>N/A</div>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{stats.counts?.na || 0}</div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="portal-card animate-in" onClick={() => handleOpenModal()} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              aspectRatio: '1 / 1',
              border: '2px dashed #e2e8f0',
              background: 'transparent',
              cursor: 'pointer',
              boxShadow: 'none',
              padding: '24px',
              boxSizing: 'border-box'
            }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 86, 179, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <i className="fas fa-plus" style={{ fontSize: '1.2rem', color: 'var(--portal-primary)' }}></i>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>Add New Class</span>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', textAlign: 'center' }}>Create a new academic group</p>
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: editingClass ? '900px' : '500px' }}>
            <div className="portal-modal-header">
              <div className="header-titles">
                <h2>{editingClass ? `Edit Class: ${editingClass.name}` : 'Initialize New Class'}</h2>
                <span>{editingClass ? 'Manage students and faculty assignments' : 'Set up a new academic cohort'}</span>
              </div>
              <button className="close-panel" onClick={() => setIsModalOpen(false)} style={{ top: '24px', right: '32px' }}>&times;</button>
            </div>
            
            <div className="portal-modal-body" style={{ 
              display: 'grid', 
              gridTemplateColumns: editingClass ? '1fr 1.2fr' : '1fr', 
              gap: '40px',
              padding: '32px'
            }}>
              <section>
                <div className="form-section-header" style={{ marginBottom: '24px' }}>General Information</div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="portal-label">Class Name</label>
                    <input 
                      type="text" 
                      className="portal-input"
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="e.g. Form 1A" 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="portal-label">Academic Level</label>
                    <select 
                      className="portal-input"
                      value={formData.level} 
                      onChange={e => setFormData({...formData, level: e.target.value})}
                    >
                      {getLevelsForSchool().map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="portal-label">Class Teacher (HOD)</label>
                    <select 
                      className="portal-input"
                      value={formData.teacherId} 
                      onChange={e => setFormData({...formData, teacherId: e.target.value})}
                    >
                      <option value="">No Teacher Assigned</option>
                      {(Array.isArray(teachers) ? teachers : []).map(t => (
                        <option key={t.id} value={t.id}>{t.user?.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '24px' }}>
                    <div className="form-group">
                      <label className="portal-label">Class Capacity</label>
                      <input 
                        type="number" className="portal-input"
                        value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})}
                        placeholder="e.g. 40"
                      />
                    </div>
                    <div className="form-group">
                      <label className="portal-label">School Section / Session</label>
                      <select 
                        className="portal-input"
                        value={formData.sectionId} onChange={e => setFormData({...formData, sectionId: e.target.value})}
                      >
                        <option value="">No Section</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="portal-btn-primary" style={{ width: '100%' }}>
                    <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                    Update Basic Details
                  </button>
                </form>

                {editingClass && (
                  <div style={{ marginTop: '32px' }}>
                    <div className="form-section-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                      Students Enrolled
                      <span className="portal-badge info">{editingClass.students?.length || 0}</span>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <table className="portal-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Sex</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(editingClass.students || []).map((s: any) => (
                            <tr key={s.id}>
                              <td style={{ fontFamily: 'monospace' }}>{s.studentId}</td>
                              <td style={{ fontWeight: 600 }}>{s.name}</td>
                              <td>{s.gender?.charAt(0).toUpperCase()}</td>
                            </tr>
                          ))}
                          {(editingClass.students || []).length === 0 && (
                            <tr>
                              <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#a0aec0' }}>No students in this class.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>

              {/* Right Column: Subject Assignments (Only for existing classes) */}
              {editingClass && (
                <section style={{ borderLeft: '1px solid var(--portal-border)', paddingLeft: '32px' }}>
                  <h3 className="section-title" style={{ fontSize: '0.9rem', color: 'var(--portal-primary)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Subject Faculty Assignments
                  </h3>
                  
                  {/* Quick Assign Form */}
                  <div className="quick-assign-box" style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '16px', 
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: '1px dashed var(--portal-border)'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <select 
                        className="form-control" 
                        style={{ fontSize: '0.8rem' }}
                        value={assignData.subjectId}
                        onChange={e => setAssignData({...assignData, subjectId: e.target.value})}
                      >
                        <option value="">Select Subject...</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select 
                        className="form-control" 
                        style={{ fontSize: '0.8rem' }}
                        value={assignData.teacherId}
                        onChange={e => setAssignData({...assignData, teacherId: e.target.value})}
                      >
                        <option value="">Select Teacher...</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.user?.name}</option>)}
                      </select>
                    </div>
                    <button 
                      className="portal-btn-ghost" 
                      style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
                      disabled={!assignData.subjectId || !assignData.teacherId || assigning}
                      onClick={async () => {
                        setAssigning(true);
                        try {
                          await api.post(`/api/classes/${editingClass.id}/subject-teachers`, assignData);
                          showToast('Faculty assigned successfully', 'success');
                          setAssignData({ subjectId: '', teacherId: '' });
                          fetchData();
                        } catch (err) {
                          showToast('Assignment failed', 'error');
                        
    } finally {
                          setAssigning(false);
                        }
                      }}
                    >
                      {assigning ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-link"></i>} Assign Faculty
                    </button>
                  </div>

                  <div className="assignment-list" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '8px' }}>
                    {(Array.isArray(editingClass.subjectTeachers) ? editingClass.subjectTeachers : []).length > 0 ? (
                      editingClass.subjectTeachers.map((st: any) => (
                        <div key={st.id} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '12px', 
                          marginBottom: '8px',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{st.subject?.name}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{st.teacher?.user?.name}</div>
                          </div>
                          <button 
                            className="btn-icon btn-delete" 
                            style={{ padding: '6px', fontSize: '0.7rem' }}
                            onClick={async () => {
                              if (await toastConfirm('Remove this assignment?')) {
                                try {
                                  await api.delete(`/api/classes/${editingClass.id}/subject-teachers/${st.id}`);
                                  showToast('Assignment removed', 'success');
                                  fetchData();
                                } catch {
                                  showToast('Failed to remove assignment', 'error');
                                }
                              }
                            }}
                          >
                            <i className="fas fa-unlink"></i>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px', opacity: 0.5, fontSize: '0.8rem' }}>
                        <i className="fas fa-info-circle" style={{ display: 'block', fontSize: '1.5rem', marginBottom: '8px' }}></i>
                        No subjects assigned yet
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}

      {isMigrateModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '500px' }}>
            <div className="portal-modal-header">
              <div className="header-titles">
                <h2>Migrate Cohort</h2>
                <span>Move all students from {migratingClass?.name} to a new class</span>
              </div>
              <button className="close-panel" onClick={() => setIsMigrateModalOpen(false)} style={{ top: '24px', right: '32px' }}>&times;</button>
            </div>
            <div className="portal-modal-body" style={{ padding: '32px' }}>
              <form onSubmit={handleMigrate}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="portal-label">Target Class</label>
                  <select 
                    className="portal-input"
                    value={migrateData.targetClassId} 
                    onChange={e => setMigrateData({...migrateData, targetClassId: e.target.value})}
                    required
                  >
                    <option value="">-- Select Target Class --</option>
                    {classes.filter(c => c.id !== migratingClass?.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="portal-label">Academic Part/Term (Optional)</label>
                  <input 
                    type="text" 
                    className="portal-input"
                    value={migrateData.targetPart} 
                    onChange={e => setMigrateData({...migrateData, targetPart: e.target.value})} 
                    placeholder="e.g. 1" 
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="portal-btn-ghost" style={{ flex: 1 }} onClick={() => setIsMigrateModalOpen(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" style={{ flex: 1, background: '#10b981' }} disabled={isMigrating}>
                    {isMigrating ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Migrating...</> : <><i className="fas fa-random" style={{ marginRight: '8px' }}></i> Migrate Cohort</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isSectionModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '450px' }}>
            <div className="portal-modal-header">
              <div className="header-titles">
                <h2>Manage School Sections</h2>
                <span>Create sessions like Morning, Afternoon, or A/B</span>
              </div>
              <button className="close-panel" onClick={() => setIsSectionModalOpen(false)}>&times;</button>
            </div>
            <div className="portal-modal-body" style={{ padding: '24px' }}>
              <form onSubmit={handleAddSection} style={{ marginBottom: '24px', display: 'flex', gap: '10px' }}>
                <input 
                  type="text" className="portal-input" placeholder="New Section Name..." 
                  value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                />
                <button type="submit" className="portal-btn-primary" disabled={isAddingSection}>
                  {isAddingSection ? <i className="fas fa-spinner fa-spin"></i> : 'Add'}
                </button>
              </form>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {sections.map(s => (
                  <div key={s.id} className="portal-badge" style={{ background: 'var(--portal-bg)', color: 'var(--portal-primary)', padding: '8px 15px', borderRadius: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {s.name}
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--portal-danger)', cursor: 'pointer' }}
                      onClick={async () => {
                        if (await toastConfirm(`Delete section ${s.name}?`)) {
                          try {
                            // Assuming a delete endpoint exists or adding it
                            await api.delete(`/api/classes/sections/${s.id}`);
                            fetchSections();
                          } catch (err) {
                            showToast('Failed to delete section', 'error');
                          
    }
                        }
                      }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
                {sections.length === 0 && <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No sections created yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .stat-circle {
          width: 60px;
          height: 60px;
          border: 4px solid;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.9rem;
          margin: 0 auto 10px;
        }
        .stat-label { font-size: 0.7rem; color: var(--gray-400); text-transform: uppercase; font-weight: 700; }
        .stat-count { font-size: 0.8rem; font-weight: 800; }
        .add-new-card:hover { transform: translateY(-5px); border-color: var(--blue); }
      `}</style>
    </div>
  );
}
