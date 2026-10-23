import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { SkeletonLoader, PaginatedTable } from '../../../components/shared';
import '../../../styles/portal.css';

interface GradeRow {
  id?: string;
  grade: string;
  minScore: number;
  maxScore: number;
  status: string;
  gpaPoint?: number;
  description?: string;
}

const PRESET_SCALES: Record<string, { label: string; rows: GradeRow[] }> = {
  zimsec: {
    label: 'ZIMSEC Secondary',
    rows: [
      { grade: 'A', minScore: 75, maxScore: 100, status: 'EXCELLENT', gpaPoint: 1, description: 'Distinction' },
      { grade: 'B', minScore: 65, maxScore: 74, status: 'GOOD', gpaPoint: 2, description: 'Merit' },
      { grade: 'C', minScore: 50, maxScore: 64, status: 'PASS', gpaPoint: 3, description: 'Credit Pass' },
      { grade: 'D', minScore: 40, maxScore: 49, status: 'PASS', gpaPoint: 4, description: 'Pass' },
      { grade: 'E', minScore: 30, maxScore: 39, status: 'FAIL', gpaPoint: 5, description: 'Weak Pass' },
      { grade: 'U', minScore: 0, maxScore: 29, status: 'FAIL', gpaPoint: 9, description: 'Ungraded' },
    ]
  },
  cambridge: {
    label: 'Cambridge / IGCSE',
    rows: [
      { grade: 'A*', minScore: 90, maxScore: 100, status: 'EXCELLENT', gpaPoint: 4.0, description: 'Outstanding' },
      { grade: 'A', minScore: 80, maxScore: 89, status: 'EXCELLENT', gpaPoint: 3.8, description: 'Excellent' },
      { grade: 'B', minScore: 70, maxScore: 79, status: 'GOOD', gpaPoint: 3.0, description: 'Very Good' },
      { grade: 'C', minScore: 60, maxScore: 69, status: 'PASS', gpaPoint: 2.5, description: 'Good Pass' },
      { grade: 'D', minScore: 50, maxScore: 59, status: 'PASS', gpaPoint: 2.0, description: 'Pass' },
      { grade: 'E', minScore: 40, maxScore: 49, status: 'FAIL', gpaPoint: 1.0, description: 'Minimum Pass' },
      { grade: 'U', minScore: 0, maxScore: 39, status: 'FAIL', gpaPoint: 0.0, description: 'Ungraded' },
    ]
  },
  tertiary: {
    label: 'University / 4.0 GPA',
    rows: [
      { grade: 'A+', minScore: 85, maxScore: 100, status: 'EXCELLENT', gpaPoint: 4.0, description: 'First Class Distinction' },
      { grade: 'A', minScore: 75, maxScore: 84, status: 'EXCELLENT', gpaPoint: 3.7, description: 'First Class' },
      { grade: 'B+', minScore: 70, maxScore: 74, status: 'GOOD', gpaPoint: 3.3, description: 'Upper Second (2.1)' },
      { grade: 'B', minScore: 65, maxScore: 69, status: 'GOOD', gpaPoint: 3.0, description: 'Upper Second (2.1)' },
      { grade: 'C+', minScore: 60, maxScore: 64, status: 'PASS', gpaPoint: 2.5, description: 'Lower Second (2.2)' },
      { grade: 'C', minScore: 50, maxScore: 59, status: 'PASS', gpaPoint: 2.0, description: 'Pass' },
      { grade: 'F', minScore: 0, maxScore: 49, status: 'FAIL', gpaPoint: 0.0, description: 'Fail / Repeat' },
    ]
  },
  standard: {
    label: 'Standard Percentage',
    rows: [
      { grade: 'A', minScore: 75, maxScore: 100, status: 'EXCELLENT', gpaPoint: 4.0, description: 'Distinction' },
      { grade: 'B', minScore: 65, maxScore: 74, status: 'GOOD', gpaPoint: 3.0, description: 'Merit' },
      { grade: 'C', minScore: 50, maxScore: 64, status: 'PASS', gpaPoint: 2.0, description: 'Credit' },
      { grade: 'D', minScore: 40, maxScore: 49, status: 'PASS', gpaPoint: 1.0, description: 'Pass' },
      { grade: 'F', minScore: 0, maxScore: 39, status: 'FAIL', gpaPoint: 0.0, description: 'Fail' },
    ]
  }
};

