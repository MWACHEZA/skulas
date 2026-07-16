import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { toast } from 'react-hot-toast';
import '../../../styles/portal.css';
import { useTerminology } from '../../../hooks/useTerminology';

interface Student {
  id: string;
  name: string;
  studentId: string;
  grades: {
    id: string;
    caScore: number;
    examScore: number;
    score: number;
    grade: string;
    comment: string;
  }[];
}

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  caWeight?: number;
  examWeight?: number;
}

export default function MarksEntryPage() {
  const { isMedical, isPoly, isUniversity, isSeminary } = useTerminology();
  const isSemester = isUniversity || isPoly || isMedical || isSeminary;

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [term, setTerm] = useState(isSemester ? 'Semester 1' : 'Term 1');
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [marks, setMarks] = useState<Record<string, { caScore: string; examScore: string; comment: string }>>({});

  useEffect(() => {
    setTerm(isSemester ? 'Semester 1' : 'Term 1');
  }, [isSemester]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/subjects')
      ]);
      setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
      setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
    } catch (error) {
      toast.error('Failed to synchronize academic registry repositories');
    }
  };

  const loadStudents = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      toast.error('Institutional class and subject parameters required');
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/api/grades/subject/${selectedClassId}/${selectedSubjectId}`, {
        params: { term, year }
      });
      const studentData = Array.isArray(res.data) ? res.data : [];
      setStudents(studentData);
      
      // Initialize marks state
      const initialMarks: any = {};
      studentData.forEach((s: Student) => {
        const g = Array.isArray(s.grades) ? s.grades[0] : null;
        initialMarks[s.id] = {
          caScore: g?.caScore?.toString() || '',
          examScore: g?.examScore?.toString() || '',
          comment: g?.comment || ''
        };
      });
      setMarks(initialMarks);
      toast.success(`${studentData.length} student records synchronized`);
    } catch (error) {
      toast.error('Failed to synchronize student performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId: string, field: string, value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
  };

  const saveMarks = async () => {
    try {
      setSaving(true);
      const results = Object.entries(marks).map(([studentId, data]) => ({
        studentId,
        caScore: data.caScore,
        examScore: data.examScore,
        comment: data.comment
      }));

      await api.post('/api/grades/bulk', {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        term,
        year,
        results
      });
      toast.success('Performance metrics archived successfully');
      loadStudents(); // Refresh data
    } catch (error) {
      toast.error('Failed to archive performance metrics');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Performance Assessment</h1>
          <p>Record and audit student academic results, continuous assessment metrics, and professional feedback.</p>
        </div>
        <div className="status-badge" style={{ padding: '8px 20px', background: '#eef2ff', color: '#4338ca', border: '1px solid #e0e7ff', fontWeight: 900 }}>
          <i className="fas fa-graduation-cap mr-2"></i>ACADEMIC REGISTRY
        </div>
      </div>

      <div className="portal-card animate-in fade-in slide-in-from-top-4 duration-500" style={{ marginBottom: '40px' }}>
        <div className="portal-card-header">
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', border: '1px solid #e2e8f0' }}>
                <i className="fas fa-sliders-h" style={{ fontSize: '1.2rem' }}></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Assessment Configuration</h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>Define the academic parameters for student performance auditing.</p>
              </div>
           </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px', alignItems: 'end' }}>
          <div className="form-group">
            <label className="portal-label">Academic Cycle</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="portal-input"
              style={{ fontWeight: 800 }}
            />
          </div>
          <div className="form-group">
            <label className="portal-label">Assessment {isSemester ? 'Semester' : 'Term'}</label>
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
                  <option value="Term 1">Term 1 - Primary Cycle</option>
                  <option value="Term 2">Term 2 - Intermediate Cycle</option>
                  <option value="Term 3">Term 3 - Final Audit</option>
                </>
              )}
            </select>
          </div>
          <div className="form-group">
            <label className="portal-label">Institutional Class</label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="portal-input"
              style={{ fontWeight: 800 }}
            >
              <option value="">-- Select Registry --</option>
              {(Array.isArray(classes) ? classes : []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="portal-label">Subject Discipline</label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="portal-input"
              style={{ fontWeight: 800 }}
            >
              <option value="">-- Select Discipline --</option>
              {(Array.isArray(subjects) ? subjects : []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button 
            onClick={loadStudents}
            disabled={loading || !selectedClassId || !selectedSubjectId}
            className="portal-btn-primary"
            style={{ height: '56px', padding: '0 40px', fontWeight: 900 }}
          >
            {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-sync-alt mr-2"></i>}
            Authorize Roster Synchronization
          </button>
        </div>
      </div>

      {loading ? (
        <div className="portal-card animate-in fade-in duration-500" style={{ padding: '120px 24px', textAlign: 'center' }}>
          <div className="portal-spinner" style={{ margin: '0 auto 24px' }}></div>
          <p style={{ color: '#64748b', fontWeight: 900, fontSize: '1.25rem' }}>Synchronizing performance records...</p>
          <p style={{ color: '#94a3b8', fontWeight: 700, margin: 0 }}>Please remain on this page during data encryption.</p>
        </div>
      ) : (Array.isArray(students) ? students : []).length > 0 ? (
        <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#1e293b' }}>
                  {classes.find(c => c.id === selectedClassId)?.name}
                </h3>
                <i className="fas fa-chevron-right" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}></i>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#4338ca' }}>
                  {subjects.find(s => s.id === selectedSubjectId)?.name}
                </h3>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 700 }}>Recording assessments for {term}, Cycle {year}</p>
            </div>
            <button
              onClick={saveMarks}
              disabled={saving}
              className="portal-btn-primary"
              style={{ background: '#059669', border: '1px solid #047857', fontWeight: 900, padding: '14px 32px', height: '52px' }}
            >
              {saving ? <i className="fas fa-spinner fa-spin mr-3"></i> : <i className="fas fa-save mr-3"></i>}
              Archive Batch Results
            </button>
          </div>
          {(() => {
            const currentSubject = subjects.find(s => s.id === selectedSubjectId);
            const caWeight = currentSubject?.caWeight ?? 30;
            const examWeight = currentSubject?.examWeight ?? 70;

            return (
              <div className="table-responsive">
                <table className="management-table">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Student Identity</th>
                      <th style={{ textAlign: 'center', width: '14%' }}>Continuous Assess. ({caWeight}%)</th>
                      <th style={{ textAlign: 'center', width: '14%' }}>Cycle Examination ({examWeight}%)</th>
                      <th style={{ width: '30%' }}>Professional Audit Feedback</th>
                      <th style={{ textAlign: 'center', width: '10%' }}>Composite</th>
                      <th style={{ textAlign: 'right', width: '10%' }}>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(students) ? students : []).map(student => {
                      const data = marks[student.id] || { caScore: '', examScore: '', comment: '' };
                      const ca = parseFloat(data.caScore) || 0;
                      const exam = parseFloat(data.examScore) || 0;
                      const total = (ca * (caWeight / 100)) + (exam * (examWeight / 100)); 

                      return (
                        <tr key={student.id}>
                          <td>
                            <div style={{ fontWeight: 900, color: '#1e293b' }}>{student.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>REG: {student.studentId}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <input
                                  type="number"
                                  value={data.caScore}
                                  onChange={e => handleMarkChange(student.id, 'caScore', e.target.value)}
                                  className="portal-input"
                                  style={{ width: '100px', textAlign: 'center', padding: '12px', fontWeight: 900, fontSize: '1.1rem', color: '#4338ca', background: '#f5f7ff' }}
                                  placeholder="0"
                                />
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <input
                                  type="number"
                                  value={data.examScore}
                                  onChange={e => handleMarkChange(student.id, 'examScore', e.target.value)}
                                  className="portal-input"
                                  style={{ width: '100px', textAlign: 'center', padding: '12px', fontWeight: 900, fontSize: '1.1rem', color: '#4338ca', background: '#f5f7ff' }}
                                  placeholder="0"
                                />
                            </div>
                          </td>
                          <td>
                            <textarea
                              rows={1}
                              value={data.comment}
                              onChange={e => handleMarkChange(student.id, 'comment', e.target.value)}
                              className="portal-input"
                              style={{ minHeight: '48px', resize: 'none', fontSize: '0.85rem', fontWeight: 700, background: '#f8fafc', padding: '12px 16px' }}
                              placeholder="Provide performance feedback..."
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.2rem', letterSpacing: '-0.5px' }}>{total.toFixed(1)}%</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="status-badge" style={{ 
                              fontWeight: 900,
                              padding: '8px 16px',
                          background: total >= 75 ? '#ecfdf5' : total >= 50 ? '#fffbeb' : '#fef2f2',
                          color: total >= 75 ? '#059669' : total >= 50 ? '#d97706' : '#dc2626',
                          border: `1px solid ${total >= 75 ? '#d1fae5' : total >= 50 ? '#fef3c7' : '#fee2e2'}`,
                          fontSize: '0.9rem',
                          minWidth: '40px',
                          display: 'inline-flex',
                          justifyContent: 'center'
                        }}>
                          {total >= 75 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : 'F'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
            );
          })()}
          <div style={{ padding: '40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '24px' }}>
             <div style={{ textAlign: 'right' }}>
               <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 800 }}>AUTHORIZED BATCH ARCHIVE</p>
               <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>Encrypted at institutional standards.</p>
             </div>
             <button
              onClick={saveMarks}
              disabled={saving}
              className="portal-btn-primary"
              style={{ background: '#059669', border: '1px solid #047857', fontWeight: 900, padding: '18px 64px', height: '64px' }}
            >
              {saving ? <i className="fas fa-spinner fa-spin mr-3"></i> : <i className="fas fa-file-archive mr-3"></i>}
              Finalize & Archive Batch Results
            </button>
          </div>
        </div>
      ) : (
        <div className="portal-card animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ padding: '140px 24px', textAlign: 'center', background: '#f8fafc', border: '1px dashed #e2e8f0' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fff', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', color: '#94a3b8' }}>
            <i className="fas fa-user-graduate fa-2x" style={{ opacity: 0.3 }}></i>
          </div>
          <h3 style={{ color: '#64748b', fontWeight: 900, fontSize: '1.4rem', marginBottom: '12px' }}>Roster Registry Locked</h3>
          <p style={{ color: '#94a3b8', fontWeight: 700, maxWidth: '400px', margin: '0 auto' }}>Please select a target institutional class and subject discipline above to authorize student assessment records.</p>
        </div>
      )}
    </div>
  );
}
