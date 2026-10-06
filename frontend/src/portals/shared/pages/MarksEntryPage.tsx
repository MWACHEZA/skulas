import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../lib/api';
import { toast } from '../../../context/ToastContext';
import '../../../styles/portal.css';
import { useAcademicConfig } from '../../../hooks/useAcademicConfig';

interface AssessmentColumn {
  id: string;
  name: string;
  type: 'Test' | 'Exercise' | 'Quiz' | 'Mid-Year Exam' | 'End-of-Term Exam' | 'End-of-Year Exam' | 'Homework' | 'Assignment' | 'CAT' | 'Practical' | 'Project' | 'Exam';
  date?: string;
  maxScore: number;
  weight: number;
  selectedForReport: boolean;
  isCustom?: boolean;
  category?: 'CA' | 'EXAM';
}

interface GradingScaleBand {
  id?: string;
  grade: string;
  minScore: number;
  maxScore: number;
  description?: string;
}

interface StudentGrade {
  id?: string;
  caScore?: number;
  examScore?: number;
  score?: number;
  grade?: string;
  comment?: string;
  assessmentEntries?: any;
  classAverage?: number;
  classPosition?: number;
}

interface Student {
  id: string;
  name: string;
  studentId: string;
  grades?: StudentGrade[];
}

interface ClassItem {
  id: string;
  name: string;
}

interface SubjectItem {
  id: string;
  name: string;
  code?: string;
  caWeight?: number;
  examWeight?: number;
  isIndustrial?: boolean;
  moderatedScale?: GradingScaleBand[];
}

interface StudentMarksRecord {
  caScore: string;
  examScore: string;
  comment: string;
  assessmentScores: Record<string, string>;
}

const DEFAULT_K12_ASSESSMENTS: AssessmentColumn[] = [
  { id: 'cat-1', name: 'Continuous Assessment Test 1 (CAT)', type: 'CAT', date: '2026-02-15', maxScore: 30, weight: 20, selectedForReport: true, category: 'CA' },
  { id: 'cat-2', name: 'Continuous Assessment Test 2 (CAT)', type: 'CAT', date: '2026-03-20', maxScore: 30, weight: 20, selectedForReport: true, category: 'CA' },
  { id: 'practical-1', name: 'Practical Lab / Assignment', type: 'Practical', date: '2026-03-01', maxScore: 50, weight: 20, selectedForReport: true, category: 'CA' },
  { id: 'final-exam', name: 'End-of-Term Examination', type: 'Exam', date: '2026-04-10', maxScore: 100, weight: 40, selectedForReport: true, category: 'EXAM' },
];

