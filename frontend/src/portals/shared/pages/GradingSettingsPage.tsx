import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface GradeRow {
  id?: string;
  grade: string;
  minScore: number;
  maxScore: number;
  status: string;
}

export default function GradingSettingsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGrading();
  }, []);

  const fetchGrading = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/grading');
      const safeData = Array.isArray(data) ? data : [];
      
      if (safeData.length === 0) {
        // Default scale if none exists
        setRows([
          { grade: 'A+', minScore: 80, maxScore: 100, status: 'PASS' },
          { grade: 'A', minScore: 70, maxScore: 79, status: 'PASS' },
          { grade: 'B', minScore: 60, maxScore: 69, status: 'PASS' },
          { grade: 'C', minScore: 50, maxScore: 59, status: 'PASS' },
          { grade: 'D', minScore: 40, maxScore: 49, status: 'PASS' },
          { grade: 'F', minScore: 0, maxScore: 39, status: 'FAIL' },
        ]);
      } else {
        setRows(safeData);
      }
    } catch (error) {
      showToast('Failed to load grading scale', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    setRows([...rows, { grade: '', minScore: 0, maxScore: 0, status: 'PASS' }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof GradeRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/api/grading', rows);
      showToast('Grading scale saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save grading scale', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Academic Grading Scale</h1>
          <p>Customize your institution's academic grading criteria and performance levels.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <div className="portal-spinner"></div>
        </div>
      ) : (
        <div className="portal-card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="portal-card-header" style={{ borderBottom: '1px solid #f1f5f9', marginBottom: '32px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Scale Configuration</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(Array.isArray(rows) ? rows : []).map((row, idx) => (
              <div key={idx} style={{ 
                display: 'grid', 
                gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr 48px', 
                gap: '20px', 
                alignItems: 'end',
                padding: '24px',
                background: '#f8fafc',
                borderRadius: '16px',
                border: '1px solid #f1f5f9'
              }}>
                <div className="form-group">
                  <label className="portal-label">Grade Name</label>
                  <input 
                    type="text" 
                    value={row.grade} 
                    onChange={(e) => updateRow(idx, 'grade', e.target.value)}
                    placeholder="e.g. A+"
                    className="portal-input"
                    style={{ fontWeight: 800 }}
                  />
                </div>
                <div className="form-group">
                  <label className="portal-label">Min Score (%)</label>
                  <input 
                    type="number" 
                    value={row.minScore} 
                    onChange={(e) => updateRow(idx, 'minScore', parseInt(e.target.value) || 0)}
                    className="portal-input"
                    style={{ fontWeight: 800 }}
                  />
                </div>
                <div className="form-group">
                  <label className="portal-label">Max Score (%)</label>
                  <input 
                    type="number" 
                    value={row.maxScore} 
                    onChange={(e) => updateRow(idx, 'maxScore', parseInt(e.target.value) || 0)}
                    className="portal-input"
                    style={{ fontWeight: 800 }}
                  />
                </div>
                <div className="form-group">
                  <label className="portal-label">Status Category</label>
                  <select 
                    value={row.status} 
                    onChange={(e) => updateRow(idx, 'status', e.target.value)}
                    className="portal-input"
                    style={{ fontWeight: 800 }}
                  >
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                    <option value="EXCELLENT">EXCELLENT</option>
                    <option value="GOOD">GOOD</option>
                  </select>
                </div>
                <button className="btn-icon btn-delete" onClick={() => removeRow(idx)} style={{ height: '48px', width: '48px', borderRadius: '12px' }}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '32px', paddingTop: '32px', borderTop: '1px solid #f1f5f9' }}>
            <button className="portal-btn-ghost" onClick={addRow} style={{ padding: '0 32px', fontWeight: 800 }}>
              <i className="fas fa-plus mr-2"></i> Add Grading Level
            </button>
            <button className="portal-btn-ghost" onClick={() => setRows([])} style={{ color: '#dc2626', fontWeight: 800 }}>
              <i className="fas fa-undo mr-2"></i> Reset Scale
            </button>
          </div>

          <div style={{ marginTop: '48px', textAlign: 'center' }}>
            <button className="portal-btn-primary" style={{ padding: '0 64px', height: '56px', fontSize: '1.1rem', fontWeight: 800 }} onClick={handleSave} disabled={saving}>
              {saving ? <i className="fas fa-spinner fa-spin mr-3"></i> : <i className="fas fa-save mr-3"></i>}
              Save Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
