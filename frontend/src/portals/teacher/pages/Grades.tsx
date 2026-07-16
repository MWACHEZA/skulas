import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../context/ToastContext';

export default function TeacherGrades() {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [term, setTerm] = useState('Semester 1');
  const [year, setYear] = useState(new Date().getFullYear());
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { t: trans } = useTranslation();
  const { t, isUniversity } = useTerminology();
  const { showToast } = useToast();

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedSubject = selectedClass?.subject;
  const isIndustrial = selectedSubject?.isIndustrial;

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (selectedClassId) fetchStudentsAndGrades();
    else setStudents([]);
  }, [selectedClassId, selectedSubjectId, term, year]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchMetadata = async () => {
    try {
      const { data } = await api.get('/api/teachers/my-classes');
      setClasses(data);
      if (data.length > 0) {
        setSelectedClassId(data[0].id);
        setSelectedSubjectId(data[0].subjectId);
      }
    } catch (err) {
      showToast('Failed to fetch classes', 'error');
    
    }
  };

  const fetchStudentsAndGrades = async () => {
    setLoading(true);
    try {
      const [studentsRes, gradesRes] = await Promise.all([
        api.get(`/api/teachers/my-students?classId=${selectedClassId}`),
        api.get(`/api/grades/class/${selectedClassId}?subjectId=${selectedSubjectId}&term=${term}&year=${year}`)
      ]);
      
      const studentsData = studentsRes.data;
      const gradesData = gradesRes.data;

      const mapped = studentsData.map((s: any) => {
        const existingGrade = gradesData.find((g: any) => g.studentId === s.id);
        return {
          ...s,
          caScore: existingGrade?.caScore || 0,
          examScore: existingGrade?.examScore || 0,
          industrialAssessment: existingGrade?.industrialAssessment || { industrialSup: 0, academicSup: 0, report: 0, oral: 0 }
        };
      });

      const draftKey = `draft_grades_${selectedClassId}_${selectedSubjectId}_${term}_${year}`;
      const draftData = localStorage.getItem(draftKey);
      if (draftData) {
        if (await toastConfirm('You have unsaved draft grades. Do you want to restore them?')) {
          setStudents(JSON.parse(draftData));
          setHasUnsavedChanges(true);
          return;
        } else {
          localStorage.removeItem(draftKey);
        }
      }

      setStudents(mapped);
      setHasUnsavedChanges(false);
    } catch (err) {
      showToast('Failed to fetch student data', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (sid: string, field: string, value: any) => {
    setStudents(prev => {
      const newStudents = prev.map(s => {
        if (s.id !== sid) return s;
        if (field.startsWith('ind_')) {
          const indField = field.replace('ind_', '');
          return {
            ...s,
            industrialAssessment: { ...s.industrialAssessment, [indField]: parseFloat(value || '0') }
          };
        }
        return { ...s, [field]: parseFloat(value || '0') };
      });
      
      const draftKey = `draft_grades_${selectedClassId}_${selectedSubjectId}_${term}_${year}`;
      localStorage.setItem(draftKey, JSON.stringify(newStudents));
      setHasUnsavedChanges(true);
      return newStudents;
    });
  };

  const saveGrades = async () => {
    setSaving(true);
    try {
      const payload = {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        term,
        year,
        results: students.map(s => ({
          studentId: s.id,
          caScore: s.caScore,
          examScore: s.examScore,
          industrialAssessment: s.industrialAssessment
        }))
      };
      await api.post('/api/grades/bulk', payload);
      showToast('Grades saved successfully!', 'success');
      const draftKey = `draft_grades_${selectedClassId}_${selectedSubjectId}_${term}_${year}`;
      localStorage.removeItem(draftKey);
      setHasUnsavedChanges(false);
    } catch (err) {
      showToast('Failed to save grades', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>{trans('gradebook')}</h1>
        <p>{trans('manage_grades')}</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ background: '#f8f9fa', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>{trans('select')} {t('class')}:</label>
              <select 
                value={selectedClassId} 
                onChange={e => {
                  const c = classes.find(cl => cl.id === e.target.value);
                  setSelectedClassId(e.target.value);
                  if (c) setSelectedSubjectId(c.subjectId);
                }}
                className="portal-input"
                style={{ minWidth: 200 }}
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.subject?.name}</option>
                ))}
              </select>
            </div>
            {isUniversity && (
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>{t('term')}:</label>
                <select 
                  value={term} 
                  onChange={e => setTerm(e.target.value)}
                  className="portal-input"
                >
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="Summer Block">Summer Block</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <button 
              onClick={saveGrades}
              disabled={saving}
              className="portal-btn-success"
            >
              {saving ? (
                <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i> {trans('saving')}</>
              ) : (
                <><i className="fas fa-save" style={{ marginRight: 8 }}></i> {trans('save_grades')}</>
              )}
            </button>
          </div>
        </div>
        <div className="portal-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          {loading ? (
             <div style={{ textAlign: 'center', padding: 40 }}><i className="fas fa-spinner fa-spin fa-2x color-primary"></i></div>
          ) : (
            <table className="portal-table">
              <thead>
                {isIndustrial ? (
                  <tr>
                    <th>{t('student')}</th>
                    <th>Industrial Sup (25%)</th>
                    <th>Academic Sup (25%)</th>
                    <th>Technical Report (40%)</th>
                    <th>Oral Presentation (10%)</th>
                    <th>{trans('total')}</th>
                  </tr>
                ) : (
                  <tr>
                    <th>{t('student')}</th>
                    {isUniversity ? (
                      <>
                        <th>Continuous Assessment ({selectedSubject?.caWeight}%)</th>
                        <th>Final Examination ({selectedSubject?.examWeight}%)</th>
                      </>
                    ) : (
                      <>
                        <th>Assignment 1 (20%)</th>
                        <th>Mid-Term (30%)</th>
                        <th>Final Exam (50%)</th>
                      </>
                    )}
                    <th>{trans('total_course')}</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {students.length === 0 ? (
                   <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#a0aec0' }}>{trans('no_students_found')}</td></tr>
                ) : (
                  students.map(s => {
                    let total = 0;
                    if (isIndustrial) {
                      const ind = s.industrialScores;
                      total = Math.round(((ind.industrialSup + ind.academicSup) / 2 * 0.5) + (ind.report * 0.4) + (ind.oral * 0.1));
                    } else {
                      const cw = selectedSubject?.caWeight || 30;
                      const ew = selectedSubject?.examWeight || 70;
                      total = Math.round((s.caScore * (cw / 100)) + (s.examScore * (ew / 100)));
                    }

                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.user.name} <br/><small style={{ color: '#718096' }}>{s.studentId}</small></td>
                        {isIndustrial ? (
                          <>
                            <td><input type="number" aria-label={`Industrial Supervisor score for ${s.user.name}`} value={s.industrialScores.industrialSup} onChange={e => handleScoreChange(s.id, 'ind_industrialSup', e.target.value)} className="grade-input" /></td>
                            <td><input type="number" aria-label={`Academic Supervisor score for ${s.user.name}`} value={s.industrialScores.academicSup} onChange={e => handleScoreChange(s.id, 'ind_academicSup', e.target.value)} className="grade-input" /></td>
                            <td><input type="number" aria-label={`Technical Report score for ${s.user.name}`} value={s.industrialScores.report} onChange={e => handleScoreChange(s.id, 'ind_report', e.target.value)} className="grade-input" /></td>
                            <td><input type="number" aria-label={`Oral Presentation score for ${s.user.name}`} value={s.industrialScores.oral} onChange={e => handleScoreChange(s.id, 'ind_oral', e.target.value)} className="grade-input" /></td>
                          </>
                        ) : isUniversity ? (
                          <>
                            <td><input type="number" aria-label={`Continuous Assessment score for ${s.user.name}`} value={s.caScore} onChange={e => handleScoreChange(s.id, 'caScore', e.target.value)} className="grade-input" /></td>
                            <td><input type="number" aria-label={`Final Examination score for ${s.user.name}`} value={s.examScore} onChange={e => handleScoreChange(s.id, 'examScore', e.target.value)} className="grade-input" /></td>
                          </>
                        ) : (
                          <>
                             {/* Keep old logic fallback for K-12 */}
                             <td><input type="number" aria-label={`Assignment 1 score for ${s.user.name}`} value={s.caScore} onChange={e => handleScoreChange(s.id, 'caScore', e.target.value)} className="grade-input" /></td>
                             <td><input type="number" aria-label={`Mid-Term score for ${s.user.name}`} value={s.midTermScore || 0} className="grade-input" /></td>
                             <td><input type="number" aria-label={`Final Exam score for ${s.user.name}`} value={s.examScore} onChange={e => handleScoreChange(s.id, 'examScore', e.target.value)} className="grade-input" /></td>
                          </>
                        )}
                        <td>
                          <span className={`portal-badge ${total >= 75 ? 'success' : total >= 50 ? 'info' : 'danger'}`}>
                            {total}% {isUniversity && `(${total >= 75 ? '1' : total >= 65 ? '2.1' : total >= 60 ? '2.2' : total >= 50 ? 'Pass' : 'Fail'})`}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <style>{`
        .grade-input {
          width: 80px;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid #cbd5e0;
          text-align: center;
          font-weight: 600;
        }
        .grade-input:focus {
          border-color: var(--portal-primary);
          outline: none;
          box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
        }
      `}</style>
    </>
  );
}
