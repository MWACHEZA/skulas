import React, { useState, useRef } from 'react';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';

interface ResourceItem {
  id: string;
  name: string;
  type: string;
  subject: string;
  level: string;
  size: string;
  downloads: number;
  author: string;
  scope: 'personal' | 'department';
}

interface LibraryBookRequest {
  id: string;
  bookTitle: string;
  author: string;
  isbn?: string;
  quantity: number;
  purpose: string;
  status: 'Pending' | 'Approved' | 'Procured';
  date: string;
}

export default function TeacherDigitalResources() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'my' | 'shared' | 'library'>('my');

  // Resource items state
  const [resources, setResources] = useState<ResourceItem[]>([
    { id: 'RES-001', name: 'Mathematics Form 3 Syllabus 2026.pdf', type: 'PDF', subject: 'Mathematics', level: 'Form 3', size: '1.2 MB', downloads: 142, author: 'Self', scope: 'personal' },
    { id: 'RES-002', name: 'Introduction to Calculus PPT Slides.pptx', type: 'PPTX', subject: 'Mathematics', level: 'Form 4', size: '4.5 MB', downloads: 89, author: 'Self', scope: 'personal' },
    { id: 'RES-003', name: 'ZIMSEC Past Exam Papers 2023-2025.pdf', type: 'PDF', subject: 'Physical Science', level: 'Form 4', size: '8.4 MB', downloads: 310, author: 'Dr. Ndlovu (HOD)', scope: 'department' },
    { id: 'RES-004', name: 'Chemistry Laboratory Safety & Reagent Manual.docx', type: 'DOCX', subject: 'Chemistry', level: 'All Levels', size: '800 KB', downloads: 210, author: 'Science Dept', scope: 'department' }
  ]);

  // Upload Form state
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const [level, setLevel] = useState('Form 3');
  const [uploadScope, setUploadScope] = useState<'personal' | 'department'>('personal');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Library Requests state
  const [libraryRequests, setLibraryRequests] = useState<LibraryBookRequest[]>([
    { id: 'LBR-001', bookTitle: 'Advanced Level Pure Mathematics (Bostock & Chandler)', author: 'L. Bostock, S. Chandler', quantity: 15, purpose: 'Class set for Form 3 accelerated learners', status: 'Approved', date: '2026-09-15' },
    { id: 'LBR-002', bookTitle: 'Cambridge IGCSE Chemistry Coursebook', author: 'Richard Harwood', quantity: 20, purpose: 'New syllabus alignment', status: 'Pending', date: '2026-10-01' }
  ]);
  const [newLibRequest, setNewLibRequest] = useState({ bookTitle: '', author: '', isbn: '', quantity: 1, purpose: '' });
  const [showLibModal, setShowLibModal] = useState(false);

  const handleUpload = () => {
    if (!selectedFile) {
      showToast('Please select a file to upload.', 'error');
      return;
    }
    if (!category) {
      showToast('Please select a resource category.', 'error');
      return;
    }
    setIsUploading(true);
    setTimeout(() => {
      const ext = selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE';
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
      const newRes: ResourceItem = {
        id: `RES-00${resources.length + 1}`,
        name: selectedFile.name,
        type: ext,
        subject,
        level,
        size: `${sizeMB} MB`,
        downloads: 0,
        author: uploadScope === 'personal' ? 'Self' : 'Department Shared',
        scope: uploadScope
      };
      setResources([newRes, ...resources]);
      setSelectedFile(null);
      setCategory('');
      setIsUploading(false);
      showToast('Teaching material uploaded and published successfully!', 'success');
    }, 1000);
  };

  const handleCreateLibRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLibRequest.bookTitle.trim()) return;
    const req: LibraryBookRequest = {
      id: `LBR-00${libraryRequests.length + 1}`,
      bookTitle: newLibRequest.bookTitle,
      author: newLibRequest.author,
      isbn: newLibRequest.isbn,
      quantity: Number(newLibRequest.quantity) || 1,
      purpose: newLibRequest.purpose,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0]
    };
    setLibraryRequests([req, ...libraryRequests]);
    setShowLibModal(false);
    setNewLibRequest({ bookTitle: '', author: '', isbn: '', quantity: 1, purpose: '' });
    showToast('Book request dispatched to Chief Librarian requisition queue', 'success');
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-folder-open" style={{ color: 'var(--school-primary, #0284c7)' }} />
            Academic Resources & Library Requisitions
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            Publish lecture notes and past papers for your classes, access department shared pools, and route textbook requests to the Library.
          </p>
        </div>
        {activeTab === 'library' && (
          <button 
            className="portal-btn-primary" 
            onClick={() => setShowLibModal(true)}
            style={{ background: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className="fas fa-book-medical" />
            Request Library Book Set
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('my')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'my' ? 700 : 500,
            color: activeTab === 'my' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'my' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-user-edit" />
          My Subject Materials ({resources.filter(r => r.scope === 'personal').length})
        </button>

        <button
          onClick={() => setActiveTab('shared')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'shared' ? 700 : 500,
            color: activeTab === 'shared' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'shared' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-users" />
          Department Shared Pool ({resources.filter(r => r.scope === 'department').length})
        </button>

        <button
          onClick={() => setActiveTab('library')}
          style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'library' ? 700 : 500,
            color: activeTab === 'library' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'library' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <i className="fas fa-book-reader" />
          Library Textbook Requisitions ({libraryRequests.length})
        </button>
      </div>

      {/* Tab 1: My Resources */}
      {activeTab === 'my' && (
        <div className="portal-grid-2" style={{ gridTemplateColumns: '1.2fr 1.8fr', gap: 24 }}>
          {/* Upload Card */}
          <div className="portal-card" style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px', color: '#1e293b' }}>
              <i className="fas fa-cloud-upload-alt mr-2" style={{ color: '#0284c7' }} />
              Upload Student Handout / Past Paper
            </h2>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            <div 
              style={{ border: '2px dashed #cbd5e0', borderRadius: 10, padding: '30px 16px', textAlign: 'center', cursor: 'pointer', background: selectedFile ? '#eff6ff' : '#f8fafc' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <>
                  <i className="fas fa-file-pdf fa-2x" style={{ color: '#0284c7', marginBottom: 8 }}></i>
                  <p style={{ margin: 0, fontWeight: 700, color: '#0284c7', fontSize: '0.9rem' }}>{selectedFile.name}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <i className="fas fa-file-upload fa-2x" style={{ color: '#94a3b8', marginBottom: 8 }}></i>
                  <p style={{ margin: 0, fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Click to select teaching file</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>PDF, PPTX, DOCX, ZIP (Max 50MB)</p>
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Subject</label>
                <select className="portal-select" style={{ width: '100%', padding: 8, marginTop: 4 }} value={subject} onChange={e => setSubject(e.target.value)}>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physical Science">Physical Science</option>
                  <option value="Biology">Biology</option>
                  <option value="English Language">English Language</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Class Cohort</label>
                <select className="portal-select" style={{ width: '100%', padding: 8, marginTop: 4 }} value={level} onChange={e => setLevel(e.target.value)}>
                  <option value="Form 1">Form 1</option>
                  <option value="Form 2">Form 2</option>
                  <option value="Form 3">Form 3</option>
                  <option value="Form 4">Form 4</option>
                  <option value="Form 5 (L6)">Form 5 (L6)</option>
                  <option value="Form 6 (U6)">Form 6 (U6)</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Category</label>
              <select className="portal-select" style={{ width: '100%', padding: 8, marginTop: 4 }} value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select Resource Type...</option>
                <option value="Past Exam Papers">Past Exam Papers & Marking Schemes</option>
                <option value="Lecture Notes">Topic Notes & Summaries</option>
                <option value="Worksheets">Revision Worksheets & Problem Sets</option>
                <option value="Syllabus">Subject Syllabus Document</option>
              </select>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Sharing Scope</label>
              <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
                <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" checked={uploadScope === 'personal'} onChange={() => setUploadScope('personal')} />
                  My Class Students Only
                </label>
                <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" checked={uploadScope === 'department'} onChange={() => setUploadScope('department')} />
                  Share with Department Pool
                </label>
              </div>
            </div>

            <button 
              className="portal-btn-primary" 
              style={{ width: '100%', marginTop: 18, padding: 10, justifyContent: 'center' }} 
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? <><i className="fas fa-spinner fa-spin mr-2" /> Uploading...</> : 'Publish to Students'}
            </button>
          </div>

          {/* List of My Uploads */}
          <div className="portal-card" style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px', color: '#1e293b' }}>
              Published Student Documents
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {resources.filter(r => r.scope === 'personal').map(res => (
                <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid #f1f5f9', borderRadius: 6, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 6, background: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                      {res.type}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{res.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {res.subject} &bull; {res.level} &bull; {res.size} &bull; {res.downloads} student downloads
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="portal-btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => showToast('Downloading file...', 'info')}>
                      <i className="fas fa-download" />
                    </button>
                    <button className="portal-btn-ghost" style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#dc2626' }} onClick={() => setResources(resources.filter(r => r.id !== res.id))}>
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Department Shared Pool */}
      {activeTab === 'shared' && (
        <div className="portal-card" style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Department-Shared Teaching Repository
              </h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                Curated pedagogical materials, schemes, past mock examinations, and laboratory guides shared across colleagues.
              </p>
            </div>
            <span className="portal-badge success" style={{ fontWeight: 700 }}>Open Department Pool</span>
          </div>

          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Resource Document</th>
                <th style={{ padding: 12 }}>Subject</th>
                <th style={{ padding: 12 }}>Target Form</th>
                <th style={{ padding: 12 }}>Author / Department</th>
                <th style={{ padding: 12 }}>File Size</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map(res => (
                <tr key={res.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12, fontWeight: 600 }}>
                    <i className="far fa-file-alt mr-2" style={{ color: '#0284c7' }} />
                    {res.name}
                  </td>
                  <td style={{ padding: 12 }}>{res.subject}</td>
                  <td style={{ padding: 12 }}><span className="portal-badge info">{res.level}</span></td>
                  <td style={{ padding: 12, color: '#475569' }}>{res.author}</td>
                  <td style={{ padding: 12, color: '#64748b' }}>{res.size}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <button className="portal-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => showToast('Opening document...', 'info')}>
                      <i className="fas fa-download mr-1" /> Get Copy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Library Requisitions */}
      {activeTab === 'library' && (
        <div className="portal-card" style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Library Textbook Requisition Registry
              </h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                Requests automatically route to the Chief Librarian portal reservation and book procurement pipeline.
              </p>
            </div>
          </div>

          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Requisition Ref</th>
                <th style={{ padding: 12 }}>Book Title & Author</th>
                <th style={{ padding: 12 }}>Quantity</th>
                <th style={{ padding: 12 }}>Instructional Purpose</th>
                <th style={{ padding: 12 }}>Librarian Status</th>
                <th style={{ padding: 12 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {libraryRequests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12, fontWeight: 700, fontFamily: 'monospace', color: '#0284c7' }}>{req.id}</td>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{req.bookTitle}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>by {req.author}</div>
                  </td>
                  <td style={{ padding: 12, fontWeight: 700 }}>{req.quantity} Copies</td>
                  <td style={{ padding: 12, color: '#475569', fontSize: '0.85rem' }}>{req.purpose}</td>
                  <td style={{ padding: 12 }}>
                    <span className={`portal-badge ${req.status === 'Approved' ? 'success' : req.status === 'Procured' ? 'info' : 'warning'}`}>
                      {req.status === 'Approved' ? 'Approved by Librarian' : req.status}
                    </span>
                  </td>
                  <td style={{ padding: 12, color: '#64748b', fontSize: '0.85rem' }}>{req.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Library Request Modal */}
      {showLibModal && (
        <div className="portal-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="portal-card" style={{ maxWidth: 540, width: '90%', background: '#fff', borderRadius: 8, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Book Set Requisition to Library</h3>
              <button onClick={() => setShowLibModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
            </div>
            <form onSubmit={handleCreateLibRequest}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Book Title *</label>
                <input 
                  type="text" required className="portal-input" style={{ width: '100%', padding: 8, marginTop: 4 }}
                  value={newLibRequest.bookTitle}
                  onChange={e => setNewLibRequest({ ...newLibRequest, bookTitle: e.target.value })}
                  placeholder="e.g. Focus on Physics Form 3"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Author / Publisher</label>
                  <input 
                    type="text" className="portal-input" style={{ width: '100%', padding: 8, marginTop: 4 }}
                    value={newLibRequest.author}
                    onChange={e => setNewLibRequest({ ...newLibRequest, author: e.target.value })}
                    placeholder="e.g. College Press"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Quantity Required</label>
                  <input 
                    type="number" min="1" required className="portal-input" style={{ width: '100%', padding: 8, marginTop: 4 }}
                    value={newLibRequest.quantity}
                    onChange={e => setNewLibRequest({ ...newLibRequest, quantity: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Instructional Purpose / Class Justification</label>
                <textarea 
                  rows={3} required className="portal-input" style={{ width: '100%', padding: 8, marginTop: 4 }}
                  value={newLibRequest.purpose}
                  onChange={e => setNewLibRequest({ ...newLibRequest, purpose: e.target.value })}
                  placeholder="Explain why this book set is needed for student learning..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowLibModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary">Submit to Library</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
