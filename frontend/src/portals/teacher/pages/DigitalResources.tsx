import { useState } from 'react';

export default function TeacherDigitalResources() {
  const [resources] = useState([
    { id: 'RES-001', name: 'Mathematics Syllabus 2024.pdf', type: 'PDF', size: '1.2 MB', downloads: 142 },
    { id: 'RES-002', name: 'Introduction to Calculus PPT', type: 'PPTX', size: '4.5 MB', downloads: 89 },
    { id: 'RES-003', name: 'Algebra Practice Sheets.docx', type: 'DOCX', size: '800 KB', downloads: 210 },
  ]);

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
            <div style={{ border: '2px dashed #cbd5e0', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}>
              <i className="fas fa-file-upload fa-3x" style={{ color: '#a0aec0', marginBottom: 16 }}></i>
              <p style={{ margin: 0, fontWeight: 600, color: '#4a5568' }}>Click or drag file to upload</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#718096' }}>PDF, PPTX, DOCX, ZIP (Max 50MB)</p>
            </div>
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Resource Category</label>
              <select className="portal-select" style={{ width: '100%', padding: '10px' }}>
                <option>Select Category...</option>
                <option>Syllabus</option>
                <option>Lecture Notes</option>
                <option>Assignment Materials</option>
                <option>Past Exam Papers</option>
              </select>
            </div>
            <button className="portal-btn-primary" style={{ width: '100%', marginTop: 20, padding: '12px' }} onClick={() => alert('This feature is currently under development or disabled.')}>Upload File</button>
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
                      <button style={{ background: 'none', border: 'none', color: 'var(--portal-danger)', cursor: 'pointer' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-trash"></i></button>
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
