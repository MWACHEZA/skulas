import { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';

export default function ApplicantDocuments() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const { showToast } = useToast();
  const { isMedical } = useTerminology();

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const { data } = await api.get('/api/dashboard/applicant');
      setDocs(data.documents_list || data.documents || []);
    } catch (err) {
      showToast('Connection error. Failed to sync documents.', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File, docName: string) => {
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await api.post('/api/applications/documents', {
          name: docName,
          url: reader.result
        });
        showToast(`${docName} synchronized successfully!`, 'success');
        fetchDocs();
        setShowModal(false);
        setCustomName('');
      } catch (err) {
        showToast('File synchronization failed. Please try again.', 'error');
      
    } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const categories = [
    { 
      id: 'identity',
      title: 'Identity & Personal Records', 
      icon: 'fa-id-card',
      types: ['Birth Certificate', 'National ID', 'Passport', 'Guardian ID'] 
    },
    { 
      id: 'academic',
      title: isMedical ? 'Academic & Registration History' : 'Academic Records', 
      icon: 'fa-graduation-cap',
      types: ['Academic Certificate', 'O-Level Results', 'A-Level Results', 'Transcripts', 'School Leaving Cert'] 
    },
    { 
      id: 'institutional',
      title: 'Professional & Clinical Records', 
      icon: 'fa-user-nurse',
      types: ['Medical Fitness Cert', 'Nursing Council Indexing', 'Police Clearance', 'Immunization Record'],
      hidden: !isMedical
    }
  ];

  const renderDocRow = (docName: string, idx: number) => {
    const existingDoc = docs.find(d => d.name === docName);
    return (
      <tr key={`${docName}-${idx}`}>
        <td style={{ fontWeight: 600 }}>{docName}</td>
        <td>
          {existingDoc ? (
            <span className={`portal-badge ${
              existingDoc.status === 'verified' ? 'success' : 
              existingDoc.status === 'pending' ? 'info' : 'warning'
            }`}>
              {existingDoc.status.replace('_', ' ')}
            </span>
          ) : (
            <span className="portal-badge" style={{ backgroundColor: '#edf2f7', color: '#718096' }}>Not Uploaded</span>
          )}
        </td>
        <td>{existingDoc?.createdAt ? new Date(existingDoc.createdAt).toLocaleDateString() : '-'}</td>
        <td>
          <div style={{ display: 'flex', gap: 8 }}>
            <input 
              type="file" 
              id={`upload-${docName}`} 
              hidden 
              onChange={(e) => e.target.files && handleUpload(e.target.files[0], docName)}
            />
            <button 
              className="portal-btn-primary" 
              disabled={isUploading}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => document.getElementById(`upload-${docName}`)?.click()}
            >
              {existingDoc?.url ? 'Replace' : 'Upload'}
            </button>
            {existingDoc?.url && (
              <a 
                href={`${BASE_URL}/api/storage/media/${existingDoc.url}`} 
                target="_blank" 
                rel="noreferrer" 
                className="portal-btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}
              >
                View
              </a>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Required Documents</h1>
        <p>Organization of essential records for your enrollment at {isMedical ? 'this Medical Institution' : 'this School'}.</p>
      </div>

      {categories.filter(c => !c.hidden).map(cat => (
        <div className="portal-card" key={cat.id} style={{ marginBottom: 24 }}>
          <div className="portal-card-header">
            <h2><i className={`fas ${cat.icon}`} style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>{cat.title}</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Document Type</th>
                  <th>Status</th>
                  <th>Last Update</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cat.types.map((type, idx) => renderDocRow(type, idx))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-plus-circle" style={{ marginRight: 8, color: '#4a5568' }}></i>Other Supporting Documents</h2>
        </div>
        <div className="portal-card-body">
          <table className="portal-table" style={{ marginTop: 0 }}>
             <tbody>
                {docs.filter(d => !categories.some(c => c.types.includes(d.name))).map((doc, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{doc.name}</td>
                    <td>
                      <span className={`portal-badge ${
                        doc.status === 'verified' ? 'success' : 
                        doc.status === 'pending' ? 'info' : 'warning'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                    <td>
                       <a href={`${BASE_URL}/api/storage/media/${doc.url}`} target="_blank" rel="noreferrer" className="portal-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>View</a>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4}>
                     <button 
                      className="portal-btn-neutral" 
                      style={{ width: '100%', border: '1px dashed #cbd5e0', background: 'transparent' }}
                      onClick={() => setShowModal(true)}
                     >
                       + Add Custom File (e.g. Testimonials, Reference Letters)
                     </button>
                  </td>
                </tr>
             </tbody>
          </table>
        </div>
      </div>

      <div className="portal-card" style={{ marginTop: 24, background: '#fffaf0', border: '1px solid #feebc8' }}>
        <div className="portal-card-body" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: '#dd6b20', color: 'white', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="fas fa-info-circle"></i>
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px', color: '#7b341e' }}>Verification Note</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#9c4221' }}>
              Ensure all scans are clear and readable. Documents marked as "rejected" must be replaced with correct versions to proceed with {isMedical ? 'clinical indexing' : 'enrollment'}.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Document Modal */}
      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 400 }}>
            <div className="portal-modal-header">
              <h2>Add Custom Document</h2>
              <button className="portal-modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="portal-modal-body">
              <div className="form-group">
                <label>Document Name</label>
                <input 
                  type="text" 
                  className="portal-input" 
                  placeholder="e.g. Character Reference" 
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
              <div style={{ marginTop: 20 }}>
                <input 
                  type="file" 
                  id="custom-file-upload" 
                  hidden 
                  onChange={(e) => e.target.files && handleUpload(e.target.files[0], customName)}
                />
                <button 
                  className="portal-btn-primary" 
                  style={{ width: '100%' }}
                  disabled={!customName || isUploading}
                  onClick={() => document.getElementById('custom-file-upload')?.click()}
                >
                  {isUploading ? <i className="fas fa-spinner fa-spin"></i> : 'Select File & Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
