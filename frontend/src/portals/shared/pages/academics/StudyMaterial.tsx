import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';
import { useTerminology } from '../../../../hooks/useTerminology';
import { format } from 'date-fns';
import { useAuth } from '../../../../contexts/AuthContext';
import { SkeletonLoader, SearchInput } from '../../../../components/shared';

export default function StudyMaterial() {
  const { showToast } = useToast();
  const { t } = useTerminology();
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Folder Explorer State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    classIds: [] as string[],
    subjectId: '',
    description: '',
    documentBase64: '',
    videoUrl: ''
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchMaterials(), fetchClasses(), fetchSubjects()]);
    } finally {
      setLoading(false);
    }
  };

  const getAuthenticatedUrl = (url: string) => {
    if (!url) return '';
    const token = localStorage.getItem('acadex_token');
    const tokenParam = token ? `?token=${token}` : '';
    return url.startsWith('http') ? `${url}${tokenParam}` : `${api.defaults.baseURL || ''}${url}${tokenParam}`;
  };

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/api/study-materials');
      setMaterials(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching materials', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching classes', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/api/subjects');
      const allSubjects = Array.isArray(res.data) ? res.data : (res.data?.subjects || []);
      if (user?.role === 'TEACHER') {
        const assignedIds = new Set(
          (user.teacher?.subjects || [])
            .map((s: any) => s.subjectId || s.subject?.id || s.id)
            .filter(Boolean)
        );
        const filtered = allSubjects.filter((s: any) => {
          if (assignedIds.size > 0 && assignedIds.has(s.id)) return true;
          if (s.teachers && Array.isArray(s.teachers)) {
            return s.teachers.some((t: any) =>
              t.teacher?.user?.id === user.id ||
              t.teacherId === user.teacher?.id ||
              t.teacher?.id === user.teacher?.id
            );
          }
          return false;
        });
        setSubjects(filtered.length > 0 ? filtered : allSubjects);
      } else {
        setSubjects(allSubjects);
      }
    } catch (error) {
      console.error('Error fetching subjects', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, documentBase64: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.date || formData.classIds.length === 0 || !formData.subjectId) {
      showToast('Please fill all required fields (title, date, subject, and at least one class)', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/study-materials', {
        title: formData.title,
        date: formData.date,
        classIds: formData.classIds,
        subjectId: formData.subjectId,
        description: formData.description,
        documentBase64: formData.documentBase64,
        videoUrl: formData.videoUrl
      });
      showToast('Study material published successfully', 'success');
      fetchMaterials();
      setFormData({
        title: '',
        date: new Date().toISOString().split('T')[0],
        classIds: [],
        subjectId: '',
        description: '',
        documentBase64: '',
        videoUrl: ''
      });
      setIsModalOpen(false);
    } catch (error) {
      showToast('Failed to save study material', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this study material?')) return;
    try {
      await api.delete(`/api/study-materials/${id}`);
      showToast('Study material deleted successfully', 'success');
      fetchMaterials();
    } catch (error) {
      showToast('Failed to delete study material', 'error');
    }
  };

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
  };

  const eligibleSubjects = useMemo(() => {
    if (user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN') {
      return subjects;
    }
    if (user?.role === 'TEACHER') {
      const assignedIds = user.teacher?.subjects?.map((ts: any) => ts.subjectId) || [];
      return subjects.filter(s => assignedIds.includes(s.id));
    }
    return subjects;
  }, [subjects, user]);

  // Group materials by subject
  const groupedMaterials = useMemo(() => {
    const groups: Record<string, any[]> = {};
    materials.forEach(m => {
      const subId = m.subjectId || 'Unassigned';
      if (!groups[subId]) groups[subId] = [];
      groups[subId].push(m);
    });
    return groups;
  }, [materials]);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const folderMaterials = selectedSubjectId ? (groupedMaterials[selectedSubjectId] || []) : [];

  const filteredSubjects = useMemo(() => {
    if (!searchTerm.trim()) return eligibleSubjects;
    const q = searchTerm.toLowerCase().trim();
    return eligibleSubjects.filter(s => (s.name || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q));
  }, [eligibleSubjects, searchTerm]);

  const filteredFolderMaterials = useMemo(() => {
    if (!searchTerm.trim()) return folderMaterials;
    const q = searchTerm.toLowerCase().trim();
    return folderMaterials.filter(m => (m.title || '').toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q));
  }, [folderMaterials, searchTerm]);

  const getFileBadge = (url: string) => {
    if (!url) return { label: 'Resource', icon: 'fa-file', color: '#64748b', bg: '#f1f5f9' };
    const lower = url.toLowerCase();
    if (lower.includes('youtube') || lower.includes('youtu.be') || lower.endsWith('.mp4') || lower.endsWith('.webm')) {
      return { label: 'Video Lecture', icon: 'fa-play-circle', color: '#dc2626', bg: '#fee2e2' };
    }
    if (lower.endsWith('.pdf')) {
      return { label: 'PDF Document', icon: 'fa-file-pdf', color: '#b91c1c', bg: '#fee2e2' };
    }
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
      return { label: 'Word Document', icon: 'fa-file-word', color: '#1d4ed8', bg: '#dbeafe' };
    }
    if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) {
      return { label: 'Slides / Presentation', icon: 'fa-file-powerpoint', color: '#c2410c', bg: '#ffedd5' };
    }
    return { label: 'Attachment', icon: 'fa-paperclip', color: '#475569', bg: '#f1f5f9' };
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Hero Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          color: '#ffffff',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(56, 189, 248, 0.16)', color: '#7dd3fc', fontSize: '0.8rem', fontWeight: 700, marginBottom: 10 }}>
            <i className="fas fa-book-open" /> Academic Curriculum & Content Repository
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#fff' }}>
            Study Material Explorer
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', maxWidth: 640 }}>
            Distribute class notes, syllabus guides, reading assignments, and multimedia resources across assigned classes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="portal-btn"
          style={{
            background: '#0284c7',
            color: '#fff',
            border: 'none'
          }}
        >
          <i className="fas fa-plus-circle" /> Add Study Material
        </button>
      </div>

      {/* Control Bar: Search & Counts */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14
        }}
      >
        <div style={{ flex: 1, minWidth: 260, maxWidth: 400 }}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={selectedSubjectId ? "Search files in folder..." : "Search subject folders..."}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {selectedSubjectId ? (
            <button
              type="button"
              onClick={() => { setSelectedSubjectId(null); setSearchTerm(''); }}
              className="portal-btn portal-btn-secondary"
            >
              <i className="fas fa-arrow-left" /> Back to Subject Folders
            </button>
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>
              {filteredSubjects.length} Subject {filteredSubjects.length === 1 ? 'Folder' : 'Folders'} Available
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <SkeletonLoader type="card" count={6} />
      ) : selectedSubjectId === null ? (
        /* SUBJECT FOLDERS GRID */
        filteredSubjects.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.75rem', marginBottom: 14 }}>
              <i className="fas fa-folder-open" />
            </div>
            <h3 style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: 700, margin: '0 0 6px 0' }}>
              No Subject Folders Found
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: 400, margin: '0 auto' }}>
              {searchTerm ? 'No subjects matched your filter criteria.' : 'No academic disciplines have been assigned yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {filteredSubjects.map(s => {
              const fileCount = (groupedMaterials[s.id] || []).length;
              return (
                <div
                  key={s.id}
                  onClick={() => { setSelectedSubjectId(s.id); setSearchTerm(''); }}
                  style={{
                    background: '#ffffff',
                    borderRadius: 14,
                    border: '1px solid #e2e8f0',
                    padding: '22px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
                    e.currentTarget.style.borderColor = '#0284c7';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        color: '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem'
                      }}
                    >
                      <i className="fas fa-folder" />
                    </div>

                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: fileCount > 0 ? '#e0f2fe' : '#f1f5f9', color: fileCount > 0 ? '#0369a1' : '#64748b' }}>
                      {fileCount} {fileCount === 1 ? 'file' : 'files'}
                    </span>
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {s.name}
                    </h3>
                    {s.code && (
                      <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#64748b', background: '#f8fafc', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                        {s.code}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 4 }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Explore Resources</span>
                    <i className="fas fa-chevron-right" style={{ fontSize: '0.8rem', color: '#94a3b8' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* FILES WITHIN SUBJECT FOLDER VIEW */
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                <i className="fas fa-folder-open" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedSubject?.name} Repository
                </h3>
                <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  {folderMaterials.length} study items and downloadable documents uploaded.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, subjectId: selectedSubjectId || '' }));
                setIsModalOpen(true);
              }}
              className="portal-btn"
              style={{ background: '#0284c7', color: '#fff', border: 'none' }}
            >
              <i className="fas fa-upload mr-1" /> Upload to this Subject
            </button>
          </div>

          {filteredFolderMaterials.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-folder-empty fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: '0 0 6px 0' }}>No Study Materials in this Folder</h4>
              <p style={{ fontSize: '0.9rem', maxWidth: 460, margin: '0 auto 20px' }}>
                Upload notes, textbook chapters, past exam papers, or video lecture links for your students.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, subjectId: selectedSubjectId || '' }));
                  setIsModalOpen(true);
                }}
                className="portal-btn portal-btn-primary"
              >
                <i className="fas fa-plus mr-1" /> Add First Document
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Upload Date</th>
                    <th>Material Title & Description</th>
                    <th style={{ width: '160px' }}>Type</th>
                    <th style={{ width: '160px' }}>Target Class</th>
                    <th style={{ width: '150px' }}>Uploaded By</th>
                    <th style={{ width: '160px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFolderMaterials.map(m => {
                    const badge = getFileBadge(m.documentUrl || m.videoUrl || '');
                    return (
                      <tr key={m.id}>
                        <td style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                          {m.date ? (isNaN(new Date(m.date).getTime()) ? '—' : format(new Date(m.date), 'dd MMM yyyy')) : '—'}
                        </td>
                        <td>
                          <div>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{m.title}</span>
                            {m.description && (
                              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b', maxWidth: 420 }}>
                                {m.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: 6,
                              background: badge.bg,
                              color: badge.color,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <i className={`fas ${badge.icon}`} /> {badge.label}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                            {m.class?.name || 'All Enrolled'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                          {m.teacher?.name || m.teacher?.user?.name || 'Teacher'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            {m.documentUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewMaterial(m)}
                                className="portal-btn"
                                style={{
                                  height: '32px',
                                  minHeight: '32px',
                                  padding: '0 10px',
                                  borderRadius: 6,
                                  background: '#f0f9ff',
                                  color: '#0284c7',
                                  border: '1px solid #bae6fd',
                                  fontSize: '0.8rem'
                                }}
                                title="Preview or Download"
                              >
                                <i className="fas fa-eye mr-1" /> View
                              </button>
                            )}

                            {(user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN' || m.teacherId === user?.teacher?.id) && (
                              <button
                                type="button"
                                onClick={() => handleDelete(m.id)}
                                className="portal-btn"
                                style={{
                                  height: '32px',
                                  minHeight: '32px',
                                  padding: '0 10px',
                                  borderRadius: 6,
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  fontSize: '0.8rem'
                                }}
                                title="Delete Document"
                              >
                                <i className="fas fa-trash" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADD STUDY MATERIAL MODAL */}
      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: '640px' }}>
            <div className="portal-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Publish Study Material</h3>
              <button className="portal-btn-ghost" onClick={() => setIsModalOpen(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="portal-modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="portal-label">Document Title <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="e.g. Unit 3 Revision Notes & Exercises"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="portal-label">Publication Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="date"
                  className="portal-input"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="portal-label">{t('subject')} Discipline <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  className="portal-input"
                  value={formData.subjectId}
                  onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                  required
                >
                  <option value="">-- Select Subject --</option>
                  {eligibleSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="portal-label">Attach Resource File (PDF, DOCX, PPT)</label>
                <input
                  type="file"
                  className="portal-input"
                  style={{ padding: '8px' }}
                  onChange={handleFileChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="portal-label">Online Video URL (Optional YouTube or MP4 link)</label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.videoUrl}
                  onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="portal-label">Classes to open for <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, maxHeight: '130px', overflowY: 'auto', padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  {classes.map(c => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                      <input
                        type="checkbox"
                        checked={formData.classIds.includes(c.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            classIds: checked
                              ? [...prev.classIds, c.id]
                              : prev.classIds.filter(id => id !== c.id)
                          }));
                        }}
                        style={{ width: 16, height: 16 }}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="portal-label">Instructions / Description</label>
                <textarea
                  className="portal-input"
                  rows={3}
                  placeholder="Explain the required reading or how students should use this material..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <div className="portal-modal-footer">
              <button type="button" className="portal-btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="portal-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><i className="fas fa-spinner fa-spin mr-2" /> Publishing...</>
                ) : (
                  <><i className="fas fa-upload mr-2" /> Publish Resource</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewMaterial && (
        <div className="portal-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="portal-modal" style={{ maxWidth: '840px', width: '90%' }}>
            <div className="portal-modal-header" style={{ background: '#0f172a', color: '#fff' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', fontWeight: 800 }}>{previewMaterial.title}</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Uploaded by {previewMaterial.teacher?.name || 'Teacher'} on {previewMaterial.date ? format(new Date(previewMaterial.date), 'dd MMM yyyy') : '—'}
                </p>
              </div>
              <button className="portal-btn-ghost" onClick={() => setPreviewMaterial(null)} style={{ color: '#fff' }}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="portal-modal-body" style={{ background: '#020617', padding: 0, overflow: 'hidden' }}>
              {getYoutubeEmbedUrl(previewMaterial.documentUrl || previewMaterial.videoUrl) ? (
                <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={getYoutubeEmbedUrl(previewMaterial.documentUrl || previewMaterial.videoUrl) || ''}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  />
                </div>
              ) : (previewMaterial.documentUrl?.endsWith('.mp4') || previewMaterial.documentUrl?.endsWith('.webm')) ? (
                <video
                  controls
                  src={getAuthenticatedUrl(previewMaterial.documentUrl)}
                  style={{ width: '100%', maxHeight: '460px', background: '#000' }}
                />
              ) : previewMaterial.documentUrl?.endsWith('.pdf') ? (
                <iframe
                  src={getAuthenticatedUrl(previewMaterial.documentUrl)}
                  style={{ width: '100%', height: '520px', border: 'none' }}
                />
              ) : (
                <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                  <i className="fas fa-file-alt fa-4x" style={{ marginBottom: 16, color: '#38bdf8' }} />
                  <h3 style={{ color: '#f8fafc', margin: '0 0 8px 0' }}>Downloadable Study Resource</h3>
                  <p style={{ fontSize: '0.9rem', maxWidth: 440, margin: '0 auto 20px', color: '#94a3b8' }}>
                    {previewMaterial.description || 'This file cannot be previewed in-app. Click below to download directly to your computer.'}
                  </p>
                  <a
                    href={getAuthenticatedUrl(previewMaterial.documentUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="portal-btn portal-btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    <i className="fas fa-download mr-1" /> Download Resource File
                  </a>
                </div>
              )}
            </div>

            <div className="portal-modal-footer" style={{ background: '#0f172a', borderTop: '1px solid #1e293b', color: '#cbd5e1' }}>
              <div style={{ fontSize: '0.85rem', width: '100%' }}>
                {previewMaterial.description && <span><strong>Notes:</strong> {previewMaterial.description}</span>}
              </div>
              <button type="button" className="portal-btn-secondary" onClick={() => setPreviewMaterial(null)}>
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
