import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface DigitalResource {
  id: string;
  title: string;
  author?: string;
  resourceType: string;
  fileFormat: string;
  fileUrl?: string;
  externalLink?: string;
  fileSize?: number;
  category?: { id: string; name: string };
  categoryName?: string;
  accessLevel: string;
  licenseStatus: string;
  expiryDate?: string;
  isExpired?: boolean;
  status: string;
  description?: string;
  downloadsCount: number;
  createdAt: string;
}

const exportToCSV = (title: string, headers: string[], dataRows: string[][]) => {
  const content = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...dataRows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function LibraryDigitalRepository() {
  const { showToast } = useToast();
  const [resources, setResources] = useState<DigitalResource[]>([]);
  const [categories, setCategories] = useState<{ id: string; category: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [entryMode, setEntryMode] = useState<'FILE' | 'LINK'>('FILE');
  const [detectedFormat, setDetectedFormat] = useState('PDF');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    categoryId: '',
    resourceType: 'eBook',
    accessLevel: 'All Students & Staff',
    licenseStatus: 'Open Access',
    expiryDate: '',
    description: '',
    keywords: ''
  });

  useEffect(() => {
    fetchResources();
    fetchCategories();
  }, [selectedCategory, selectedType]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedType !== 'all') params.append('type', selectedType);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await api.get(`/api/library/digital-resources?${params.toString()}`);
      setResources(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showToast('Failed to load digital resources', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/library/categories');
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  // Auto-detect format on file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setDetectedFormat('PDF');
    else if (ext === 'epub') setDetectedFormat('EPUB');
    else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) setDetectedFormat('Video (MP4)');
    else if (['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(ext || '')) setDetectedFormat('Audio (MP3)');
    else if (['doc', 'docx'].includes(ext || '')) setDetectedFormat('DOCX Document');
    else if (['zip', 'rar', 'tar'].includes(ext || '')) setDetectedFormat('Archive (ZIP)');
    else setDetectedFormat(ext?.toUpperCase() || 'Document');
  };

  // Auto-detect format on link typing
  const handleLinkChange = (url: string) => {
    setExternalUrl(url);
    const low = url.toLowerCase();
    if (low.includes('youtube.com') || low.includes('youtu.be') || low.includes('vimeo.com')) {
      setDetectedFormat('Streaming Video');
    } else if (low.endsWith('.pdf')) {
      setDetectedFormat('Web PDF');
    } else if (low.endsWith('.mp3') || low.includes('soundcloud.com')) {
      setDetectedFormat('Audio Stream');
    } else {
      setDetectedFormat('Web Resource / Article');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    if (entryMode === 'FILE' && !selectedFile) {
      showToast('Please select a file to upload', 'error');
      return;
    }
    if (entryMode === 'LINK' && !externalUrl.trim()) {
      showToast('Please provide an external resource link', 'error');
      return;
    }

    const data = new FormData();
    data.append('title', formData.title.trim());
    data.append('author', formData.author.trim() || 'Unknown');
    data.append('categoryId', formData.categoryId);
    data.append('resourceType', formData.resourceType);
    data.append('accessLevel', formData.accessLevel);
    data.append('licenseStatus', formData.licenseStatus);
    data.append('description', formData.description.trim());
    data.append('keywords', formData.keywords.trim());
    if (formData.expiryDate) data.append('expiryDate', formData.expiryDate);

    if (entryMode === 'FILE' && selectedFile) {
      data.append('file', selectedFile);
    } else if (entryMode === 'LINK') {
      data.append('externalLink', externalUrl.trim());
    }

    setSubmitting(true);
    try {
      await api.post('/api/library/digital-resources', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('Digital resource published successfully', 'success');
      setShowAddModal(false);
      resetModal();
      fetchResources();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to publish resource', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setExternalUrl('');
    setFormData({
      title: '',
      author: '',
      categoryId: '',
      resourceType: 'eBook',
      accessLevel: 'All Students & Staff',
      licenseStatus: 'Open Access',
      expiryDate: '',
      description: '',
      keywords: ''
    });
  };

  const getFormatBadgeStyle = (format: string) => {
    const f = format.toLowerCase();
    if (f.includes('pdf')) return { background: '#fee2e2', color: '#b91c1c', icon: 'fa-file-pdf' };
    if (f.includes('video') || f.includes('mp4')) return { background: '#e0e7ff', color: '#3730a3', icon: 'fa-video' };
    if (f.includes('audio') || f.includes('mp3')) return { background: '#fef3c7', color: '#92400e', icon: 'fa-headphones' };
    if (f.includes('link') || f.includes('web')) return { background: '#eff6ff', color: '#1e40af', icon: 'fa-external-link-alt' };
    return { background: '#f1f5f9', color: '#475569', icon: 'fa-file-alt' };
  };

  return (
    <div className="library-portal-container" style={{ padding: '24px', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: '#0f172a', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            <i className="fas fa-cloud-download-alt mr-3 text-primary" style={{ color: '#2563eb' }}></i>
            Digital Resource Repository
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Store, curate, and share eBooks, media, scientific journals, and web learning resources.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="no-print">
          <button 
            onClick={() => {
              const headers = ['Title', 'Author', 'Category', 'Format', 'Access Level', 'Licensing', 'Status'];
              const rows = resources.map(r => [
                r.title,
                r.author || 'N/A',
                r.category?.name || 'General',
                r.fileFormat,
                r.accessLevel,
                r.licenseStatus,
                r.isExpired ? 'Expired' : r.status
              ]);
              exportToCSV('Digital_Library_Repository', headers, rows);
            }}
            className="portal-btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-file-csv mr-1"></i> CSV
          </button>
          <button 
            onClick={() => { resetModal(); setShowAddModal(true); }}
            className="portal-btn-primary" 
            style={{ padding: '10px 20px', fontSize: '0.9rem', background: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className="fas fa-plus"></i> Add Digital Resource
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
          <input 
            type="text" 
            placeholder="Search digital assets by title or author..."
            className="portal-input"
            style={{ width: '100%', paddingLeft: 40, height: 42, borderRadius: 8, fontSize: '0.85rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchResources(); }}
          />
        </div>

        <div style={{ width: 200 }}>
          <select 
            className="portal-input" 
            style={{ height: 42, borderRadius: 8, width: '100%' }}
            value={selectedCategory} 
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.category}</option>)}
          </select>
        </div>

        <div style={{ width: 180 }}>
          <select 
            className="portal-input" 
            style={{ height: 42, borderRadius: 8, width: '100%' }}
            value={selectedType} 
            onChange={e => setSelectedType(e.target.value)}
          >
            <option value="all">All Formats</option>
            <option value="eBook">eBooks</option>
            <option value="Research Paper">Research Papers</option>
            <option value="Lecture Video">Lecture Videos</option>
            <option value="Audio Lesson">Audio Lessons</option>
            <option value="Interactive">Interactive</option>
          </select>
        </div>

        <div style={{ background: '#f1f5f9', padding: '6px 14px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
          {resources.length} Assets
        </div>
      </div>

      {/* Resource Cards Grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin mr-2"></i> Loading repository collections...
        </div>
      ) : resources.length === 0 ? (
        <div className="portal-card" style={{ padding: 60, textAlign: 'center', color: '#64748b', borderRadius: 16 }}>
          <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }}></i>
          <p style={{ fontWeight: 600, margin: 0 }}>No digital resources found.</p>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>Add e-books, lecture videos, or online articles to your school digital library.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {resources.map(res => {
            const formatInfo = getFormatBadgeStyle(res.fileFormat);
            return (
              <div 
                key={res.id} 
                className="portal-card" 
                style={{ 
                  borderRadius: 14, 
                  border: '1px solid #e2e8f0', 
                  background: '#ffffff', 
                  padding: 18,
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span 
                      style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        padding: '3px 8px', 
                        borderRadius: 6, 
                        background: formatInfo.background, 
                        color: formatInfo.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <i className={`fas ${formatInfo.icon}`}></i>
                      {res.fileFormat}
                    </span>

                    {res.isExpired ? (
                      <span className="portal-badge danger" style={{ fontSize: '0.7rem' }}>Expired</span>
                    ) : (
                      <span className="portal-badge success" style={{ fontSize: '0.7rem' }}>Active</span>
                    )}
                  </div>

                  <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                    {res.title}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 10 }}>
                    by {res.author || 'Institutional Repository'}
                  </div>

                  {res.description && (
                    <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0 0 12px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {res.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    <span className="portal-badge" style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#334155' }}>
                      <i className="fas fa-tag mr-1 text-muted"></i>{res.category?.name || 'General'}
                    </span>
                    <span className="portal-badge" style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#334155' }}>
                      <i className="fas fa-lock mr-1 text-muted"></i>{res.accessLevel}
                    </span>
                    <span className="portal-badge" style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#334155' }}>
                      <i className="fas fa-shield-alt mr-1 text-muted"></i>{res.licenseStatus}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {res.expiryDate ? `Expires: ${new Date(res.expiryDate).toLocaleDateString()}` : 'No Expiry'}
                  </div>

                  {res.externalLink ? (
                    <a 
                      href={res.externalLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="portal-btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <i className="fas fa-external-link-alt text-primary"></i> Open Link
                    </a>
                  ) : res.fileUrl ? (
                    <a 
                      href={res.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="portal-btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <i className="fas fa-download text-primary"></i> Access File
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Digital Resource Modal */}
      {showAddModal && (
        <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="portal-modal-card" style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
                  Add Digital Resource
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Upload educational media or curate external web materials.
                </p>
              </div>
              <button className="close-btn" style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Dual-Mode Toggle */}
              <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setEntryMode('FILE')}
                  className={entryMode === 'FILE' ? 'portal-btn-primary' : 'portal-btn-ghost'}
                  style={{ flex: 1, padding: '8px', fontSize: '0.85rem', borderRadius: 8 }}
                >
                  <i className="fas fa-file-upload mr-2"></i> File Upload (PDF, EPUB, Video, Audio)
                </button>
                <button 
                  type="button" 
                  onClick={() => setEntryMode('LINK')}
                  className={entryMode === 'LINK' ? 'portal-btn-primary' : 'portal-btn-ghost'}
                  style={{ flex: 1, padding: '8px', fontSize: '0.85rem', borderRadius: 8 }}
                >
                  <i className="fas fa-link mr-2"></i> External Link (YouTube, Vimeo, Web Page)
                </button>
              </div>

              {/* Upload Input or Link Input */}
              {entryMode === 'FILE' ? (
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>Select Resource File *</label>
                  <input 
                    type="file" 
                    className="portal-input" 
                    style={{ marginTop: 6 }}
                    onChange={handleFileChange} 
                    required={entryMode === 'FILE'} 
                  />
                  {selectedFile && (
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                      <span><i className="fas fa-check-circle mr-1"></i> Format detected: <strong>{detectedFormat}</strong></span>
                      <span>Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>External URL / Web Link *</label>
                  <input 
                    type="url" 
                    placeholder="https://www.youtube.com/watch?v=... or https://openstax.org/..." 
                    className="portal-input"
                    style={{ marginTop: 6 }}
                    value={externalUrl}
                    onChange={e => handleLinkChange(e.target.value)}
                    required={entryMode === 'LINK'}
                  />
                  {externalUrl && (
                    <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>
                      <i className="fas fa-info-circle mr-1"></i> Detected type: <strong>{detectedFormat}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata Fields */}
              <div className="portal-form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>Resource Title *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Cambridge IGCSE Chemistry Digital Revision Guide"
                  required
                  className="portal-input"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Author / Creator</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Richard Harwood"
                    className="portal-input"
                    value={formData.author}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                  />
                </div>
                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Classification Category *</label>
                  <select 
                    required 
                    className="portal-input"
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.category}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Resource Type</label>
                  <select 
                    className="portal-input"
                    value={formData.resourceType}
                    onChange={e => setFormData({ ...formData, resourceType: e.target.value })}
                  >
                    <option value="eBook">eBook</option>
                    <option value="Research Paper">Research Paper</option>
                    <option value="Lecture Video">Lecture Video</option>
                    <option value="Audio Lesson">Audio Lesson</option>
                    <option value="Interactive">Interactive Simulation</option>
                    <option value="Dataset">Dataset / Lab Data</option>
                    <option value="Other">Other Media</option>
                  </select>
                </div>

                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Access Level</label>
                  <select 
                    className="portal-input"
                    value={formData.accessLevel}
                    onChange={e => setFormData({ ...formData, accessLevel: e.target.value })}
                  >
                    <option value="All Students & Staff">All Students & Staff</option>
                    <option value="Public">Public Access</option>
                    <option value="Staff Only">Staff Only</option>
                    <option value="Restricted">Restricted / Exam Access</option>
                  </select>
                </div>

                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Licensing & Copyright</label>
                  <select 
                    className="portal-input"
                    value={formData.licenseStatus}
                    onChange={e => setFormData({ ...formData, licenseStatus: e.target.value })}
                  >
                    <option value="Open Access">Open Access</option>
                    <option value="Creative Commons (CC-BY)">Creative Commons (CC-BY)</option>
                    <option value="Institutional License">Institutional License</option>
                    <option value="Public Domain">Public Domain</option>
                    <option value="Proprietary / Copyright">Proprietary / Copyright</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>License Expiry Date (Optional)</label>
                  <input 
                    type="date" 
                    className="portal-input"
                    value={formData.expiryDate}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
                <div className="portal-form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Keywords (Comma-separated)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. organic, stoichiometry, reactions"
                    className="portal-input"
                    value={formData.keywords}
                    onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                  />
                </div>
              </div>

              <div className="portal-form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Description / Abstract</label>
                <textarea 
                  rows={2} 
                  placeholder="Summary of learning outcomes or document contents..."
                  className="portal-input"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowAddModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={submitting} style={{ background: '#2563eb' }}>
                  {submitting ? 'Publishing...' : 'Publish to Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
