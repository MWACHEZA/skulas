import { useState, useEffect } from 'react';
import api from '../../../lib/api';

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

const exportToWord = (title: string, headers: string[], dataRows: string[][]) => {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function LibraryDigitalRepository() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchResources = () => {
    setLoading(true);
    api.get('/api/library/digital')
      .then(res => setResources(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) return;
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('author', 'Unknown');
    formData.append('pdf', file);
    
    try {
      await api.post('/api/library/books', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowAddModal(false);
      setTitle('');
      setFile(null);
      fetchResources();
    } catch (err) {
      console.error(err);
      alert('Failed to upload resource');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="library-portal-container" style={{ padding: '30px', minHeight: '100vh', background: 'white' }}>
      <div className="portal-page-header" style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ color: '#1e3a8a', fontSize: '2.8rem', fontWeight: 900, marginBottom: 5 }}>Digital Resource Repository</h1>
          <p style={{ color: '#475569', fontSize: '1.1rem' }}>Access and manage the school's digital library, including e-books, research papers, and educational media.</p>
        </div>
      </div>

      <div className="portal-stats-grid" style={{ marginBottom: '32px' }}>
        <div className="portal-stat-card">
          <div className="portal-stat-icon purple"><i className="fas fa-file-pdf"></i></div>
          <div className="portal-stat-info">
            <h3>{resources.length}</h3>
            <p>Digital Assets</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-eye"></i></div>
          <div className="portal-stat-info">
            <h3>Live</h3>
            <p>Resource Access</p>
          </div>
        </div>
      </div>

      <div className="portal-card" style={{ borderRadius: '40px', border: '2px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.04)' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '24px 30px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
            <i className="fas fa-cloud-download-alt mr-2"></i>Digital Repository Stacks
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
            <button 
              onClick={() => {
                const headers = ['Title', 'Format', 'Size', 'Usage'];
                const rows = resources.map(r => [
                  r.title,
                  'PDF / Document',
                  'N/A',
                  'View Only'
                ]);
                exportToCSV('Digital_Repository', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              onClick={() => {
                const headers = ['Title', 'Format', 'Size', 'Usage'];
                const rows = resources.map(r => [
                  r.title,
                  'PDF / Document',
                  'N/A',
                  'View Only'
                ]);
                exportToWord('Digital_Repository', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to Word"
            >
              <i className="fas fa-file-word mr-1"></i> Word
            </button>
            <button 
              onClick={() => window.print()}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Print / PDF"
            >
              <i className="fas fa-print mr-1"></i> Print/PDF
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="portal-btn-primary" 
              style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#1e3a8a' }}
            >
              <i className="fas fa-plus mr-1"></i> Add Digital Asset
            </button>
          </div>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr style={{ background: '#f8fafc', color: '#1e3a8a' }}>
                <th style={{ padding: '25px 30px' }}>Title</th>
                <th>Format</th>
                <th>Size</th>
                <th>Usage Count</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>Accessing digital stacks...</td></tr>
              ) : resources.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>No digital resources found. Attach PDFs to books in the catalog.</td></tr>
              ) : resources.map((res) => (
                <tr key={res.id}>
                  <td style={{ fontWeight: 600 }}>{res.title}</td>
                  <td><span className="portal-badge neutral">PDF / Document</span></td>
                  <td>-</td>
                  <td style={{ fontWeight: 600 }}>View Only</td>
                  <td>
                    <a 
                      href={`${api.defaults.baseURL}/${res.pdfUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="portal-btn-secondary" 
                      style={{ padding: '6px 12px', textDecoration: 'none', display: 'inline-block' }}
                    >
                      View Resource
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 800 }}>Upload Digital Asset</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>Add a new PDF document or e-book to the repository.</p>
            
            <form onSubmit={handleUpload}>
              <div style={{ marginBottom: 16 }}>
                <label className="portal-label">Resource Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Advanced Physics Guide" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '1rem' }}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="portal-label">Document File (PDF) *</label>
                <input 
                  type="file" 
                  required
                  accept="application/pdf"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px dashed #e2e8f0', outline: 'none', fontSize: '1rem', background: '#f8fafc' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting || !title || !file} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'var(--school-primary, #3182ce)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: (isSubmitting || !title || !file) ? 0.7 : 1 }}>
                  {isSubmitting ? 'Uploading...' : 'Upload Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