const GRADE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  EXCELLENT: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  GOOD: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  PASS: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  FAIL: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' }
};

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
        setRows(PRESET_SCALES.standard.rows);
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
    const min = rows.length > 0 ? Math.max(0, Math.min(...rows.map(r => r.minScore)) - 10) : 0;
    setRows([...rows, { grade: 'NEW', minScore: min, maxScore: min + 9, status: 'PASS', gpaPoint: 1.0, description: 'Pass' }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof GradeRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const applyPreset = (key: string) => {
    if (PRESET_SCALES[key]) {
      setRows(PRESET_SCALES[key].rows);
      showToast(`Loaded "${PRESET_SCALES[key].label}" template`, 'info');
    }
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
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-award" style={{ color: '#0284c7' }} />
            Academic Grading Scale
          </h1>
          <p>Customize your institution's grade thresholds, GPA grade point values, and performance classifications.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            className="portal-btn-primary" 
            style={{ 
              height: 42, 
              padding: '0 24px', 
              borderRadius: 10, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              fontWeight: 700, 
              fontSize: '0.9rem' 
            }} 
            onClick={handleSave} 
            disabled={saving}
          >
            {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
            Save Configuration
          </button>
        </div>
      </div>

      {loading ? (
        <div className="portal-card" style={{ padding: 24, borderRadius: 12 }}>
          <SkeletonLoader type="table" rows={6} columns={5} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick Preset Templates Toolbar */}
          <div 
            className="portal-card" 
            style={{ 
              padding: '16px 20px', 
              borderRadius: 12, 
              border: '1px solid #e2e8f0', 
              background: '#f8fafc',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: 12 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-magic" style={{ color: '#0284c7' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                Quick Presets:
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(PRESET_SCALES).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <i className="fas fa-file-alt" style={{ color: '#64748b' }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Scale Distribution Bar */}
          <div className="portal-card" style={{ padding: '18px 24px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Score Range Visualization (0% – 100%)
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {rows.length} grade bands configured
              </span>
            </div>

            <div style={{ width: '100%', height: 28, display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              {[...rows]
                .sort((a, b) => a.minScore - b.minScore)
                .map((r, i) => {
                  const width = Math.max(4, r.maxScore - r.minScore + 1);
                  const scheme = GRADE_COLORS[r.status] || GRADE_COLORS.PASS;
                  return (
                    <div
                      key={i}
                      style={{
                        width: `${width}%`,
                        background: scheme.bg,
                        color: scheme.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        borderRight: '1px solid #cbd5e1'
                      }}
                      title={`${r.grade}: ${r.minScore}% - ${r.maxScore}% (${r.status})`}
                    >
                      {r.grade}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Grading Levels Table */}
          <div className="portal-card" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Grading Bands &amp; Classification
              </h2>
              <button 
                type="button" 
                onClick={addRow}
                className="portal-btn-ghost"
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0284c7',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <i className="fas fa-plus" /> Add Grade Band
              </button>
            </div>

            <PaginatedTable className="portal-table" style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', width: 120 }}>Grade Symbol</th>
                  <th style={{ padding: '12px 16px', width: 130 }}>Min Score (%)</th>
                  <th style={{ padding: '12px 16px', width: 130 }}>Max Score (%)</th>
                  <th style={{ padding: '12px 16px', width: 120 }}>Grade Points</th>
                  <th style={{ padding: '12px 16px' }}>Performance Description</th>
                  <th style={{ padding: '12px 16px', width: 150 }}>Status Category</th>
                  <th style={{ padding: '12px 16px', width: 60, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const scheme = GRADE_COLORS[row.status] || GRADE_COLORS.PASS;

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Grade Symbol */}
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span 
                            style={{ 
                              width: 32, 
                              height: 32, 
                              borderRadius: 6, 
                              background: scheme.bg, 
                              color: scheme.color, 
                              border: `1px solid ${scheme.border}`,
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontWeight: 900,
                              fontSize: '0.9rem' 
                            }}
                          >
                            {row.grade || '?'}
                          </span>
                          <input 
                            type="text" 
                            value={row.grade} 
                            onChange={(e) => updateRow(idx, 'grade', e.target.value.toUpperCase())}
                            placeholder="e.g. A+"
                            className="portal-input"
                            style={{ width: 60, height: 36, padding: '4px 8px', fontWeight: 800, textAlign: 'center' }}
                          />
                        </div>
                      </td>

                      {/* Min Score */}
                      <td style={{ padding: '10px 16px' }}>
                        <input 
                          type="number" 
                          value={row.minScore} 
                          onChange={(e) => updateRow(idx, 'minScore', parseInt(e.target.value) || 0)}
                          className="portal-input"
                          style={{ width: '100%', height: 36, padding: '4px 8px', fontWeight: 700 }}
                          min={0}
                          max={100}
                        />
                      </td>

                      {/* Max Score */}
                      <td style={{ padding: '10px 16px' }}>
                        <input 
                          type="number" 
                          value={row.maxScore} 
                          onChange={(e) => updateRow(idx, 'maxScore', parseInt(e.target.value) || 0)}
                          className="portal-input"
                          style={{ width: '100%', height: 36, padding: '4px 8px', fontWeight: 700 }}
                          min={0}
                          max={100}
                        />
                      </td>

                      {/* Grade Points */}
                      <td style={{ padding: '10px 16px' }}>
                        <input 
                          type="number" 
                          step="0.1"
                          value={row.gpaPoint !== undefined ? row.gpaPoint : ''} 
                          onChange={(e) => updateRow(idx, 'gpaPoint', parseFloat(e.target.value) || 0)}
                          placeholder="4.0"
                          className="portal-input"
                          style={{ width: '100%', height: 36, padding: '4px 8px', fontWeight: 700 }}
                        />
                      </td>

                      {/* Description */}
                      <td style={{ padding: '10px 16px' }}>
                        <input 
                          type="text" 
                          value={row.description || ''} 
                          onChange={(e) => updateRow(idx, 'description', e.target.value)}
                          placeholder="e.g. Distinction, Credit"
                          className="portal-input"
                          style={{ width: '100%', height: 36, padding: '4px 10px', fontSize: '0.85rem' }}
                        />
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 16px' }}>
                        <select 
                          value={row.status} 
                          onChange={(e) => updateRow(idx, 'status', e.target.value)}
                          className="portal-select"
                          style={{ width: '100%', height: 36, padding: '4px 8px', fontWeight: 700, fontSize: '0.82rem' }}
                        >
                          <option value="EXCELLENT">EXCELLENT</option>
                          <option value="GOOD">GOOD</option>
                          <option value="PASS">PASS</option>
                          <option value="FAIL">FAIL</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <button 
                          type="button"
                          className="portal-btn-ghost" 
                          onClick={() => removeRow(idx)} 
                          style={{ 
                            height: 32, 
                            width: 32, 
                            padding: 0, 
                            borderRadius: 6, 
                            color: '#dc2626',
                            border: '1px solid #fee2e2',
                            background: '#fef2f2',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Remove level"
                        >
                          <i className="fas fa-trash-alt" style={{ fontSize: '0.78rem' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </PaginatedTable>

            {/* Bottom Actions */}
            <div 
              style={{ 
                padding: '16px 20px', 
                background: '#f8fafc', 
                borderTop: '1px solid #f1f5f9', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}
            >
              <button 
                type="button" 
                className="portal-btn-ghost" 
                onClick={addRow} 
                style={{ height: 42, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem' }}
              >
                <i className="fas fa-plus mr-2" /> Add Grading Level
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  type="button" 
                  className="portal-btn-ghost" 
                  onClick={() => setRows(PRESET_SCALES.standard.rows)} 
                  style={{ height: 42, padding: '0 16px', borderRadius: 10, color: '#64748b', fontSize: '0.85rem' }}
                >
                  <i className="fas fa-undo mr-2" /> Reset to Default
                </button>
                <button 
                  type="button" 
                  className="portal-btn-primary" 
                  style={{ height: 42, padding: '0 24px', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem' }} 
                  onClick={handleSave} 
                  disabled={saving}
                >
                  {saving ? <i className="fas fa-spinner fa-spin mr-2" /> : <i className="fas fa-save mr-2" />}
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
