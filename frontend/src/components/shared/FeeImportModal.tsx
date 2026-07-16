import { useState } from 'react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FeeImportModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/api/fees/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'acadex_fee_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      showToast('Failed to download template', 'error');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/fees/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResults(res.data.details);
      showToast(res.data.summary, 'success');
      if (res.data.details.created > 0) onSuccess();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Import failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="portal-modal-overlay">
      <div className="portal-modal-content" style={{ maxWidth: 600 }}>
        <div className="portal-modal-header">
          <h2><i className="fas fa-file-import" style={{ marginRight: 10 }}></i>Import Legacy Fees</h2>
          <button onClick={onClose} className="portal-modal-close">&times;</button>
        </div>
        
        <div className="portal-modal-body">
          <p style={{ color: '#718096', marginBottom: 20 }}>
            Upload an Excel file to bulk import fee records. 
            <strong>Tip:</strong> The required columns are Student ID (or Email), Amount, Paid, Term, and Year. We recommend downloading the standard template first.
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 25 }}>
            <button 
              onClick={handleDownloadTemplate} 
              className="portal-btn-secondary"
              title="Click here to download a sample Excel template with all required columns."
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <i className="fas fa-download"></i> Download Template
            </button>
          </div>

          <div 
            style={{ 
              border: '2px dashed #e2e8f0', 
              borderRadius: 12, 
              padding: 30, 
              textAlign: 'center',
              backgroundColor: file ? '#f0fff4' : '#f7fafc',
              cursor: 'pointer'
            }}
            onClick={() => document.getElementById('fee-excel-input')?.click()}
          >
            <i className={`fas ${file ? 'fa-file-excel' : 'fa-cloud-upload-alt'} fa-3x`} style={{ color: file ? '#48bb78' : '#a0aec0', marginBottom: 15 }}></i>
            <p style={{ fontWeight: 600, margin: 0 }}>{file ? file.name : 'Click to select Excel file'}</p>
            <p style={{ fontSize: '0.875rem', color: '#a0aec0', marginTop: 5 }}>Only .xlsx or .xls files supported</p>
            <input 
              id="fee-excel-input"
              type="file" 
              accept=".xlsx,.xls" 
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {results && (
            <div style={{ marginTop: 20, padding: 15, borderRadius: 8, backgroundColor: '#fffaf0', border: '1px solid #feebc8' }}>
              <p style={{ fontWeight: 600, color: '#c05621', marginBottom: 5 }}>Import Summary:</p>
              <ul style={{ fontSize: '0.875rem', color: '#7b341e', margin: 0, paddingLeft: 20 }}>
                <li>Created: {results.created}</li>
                <li>Skipped: {results.skipped}</li>
              </ul>
              {results.errors.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e53e3e' }}>Issues found:</p>
                  <div style={{ maxHeight: 100, overflowY: 'auto', fontSize: '0.75rem', color: '#e53e3e' }}>
                    {results.errors.map((err: string, i: number) => <div key={i}>• {err}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="portal-modal-footer">
          <button onClick={onClose} className="portal-btn-ghost">Cancel</button>
          <button 
            onClick={handleUpload} 
            className="portal-btn-primary" 
            disabled={!file || isUploading}
            style={{ minWidth: 120 }}
          >
            {isUploading ? <i className="fas fa-spinner fa-spin"></i> : 'Start Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
