import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import TeacherGrades from './Grades';
import MarksEntryPage from '../../shared/pages/MarksEntryPage';
import api from '../../../lib/api';

export type TeacherGradesTab = 'grades' | 'marks-entry' | 'grading-scale';

interface GradingScaleItem {
  id?: string;
  grade: string;
  minScore: number;
  maxScore: number;
  status: string;
}

export default function TeacherGradesUnified() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = (searchParams.get('tab') as TeacherGradesTab) || 'grades';
  const [activeTab, setActiveTab] = useState<TeacherGradesTab>(currentTab);
  const [scales, setScales] = useState<GradingScaleItem[]>([]);
  const [loadingScales, setLoadingScales] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TeacherGradesTab;
    if (tabParam && ['grades', 'marks-entry', 'grading-scale'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'grading-scale') {
      fetchScales();
    }
  }, [activeTab]);

  const fetchScales = async () => {
    setLoadingScales(true);
    try {
      const res = await api.get('/api/grading');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setScales(res.data);
      } else {
        // Fallback default
        setScales([
          { grade: 'A', minScore: 75, maxScore: 100, status: 'Distinction' },
          { grade: 'B', minScore: 65, maxScore: 74, status: 'Merit' },
          { grade: 'C', minScore: 50, maxScore: 64, status: 'Credit' },
          { grade: 'D', minScore: 40, maxScore: 49, status: 'Pass' },
          { grade: 'F', minScore: 0, maxScore: 39, status: 'Fail' }
        ]);
      }
    } catch (err) {
      console.error('Failed to load grading scale', err);
    } finally {
      setLoadingScales(false);
    }
  };

  const handleTabChange = (tab: TeacherGradesTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div 
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          padding: '28px 32px',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              <i className="fas fa-chart-line" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Student Assessment & Gradebook
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#e0f2fe', fontSize: '0.92rem' }}>
                Record subject continuous assessments (CATs), termly examinations, and manage academic report marks.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/teacher/reports')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: '#ffffff',
            color: '#0369a1',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <i className="fas fa-file-invoice" />
          Generate Report Cards
        </button>
      </div>

      {/* Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 24,
          background: '#fff',
          padding: '8px 16px 0 16px',
          borderRadius: '12px 12px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('grades')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'grades' ? 700 : 500,
            color: activeTab === 'grades' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'grades' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-graduation-cap" />
          Grades Overview
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('marks-entry')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'marks-entry' ? 700 : 500,
            color: activeTab === 'marks-entry' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'marks-entry' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-pen-alt" />
          Multi-Column Marks Entry
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('grading-scale')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'grading-scale' ? 700 : 500,
            color: activeTab === 'grading-scale' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'grading-scale' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-ruler-combined" />
          School Grading Scale
        </button>
      </div>

      <div>
        {activeTab === 'grades' && <TeacherGrades />}
        {activeTab === 'marks-entry' && <MarksEntryPage />}
        {activeTab === 'grading-scale' && (
          <div className="portal-card">
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                  <i className="fas fa-balance-scale" style={{ marginRight: 8, color: '#0284c7' }} />
                  Active Institution Grading Policy & Performance Bands
                </h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  These configured score boundaries determine letter grades, positions, and merit classifications on student terminal reports.
                </p>
              </div>

              <span className="portal-badge info">
                {scales.length} Performance Bands Configured
              </span>
            </div>

            <div className="portal-card-body" style={{ padding: 0 }}>
              {loadingScales ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7' }} />
                </div>
              ) : (
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th style={{ width: 100 }}>Grade Letter</th>
                      <th>Score Range (%)</th>
                      <th>Performance Standing</th>
                      <th>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scales.map((s, idx) => (
                      <tr key={idx}>
                        <td>
                          <span 
                            style={{ 
                              display: 'inline-block',
                              padding: '6px 14px',
                              borderRadius: 8,
                              fontWeight: 800,
                              fontSize: '1rem',
                              background: s.minScore >= 70 ? '#ecfdf5' : s.minScore >= 50 ? '#eff6ff' : '#fef2f2',
                              color: s.minScore >= 70 ? '#047857' : s.minScore >= 50 ? '#1d4ed8' : '#b91c1c',
                              border: `1px solid ${s.minScore >= 70 ? '#a7f3d0' : s.minScore >= 50 ? '#bfdbfe' : '#fecaca'}`
                            }}
                          >
                            Grade {s.grade}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {s.minScore}% &mdash; {s.maxScore}%
                        </td>
                        <td style={{ fontWeight: 600, color: '#334155' }}>
                          {s.status}
                        </td>
                        <td>
                          <span className={`portal-badge ${s.minScore >= 70 ? 'success' : s.minScore >= 50 ? 'info' : 'danger'}`}>
                            {s.minScore >= 70 ? 'Distinction / Merit' : s.minScore >= 50 ? 'Passing Grade' : 'Remedial Required'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
