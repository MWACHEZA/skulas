import React, { useState, useEffect } from 'react';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';
import { useTerminology } from '../../../../hooks/useTerminology';
import { format } from 'date-fns';
import { useAuth } from '../../../../contexts/AuthContext';

export default function StudyMaterial() {
  const { showToast } = useToast();
  const { t } = useTerminology();
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Folder Explorer State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    classIds: [] as string[],
    subjectId: '',
    description: '',
    documentBase64: '',
    videoUrl: ''
  });

  useEffect(() => {
    fetchMaterials();
    fetchClasses();
    fetchSubjects();
  }, []);

  const getAuthenticatedUrl = (url: string) => {
    if (!url) return '';
    const token = localStorage.getItem('acadex_token');
    const tokenParam = token ? `?token=${token}` : '';
    return url.startsWith('http') ? `${url}${tokenParam}` : `${api.defaults.baseURL || ''}${url}${tokenParam}`;
  };

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/api/study-materials');
      setMaterials(res.data);
    } catch (error) {
      console.error('Error fetching materials', error);
    
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(res.data);
    } catch (error) {
      console.error('Error fetching classes', error);
    
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/api/subjects');
      setSubjects(res.data);
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
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
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
      showToast('Study material added successfully', 'success');
      fetchMaterials();
      setFormData({
        title: '', date: '', classIds: [], subjectId: '', description: '', documentBase64: '', videoUrl: ''
      });
      setIsModalOpen(false);
    } catch (error) {
      showToast('Failed to add study material', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm('Are you sure you want to delete this material?'))) return;
    try {
      await api.delete(`/api/study-materials/${id}`);
      showToast('Deleted successfully', 'success');
      fetchMaterials();
    } catch (error) {
      showToast('Failed to delete material', 'error');
    
    }
  };

  // Helper to resolve YouTube embed URL
  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
  };

  // Group materials by subject for folder explorer
  const groupedMaterials: Record<string, any[]> = {};
  materials.forEach(m => {
    const subId = m.subjectId || 'Unassigned';
    if (!groupedMaterials[subId]) {
      groupedMaterials[subId] = [];
    }
    groupedMaterials[subId].push(m);
  });

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const folderMaterials = selectedSubjectId ? (groupedMaterials[selectedSubjectId] || []) : [];

  const eligibleSubjects = React.useMemo(() => {
    if (user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN') {
      return subjects;
    }
    if (user?.role === 'TEACHER') {
      const assignedIds = user.teacher?.subjects?.map((ts: any) => ts.subjectId) || [];
      return subjects.filter(s => assignedIds.includes(s.id));
    }
    return subjects;
  }, [subjects, user]);

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Study Material Explorer</h1>
          <p>Organize, manage, and share subject-based resources with your classes.</p>
        </div>
        <button className="portal-btn-primary" style={{ background: 'var(--portal-success)', borderColor: 'var(--portal-success)', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsModalOpen(true)}>
          <i className="fas fa-plus"></i> Add study material
        </button>
      </div>

      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '650px' }}>
            <div className="portal-modal-header">
              <div className="header-titles">
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Add Study Material</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>Upload files or attach videos for target classes</p>
              </div>
              <button className="close-panel" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}>&times;</button>
            </div>
            <div className="portal-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="portal-form-group">
                  <label className="portal-label">Title <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" className="portal-input" placeholder="Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Select date <span style={{ color: 'red' }}>*</span></label>
                  <input type="date" className="portal-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">{t('subject')} <span style={{ color: 'red' }}>*</span></label>
                  <select className="portal-input" value={formData.subjectId} onChange={e => setFormData({ ...formData, subjectId: e.target.value })}>
                    <option value="">Select subject</option>
                    {eligibleSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="portal-form-group">
                  <label className="portal-label">Attach File</label>
                  <input type="file" className="portal-input" style={{ padding: '5px' }} onChange={handleFileChange} />
                </div>

                <div className="portal-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="portal-label">Video URL (Optional - e.g. YouTube or direct MP4 link)</label>
                  <input type="text" className="portal-input" placeholder="https://www.youtube.com/watch?v=..." value={formData.videoUrl} onChange={e => setFormData({ ...formData, videoUrl: e.target.value })} />
                </div>

                <div className="portal-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="portal-label">Classes to open for <span style={{ color: 'red' }}>*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', maxHeight: '120px', overflowY: 'auto', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    {classes.map(c => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
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
                          style={{ width: '16px', height: '16px' }}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="portal-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="portal-label">Description</label>
                  <textarea className="portal-input" rows={3} placeholder="Description details..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 15, marginTop: 25 }}>
                <button className="portal-btn-ghost" style={{ flex: 1, padding: '10px' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button className="portal-btn-primary" style={{ flex: 1, background: 'var(--portal-success)', borderColor: 'var(--portal-success)', padding: '10px' }} onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : <><i className="fas fa-save"></i> Save</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Study Material Section */}
      <div className="portal-card" style={{ padding: '24px' }}>
        <div className="portal-card-body">
          {selectedSubjectId === null ? (
            // Folder Explorer grid
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontWeight: 900, color: '#1e293b' }}><i className="fas fa-folder-open text-warning mr-2" style={{ marginRight: 8, color: '#ecc94b' }}></i>Subject Folders</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Total folders: {eligibleSubjects.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}>
                {eligibleSubjects.map(s => {
                  const fileCount = (groupedMaterials[s.id] || []).length;
                  return (
                    <div 
                      key={s.id}
                      className="folder-item" 
                      style={{ 
                        padding: '24px', 
                        background: '#fff', 
                        borderRadius: '16px', 
                        border: '1px solid #edf2f7', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                      onClick={() => setSelectedSubjectId(s.id)}
                    >
                      <i className="fas fa-folder fa-4x" style={{ color: '#ecc94b' }}></i>
                      <div style={{ fontWeight: 800, color: '#1e293b', textAlign: 'center', fontSize: '0.95rem' }}>{s.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>{fileCount} {fileCount === 1 ? 'file' : 'files'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Files within subject folder
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button className="portal-btn-ghost" onClick={() => setSelectedSubjectId(null)} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-arrow-left"></i> Back to Folders
                  </button>
                  <span style={{ color: '#cbd5e1', fontSize: '1.25rem' }}>/</span>
                  <h3 style={{ margin: 0, fontWeight: 900, color: '#1e293b' }}>
                    {selectedSubject?.name} Folder
                  </h3>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>{folderMaterials.length} materials uploaded</span>
              </div>

              <table className="portal-table">
                <thead>
                  <tr>
                    <th>DATE UPLOADED</th>
                    <th>TITLE</th>
                    <th>CLASS</th>
                    <th>TEACHER</th>
                    <th>DESCRIPTION</th>
                    <th>PREVIEW / DOWNLOAD</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {folderMaterials.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 50, color: '#a0aec0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <i className="fas fa-folder-open fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
                        <span>No materials uploaded in this folder</span>
                      </div>
                    </td></tr>
                  ) : (
                    folderMaterials.map((m) => (
                      <tr key={m.id}>
                        <td>{m.date ? (isNaN(new Date(m.date).getTime()) ? 'N/A' : format(new Date(m.date), 'yyyy-MM-dd')) : 'N/A'}</td>
                        <td style={{ fontWeight: 700 }}>{m.title}</td>
                        <td style={{ fontWeight: 600 }}>{m.class?.name}</td>
                        <td>{m.teacher?.name}</td>
                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{m.description}</td>
                        <td>
                          {m.documentUrl ? (
                            <button className="portal-btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--school-primary, #3182ce)', borderColor: 'var(--school-primary, #3182ce)', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setPreviewMaterial(m)}>
                              <i className={m.documentUrl.includes('youtube') || m.documentUrl.includes('youtu.be') || m.documentUrl.endsWith('.mp4') ? 'fas fa-play' : 'fas fa-eye'}></i>
                              {m.documentUrl.includes('youtube') || m.documentUrl.includes('youtu.be') || m.documentUrl.endsWith('.mp4') ? 'Play Media' : 'Open Document'}
                            </button>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>No file</span>
                          )}
                        </td>
                        <td>
                          <button className="portal-btn-secondary" style={{ padding: '6px 12px', color: 'white', background: 'var(--portal-danger)', border: 'none', borderRadius: '6px', cursor: 'pointer' }} onClick={() => handleDelete(m.id)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* IN-APP MEDIA PLAYER & DOCUMENT VIEWER MODAL */}
      {previewMaterial && (
        <div className="portal-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="portal-modal-card" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="portal-modal-header" style={{ background: '#1e293b', color: 'white' }}>
              <div className="header-titles">
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: 'white' }}>{previewMaterial.title}</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                  Uploaded by {previewMaterial.teacher?.name} on {previewMaterial.date ? format(new Date(previewMaterial.date), 'yyyy-MM-dd') : 'N/A'}
                </p>
              </div>
              <button className="close-panel" onClick={() => setPreviewMaterial(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
            </div>
            <div className="portal-modal-body" style={{ background: '#0f172a', padding: '0px', overflow: 'hidden' }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                
                {/* YOUTUBE EMBED PLAYER */}
                {getYoutubeEmbedUrl(previewMaterial.documentUrl) ? (
                  <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0 }}>
                    <iframe
                      src={getYoutubeEmbedUrl(previewMaterial.documentUrl) || ''}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    ></iframe>
                  </div>
                ) : /* MP4 DIRECT VIDEO PLAYER */
                previewMaterial.documentUrl?.endsWith('.mp4') || previewMaterial.documentUrl?.endsWith('.webm') ? (
                  <video 
                    controls 
                    src={getAuthenticatedUrl(previewMaterial.documentUrl)} 
                    style={{ width: '100%', maxHeight: '450px', background: '#000' }}
                  />
                ) : /* PDF EMBED VIEWER */
                previewMaterial.documentUrl?.endsWith('.pdf') ? (
                  <iframe 
                    src={getAuthenticatedUrl(previewMaterial.documentUrl)}
                    style={{ width: '100%', height: '500px', border: 'none' }}
                  />
                ) : /* STANDARD DOCUMENT DOWNLOAD CARD */
                (
                  <div style={{ padding: '60px 24px', textAlign: 'center', width: '100%', color: '#94a3b8' }}>
                    <i className="fas fa-file-alt fa-4x" style={{ marginBottom: '20px', color: '#38bdf8' }}></i>
                    <h3>General Study Material Resource</h3>
                    <p style={{ fontSize: '0.9rem', maxWidth: '500px', margin: '10px auto 20px', lineHeight: 1.6 }}>
                      {previewMaterial.description || 'This file cannot be previewed in-app. Please use the button below to download the material.'}
                    </p>
                    <a 
                      href={getAuthenticatedUrl(previewMaterial.documentUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="portal-btn-primary"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
                    >
                      <i className="fas fa-download"></i> Download Document
                    </a>
                  </div>
                )}

              </div>
            </div>
            {previewMaterial.description && !previewMaterial.documentUrl?.endsWith('.pdf') && !getYoutubeEmbedUrl(previewMaterial.documentUrl) && !previewMaterial.documentUrl?.endsWith('.mp4') && (
              <div className="portal-modal-footer" style={{ background: '#1e293b', borderTop: '1px solid #334155', color: '#cbd5e1', padding: '16px 24px' }}>
                <div style={{ fontSize: '0.9rem', width: '100%' }}>
                  <strong>Description:</strong> {previewMaterial.description}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
