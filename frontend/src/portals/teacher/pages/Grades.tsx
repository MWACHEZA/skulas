import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';
import { useToast } from '../../../context/ToastContext';

interface GradingScaleBand {
  id?: string;
  grade: string;
  minScore: number;
  maxScore: number;
  status?: string;
}

interface StudentGradeRecord {
  id: string;
  studentId: string;
  name: string;
  user?: { name: string };
  caScore: number;
  examScore: number;
  comment: string;
  industrialAssessment?: {
    industrialSup: number;
    academicSup: number;
    report: number;
    oral: number;
  };
}

export default function TeacherGrades() {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [year, setYear] = useState(new Date().getFullYear());
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentGradeRecord[]>([]);
  const [schoolGradingScale, setSchoolGradingScale] = useState<GradingScaleBand[]>([]);
  const [subjectModeratedScale, setSubjectModeratedScale] = useState<GradingScaleBand[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { t: trans } = useTranslation();
  const { t, isUniversity } = useTerminology();
  const { showToast } = useToast();

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedSubject = selectedClass?.subject;
  const isIndustrial = selectedSubject?.isIndustrial;
  const caWeight = selectedSubject?.caWeight !== undefined ? selectedSubject.caWeight : 30;
  const examWeight = selectedSubject?.examWeight !== undefined ? selectedSubject.examWeight : 70;

  // Active grading scale for this subject (moderated takes precedence over school default)
  const effectiveGradingScale: GradingScaleBand[] = useMemo(() => {
    if (subjectModeratedScale && subjectModeratedScale.length > 0) {
      return subjectModeratedScale;
    }
    if (schoolGradingScale && schoolGradingScale.length > 0) {
      return schoolGradingScale;
    }
    // Standard default scale
    return [
      { grade: 'A', minScore: 75, maxScore: 100, status: 'Distinction' },
      { grade: 'B', minScore: 65, maxScore: 74, status: 'Merit' },
      { grade: 'C', minScore: 50, maxScore: 64, status: 'Credit' },
      { grade: 'D', minScore: 40, maxScore: 49, status: 'Pass' },
      { grade: 'F', minScore: 0, maxScore: 39, status: 'Fail' }
    ];
  }, [subjectModeratedScale, schoolGradingScale]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudentsAndGrades();
    } else {
      setStudents([]);
    }
  }, [selectedClassId, selectedSubjectId, term, year]);

  useEffect(() => {
    if (selectedSubjectId) {
      fetchSubjectScale(selectedSubjectId);
    }
  }, [selectedSubjectId]);

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
      const [classesRes, scalesRes] = await Promise.all([
        api.get('/api/teachers/my-classes'),
        api.get('/api/grading').catch(() => ({ data: [] }))
      ]);

      const classData = Array.isArray(classesRes.data) ? classesRes.data : [];
      setClasses(classData);

      if (Array.isArray(scalesRes.data) && scalesRes.data.length > 0) {
        setSchoolGradingScale(scalesRes.data);
      }

      if (classData.length > 0) {
        setSelectedClassId(classData[0].id);
        setSelectedSubjectId(classData[0].subjectId || classData[0].subject?.id || '');
      }
    } catch (err) {
      showToast('Failed to fetch class metadata', 'error');
    }
  };

  const fetchSubjectScale = async (subjId: string) => {
    try {
      const res = await api.get(`/api/grades/scale/${subjId}`);
      if (res.data?.moderatedScale && Array.isArray(res.data.moderatedScale)) {
        setSubjectModeratedScale(res.data.moderatedScale);
      } else {
        setSubjectModeratedScale(null);
      }
    } catch (err) {
      // Fallback to school default
      setSubjectModeratedScale(null);
    }
  };

  const fetchStudentsAndGrades = async () => {
    setLoading(true);
    try {
      const [studentsRes, gradesRes] = await Promise.all([
        api.get(`/api/teachers/my-students?classId=${selectedClassId}`),
        api.get(`/api/grades/class/${selectedClassId}?subjectId=${selectedSubjectId}&term=${term}&year=${year}`)
      ]);

      const studentsData = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      const gradesData = Array.isArray(gradesRes.data) ? gradesRes.data : [];

      const mapped: StudentGradeRecord[] = studentsData.map((s: any) => {
        const existingGrade = gradesData.find((g: any) => g.studentId === s.id);
        return {
          id: s.id,
          studentId: s.studentId || s.id,
          name: s.name || s.user?.name || 'Student',
          user: s.user || { name: s.name },
          caScore: existingGrade?.caScore !== undefined ? existingGrade.caScore : 0,
          examScore: existingGrade?.examScore !== undefined ? existingGrade.examScore : 0,
          comment: existingGrade?.comment || '',
          industrialAssessment: existingGrade?.industrialAssessment || { industrialSup: 0, academicSup: 0, report: 0, oral: 0 }
        };
      });

      const draftKey = `draft_grades_${selectedClassId}_${selectedSubjectId}_${term}_${year}`;
      const draftData = localStorage.getItem(draftKey);
      if (draftData) {
        if (window.confirm('You have unsaved draft grades stored locally. Do you want to restore them?')) {
          setStudents(JSON.parse(draftData));
          setHasUnsavedChanges(true);
          setLoading(false);
          return;
        } else {
          localStorage.removeItem(draftKey);
        }
      }

      setStudents(mapped);
      setHasUnsavedChanges(false);
    } catch (err) {
      showToast('Failed to fetch student grades', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateStudentTotal = (s: StudentGradeRecord): number => {
    if (isIndustrial) {
      const ind = s.industrialAssessment || { industrialSup: 0, academicSup: 0, report: 0, oral: 0 };
      const ca = ((ind.industrialSup || 0) + (ind.academicSup || 0)) / 2;
      return Math.round(((ca * 0.5) + ((ind.report || 0) * 0.4) + ((ind.oral || 0) * 0.1)) * 10) / 10;
    }
    const ca = parseFloat(String(s.caScore)) || 0;
    const exam = parseFloat(String(s.examScore)) || 0;
    const total = (ca * (caWeight / 100)) + (exam * (examWeight / 100));
    return Math.round(total * 10) / 10;
  };

  const getGradeInfo = (score: number): { grade: string; color: string; status: string } => {
    for (const scale of effectiveGradingScale) {
      if (score >= scale.minScore && score <= scale.maxScore) {
        let color = '#10b981'; // Green for top grades
        if (scale.minScore < 50) color = '#ef4444'; // Red for fail
        else if (scale.minScore < 60) color = '#f59e0b'; // Amber for pass
        else if (scale.minScore < 70) color = '#3b82f6'; // Blue for credit/merit
        return { grade: scale.grade, color, status: scale.status || 'Active' };
      }
    }
    return score >= 50 
      ? { grade: 'Pass', color: '#10b981', status: 'Passed' }
      : { grade: 'Fail', color: '#ef4444', status: 'Failed' };
  };

  const handleScoreChange = (sid: string, field: string, value: any) => {
    setStudents(prev => {
      const newStudents = prev.map(s => {
        if (s.id !== sid) return s;
        if (field.startsWith('ind_')) {
          const indField = field.replace('ind_', '');
          return {
            ...s,
            industrialAssessment: { 
              ...(s.industrialAssessment || { industrialSup: 0, academicSup: 0, report: 0, oral: 0 }),
              [indField]: parseFloat(value || '0') 
            }
          };
        }
        if (field === 'comment') {
          return { ...s, comment: value };
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
      const results = students.map(s => {
        const totalScore = calculateStudentTotal(s);
        const gradeInfo = getGradeInfo(totalScore);
        return {
          studentId: s.id,
          score: totalScore,
          grade: gradeInfo.grade,
          caScore: s.caScore,
          examScore: s.examScore,
          comment: s.comment,
          industrialAssessment: s.industrialAssessment
        };
      });

      const payload = {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        term,
        year,
        results
      };

      await api.post('/api/grades/bulk', payload);
      showToast('All student grades saved successfully to official records!', 'success');
      const draftKey = `draft_grades_${selectedClassId}_${selectedSubjectId}_${term}_${year}`;
      localStorage.removeItem(draftKey);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save grades', 'error');
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    if (students.length === 0) {
      showToast('No student records to export', 'warning');
      return;
    }

    const headers = ['Student ID', 'Student Name', `Continuous Assessment (${caWeight}%)`, `Final Exam (${examWeight}%)`, 'Total Score (%)', 'Grade', 'Remarks'];
    let csv = headers.map(h => `"${h}"`).join(',') + '\n';

    students.forEach(s => {
      const total = calculateStudentTotal(s);
      const { grade } = getGradeInfo(total);
      const row = [
        s.studentId,
        s.name,
        s.caScore,
        s.examScore,
        total,
        grade,
        s.comment || ''
      ];
      csv += row.map(v => `"${v}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gradebook_${selectedClass?.name || 'class'}_${term.replace(/\s+/g, '')}_${year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Gradebook spreadsheet exported successfully!', 'success');
  };

  // Filtered students for search
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats calculation
  const totalStudents = students.length;
  const scoredStudents = students.filter(s => s.caScore > 0 || s.examScore > 0);
  const averageScore = scoredStudents.length > 0
    ? Math.round((scoredStudents.reduce((sum, s) => sum + calculateStudentTotal(s), 0) / scoredStudents.length) * 10) / 10
    : 0;
  const highestScore = scoredStudents.length > 0
    ? Math.max(...scoredStudents.map(s => calculateStudentTotal(s)))
    : 0;
  const passCount = scoredStudents.filter(s => calculateStudentTotal(s) >= 50).length;
  const passRate = scoredStudents.length > 0 ? Math.round((passCount / scoredStudents.length) * 100) : 0;

  return (
    <>
      {/* KPI Overview Metrics */}
      <div className="portal-stats-grid" style={{ marginBottom: 20 }}>
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue">
            <i className="fas fa-users" />
          </div>
          <div className="portal-stat-info">
            <h3>{totalStudents}</h3>
            <p>Enrolled {t('students')}</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon purple">
            <i className="fas fa-calculator" />
          </div>
          <div className="portal-stat-info">
            <h3>{averageScore > 0 ? `${averageScore}%` : '—'}</h3>
            <p>Class Average Mark</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon green">
            <i className="fas fa-award" />
          </div>
          <div className="portal-stat-info">
            <h3>{highestScore > 0 ? `${highestScore}%` : '—'}</h3>
            <p>Highest Score</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon orange">
            <i className="fas fa-check-circle" />
          </div>
          <div className="portal-stat-info">
            <h3>{passRate > 0 ? `${passRate}%` : '—'}</h3>
            <p>Pass Rate ({passCount}/{scoredStudents.length || 0})</p>
          </div>
        </div>
      </div>

      {/* Main Gradebook Container */}
      <div className="portal-card" style={{ marginBottom: 20 }}>
        {/* Controls Toolbar */}
        <div 
          className="portal-card-header" 
          style={{ 
            background: '#f8fafc', 
            padding: '16px 20px', 
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: 16 
          }}
        >
          {/* Class, Term, and Year Filters */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: 4, color: '#475569' }}>
                {trans('select')} {t('class')}:
              </label>
              <select 
                value={selectedClassId} 
                onChange={e => {
                  const c = classes.find(cl => cl.id === e.target.value);
                  setSelectedClassId(e.target.value);
                  if (c) setSelectedSubjectId(c.subjectId || c.subject?.id || '');
                }}
                className="portal-input"
                style={{ minWidth: 200, padding: '7px 12px' }}
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.subject?.name ? `(${c.subject.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: 4, color: '#475569' }}>
                Academic Period:
              </label>
              <select 
                value={term} 
                onChange={e => setTerm(e.target.value)}
                className="portal-input"
                style={{ minWidth: 130, padding: '7px 12px' }}
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: 4, color: '#475569' }}>
                Year:
              </label>
              <select 
                value={year} 
                onChange={e => setYear(parseInt(e.target.value))}
                className="portal-input"
                style={{ minWidth: 100, padding: '7px 12px' }}
              >
                {[0, -1, -2, 1].map(offset => {
                  const y = new Date().getFullYear() + offset;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>

            <div style={{ position: 'relative' }}>
              <label style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: 4, color: '#475569' }}>
                Search Student:
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }} />
                <input
                  type="text"
                  placeholder="Filter name or ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="portal-input"
                  style={{ paddingLeft: 30, minWidth: 180, padding: '7px 12px 7px 30px' }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={exportCSV}
              type="button"
              className="portal-btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              title="Download CSV spreadsheet"
            >
              <i className="fas fa-file-csv" style={{ color: '#059669', marginRight: 6 }} />
              Export CSV
            </button>

            <button 
              onClick={saveGrades}
              disabled={saving || !hasUnsavedChanges}
              className="portal-btn-success"
              style={{
                padding: '9px 18px',
                fontSize: '0.88rem',
                opacity: !hasUnsavedChanges && !saving ? 0.75 : 1
              }}
            >
              {saving ? (
                <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i> {trans('saving')}</>
              ) : (
                <><i className="fas fa-save" style={{ marginRight: 8 }}></i> {hasUnsavedChanges ? 'Save Changes' : 'Grades Up to Date'}</>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Scale & Weighting Legend Banner */}
        <div 
          style={{
            padding: '12px 20px',
            background: '#eff6ff',
            borderBottom: '1px solid #dbeafe',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#1e40af' }}>
            <i className="fas fa-balance-scale" style={{ fontSize: '0.95rem' }} />
            <span style={{ fontWeight: 700 }}>Assessment Weighting:</span>
            <span>Continuous Assessment ({caWeight}%) + Final Examination ({examWeight}%) = 100% Total</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginRight: 4 }}>Grading Scale:</span>
            {effectiveGradingScale.map((scale, i) => (
              <span 
                key={i} 
                style={{ 
                  background: '#ffffff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 6,
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#1e3a8a'
                }}
              >
                {scale.grade}: {scale.minScore}-{scale.maxScore}%
              </span>
            ))}
          </div>
        </div>

        {/* Table Body */}
        <div className="portal-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: 12 }} />
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading student marksheet and active grading scale...</p>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                {isIndustrial ? (
                  <tr>
                    <th>{t('student')}</th>
                    <th>Industrial Sup (25%)</th>
                    <th>Academic Sup (25%)</th>
                    <th>Technical Report (40%)</th>
                    <th>Oral Pres. (10%)</th>
                    <th>Total</th>
                    <th>Grade</th>
                    <th>Remarks</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ minWidth: 200 }}>{t('student')}</th>
                    <th style={{ width: 140, textAlign: 'center' }}>
                      CA ({caWeight}%)
                    </th>
                    <th style={{ width: 140, textAlign: 'center' }}>
                      Final Exam ({examWeight}%)
                    </th>
                    <th style={{ width: 110, textAlign: 'center' }}>Total Score</th>
                    <th style={{ width: 110, textAlign: 'center' }}>Official Grade</th>
                    <th style={{ minWidth: 220 }}>Teacher Remarks (Report Card)</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>
                      {searchTerm ? 'No students match your search filter.' : trans('no_students_found')}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(s => {
                    const total = calculateStudentTotal(s);
                    const { grade, color } = getGradeInfo(total);

                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ color: '#0f172a' }}>{s.name}</div>
                          <small style={{ color: '#64748b', fontSize: '0.78rem' }}>{s.studentId}</small>
                        </td>

                        {isIndustrial ? (
                          <>
                            <td>
                              <input 
                                type="number" 
                                min={0} 
                                max={100}
                                value={s.industrialAssessment?.industrialSup || 0} 
                                onChange={e => handleScoreChange(s.id, 'ind_industrialSup', e.target.value)} 
                                className="grade-input" 
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                min={0} 
                                max={100}
                                value={s.industrialAssessment?.academicSup || 0} 
                                onChange={e => handleScoreChange(s.id, 'ind_academicSup', e.target.value)} 
                                className="grade-input" 
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                min={0} 
                                max={100}
                                value={s.industrialAssessment?.report || 0} 
                                onChange={e => handleScoreChange(s.id, 'ind_report', e.target.value)} 
                                className="grade-input" 
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                min={0} 
                                max={100}
                                value={s.industrialAssessment?.oral || 0} 
                                onChange={e => handleScoreChange(s.id, 'ind_oral', e.target.value)} 
                                className="grade-input" 
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="number" 
                                min={0} 
                                max={100}
                                value={s.caScore} 
                                onChange={e => handleScoreChange(s.id, 'caScore', e.target.value)} 
                                className="grade-input" 
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="number" 
                                min={0} 
                                max={100}
                                value={s.examScore} 
                                onChange={e => handleScoreChange(s.id, 'examScore', e.target.value)} 
                                className="grade-input" 
                              />
                            </td>
                          </>
                        )}

                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
                            {total}%
                          </span>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <span 
                            style={{ 
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: 6,
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              background: `${color}18`,
                              color: color,
                              border: `1px solid ${color}40`
                            }}
                          >
                            Grade {grade}
                          </span>
                        </td>

                        <td>
                          <input
                            type="text"
                            placeholder="e.g. Shows commendable progress in coursework..."
                            value={s.comment}
                            onChange={e => handleScoreChange(s.id, 'comment', e.target.value)}
                            className="portal-input"
                            style={{ width: '100%', fontSize: '0.82rem', padding: '6px 10px' }}
                          />
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
          width: 84px;
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          text-align: center;
          font-weight: 700;
          font-size: 0.92rem;
          color: #1e293b;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .grade-input:focus {
          border-color: #0284c7;
          outline: none;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }
      `}</style>
    </>
  );
}
