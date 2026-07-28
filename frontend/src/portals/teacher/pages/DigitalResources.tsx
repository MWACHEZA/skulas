import { useState, useRef } from 'react';
import { useToast } from '../../../context/ToastContext';

export default function TeacherDigitalResources() {
  const { showToast } = useToast();
  const [resources, setResources] = useState([
    { id: 'RES-001', name: 'Mathematics Syllabus 2024.pdf', type: 'PDF', size: '1.2 MB', downloads: 142 },
    { id: 'RES-002', name: 'Introduction to Calculus PPT', type: 'PPTX', size: '4.5 MB', downloads: 89 },
    { id: 'RES-003', name: 'Algebra Practice Sheets.docx', type: 'DOCX', size: '800 KB', downloads: 210 },
  ]);

  const [category, setCategory] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const newRes = {
        id: `RES-00${resources.length + 1}`,
        name: selectedFile.name,
        type: ext,
        size: `${sizeMB} MB`,
        downloads: 0
      };
      setResources([newRes, ...resources]);
      setSelectedFile(null);
      setCategory('');
      setIsUploading(false);
      showToast('File uploaded successfully!', 'success');
    }, 1500);
  };

  const handleDelete = (id: string) => {
    setResources(resources.filter(r => r.id !== id));
    showToast('File deleted.', 'info');
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Digital Resources</h1>
        <p>Upload and manage study materials, syllabi, and lecture notes for your students.</p>
      </div>

      <div className="portal-grid-2">
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-cloud-upload-alt" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Upload New Resource</h2>
          </div>
          <div className="portal-card-body">
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            <div 
              style={{ border: '2px dashed #cbd5e0', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: selectedFile ? '#ebf8ff' : '#f8fafc' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <>
                  <i className="fas fa-file-alt fa-3x" style={{ color: 'var(--school-primary, #3182ce)', marginBottom: 16 }}></i>
                  <p style={{ margin: 0, fontWeight: 600, color: 'var(--school-primary, #3182ce)' }}>{selectedFile.name}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#718096' }}>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <i className="fas fa-file-upload fa-3x" style={{ color: '#a0aec0', marginBottom: 16 }}></i>
                  <p style={{ margin: 0, fontWeight: 600, color: '#4a5568' }}>Click or drag file to upload</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#718096' }}>PDF, PPTX, DOCX, ZIP (Max 50MB)</p>
                </>
              )}
            </div>
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Resource Category</label>
              <select className="portal-select" style={{ width: '100%', padding: '10px' }} value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select Category...</option>
                <option value="Syllabus">Syllabus</option>
                <option value="Lecture Notes">Lecture Notes</option>
                <option value="Assignment Materials">Assignment Materials</option>
                <option value="Past Exam Papers">Past Exam Papers</option>
              </select>
            </div>
            <button 
              className="portal-btn-primary" 
              style={{ width: '100%', marginTop: 20, padding: '12px', justifyContent: 'center' }} 
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Uploading...</> : 'Upload File'}
            </button>
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-folder-open" style={{ marginRight: 8, color: 'var(--portal-success)' }}></i>My Shared Files</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>Downloads</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{r.size}</div>
                    </td>
                    <td><span className="portal-badge info">{r.type}</span></td>
                    <td style={{ fontWeight: 600 }}>{r.downloads}</td>
                    <td>
                      <button style={{ background: 'none', border: 'none', color: 'var(--portal-danger)', cursor: 'pointer' }} onClick={() => handleDelete(r.id)}><i className="fas fa-trash"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