export default function MarksEntryPage() {
  const {
    isK12,
    isTertiary,
    registeredTerms,
    academicPeriodLabel,
    classLabel,
    subjectLabel
  } = useAcademicConfig();

  const [frameworkMode, setFrameworkMode] = useState<'K12' | 'TERTIARY'>(() => {
    return isTertiary ? 'TERTIARY' : 'K12';
  });
  const isK12Effective = frameworkMode === 'K12';

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [term, setTerm] = useState(registeredTerms[0] || (isTertiary ? 'Semester 1' : 'Term 1'));
  const [year, setYear] = useState(new Date().getFullYear());

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // K12 Assessment Columns state
  const [assessmentColumns, setAssessmentColumns] = useState<AssessmentColumn[]>(DEFAULT_K12_ASSESSMENTS);
  const [marks, setMarks] = useState<Record<string, StudentMarksRecord>>({});

  // Add / Manage Assessment Column Modal
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [isManageColumnsModalOpen, setIsManageColumnsModalOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<AssessmentColumn['type']>('CAT');
  const [newColDate, setNewColDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newColMax, setNewColMax] = useState<number>(50);
  const [newColWeight, setNewColWeight] = useState<number>(20);
  const [newColCategory, setNewColCategory] = useState<'CA' | 'EXAM'>('CA');
  const [newColCountInReport, setNewColCountInReport] = useState<boolean>(true);

  // HOD Submission Modal
  const [isHodApprovalModalOpen, setIsHodApprovalModalOpen] = useState(false);
  const [hodNotes, setHodNotes] = useState('');
  const [isSubmittingHod, setIsSubmittingHod] = useState(false);

  // Grading Scale & Moderation Modal
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [schoolGradingScale, setSchoolGradingScale] = useState<GradingScaleBand[]>([]);
  const [moderatedScale, setModeratedScale] = useState<GradingScaleBand[] | null>(null);
  const [editableScaleBands, setEditableScaleBands] = useState<GradingScaleBand[]>([]);
  const [moderationReason, setModerationReason] = useState('');
  const [lastModeration, setLastModeration] = useState<any>(null);
  const [isSavingModeration, setIsSavingModeration] = useState(false);

  useEffect(() => {
    if (registeredTerms.length > 0 && !registeredTerms.includes(term)) {
      setTerm(registeredTerms[0]);
    }
  }, [registeredTerms]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // When subject changes, fetch scale info
  useEffect(() => {
    if (selectedSubjectId) {
      loadSubjectScale(selectedSubjectId);
    } else {
      setSchoolGradingScale([]);
      setModeratedScale(null);
      setEditableScaleBands([]);
      setLastModeration(null);
    }
  }, [selectedSubjectId]);

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

  const loadSubjectScale = async (subjectId: string) => {
    try {
      const res = await api.get(`/api/grades/scale/${subjectId}`);
      const schoolScale: GradingScaleBand[] = res.data.schoolScale || [];
      const modScale: GradingScaleBand[] | null = res.data.moderatedScale || null;
      setSchoolGradingScale(schoolScale);
      setModeratedScale(modScale);
      setLastModeration(res.data.lastModeration);

      // Initialize editable bands for modal
      if (modScale && modScale.length > 0) {
        setEditableScaleBands(JSON.parse(JSON.stringify(modScale)));
      } else if (schoolScale && schoolScale.length > 0) {
        setEditableScaleBands(JSON.parse(JSON.stringify(schoolScale)));
      } else {
        // Fallback default scale
        setEditableScaleBands(
          isTertiary
            ? [
                { grade: '1st', minScore: 75, maxScore: 100, description: 'First Class Honours' },
                { grade: '2.1', minScore: 65, maxScore: 74, description: 'Upper Second Class' },
                { grade: '2.2', minScore: 60, maxScore: 64, description: 'Lower Second Class' },
                { grade: 'Pass', minScore: 50, maxScore: 59, description: 'Pass Division' },
                { grade: 'Fail', minScore: 0, maxScore: 49, description: 'Failure' }
              ]
            : [
                { grade: 'A', minScore: 75, maxScore: 100, description: 'Distinction / Excellent' },
                { grade: 'B', minScore: 65, maxScore: 74, description: 'Credit / Good' },
                { grade: 'C', minScore: 50, maxScore: 64, description: 'Pass / Satisfactory' },
                { grade: 'D', minScore: 40, maxScore: 49, description: 'Subsidiary / Weak' },
                { grade: 'F', minScore: 0, maxScore: 39, description: 'Fail / Unsatisfactory' }
              ]
        );
      }
    } catch (err) {
      console.error('Failed to load grading scale', err);
    }
  };

  const loadStudents = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      toast.error(`${classLabel} and ${subjectLabel} parameters required`);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/api/grades/subject/${selectedClassId}/${selectedSubjectId}`, {
        params: { term, year }
      });
      const studentData: Student[] = Array.isArray(res.data) ? res.data : [];
      setStudents(studentData);

      // Fetch saved subject columns or fallback to default
      let discoveredColumns: AssessmentColumn[] = [...DEFAULT_K12_ASSESSMENTS];
      try {
        const colRes = await api.get(`/api/marks/columns/${selectedSubjectId}`);
        if (colRes.data?.columns && Array.isArray(colRes.data.columns) && colRes.data.columns.length > 0) {
          discoveredColumns = colRes.data.columns;
        }
      } catch (colErr) {
        // Fallback
      }

      const initialMarks: Record<string, StudentMarksRecord> = {};

      studentData.forEach(student => {
        const grade = student.grades && student.grades.length > 0 ? student.grades[0] : null;
        const studentAssessmentScores: Record<string, string> = {};

        if (grade && Array.isArray(grade.assessmentEntries)) {
          grade.assessmentEntries.forEach((entry: any) => {
            if (entry && entry.id) {
              studentAssessmentScores[entry.id] = typeof entry.score === 'number' ? entry.score.toString() : '';
              // Check if column already in discoveredColumns
              const exists = discoveredColumns.some(c => c.id === entry.id);
              if (!exists) {
                discoveredColumns.push({
                  id: entry.id,
                  name: entry.name || 'Assessment',
                  type: entry.type || 'Test',
                  date: entry.date || new Date().toISOString().slice(0, 10),
                  maxScore: entry.maxScore || 50,
                  weight: entry.weight || 20,
                  selectedForReport: entry.selectedForReport !== undefined ? entry.selectedForReport : true,
                  category: entry.category || 'CA',
                  isCustom: true
                });
              }
            }
          });
        }

        initialMarks[student.id] = {
          caScore: grade?.caScore?.toString() || '',
          examScore: grade?.examScore?.toString() || '',
          comment: grade?.comment || '',
          assessmentScores: studentAssessmentScores
        };
      });

      setAssessmentColumns(discoveredColumns);
      setMarks(initialMarks);
      toast.success(`${studentData.length} student records synchronized`);
    } catch (error) {
      toast.error('Failed to synchronize student performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssessmentScoreChange = (studentId: string, colId: string, value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        assessmentScores: {
          ...(prev[studentId]?.assessmentScores || {}),
          [colId]: value
        }
      }
    }));
  };

  const handleMarkChange = (studentId: string, field: 'caScore' | 'examScore' | 'comment', value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const toggleColumnSelectedForReport = (colId: string) => {
    setAssessmentColumns(prev =>
      prev.map(c => (c.id === colId ? { ...c, selectedForReport: !c.selectedForReport } : c))
    );
  };

  const handleAddCustomColumn = () => {
    if (!newColName.trim()) {
      toast.error('Assessment title is required');
      return;
    }
    if (newColMax <= 0) {
      toast.error('Maximum score must be greater than 0');
      return;
    }
    if (newColWeight <= 0) {
      toast.error('Assessment weight % must be greater than 0');
      return;
    }

    const newId = `col-${Date.now()}`;
    const newCol: AssessmentColumn = {
      id: newId,
      name: newColName.trim(),
      type: newColType,
      date: newColDate || new Date().toISOString().slice(0, 10),
      maxScore: Number(newColMax),
      weight: Number(newColWeight),
      category: newColCategory,
      selectedForReport: newColCountInReport,
      isCustom: true
    };

    setAssessmentColumns(prev => [...prev, newCol]);
    setIsAddColumnModalOpen(false);
    setNewColName('');
    setNewColMax(50);
    setNewColWeight(20);
    setNewColCategory('CA');
    setNewColCountInReport(true);
    toast.success(`Added "${newCol.name}" (${newCol.weight}%) assessment column`);
  };

  const handleDeleteColumn = (colId: string) => {
    setAssessmentColumns(prev => prev.filter(c => c.id !== colId));
    toast.success('Column removed');
  };

  const totalAllocatedWeight = useMemo(() => {
    return (
      Math.round(
        assessmentColumns
          .filter(c => c.selectedForReport)
          .reduce((sum, c) => sum + (parseFloat(String(c.weight)) || 0), 0) * 10
      ) / 10
    );
  }, [assessmentColumns]);

  const handleAutoBalanceWeights = () => {
    const activeCols = assessmentColumns.filter(c => c.selectedForReport);
    if (activeCols.length === 0) return;
    const currentSum = activeCols.reduce((sum, c) => sum + (parseFloat(String(c.weight)) || 0), 0);
    if (currentSum === 0) {
      const even = Math.floor(100 / activeCols.length);
      const rem = 100 - even * activeCols.length;
      setAssessmentColumns(prev =>
        prev.map((c, i) => (c.selectedForReport ? { ...c, weight: even + (i === 0 ? rem : 0) } : c))
      );
      toast.success('Weights distributed evenly to 100%');
      return;
    }
    let allocated = 0;
    const updated = assessmentColumns.map((c, idx) => {
      if (!c.selectedForReport) return c;
      if (idx === assessmentColumns.length - 1) {
        return { ...c, weight: Math.max(0, Math.round((100 - allocated) * 10) / 10) };
      }
      const newW = Math.round(((c.weight / currentSum) * 100) * 10) / 10;
      allocated += newW;
      return { ...c, weight: newW };
    });
    setAssessmentColumns(updated);
    toast.success('Weights auto-balanced proportionally to 100%');
  };

  const handleSaveColumnsConfiguration = async () => {
    if (!selectedSubjectId) {
      toast.error('Please select a subject first');
      return;
    }
    const includedCols = assessmentColumns.filter(c => c.selectedForReport);
    const sumW = Math.round(includedCols.reduce((s, c) => s + (parseFloat(String(c.weight)) || 0), 0) * 10) / 10;
    if (Math.abs(sumW - 100) > 0.05) {
      toast.error(`Columns included in the final report must sum to exactly 100% (currently ${sumW}%). Please adjust weights or use Auto-Balance.`);
      return;
    }

    try {
      await api.post(`/api/marks/columns/${selectedSubjectId}`, { columns: assessmentColumns });
      toast.success('Assessment columns and weights saved successfully!');
      setIsManageColumnsModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save assessment configuration');
    }
  };

  const submitForHodApproval = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      toast.error('Please select both class and subject');
      return;
    }
    setIsSubmittingHod(true);
    try {
      await api.post('/api/marks/submit-approval', {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        term,
        year,
        notes: hodNotes
      });
      toast.success('Marksheet submitted for HOD review and approval!');
      setIsHodApprovalModalOpen(false);
      setHodNotes('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit marks for approval');
    } finally {
      setIsSubmittingHod(false);
    }
  };

  // Active Subject details
  const currentSubject = useMemo(() => {
    return subjects.find(s => s.id === selectedSubjectId);
  }, [subjects, selectedSubjectId]);

  const caWeight = currentSubject?.caWeight ?? 30;
  const examWeight = currentSubject?.examWeight ?? 70;

  // Effective grading scale (Moderated scale has priority over School default)
  const effectiveScale = useMemo(() => {
    if (moderatedScale && moderatedScale.length > 0) return moderatedScale;
    if (schoolGradingScale && schoolGradingScale.length > 0) return schoolGradingScale;
    return editableScaleBands;
  }, [moderatedScale, schoolGradingScale, editableScaleBands]);

  // Compute grade from score using effective scale
  const computeGrade = (score: number): string => {
    if (effectiveScale && effectiveScale.length > 0) {
      const match = effectiveScale.find(s => score >= s.minScore && score <= s.maxScore);
      if (match) return match.grade;
    }
    // Fallback logic
    if (isTertiary) {
      if (score >= 75) return '1st';
      if (score >= 65) return '2.1';
      if (score >= 60) return '2.2';
      if (score >= 50) return 'Pass';
      return 'Fail';
    }
    if (score >= 75) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  };

  // Auto-calculate scores, percentages, grades, and positions for all students
  const computedStudentMetrics = useMemo(() => {
    const selectedCols = assessmentColumns.filter(c => c.selectedForReport);
    const totalIncludedWeight = selectedCols.reduce((sum, c) => sum + (parseFloat(String(c.weight)) || 0), 0);

    const calculated: Record<
      string,
      {
        compositeScore: number;
        caSubtotal: number;
        examSubtotal: number;
        gpaPoints: number;
        grade: string;
        classPosition: number;
      }
    > = {};

    // 1. Calculate raw composite percentage for each student
    const studentScoresList: { studentId: string; score: number }[] = [];

    students.forEach(student => {
      const data = marks[student.id] || { caScore: '', examScore: '', comment: '', assessmentScores: {} };
      let compositeScore = 0;
      let caSubtotal = 0;
      let examSubtotal = 0;

      if (selectedCols.length > 0 && totalIncludedWeight > 0) {
        compositeScore = selectedCols.reduce((sum, col) => {
          const raw = parseFloat(data.assessmentScores[col.id]) || 0;
          const max = col.maxScore || 100;
          const w = parseFloat(String(col.weight)) || 0;
          const weightedContribution = max > 0 ? (raw / max) * w : 0;

          if (col.category === 'CA' || col.type !== 'Exam') {
            caSubtotal += weightedContribution;
          } else {
            examSubtotal += weightedContribution;
          }
          return sum + weightedContribution;
        }, 0);
        compositeScore = Math.round(compositeScore * 10) / 10;
        caSubtotal = Math.round(caSubtotal * 10) / 10;
        examSubtotal = Math.round(examSubtotal * 10) / 10;
      } else {
        // Fallback CA + Exam weighted calculation
        const ca = parseFloat(data.caScore) || 0;
        const exam = parseFloat(data.examScore) || 0;
        compositeScore = Math.round(((ca * (caWeight / 100)) + (exam * (examWeight / 100))) * 10) / 10;
        caSubtotal = ca;
        examSubtotal = exam;
      }

      const grade = computeGrade(compositeScore);

      let gpaPoints = 0;
      if (compositeScore >= 75) gpaPoints = 4.0;
      else if (compositeScore >= 65) gpaPoints = 3.0;
      else if (compositeScore >= 50) gpaPoints = 2.0;
      else if (compositeScore >= 40) gpaPoints = 1.0;
      else gpaPoints = 0.0;

      studentScoresList.push({ studentId: student.id, score: compositeScore });
      calculated[student.id] = { compositeScore, caSubtotal, examSubtotal, gpaPoints, grade, classPosition: 1 };
    });

    // 2. Compute Class Position (Ranks) based on sorted composite scores (standard competition ranking: 1, 2, 2, 4)
    studentScoresList.sort((a, b) => b.score - a.score);
    studentScoresList.forEach((item, index) => {
      if (index > 0 && item.score === studentScoresList[index - 1].score) {
        calculated[item.studentId].classPosition = calculated[studentScoresList[index - 1].studentId].classPosition;
      } else {
        calculated[item.studentId].classPosition = index + 1;
      }
    });

    return calculated;
  }, [students, marks, assessmentColumns, isK12Effective, isTertiary, caWeight, examWeight, effectiveScale]);

  // Overall Class Average
  const classAverage = useMemo(() => {
    if (students.length === 0) return 0;
    const total = students.reduce((acc, s) => {
      return acc + (computedStudentMetrics[s.id]?.compositeScore || 0);
    }, 0);
    return Math.round((total / students.length) * 10) / 10;
  }, [students, computedStudentMetrics]);

  // Pass rate
  const passRate = useMemo(() => {
    if (students.length === 0) return 0;
    const passed = students.filter(s => {
      const g = computedStudentMetrics[s.id]?.grade;
      return g && g !== 'F' && g !== 'Fail';
    }).length;
    return Math.round((passed / students.length) * 100);
  }, [students, computedStudentMetrics]);

  // Save Batch to Backend
  const saveMarks = async (isFinalizing = false) => {
    if (!selectedClassId || !selectedSubjectId) {
      toast.error('Please select both class and subject');
      return;
    }

    try {
      setSaving(true);
      const results = students.map(student => {
        const d = marks[student.id] || { caScore: '', examScore: '', comment: '', assessmentScores: {} };
        const calc = computedStudentMetrics[student.id];

        // Format assessment entries
        const assessmentEntries = assessmentColumns.map(col => ({
          id: col.id,
          name: col.name,
          type: col.type,
          date: col.date || new Date().toISOString().slice(0, 10),
          maxScore: col.maxScore,
          weight: col.weight,
          category: col.category || 'CA',
          selectedForReport: col.selectedForReport,
          score: parseFloat(d.assessmentScores[col.id]) || 0
        }));

        return {
          studentId: student.id,
          caScore: parseFloat(d.caScore) || 0,
          examScore: parseFloat(d.examScore) || 0,
          score: calc?.compositeScore || 0,
          grade: calc?.grade || 'F',
          comment: d.comment || null,
          assessmentEntries,
          classAverage,
          classPosition: calc?.classPosition || 1
        };
      });

      await api.post('/api/grades/bulk', {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        term,
        year,
        classAverage,
        results
      });

      toast.success(
        isFinalizing
          ? 'Batch results finalized and archived successfully!'
          : 'Performance metrics archived successfully'
      );
      loadStudents();
    } catch (error: any) {
      toast.error('Failed to archive performance metrics: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  // Moderation Save Handler
  const handleSaveModeration = async () => {
    if (!selectedSubjectId) return;
    if (!moderationReason.trim()) {
      toast.error('A mandatory reason is required to moderate the grading scale');
      return;
    }

    try {
      setIsSavingModeration(true);
      const res = await api.post('/api/grades/moderate-scale', {
        subjectId: selectedSubjectId,
        moderatedScale: editableScaleBands,
        reason: moderationReason.trim(),
        term,
        year
      });
      setModeratedScale(res.data.moderatedScale);
      toast.success('Grading scale moderated and applied successfully!');
      setIsScaleModalOpen(false);
      setModerationReason('');
      loadSubjectScale(selectedSubjectId);
    } catch (error: any) {
      toast.error('Failed to moderate scale: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSavingModeration(false);
    }
  };

  // Reset Moderation to Default
  const handleResetModeration = async () => {
    if (!selectedSubjectId) return;
    try {
      setIsSavingModeration(true);
      await api.post('/api/grades/moderate-scale', {
        subjectId: selectedSubjectId,
        moderatedScale: null,
        reason: 'Reset to default school scale',
        term,
        year
      });
      setModeratedScale(null);
      toast.success('Grading scale reset to default successfully');
      setIsScaleModalOpen(false);
      setModerationReason('');
      loadSubjectScale(selectedSubjectId);
    } catch (error: any) {
      toast.error('Failed to reset scale: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSavingModeration(false);
    }
  };

  return (
    <div className="portal-container">
      {/* HEADER */}
      <div className="portal-page-header">
        <div className="header-content">
          <h1>{isTertiary ? 'Course Performance & Examination Grading' : 'Performance Assessment & Terminal Reports'}</h1>
          <p>
            {isTertiary
              ? 'Record and audit student academic results, semester assessments, and continuous evaluation metrics.'
              : 'Record tests, exercises, and exams. Select which marks count toward terminal reports, and auto-calculate class positions and averages.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectedSubjectId && (
            <button
              onClick={() => setIsScaleModalOpen(true)}
              className="portal-btn-ghost"
              style={{
                border: moderatedScale ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                background: moderatedScale ? '#fffbeb' : '#fff',
                color: moderatedScale ? '#b45309' : '#475569',
                fontWeight: 800,
                padding: '10px 18px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-balance-scale"></i>
              <span>{moderatedScale ? 'Moderation Active' : 'Moderate Scale'}</span>
              {moderatedScale && (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
              )}
            </button>
          )}
          <div className="status-badge" style={{ padding: '8px 20px', background: '#eef2ff', color: '#4338ca', border: '1px solid #e0e7ff', fontWeight: 900 }}>
            <i className="fas fa-graduation-cap mr-2"></i>ACADEMIC REGISTRY
          </div>
        </div>
      </div>

      {/* ASSESSMENT CONFIGURATION FILTER CARD */}
      <div className="portal-card animate-in fade-in slide-in-from-top-4 duration-500" style={{ marginBottom: '32px' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', border: '1px solid #e2e8f0' }}>
              <i className="fas fa-sliders-h" style={{ fontSize: '1.2rem' }}></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Assessment Scope Configuration</h3>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>
                Define the academic parameters and target registry for student performance auditing.
              </p>
            </div>
          </div>

          {/* Explicit Framework Mode Selector */}
          <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setFrameworkMode('K12')}
              className={isK12Effective ? 'portal-btn-primary' : 'portal-btn-ghost'}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 900,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isK12Effective ? '#4338ca' : 'transparent',
                color: isK12Effective ? '#ffffff' : '#64748b',
                border: isK12Effective ? 'none' : '1px solid transparent'
              }}
            >
              <i className="fas fa-school"></i>
              K-12 Terminal Assessment (CATs & Exams)
            </button>
            <button
              type="button"
              onClick={() => setFrameworkMode('TERTIARY')}
              className={!isK12Effective ? 'portal-btn-primary' : 'portal-btn-ghost'}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 900,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: !isK12Effective ? '#4338ca' : 'transparent',
                color: !isK12Effective ? '#ffffff' : '#64748b',
                border: !isK12Effective ? 'none' : '1px solid transparent'
              }}
            >
              <i className="fas fa-university"></i>
              Weighted CA + Exam
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', alignItems: 'end', padding: '8px' }}>
          <div className="form-group">
            <label className="portal-label">Academic Cycle (Year)</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="portal-input"
              style={{ fontWeight: 800 }}
            />
          </div>
          <div className="form-group">
            <label className="portal-label">Assessment {academicPeriodLabel}</label>
            <select
              value={term}
              onChange={e => setTerm(e.target.value)}
              className="portal-input"
              style={{ fontWeight: 800 }}
            >
              {registeredTerms.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="portal-label">{classLabel}</label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="portal-input"
              style={{ fontWeight: 800 }}
            >
              <option value="">-- Select {classLabel} --</option>
              {(Array.isArray(classes) ? classes : []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="portal-label">{subjectLabel} Discipline</label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="portal-input"
              style={{ fontWeight: 800 }}
            >
              <option value="">-- Select {subjectLabel} --</option>
              {(Array.isArray(subjects) ? subjects : []).map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
              ))}
            </select>
          </div>
          <button
            onClick={loadStudents}
            disabled={loading || !selectedClassId || !selectedSubjectId}
            className="portal-btn-primary"
            style={{ height: '52px', padding: '0 32px', fontWeight: 900 }}
          >
            {loading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-sync-alt mr-2"></i>}
            Authorize Roster Synchronization
          </button>
        </div>
      </div>

      {/* KPI METRICS BANNER (When roster is loaded) */}
      {students.length > 0 && !loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '28px'
          }}
        >
          <div style={{ background: '#fff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Class Average</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4338ca', marginTop: '4px' }}>
              {classAverage}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Composite score mean across {students.length} students</div>
          </div>

          <div style={{ background: '#fff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pass Rate</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: passRate >= 70 ? '#059669' : '#d97706', marginTop: '4px' }}>
              {passRate}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Students meeting minimum pass threshold</div>
          </div>

          <div style={{ background: '#fff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Roster</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e293b', marginTop: '4px' }}>
              {students.length} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Enrolled</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Synchronized performance entities</div>
          </div>

          <div style={{ background: '#fff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grading Standard</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: moderatedScale ? '#b45309' : '#059669', marginTop: '8px' }}>
              {moderatedScale ? 'Moderated Override' : 'Default Standard'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              {moderatedScale ? 'Subject-level modified thresholds' : 'Official institutional scale'}
            </div>
          </div>
        </div>
      )}

      {/* TABLE / ROSTER CONTENT */}
      {loading ? (
        <div className="portal-card animate-in fade-in duration-500" style={{ padding: '120px 24px', textAlign: 'center' }}>
          <div className="portal-spinner" style={{ margin: '0 auto 24px' }}></div>
          <p style={{ color: '#64748b', fontWeight: 900, fontSize: '1.25rem' }}>Synchronizing performance records...</p>
          <p style={{ color: '#94a3b8', fontWeight: 700, margin: 0 }}>Compiling continuous assessments and grades.</p>
        </div>
      ) : students.length > 0 ? (
        <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div
            className="portal-card-header"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px',
              padding: '12px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#1e293b' }}>
                  {classes.find(c => c.id === selectedClassId)?.name}
                </h3>
                <i className="fas fa-chevron-right" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}></i>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#4338ca' }}>
                  {currentSubject?.name}
                </h3>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 700 }}>
                Recording assessments for {term}, Cycle {year} • {isK12Effective ? 'K-12 Terminal Evaluation' : 'Tertiary Evaluation'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setIsScaleModalOpen(true)}
                className="portal-btn-ghost"
                style={{
                  padding: '10px 18px',
                  fontWeight: 800,
                  borderRadius: '10px',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  background: '#fef3c7'
                }}
                title="Moderate grade boundaries and thresholds"
              >
                <i className="fas fa-balance-scale mr-2"></i>Moderate Grading Scale
              </button>

              <button
                onClick={() => setIsManageColumnsModalOpen(true)}
                className="portal-btn-ghost"
                style={{
                  padding: '10px 16px',
                  fontWeight: 800,
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  color: '#1e293b',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fas fa-sliders-h" style={{ color: '#6366f1' }}></i>
                Setup Columns &amp; Weights
              </button>

              <button
                onClick={() => setIsAddColumnModalOpen(true)}
                className="portal-btn-ghost"
                style={{
                  padding: '10px 18px',
                  fontWeight: 800,
                  borderRadius: '10px',
                  border: '1px dashed #6366f1',
                  color: '#6366f1',
                  background: '#eef2ff'
                }}
              >
                <i className="fas fa-plus-circle mr-2"></i>Add Column
              </button>

              <button
                onClick={() => setIsHodApprovalModalOpen(true)}
                disabled={saving || students.length === 0}
                className="portal-btn-neutral"
                style={{ fontWeight: 800, padding: '12px 18px', height: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fas fa-paper-plane" style={{ color: '#2563eb' }}></i>
                Submit for HOD Approval
              </button>

              <button
                onClick={() => saveMarks(false)}
                disabled={saving}
                className="portal-btn-primary"
                style={{ background: '#059669', border: '1px solid #047857', fontWeight: 900, padding: '12px 24px', height: '48px' }}
              >
                {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                Archive Batch Results
              </button>
            </div>
          </div>

          {/* LIVE ASSESSMENT WEIGHT ALLOCATION BANNER */}
          <div
            style={{
              background: Math.abs(totalAllocatedWeight - 100) < 0.05 ? '#f0fdf4' : totalAllocatedWeight < 100 ? '#fffbeb' : '#fef2f2',
              border: `1px solid ${Math.abs(totalAllocatedWeight - 100) < 0.05 ? '#86efac' : totalAllocatedWeight < 100 ? '#fde68a' : '#fca5a5'}`,
              borderRadius: '12px',
              padding: '12px 18px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: Math.abs(totalAllocatedWeight - 100) < 0.05 ? '#dcfce7' : totalAllocatedWeight < 100 ? '#fef3c7' : '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: Math.abs(totalAllocatedWeight - 100) < 0.05 ? '#16a34a' : totalAllocatedWeight < 100 ? '#d97706' : '#dc2626'
                }}
              >
                <i className={`fas ${Math.abs(totalAllocatedWeight - 100) < 0.05 ? 'fa-check-circle' : 'fa-balance-scale'}`}></i>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>
                    Assessment Weight Allocation:
                  </span>
                  <span
                    style={{
                      fontWeight: 900,
                      fontSize: '1rem',
                      color: Math.abs(totalAllocatedWeight - 100) < 0.05 ? '#16a34a' : totalAllocatedWeight < 100 ? '#d97706' : '#dc2626'
                    }}
                  >
                    {totalAllocatedWeight}% / 100%
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: Math.abs(totalAllocatedWeight - 100) < 0.05 ? '#22c55e' : totalAllocatedWeight < 100 ? '#f59e0b' : '#ef4444',
                      color: '#fff'
                    }}
                  >
                    {Math.abs(totalAllocatedWeight - 100) < 0.05
                      ? '100% Weight Balanced'
                      : totalAllocatedWeight < 100
                      ? `Under-allocated (-${(100 - totalAllocatedWeight).toFixed(1)}% remaining)`
                      : `Over-allocated (+${(totalAllocatedWeight - 100).toFixed(1)}% excess)`}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {isTertiary
                    ? `Tertiary Breakdown: CA Components (${assessmentColumns.filter(c => c.selectedForReport && (c.category === 'CA' || c.type !== 'Exam')).reduce((s, c) => s + (c.weight || 0), 0)}%) + Exam (${assessmentColumns.filter(c => c.selectedForReport && (c.category === 'EXAM' || c.type === 'Exam')).reduce((s, c) => s + (c.weight || 0), 0)}%).`
                    : 'The sum of weights for columns included in the terminal report must equal 100% for valid ranking & grade calculations.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {Math.abs(totalAllocatedWeight - 100) >= 0.05 && (
                <button
                  type="button"
                  onClick={handleAutoBalanceWeights}
                  className="portal-btn-ghost"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    borderRadius: '8px'
                  }}
                >
                  <i className="fas fa-magic" style={{ marginRight: '6px', color: '#6366f1' }}></i>
                  Auto-Balance to 100%
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsManageColumnsModalOpen(true)}
                className="portal-btn-neutral"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-cog"></i>
                Setup Columns
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ width: '20%', minWidth: '180px' }}>Student Identity</th>

                  {/* Dynamic Assessment Columns */}
                  {assessmentColumns.map(col => (
                    <th key={col.id} style={{ textAlign: 'center', minWidth: '135px', padding: '10px 8px' }}>
                      <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.82rem' }}>
                        {col.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: '#e0e7ff',
                            color: '#3730a3',
                            fontWeight: 700
                          }}
                        >
                          {col.type}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569',
                            fontWeight: 700
                          }}
                        >
                          Max: {col.maxScore}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: col.selectedForReport ? '#dcfce7' : '#fee2e2',
                            color: col.selectedForReport ? '#15803d' : '#991b1b',
                            fontWeight: 800
                          }}
                        >
                          {col.weight}%
                        </span>
                        {col.category && (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              padding: '1px 4px',
                              borderRadius: '4px',
                              background: col.category === 'EXAM' ? '#fef3c7' : '#ede9fe',
                              color: col.category === 'EXAM' ? '#92400e' : '#5b21b6',
                              fontWeight: 800
                            }}
                          >
                            {col.category}
                          </span>
                        )}
                      </div>
                      {col.date && (
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                          {col.date}
                        </div>
                      )}
                      <div style={{ marginTop: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <input
                          type="checkbox"
                          checked={col.selectedForReport}
                          onChange={() => toggleColumnSelectedForReport(col.id)}
                          id={`check-${col.id}`}
                          style={{ cursor: 'pointer' }}
                        />
                        <label
                          htmlFor={`check-${col.id}`}
                          style={{
                            cursor: 'pointer',
                            fontWeight: 700,
                            color: col.selectedForReport ? '#059669' : '#94a3b8'
                          }}
                        >
                          In Final
                        </label>
                      </div>
                    </th>
                  ))}

                  {/* Framework Mode Columns */}
                  {isTertiary ? (
                    <>
                      <th style={{ textAlign: 'center', width: '9%' }}>CA Total</th>
                      <th style={{ textAlign: 'center', width: '9%' }}>Exam Total</th>
                      <th style={{ width: '20%', minWidth: '150px' }}>Lecturer Remarks</th>
                      <th style={{ textAlign: 'center', width: '9%' }}>Final (%)</th>
                      <th style={{ textAlign: 'center', width: '10%' }}>Classif. / GPA</th>
                    </>
                  ) : (
                    <>
                      <th style={{ width: '22%', minWidth: '160px' }}>Teacher Remarks</th>
                      <th style={{ textAlign: 'center', width: '8%' }}>Position</th>
                      <th style={{ textAlign: 'center', width: '9%' }}>Composite</th>
                      <th style={{ textAlign: 'right', width: '9%' }}>Grade</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const data = marks[student.id] || { caScore: '', examScore: '', comment: '', assessmentScores: {} };
                  const computed = computedStudentMetrics[student.id] || { compositeScore: 0, caSubtotal: 0, examSubtotal: 0, gpaPoints: 0, grade: 'F', classPosition: 1 };

                  return (
                    <tr key={student.id}>
                      {/* Identity */}
                      <td>
                        <div style={{ fontWeight: 900, color: '#1e293b' }}>{student.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          REG: {student.studentId}
                        </div>
                      </td>

                      {/* Marks inputs */}
                      {assessmentColumns.map(col => {
                        const rawScore = data.assessmentScores[col.id] || '';
                        const numVal = parseFloat(rawScore);
                        const isOverMax = !isNaN(numVal) && numVal > col.maxScore;

                        return (
                          <td key={col.id} style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min={0}
                              max={col.maxScore}
                              value={rawScore}
                              onChange={e => handleAssessmentScoreChange(student.id, col.id, e.target.value)}
                              className="portal-input"
                              style={{
                                width: '76px',
                                textAlign: 'center',
                                padding: '8px 4px',
                                fontWeight: 900,
                                fontSize: '1rem',
                                color: isOverMax ? '#dc2626' : col.selectedForReport ? '#3730a3' : '#64748b',
                                background: isOverMax ? '#fef2f2' : col.selectedForReport ? '#f5f7ff' : '#f8fafc',
                                border: isOverMax ? '2px solid #ef4444' : col.selectedForReport ? '1px solid #c7d2fe' : '1px solid #e2e8f0'
                              }}
                              title={isOverMax ? `Score exceeds maximum (${col.maxScore})` : ''}
                              placeholder="0"
                            />
                          </td>
                        );
                      })}

                      {/* Framework Branching for Row Tail */}
                      {isTertiary ? (
                        <>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#4338ca' }}>
                            {computed.caSubtotal.toFixed(1)}%
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#d97706' }}>
                            {computed.examSubtotal.toFixed(1)}%
                          </td>
                          <td>
                            <textarea
                              rows={1}
                              value={data.comment}
                              onChange={e => handleMarkChange(student.id, 'comment', e.target.value)}
                              className="portal-input"
                              style={{ minHeight: '44px', resize: 'none', fontSize: '0.82rem', fontWeight: 600, background: '#f8fafc', padding: '10px 14px' }}
                              placeholder="Lecturer feedback..."
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.15rem' }}>
                              {computed.compositeScore.toFixed(1)}%
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <span
                                className="status-badge"
                                style={{
                                  fontWeight: 900,
                                  padding: '4px 10px',
                                  fontSize: '0.78rem',
                                  background:
                                    computed.compositeScore >= 75
                                      ? '#ecfdf5'
                                      : computed.compositeScore >= 65
                                      ? '#eff6ff'
                                      : computed.compositeScore >= 50
                                      ? '#fffbeb'
                                      : '#fef2f2',
                                  color:
                                    computed.compositeScore >= 75
                                      ? '#059669'
                                      : computed.compositeScore >= 65
                                      ? '#2563eb'
                                      : computed.compositeScore >= 50
                                      ? '#d97706'
                                      : '#dc2626'
                                }}
                              >
                                {computed.grade}
                              </span>
                              <small style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>
                                {computed.gpaPoints.toFixed(1)} GPA
                              </small>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Remarks */}
                          <td>
                            <textarea
                              rows={1}
                              value={data.comment}
                              onChange={e => handleMarkChange(student.id, 'comment', e.target.value)}
                              className="portal-input"
                              style={{ minHeight: '44px', resize: 'none', fontSize: '0.82rem', fontWeight: 600, background: '#f8fafc', padding: '10px 14px' }}
                              placeholder="Teacher feedback..."
                            />
                          </td>

                          {/* Position */}
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                fontWeight: 900,
                                padding: '4px 10px',
                                borderRadius: '12px',
                                background: computed.classPosition === 1 ? '#fef3c7' : computed.classPosition <= 3 ? '#e0e7ff' : '#f1f5f9',
                                color: computed.classPosition === 1 ? '#92400e' : computed.classPosition <= 3 ? '#3730a3' : '#64748b',
                                fontSize: '0.85rem'
                              }}
                            >
                              #{computed.classPosition}
                            </span>
                          </td>

                          {/* Composite Percentage */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.15rem' }}>
                              {computed.compositeScore.toFixed(1)}%
                            </div>
                          </td>

                          {/* Grade */}
                          <td style={{ textAlign: 'right' }}>
                            <span
                              className="status-badge"
                              style={{
                                fontWeight: 900,
                                padding: '6px 14px',
                                background:
                                  computed.compositeScore >= 70
                                    ? '#ecfdf5'
                                    : computed.compositeScore >= 50
                                    ? '#fffbeb'
                                    : '#fef2f2',
                                color:
                                  computed.compositeScore >= 70
                                    ? '#059669'
                                    : computed.compositeScore >= 50
                                    ? '#d97706'
                                    : '#dc2626'
                              }}
                            >
                              {computed.grade}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* FOOTER ACTIONS */}
          <div
            style={{
              padding: '32px 40px',
              background: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '20px'
            }}
          >
            <div>
              <p style={{ margin: 0, color: '#1e293b', fontSize: '0.9rem', fontWeight: 800 }}>
                Class Statistics Summary
              </p>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                Average: <strong style={{ color: '#4338ca' }}>{classAverage}%</strong> • Pass Rate: <strong style={{ color: '#059669' }}>{passRate}%</strong> • Total Graded: <strong>{students.length}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => saveMarks(false)}
                disabled={saving}
                className="portal-btn-ghost"
                style={{ padding: '14px 28px', fontWeight: 800, border: '1px solid #cbd5e1', background: '#fff' }}
              >
                {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                Save Draft
              </button>
              <button
                onClick={() => saveMarks(true)}
                disabled={saving}
                className="portal-btn-primary"
                style={{ background: '#059669', border: '1px solid #047857', fontWeight: 900, padding: '16px 48px', height: '56px' }}
              >
                {saving ? <i className="fas fa-spinner fa-spin mr-3"></i> : <i className="fas fa-file-archive mr-3"></i>}
                Finalize & Archive Batch Results
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="portal-card animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ padding: '140px 24px', textAlign: 'center', background: '#f8fafc', border: '1px dashed #e2e8f0' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fff', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', color: '#94a3b8' }}>
            <i className="fas fa-user-graduate fa-2x" style={{ opacity: 0.3 }}></i>
          </div>
          <h3 style={{ color: '#64748b', fontWeight: 900, fontSize: '1.4rem', marginBottom: '12px' }}>Roster Registry Locked</h3>
          <p style={{ color: '#94a3b8', fontWeight: 700, maxWidth: '400px', margin: '0 auto' }}>
            Please select a target {classLabel.toLowerCase()} and {subjectLabel.toLowerCase()} above to authorize student assessment records.
          </p>
        </div>
      )}

      {/* MODAL 1: ADD ASSESSMENT COLUMN MODAL */}
      {isAddColumnModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content animate-in zoom-in-95 duration-200" style={{ maxWidth: '480px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-plus"></i>
                </div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', color: '#1e293b' }}>
                  Add Assessment Item
                </h3>
              </div>
              <button
                onClick={() => setIsAddColumnModalOpen(false)}
                style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>
              Add an assessment column to record test, exercise, or exam results for students in this subject.
            </p>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="portal-label">Assessment Title</label>
              <input
                type="text"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                placeholder="e.g. Test 3 (Algebra), Mid-Year Exam"
                className="portal-input"
                style={{ fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label className="portal-label">Assessment Type</label>
                <select
                  value={newColType}
                  onChange={e => setNewColType(e.target.value as any)}
                  className="portal-input"
                  style={{ fontWeight: 700 }}
                >
                  <option value="CAT">Continuous Assessment Test (CAT)</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Test">Class Test</option>
                  <option value="Project">Project / Coursework</option>
                  <option value="Practical">Practical Lab</option>
                  <option value="Exam">Terminal / End Exam</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Homework">Homework</option>
                </select>
              </div>

              <div>
                <label className="portal-label">Component Category</label>
                <select
                  value={newColCategory}
                  onChange={e => setNewColCategory(e.target.value as any)}
                  className="portal-input"
                  style={{ fontWeight: 700 }}
                >
                  <option value="CA">Continuous Assessment (CA)</option>
                  <option value="EXAM">Examination Component</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label className="portal-label">Assessment Date</label>
                <input
                  type="date"
                  value={newColDate}
                  onChange={e => setNewColDate(e.target.value)}
                  className="portal-input"
                  style={{ fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="portal-label">Max Score</label>
                <input
                  type="number"
                  min={1}
                  value={newColMax}
                  onChange={e => setNewColMax(parseInt(e.target.value) || 0)}
                  className="portal-input"
                  style={{ fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="portal-label">Weight (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newColWeight}
                  onChange={e => setNewColWeight(parseFloat(e.target.value) || 0)}
                  className="portal-input"
                  style={{ fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
              <input
                type="checkbox"
                id="modal-count-report"
                checked={newColCountInReport}
                onChange={e => setNewColCountInReport(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="modal-count-report" style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                Include this assessment in terminal report percentage calculation
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setIsAddColumnModalOpen(false)}
                className="portal-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomColumn}
                className="portal-btn-primary"
                style={{ fontWeight: 800 }}
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GRADING SCALE MODERATION MODAL */}
      {isScaleModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content animate-in zoom-in-95 duration-200" style={{ maxWidth: '640px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-balance-scale"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', color: '#1e293b' }}>
                    Grading Scale Moderation
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Subject: <strong>{currentSubject?.name}</strong> • {term} {year}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsScaleModalOpen(false)}
                style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '20px', fontSize: '0.85rem', color: '#475569' }}>
              <i className="fas fa-info-circle mr-2" style={{ color: '#6366f1' }}></i>
              Moderating the grading scale allows adjusting grade boundaries for this subject when assessment difficulty or cohort distribution requires moderation. A mandatory reason is tracked for audit compliance.
            </div>

            {/* Scale Bands Table */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Grade Thresholds
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Grade</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Min Score (%)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Max Score (%)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableScaleBands.map((band, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 900, color: '#1e293b' }}>
                          {band.grade}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={band.minScore}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditableScaleBands(prev =>
                                prev.map((b, i) => (i === idx ? { ...b, minScore: val } : b))
                              );
                            }}
                            className="portal-input"
                            style={{ width: '70px', padding: '6px', textAlign: 'center', fontWeight: 800 }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={band.maxScore}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditableScaleBands(prev =>
                                prev.map((b, i) => (i === idx ? { ...b, maxScore: val } : b))
                              );
                            }}
                            className="portal-input"
                            style={{ width: '70px', padding: '6px', textAlign: 'center', fontWeight: 800 }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '0.8rem' }}>
                          {band.description || 'Standard division'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mandatory Reason */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="portal-label" style={{ color: '#b45309' }}>
                <i className="fas fa-exclamation-triangle mr-1"></i>Mandatory Reason for Moderation *
              </label>
              <textarea
                rows={3}
                value={moderationReason}
                onChange={e => setModerationReason(e.target.value)}
                placeholder="e.g. Examination difficulty exceeded standard curriculum benchmarks; threshold lowered by 5% as approved by Academic Committee."
                className="portal-input"
                style={{ resize: 'none', fontSize: '0.85rem', fontWeight: 600, padding: '12px' }}
                required
              />
            </div>

            {/* Audit Trail Note */}
            {lastModeration && (
              <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', marginBottom: '20px', fontSize: '0.78rem', color: '#92400e' }}>
                <strong>Last Moderated:</strong> {new Date(lastModeration.createdAt).toLocaleDateString()} by{' '}
                {lastModeration.details?.moderatedBy || 'Authorized Teacher'}
                <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                  Reason: "{lastModeration.details?.reason || 'Standard moderation'}"
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {moderatedScale ? (
                <button
                  type="button"
                  onClick={handleResetModeration}
                  disabled={isSavingModeration}
                  className="portal-btn-ghost"
                  style={{ color: '#dc2626', border: '1px solid #fecaca', background: '#fef2f2' }}
                >
                  <i className="fas fa-undo mr-2"></i>Reset to Default
                </button>
              ) : <div></div>}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsScaleModalOpen(false)}
                  className="portal-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModeration}
                  disabled={isSavingModeration}
                  className="portal-btn-primary"
                  style={{ background: '#b45309', border: '1px solid #92400e', fontWeight: 800 }}
                >
                  {isSavingModeration ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-check mr-2"></i>}
                  Apply Moderated Scale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIGURE COLUMNS & WEIGHTS MODAL */}
      {isManageColumnsModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content animate-in zoom-in-95 duration-200" style={{ maxWidth: '900px', width: '95%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eef2ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-sliders-h fa-lg"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', color: '#1e293b' }}>
                    Configure Assessment Columns &amp; Weights
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Subject: <strong>{currentSubject?.name}</strong> • Define test dates, maximum marks, and weight percentages.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManageColumnsModalOpen(false)}
                style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Live Weight Status in Modal */}
            <div
              style={{
                background: Math.abs(totalAllocatedWeight - 100) < 0.05 ? '#f0fdf4' : totalAllocatedWeight < 100 ? '#fffbeb' : '#fef2f2',
                border: `1px solid ${Math.abs(totalAllocatedWeight - 100) < 0.05 ? '#86efac' : totalAllocatedWeight < 100 ? '#fde68a' : '#fca5a5'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>Allocated Weight:</span>
                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: Math.abs(totalAllocatedWeight - 100) < 0.05 ? '#16a34a' : totalAllocatedWeight < 100 ? '#d97706' : '#dc2626' }}>
                  {totalAllocatedWeight}% / 100%
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: Math.abs(totalAllocatedWeight - 100) < 0.05 ? '#22c55e' : totalAllocatedWeight < 100 ? '#f59e0b' : '#ef4444',
                    color: '#fff'
                  }}
                >
                  {Math.abs(totalAllocatedWeight - 100) < 0.05 ? 'Balanced (100%)' : totalAllocatedWeight < 100 ? `Under-allocated (-${(100 - totalAllocatedWeight).toFixed(1)}%)` : `Over-allocated (+${(totalAllocatedWeight - 100).toFixed(1)}%)`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAutoBalanceWeights}
                className="portal-btn-ghost"
                style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, background: '#fff', border: '1px solid #cbd5e1', color: '#4338ca', borderRadius: '6px' }}
              >
                <i className="fas fa-magic mr-1"></i> Auto-Balance to 100%
              </button>
            </div>

            {/* Columns List Table */}
            <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Assessment Name</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', width: '110px' }}>Type</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', width: '90px' }}>Category</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', width: '120px' }}>Date</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '80px' }}>Max Score</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '80px' }}>Weight %</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '80px' }}>In Final</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '50px' }}>Del</th>
                  </tr>
                </thead>
                <tbody>
                  {assessmentColumns.map((col, idx) => (
                    <tr key={col.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="text"
                          value={col.name}
                          onChange={e => {
                            const val = e.target.value;
                            setAssessmentColumns(prev => prev.map((c, i) => i === idx ? { ...c, name: val } : c));
                          }}
                          className="portal-input"
                          style={{ padding: '6px 8px', fontSize: '0.82rem', fontWeight: 700 }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <select
                          value={col.type}
                          onChange={e => {
                            const val = e.target.value as any;
                            setAssessmentColumns(prev => prev.map((c, i) => i === idx ? { ...c, type: val } : c));
                          }}
                          className="portal-input"
                          style={{ padding: '6px 4px', fontSize: '0.78rem', fontWeight: 600 }}
                        >
                          <option value="CAT">CAT</option>
                          <option value="Assignment">Assignment</option>
                          <option value="Test">Test</option>
                          <option value="Project">Project</option>
                          <option value="Practical">Practical</option>
                          <option value="Exam">Exam</option>
                          <option value="Quiz">Quiz</option>
                          <option value="Homework">Homework</option>
                        </select>
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <select
                          value={col.category || 'CA'}
                          onChange={e => {
                            const val = e.target.value as any;
                            setAssessmentColumns(prev => prev.map((c, i) => i === idx ? { ...c, category: val } : c));
                          }}
                          className="portal-input"
                          style={{ padding: '6px 4px', fontSize: '0.78rem', fontWeight: 700 }}
                        >
                          <option value="CA">CA</option>
                          <option value="EXAM">EXAM</option>
                        </select>
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <input
                          type="date"
                          value={col.date || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setAssessmentColumns(prev => prev.map((c, i) => i === idx ? { ...c, date: val } : c));
                          }}
                          className="portal-input"
                          style={{ padding: '6px 4px', fontSize: '0.78rem' }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min={1}
                          value={col.maxScore}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 1;
                            setAssessmentColumns(prev => prev.map((c, i) => i === idx ? { ...c, maxScore: val } : c));
                          }}
                          className="portal-input"
                          style={{ width: '64px', textAlign: 'center', padding: '6px 2px', fontWeight: 800 }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={col.weight}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setAssessmentColumns(prev => prev.map((c, i) => i === idx ? { ...c, weight: val } : c));
                          }}
                          className="portal-input"
                          style={{ width: '64px', textAlign: 'center', padding: '6px 2px', fontWeight: 800, color: col.selectedForReport ? '#15803d' : '#64748b' }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={col.selectedForReport}
                          onChange={e => {
                            const val = e.target.checked;
                            setAssessmentColumns(prev => prev.map((c, i) => i === idx ? { ...c, selectedForReport: val } : c));
                          }}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setAssessmentColumns(prev => prev.filter((_, i) => i !== idx))}
                          className="portal-btn-ghost"
                          style={{ padding: '4px', color: '#dc2626' }}
                          title="Delete column"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  const newId = `col-${Date.now()}`;
                  setAssessmentColumns(prev => [
                    ...prev,
                    {
                      id: newId,
                      name: `Assessment ${prev.length + 1}`,
                      type: 'CAT',
                      date: new Date().toISOString().slice(0, 10),
                      maxScore: 50,
                      weight: 10,
                      selectedForReport: true,
                      category: 'CA',
                      isCustom: true
                    }
                  ]);
                }}
                className="portal-btn-ghost"
                style={{ color: '#4338ca', border: '1px dashed #6366f1', background: '#eef2ff', fontWeight: 700 }}
              >
                <i className="fas fa-plus mr-1"></i> Add Another Column
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsManageColumnsModalOpen(false)}
                  className="portal-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveColumnsConfiguration}
                  className="portal-btn-primary"
                  style={{ background: '#4338ca', fontWeight: 800 }}
                >
                  <i className="fas fa-check mr-2"></i> Save &amp; Sync Columns
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SUBMIT FOR HOD APPROVAL MODAL */}
      {isHodApprovalModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content animate-in zoom-in-95 duration-200" style={{ maxWidth: '520px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-paper-plane"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: '#1e293b' }}>
                    Submit for HOD Approval
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Send mark sheet to Head of Department for certification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsHodApprovalModalOpen(false)}
                style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem' }}>
                <div><strong>Subject:</strong> {currentSubject?.name}</div>
                <div><strong>Class:</strong> {classes.find(c => c.id === selectedClassId)?.name}</div>
                <div><strong>Cycle:</strong> {term} {year}</div>
                <div><strong>Students:</strong> {students.length} Enrolled</div>
                <div><strong>Class Average:</strong> {classAverage}%</div>
                <div><strong>Weight Allocated:</strong> {totalAllocatedWeight}%</div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="portal-label">Submission Remarks / Notes for HOD</label>
              <textarea
                rows={3}
                value={hodNotes}
                onChange={e => setHodNotes(e.target.value)}
                placeholder="e.g. All coursework tests and practical marks finalized; ready for review."
                className="portal-input"
                style={{ resize: 'none', fontSize: '0.85rem', fontWeight: 600, padding: '10px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsHodApprovalModalOpen(false)}
                className="portal-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitForHodApproval}
                disabled={isSubmittingHod}
                className="portal-btn-primary"
                style={{ background: '#2563eb', fontWeight: 800 }}
              >
                {isSubmittingHod ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-paper-plane mr-2"></i>}
                Confirm Submission to HOD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
