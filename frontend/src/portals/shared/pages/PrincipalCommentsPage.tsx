import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';
import { useTerminology } from '../../../hooks/useTerminology';

interface Grade {
  id: string;
  subject: { name: string };
  score: number;
  grade: string;
  comment: string;
}

interface Student {
  id: string;
  name: string;
  studentId: string;
  grades: Grade[];
  termlyComments: {
    principalComment: string;
  }[];
}

interface Class {
  id: string;
  name: string;
}

export default function PrincipalCommentsPage() {
  const { isMedical, isPoly, isUniversity, isSeminary } = useTerminology();
  const isSemester = isUniversity || isPoly || isMedical || isSeminary;

  const [selectedClassId, setSelectedClassId] = useState('');
  const [term, setTerm] = useState(isSemester ? 'Semester 1' : 'Term 1');
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  useEffect(() => {
    setTerm(isSemester ? 'Semester 1' : 'Term 1');
  }, [isSemester]);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      showToast('Failed to synchronize class registry', 'error');
    
    }
  };

  const loadStudents = async () => {
    if (!selectedClassId) {
      showToast('Institutional class selection required', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/api/reports/principal-comments/${selectedClassId}`, {
        params: { term, year }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setStudents(data);
      
      const initialComments: any = {};
      data.forEach((s: Student) => {
        initialComments[s.id] = s.termlyComments?.[0]?.principalComment || '';
      });
      setComments(initialComments);
    } catch (error) {
      showToast('Failed to load student performance registry', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const saveComments = async () => {
    try {
      setSaving(true);
      const data = Object.entries(comments).map(([studentId, principalComment]) => ({
        studentId,
        principalComment
      }));

      await api.post('/api/reports/principal-comments/bulk', {
        term,
        year,
        comments: data
      });
      showToast('Institutional feedback authorized and archived', 'success');
      loadStudents();
    } catch (error) {
      showToast('Failed to authorize feedback batch', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Principal's Executive Feedback</h1>
          <p>Review comprehensive academic performance and provide authorized institutional commentary for {isSemester ? 'semester' : 'termly'} reports.</p>
        </div>
        {(Array.isArray(students) ? students : []).length > 0 && (
          <button
            onClick={saveComments}
            disabled={saving}
            className="portal-btn-primary"
            style={{ padding: '12px 32px', fontWeight: 900 }}
          >
            {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-file-signature mr-2"></i>}
            Authorize Batch Comments
          </button>
        )}
      </div>

      <div className="portal-card animate-in fade-in slide-in-from-top-4 duration-500" style={{ marginBottom: '40px' }}>
        <div className="portal-card-header">
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', border: '1px solid #e2e8f0' }}>
                <i className="fas fa-sliders-h" style={{ fontSize: '1.2rem' }}></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Audit Configuration</h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>Synchronize class registries and define the audit scope for executive feedback.</p>
              </div>
           </div>
        </div>
        <div className="portal-card-body" style={{ padding: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', alignItems: 'flex-end' }}>
            <div className="form-group">
              <label className="portal-label">Academic Audit Year</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(parseInt(e.target.value))}
                className="portal-input"
                style={{ fontWeight: 800 }}
              />
            </div>
            <div className="form-group">
              <label className="portal-label">Active {isSemester ? 'Semester' : 'Term'}</label>
              <select
                value={term}
                onChange={e => setTerm(e.target.value)}
                className="portal-input"
                style={{ fontWeight: 800 }}
              >
                {isSemester ? (
                  <>
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                  </>
                ) : (
                  <>
                    <option value="Term 1">Term 1 (Lent)</option>
                    <option value="Term 2">Term 2 (Trinity)</option>
                    <option value="Term 3">Term 3 (Michaelmas)</option>
                  </>
                )}
              </select>
            </div>
            <div className="form-group">
              <label className="portal-label">Authorized Class Registry</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="portal-input"
                style={{ fontWeight: 800 }}
              >
                <option value="">Select Class Entity</option>
                {(Array.isArray(classes) ? classes : []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button
              onClick={loadStudents}
              disabled={loading}
              className="portal-btn-primary"
              style={{ height: '56px', padding: '0 40px', fontWeight: 900 }}
            >
              {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-sync-alt mr-2"></i>}
              Synchronize Registry
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '120px 24px' }}>
          <div className="portal-spinner" style={{ margin: '0 auto 24px' }}></div>
          <p style={{ fontWeight: 900, color: '#64748b', fontSize: '1.2rem' }}>Synchronizing performance repositories...</p>
        </div>
      ) : (Array.isArray(students) ? students : []).length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {(Array.isArray(students) ? students : []).map(student => (
            <div key={student.id} className="portal-card hover-card" style={{ overflow: 'hidden', padding: 0 }}>
              <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ 
                        width: '56px', height: '56px', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 900, color: '#2563eb'
                    }}>
                        {student.name?.charAt(0)}
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{student.name}</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <i className="fas fa-id-badge mr-2"></i>{student.studentId} • <span style={{ color: '#2563eb' }}>{term} {year} Registry</span>
                        </p>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Audit Subjects</div>
                  <div className="status-badge" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', fontWeight: 900, fontSize: '1rem', padding: '4px 16px' }}>
                    {(Array.isArray(student.grades) ? student.grades : []).length}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '0', borderTop: '1px solid #f1f5f9' }}>
                {/* Results Table */}
                <div style={{ padding: '32px', borderRight: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                        <i className="fas fa-chart-line mr-2" style={{ color: '#2563eb' }}></i>Academic Summary
                    </h4>
                  </div>
                  <div className="table-responsive">
                    <table className="management-table" style={{ fontSize: '0.95rem' }}>
                      <thead>
                        <tr style={{ background: 'transparent' }}>
                          <th style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>Subject Entity</th>
                          <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>Trace Score</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>Metric</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(student.grades) ? student.grades : []).map(g => (
                          <tr key={g.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '16px 12px', fontWeight: 800, color: '#1e293b' }}>{g.subject?.name}</td>
                            <td style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 900, color: '#2563eb', fontSize: '1.05rem' }}>{g.score?.toFixed(0)}%</td>
                            <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                              <span className="status-badge" style={{ 
                                  padding: '4px 12px', 
                                  fontWeight: 900, 
                                  background: g.grade === 'A' ? '#ecfdf5' : '#f8fafc', 
                                  color: g.grade === 'A' ? '#059669' : '#64748b',
                                  border: '1px solid',
                                  borderColor: g.grade === 'A' ? '#d1fae5' : '#f1f5f9'
                              }}>
                                {g.grade}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {(Array.isArray(student.grades) ? student.grades : []).length === 0 && (
                          <tr><td colSpan={3} style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8', fontWeight: 700, fontStyle: 'italic' }}>
                            <i className="fas fa-exclamation-circle mr-2"></i>No primary records identified for this {isSemester ? 'semester' : 'term'}.
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Comment Area */}
                <div style={{ padding: '32px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                        <i className="fas fa-comment-dots mr-2" style={{ color: '#2563eb' }}></i>Institutional Feedback
                    </h4>
                    <span className="status-badge" style={{ 
                        fontSize: '0.7rem', fontWeight: 900, 
                        background: comments[student.id] ? '#f0fdf4' : '#fffbeb', 
                        color: comments[student.id] ? '#16a34a' : '#d97706',
                        border: '1px solid',
                        borderColor: comments[student.id] ? '#dcfce7' : '#fef3c7'
                    }}>
                      <i className={`fas fa-${comments[student.id] ? 'check-circle' : 'clock'} mr-1`}></i>
                      {comments[student.id] ? 'DRAFTED' : 'PENDING AUDIT'}
                    </span>
                  </div>
                  <textarea
                    value={comments[student.id] || ''}
                    onChange={e => setComments({ ...comments, [student.id]: e.target.value })}
                    placeholder={`Enter authoritative ${isSemester ? 'semester' : 'termly'} institutional feedback for the student report...`}
                    className="portal-input"
                    style={{ minHeight: '180px', resize: 'none', background: '#ffffff', padding: '24px', lineHeight: '1.8', fontWeight: 600, fontSize: '0.95rem', borderRadius: '20px' }}
                  />
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: comments[student.id]?.length > 20 ? '#2563eb' : '#cbd5e1' }}></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>{comments[student.id]?.length || 0} Character Audit</span>
                    </div>
                    <button className="portal-btn-ghost" style={{ fontSize: '0.8rem', fontWeight: 800, padding: '8px 16px' }} onClick={() => setComments({...comments, [student.id]: 'Consistently demonstrating academic excellence and institutional discipline. Commendable performance across all disciplines.'})}>
                        <i className="fas fa-magic mr-2"></i>Use Template
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="portal-card" style={{ textAlign: 'center', padding: '160px 24px' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', border: '1px solid #f1f5f9' }}>
                <i className="fas fa-graduation-cap fa-3x" style={{ color: '#cbd5e1', opacity: 0.5 }}></i>
            </div>
            <h3 style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.5rem', letterSpacing: '-0.5px' }}>Registry Synchronization Required</h3>
            <p style={{ color: '#64748b', fontWeight: 700, maxWidth: '400px', margin: '16px auto 0', lineHeight: 1.6 }}>Please select an authorized class registry and academic {isSemester ? 'semester' : 'term'} to audit student performance and authorize institutional commentary.</p>
        </div>
      )}
    </div>
  );
}
