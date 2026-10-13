import React, { useState } from 'react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  templateUrl: string;
  importUrl: string;
  templateFilename?: string;
  description?: string;
  entityName?: string;
}

export default function DataImportModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  templateUrl,
  importUrl,
  templateFilename = 'import_template.xlsx',
  description,
  entityName = 'records'
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(templateUrl, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', templateFilename);
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
      const res = await api.post(importUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResults(res.data.details || res.data);
      showToast(res.data.summary || 'Import successful', 'success');
      if (res.data.details?.created > 0 || res.data.created > 0) {
        onSuccess();
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'Import failed';
      showToast(errMsg, 'error');
      if (error.response?.data?.details) {
        setResults(error.response.data.details);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="portal-modal-overlay">
      <div className="portal-modal-content" style={{ maxWidth: 620, padding: 0, borderRadius: 16, overflow: 'hidden' }}>
        <div className="portal-modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-file-import" style={{ color: '#2563eb' }}></i>
            {title}
          </h2>
          <button onClick={onClose} className="portal-modal-close" style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        </div>
        
        <div className="portal-modal-body" style={{ padding: 24 }}>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.5 }}>
            {description || `Upload an Excel (.xlsx/.xls) or CSV file to bulk import ${entityName}. Download the pre-formatted template below to ensure proper column headers.`}
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <button 
              type="button"
              onClick={handleDownloadTemplate} 
              className="portal-btn-secondary"
              title="Click here to download a standard Excel template with all required columns."
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: 8, fontWeight: 700 }}
            >
              <i className="fas fa-download"></i> Download Standard Template
            </button>
          </div>

          <div 
            style={{ 
              border: '2px dashed #cbd5e1', 
              borderRadius: 12, 
              padding: 32, 
              textAlign: 'center',
              backgroundColor: file ? '#f0fdf4' : '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => document.getElementById('data-excel-input')?.click()}
          >
            <i className={`fas ${file ? 'fa-file-excel' : 'fa-cloud-upload-alt'} fa-3x`} style={{ color: file ? '#16a34a' : '#94a3b8', marginBottom: 14 }}></i>
            <p style={{ fontWeight: 700, margin: 0, color: file ? '#15803d' : '#334155' }}>
              {file ? file.name : 'Click to browse or select spreadsheet'}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 6, margin: '6px 0 0' }}>
              Supported formats: .xlsx, .xls, .csv
            </p>
            <input 
              id="data-excel-input"
              type="file" 
              accept=".xlsx,.xls,.csv" 
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {results && (
            <div style={{ marginTop: 20, padding: 16, borderRadius: 10, backgroundColor: results.errors?.length > 0 ? '#fff5f5' : '#f0fdf4', border: `1px solid ${results.errors?.length > 0 ? '#fecaca' : '#bbf7d0'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: '0.875rem', color: results.errors?.length > 0 ? '#b91c1c' : '#15803d' }}>
                  Import Results:
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  Created: {results.created || 0} | Skipped: {results.skipped || 0}
                </span>
              </div>
              {results.errors && results.errors.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', margin: '0 0 6px' }}>Issues Encountered ({results.errors.length}):</p>
                  <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: '0.75rem', color: '#b91c1c', background: 'white', padding: 8, borderRadius: 6, border: '1px solid #fee2e2' }}>
                    {results.errors.map((err: string, i: number) => <div key={i} style={{ marginBottom: 4 }}>• {err}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="portal-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12, background: '#f8fafc' }}>
          <button type="button" onClick={onClose} className="portal-btn-ghost" style={{ height: 40, padding: '0 18px', borderRadius: 8, fontWeight: 700 }}>Cancel</button>
          <button 
            type="button"
            onClick={handleUpload} 
            className="portal-btn-primary" 
            disabled={!file || isUploading}
            style={{ minWidth: 130, height: 40, padding: '0 20px', borderRadius: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {isUploading ? <><i className="fas fa-spinner fa-spin"></i> Importing...</> : <><i className="fas fa-upload"></i> Start Import</>}
          </button>
        </div>
      </div>
    </div>
  );
}
