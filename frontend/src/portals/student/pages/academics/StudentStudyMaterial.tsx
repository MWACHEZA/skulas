import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useTerminology } from '../../../../hooks/useTerminology';
import { format } from 'date-fns';

export default function StudentStudyMaterial() {
  const { t } = useTerminology();
  const [materials, setMaterials] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Folder Explorer State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<any | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [materialsRes, subjectsRes] = await Promise.all([
        api.get('/api/study-materials'),
        api.get('/api/subjects')
      ]);
      setMaterials(materialsRes.data);
      setSubjects(subjectsRes.data);
    } catch (error) {
      console.error('Error fetching materials', error);
    
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

  const handleDownload = (material: any) => {
    if (material.documentUrl) {
      window.open(getAuthenticatedUrl(material.documentUrl), '_blank');
    } else {
      alert('No document attached to this study material.');
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

  return (
    <>
      <div className="portal-page-header">
        <h1>Study Material Explorer</h1>
        <p>Access syllabus folders, reading resources, and lecture video streams shared by your educators.</p>
      </div>

      <div className="portal-card" style={{ padding: '24px' }}>
        <div className="portal-card-body">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading resources...</div>
          ) : selectedSubjectId === null ? (
            // Folder Explorer grid
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontWeight: 900, color: '#1e293b' }}><i className="fas fa-folder-open text-warning mr-2" style={{ marginRight: 8, color: '#ecc94b' }}></i>Subject Folders</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Total folders: {subjects.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}>
                {subjects.map(s => {
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
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>{folderMaterials.length} files available</span>
              </div>

              <table className="portal-table">
                <thead>
                  <tr>
                    <th>DATE UPLOADED</th>
                    <th>TITLE</th>
                    <th>TEACHER</th>
                    <th>DESCRIPTION</th>
                    <th>PLAY / VIEW</th>
                    <th>DOWNLOAD</th>
                  </tr>
                </thead>
                <tbody>
                  {folderMaterials.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 50, color: '#a0aec0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <i className="fas fa-folder-open fa-3x" style={{ color: '#cbd5e0', marginBottom: 15 }}></i>
                        <span>No files available in this folder</span>
                      </div>
                    </td></tr>
                  ) : (
                    folderMaterials.map((m) => (
                      <tr key={m.id}>
                        <td>{m.date ? format(new Date(m.date), 'yyyy-MM-dd') : 'N/A'}</td>
                        <td style={{ fontWeight: 700 }}>{m.title}</td>
                        <td>{m.teacher?.name}</td>
                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{m.description}</td>
                        <td>
                          {m.documentUrl ? (
                            <button className="portal-btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setPreviewMaterial(m)}>
                              <i className={m.documentUrl.includes('youtube') || m.documentUrl.includes('youtu.be') || m.documentUrl.endsWith('.mp4') ? 'fas fa-play' : 'fas fa-eye'}></i>
                              {m.documentUrl.includes('youtube') || m.documentUrl.includes('youtu.be') || m.documentUrl.endsWith('.mp4') ? 'Play Media' : 'Open Document'}
                            </button>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>No file</span>
                          )}
                        </td>
                        <td>
                          {m.documentUrl ? (
                            <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleDownload(m)}>
                              <i className="fas fa-download"></i> Download
                            </button>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>—</span>
                          )}
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
                      {previewMaterial.description || 'This file cannot be previewed in-app. Please use the download options to view the material.'}
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
