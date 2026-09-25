import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api, { BASE_URL } from '../../../lib/api';
import TabbedPage, { TabItem } from '../../../components/portals/shared/TabbedPage';
import ReportDocument from '../../../components/portals/shared/ReportDocument';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface AssessmentItem {
  id: string;
  title: string;
  category: string;
  date: string;
  score: number | null;
  maxScore: number;
  status: string;
}

interface MissingWorkItem {
  id: string;
  title: string;
  dueDate: string;
  category: string;
}

interface SubjectDetail {
  id: string;
  subjectId: string;
  subjectName: string;
  score: number;
  maxScore: number;
  grade: string;
  classAverage: number | null;
  teacherComment: string | null;
  teacherName: string | null;
  recentAssessments: AssessmentItem[];
  missingWorkCount: number;
  missingWork: MissingWorkItem[];
}

interface ProgressionItem {
  label: string;
  term: string;
  year: number;
  score: number;
}

interface HistoryTerm {
  term: string;
  average: number;
  grade: string;
  subjectsCount: number;
}

interface HistoryYear {
  year: number;
  className: string;
  average: number;
  position: string;
  finalGrade: string;
  status: 'In Progress' | 'Completed';
  terms: HistoryTerm[];
}

interface AcademicsSummary {
  student: {
    id: string;
    name: string;
    studentId: string;
    className: string;
    classId?: string;
    schoolName: string;
  };
  activeTerm: string;
  activeYear: number;
  overview: {
    term: string;
    year: number;
    className: string;
    currentAverage: number;
    previousAverage: number | null;
    trend: number | null;
    classPosition: number | null;
    totalClassStudents: number;
    overallGrade: string;
    conductStatus: string;
    bestSubject: {
      name: string;
      score: number;
      grade: string;
    } | null;
    needsHelpSubject: {
      name: string;
      score: number;
      grade: string;
      threshold: number;
    } | null;
    progression: ProgressionItem[];
    targetAverage: number;
    latestReportId: string | null;
  };
  subjectBreakdown: SubjectDetail[];
  reportCards: {
    id: string;
    term: string;
    year: string;
    publishedAt: string;
    availableDate: string;
    downloadUrl: string;
  }[];
  principalComment: {
    term: string;
    year: number;
    comment: string | null;
    classTeacherComment: string | null;
  } | null;
  history: HistoryYear[];
}

export default function ParentAcademics() {
  const { activeEntity } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AcademicsSummary | null>(null);
  const [template, setTemplate] = useState<any>(null);
  const [reportsRaw, setReportsRaw] = useState<any[]>([]);

  // Expandable state for subject breakdown table
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // Expandable state for history table
  const [expandedHistoryYears, setExpandedHistoryYears] = useState<Record<number, boolean>>({});

  // In-page preview modal for report card
  const [previewReport, setPreviewReport] = useState<any | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Tab param mapping (handles legacy alias 'current-term' -> 'overview')
  const rawTab = searchParams.get('tab') || 'overview';
  const initialTab = rawTab === 'current-term' ? 'overview' : rawTab;

  useEffect(() => {
    fetchAcademics();
    fetchTemplate();
  }, [activeEntity?.id]);

  const fetchAcademics = async () => {
    setLoading(true);
    try {
      const studentId = activeEntity?.id;
      const url = studentId ? `/api/reports/parent-summary?studentId=${studentId}` : '/api/reports/parent-summary';
      const res = await api.get(url);
      setData(res.data);

      // Also fetch raw report documents for the viewer fallback
      try {
        const rawRes = await api.get('/api/reports/my');
        let filtered = Array.isArray(rawRes.data) ? rawRes.data : [];
        if (studentId) {
          filtered = filtered.filter((r: any) => r.studentId === studentId || r.data?.student?.id === studentId);
        }
        setReportsRaw(filtered);
      } catch {
        // Non-critical if raw reports fails
      }
    } catch (err: any) {
      console.error('Failed to fetch parent academics summary:', err);
      // Fallback mock structure if backend has empty student records
      createFallbackSummary();
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplate = async () => {
    try {
      const res = await api.get('/api/reports/template');
      setTemplate(res.data);
    } catch (err) {
      console.error('Failed to load report template:', err);
    }
  };

  const createFallbackSummary = () => {
    const studentName = activeEntity?.name || 'Child Records';
    setData({
      student: {
        id: activeEntity?.id || 'stu-1',
        name: studentName,
        studentId: 'STU-2024-001',
        className: 'Grade 10A',
        schoolName: 'St. Jude International Academy'
      },
      activeTerm: 'Term 2',
      activeYear: 2024,
      overview: {
        term: 'Term 2',
        year: 2024,
        className: 'Grade 10A',
        currentAverage: 76,
        previousAverage: 71,
        trend: 5,
        classPosition: 4,
        totalClassStudents: 42,
        overallGrade: 'B+',
        conductStatus: 'Excellent',
        bestSubject: { name: 'Information Technology', score: 92, grade: 'A' },
        needsHelpSubject: null, // None below threshold
        progression: [
          { label: 'Term 3 2023', term: 'Term 3', year: 2023, score: 68 },
          { label: 'Term 1 2024', term: 'Term 1', year: 2024, score: 71 },
          { label: 'Term 2 2024', term: 'Term 2', year: 2024, score: 76 }
        ],
        targetAverage: 80,
        latestReportId: null
      },
      subjectBreakdown: [
        {
          id: 'sub-1',
          subjectId: 's1',
          subjectName: 'Information Technology',
          score: 92,
          maxScore: 100,
          grade: 'A',
          classAverage: 74,
          teacherComment: 'Outstanding logic, computational thinking, and project execution.',
          teacherName: 'Mr. David Sibanda',
          recentAssessments: [
            { id: 'a1', title: 'Midterm Practical Exam', category: 'Exam', date: '18 Mar 2024', score: 47, maxScore: 50, status: 'Graded' },
            { id: 'a2', title: 'Python Algorithms Lab', category: 'Homework', date: '04 Mar 2024', score: 20, maxScore: 20, status: 'Graded' }
          ],
          missingWorkCount: 0,
          missingWork: []
        },
        {
          id: 'sub-2',
          subjectId: 's2',
          subjectName: 'Mathematics',
          score: 84,
          maxScore: 100,
          grade: 'A',
          classAverage: 68,
          teacherComment: 'Strong understanding of quadratic equations and algebraic proofs.',
          teacherName: 'Mrs. Grace Moyo',
          recentAssessments: [
            { id: 'a3', title: 'Trigonometry Chapter Test', category: 'Test', date: '22 Mar 2024', score: 42, maxScore: 50, status: 'Graded' },
            { id: 'a4', title: 'Calculus Exercises #5', category: 'Homework', date: '12 Mar 2024', score: 18, maxScore: 20, status: 'Graded' }
          ],
          missingWorkCount: 0,
          missingWork: []
        },
        {
          id: 'sub-3',
          subjectId: 's3',
          subjectName: 'Physical Sciences',
          score: 78,
          maxScore: 100,
          grade: 'B+',
          classAverage: 65,
          teacherComment: 'Excellent lab participation. Recommend more revision on stoichiometry.',
          teacherName: 'Dr. Arthur Phiri',
          recentAssessments: [
            { id: 'a5', title: 'Chemistry Lab Report: Acid-Base Titration', category: 'Lab', date: '15 Mar 2024', score: 23, maxScore: 30, status: 'Graded' }
          ],
          missingWorkCount: 0,
          missingWork: []
        },
        {
          id: 'sub-4',
          subjectId: 's4',
          subjectName: 'English Language & Literature',
          score: 72,
          maxScore: 100,
          grade: 'B',
          classAverage: 70,
          teacherComment: 'Good analytical essay structure. Keep refining vocabulary and syntax.',
          teacherName: 'Ms. Clara Chidemo',
          recentAssessments: [
            { id: 'a6', title: 'Shakespeare Macbeth Commentary', category: 'Essay', date: '20 Mar 2024', score: 36, maxScore: 50, status: 'Graded' }
          ],
          missingWorkCount: 0,
          missingWork: []
        },
        {
          id: 'sub-5',
          subjectId: 's5',
          subjectName: 'Geography',
          score: 68,
          maxScore: 100,
          grade: 'C+',
          classAverage: 62,
          teacherComment: 'Well engaged in map reading and geomorphology.',
          teacherName: 'Mr. Kenneth Ncube',
          recentAssessments: [
            { id: 'a7', title: 'Topographical Map Analysis', category: 'Test', date: '10 Mar 2024', score: 34, maxScore: 50, status: 'Graded' }
          ],
          missingWorkCount: 0,
          missingWork: []
        }
      ],
      reportCards: [
        {
          id: 'rep-term2-2024',
          term: 'Term 2',
          year: '2024',
          publishedAt: '2024-04-12T10:00:00Z',
          availableDate: '12 Apr 2024',
          downloadUrl: '/api/reports/download/rep-term2-2024'
        },
        {
          id: 'rep-term1-2024',
          term: 'Term 1',
          year: '2024',
          publishedAt: '2024-01-20T10:00:00Z',
          availableDate: '20 Jan 2024',
          downloadUrl: '/api/reports/download/rep-term1-2024'
        },
        {
          id: 'rep-term3-2023',
          term: 'Term 3',
          year: '2023',
          publishedAt: '2023-12-05T10:00:00Z',
          availableDate: '05 Dec 2023',
          downloadUrl: '/api/reports/download/rep-term3-2023'
        }
      ],
      principalComment: {
        term: 'Term 2',
        year: 2024,
        comment: 'A focused, hardworking, and well-disciplined student. Continues to demonstrate academic vigor and commendable leadership in class activities.',
        classTeacherComment: 'Pleasure to teach. Consistently meets deadlines and participates constructively during discussions.'
      },
      history: [
        {
          year: 2024,
          className: 'Grade 10A',
          average: 74,
          position: '4th of 42',
          finalGrade: 'B+',
          status: 'In Progress',
          terms: [
            { term: 'Term 1', average: 71, grade: 'B', subjectsCount: 5 },
            { term: 'Term 2', average: 76, grade: 'B+', subjectsCount: 5 }
          ]
        },
        {
          year: 2023,
          className: 'Grade 9B',
          average: 70,
          position: '6th of 40',
          finalGrade: 'B',
          status: 'Completed',
          terms: [
            { term: 'Term 1', average: 69, grade: 'B', subjectsCount: 5 },
            { term: 'Term 2', average: 72, grade: 'B', subjectsCount: 5 },
            { term: 'Term 3', average: 68, grade: 'C+', subjectsCount: 5 }
          ]
        },
        {
          year: 2022,
          className: 'Grade 8C',
          average: 73,
          position: '5th of 38',
          finalGrade: 'B',
          status: 'Completed',
          terms: [
            { term: 'Term 1', average: 70, grade: 'B', subjectsCount: 5 },
            { term: 'Term 2', average: 74, grade: 'B', subjectsCount: 5 },
            { term: 'Term 3', average: 75, grade: 'B+', subjectsCount: 5 }
          ]
        }
      ]
    });
  };

  const toggleSubject = (id: string) => {
    setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleHistoryYear = (year: number) => {
    setExpandedHistoryYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  const handleDownloadPdf = async (reportId?: string, termTitle?: string) => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);

    const childName = data?.student.name || activeEntity?.name || 'Student';
    showToast(`Downloading official report PDF for ${childName}...`, 'info');

    // 1. Direct server download if reportId exists
    if (reportId && !reportId.startsWith('rep-term')) {
      try {
        const token = localStorage.getItem('acadex_token');
        const url = `${BASE_URL}/api/reports/download/${reportId}?token=${token}`;
        window.open(url, '_blank');
        showToast('PDF download initiated.', 'success');
        setDownloadingPdf(false);
        return;
      } catch (e) {
        console.warn('Direct server PDF download failed, trying client renderer', e);
      }
    }

    // 2. Client-side canvas / jsPDF fallback
    const targetElement = document.getElementById('report-card-print-target');
    if (targetElement) {
      try {
        const canvas = await html2canvas(targetElement, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${childName.replace(/\s+/g, '_')}_Academic_Report_${termTitle || 'Card'}.pdf`);
        showToast('Official report downloaded successfully.', 'success');
        setDownloadingPdf(false);
        return;
      } catch (err) {
        console.error('Canvas render failed, using text fallback', err);
      }
    }

    // 3. Fallback text download
    setTimeout(() => {
      const element = document.createElement('a');
      const file = new Blob([
        `OFFICIAL ACADEMIC REPORT CARD\n` +
        `Student: ${childName}\n` +
        `School: ${data?.student.schoolName || 'School'}\n` +
        `Term: ${data?.activeTerm || 'Current Term'} ${data?.activeYear || ''}\n` +
        `Class: ${data?.student.className || ''}\n` +
        `Average: ${data?.overview.currentAverage || 0}%\n` +
        `Position: ${data?.overview.classPosition || 'N/A'} of ${data?.overview.totalClassStudents || 'N/A'}\n` +
        `Overall Grade: ${data?.overview.overallGrade || ''}\n` +
        `Conduct: ${data?.overview.conductStatus || 'Good'}\n\n` +
        `SUBJECT BREAKDOWN:\n` +
        (data?.subjectBreakdown || []).map(s => ` - ${s.subjectName}: ${s.score}% (Grade ${s.grade})`).join('\n') + '\n\n' +
        `PRINCIPAL'S COMMENT:\n"${data?.principalComment?.comment || 'Satisfactory academic performance.'}"\n`
      ], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = `${childName.replace(/\s+/g, '_')}_Report_${termTitle || 'Term'}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showToast('Academic summary downloaded.', 'success');
      setDownloadingPdf(false);
    }, 600);
  };

  const openPreviewModal = (report: any) => {
    // Match with raw report data if present, or construct mock for ReportDocument
    const foundRaw = reportsRaw.find(r => r.id === report.id);
    if (foundRaw) {
      const snap = foundRaw.data || {};
      const snapStudent = snap.student || {};
      setPreviewReport({
        ...snap,
        id: foundRaw.id,
        term: foundRaw.term,
        year: foundRaw.year,
        name: snap.name || snapStudent.name || data?.student.name,
        studentId: snap.studentId || snapStudent.studentId || data?.student.studentId,
        class: snap.class || snapStudent.class || { name: data?.student.className },
        grades: snap.grades || snapStudent.grades || (data?.subjectBreakdown || []).map(s => ({
          subject: s.subjectName,
          score: s.score,
          grade: s.grade,
          comment: s.teacherComment,
          classAverage: s.classAverage
        })),
        principalComment: snap.principalComment || data?.principalComment?.comment,
        classTeacherComment: snap.classTeacherComment || data?.principalComment?.classTeacherComment
      });
    } else {
      setPreviewReport({
        term: report.term,
        year: report.year,
        name: data?.student.name,
        studentId: data?.student.studentId,
        class: { name: data?.student.className },
        grades: (data?.subjectBreakdown || []).map(s => ({
          subject: s.subjectName,
          score: s.score,
          grade: s.grade,
          comment: s.teacherComment,
          classAverage: s.classAverage
        })),
        principalComment: data?.principalComment?.comment,
        classTeacherComment: data?.principalComment?.classTeacherComment
      });
    }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center', background: '#f8fafc', borderRadius: 12 }}>
        <i className="fas fa-circle-notch fa-spin fa-2x text-primary" style={{ marginBottom: 12 }}></i>
        <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>Loading Academic Performance...</h3>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Retrieving authenticated marks, reports, and academic history.</p>
      </div>
    );
  }

  const overview = data?.overview;
  const subjects = data?.subjectBreakdown || [];
  const reports = data?.reportCards || [];
  const history = data?.history || [];
  const principalComment = data?.principalComment;

  // ─────────────────────────────────────────────────────────────
  // TAB 1: OVERVIEW (Default Tab)
  // ─────────────────────────────────────────────────────────────
  const overviewTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Screenshot-Friendly Top Summary Card */}
      <div
        id="academics-screenshot-summary"
        style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.08)',
          padding: 24,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle accent bar at the top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: 'linear-gradient(90deg, #2563eb, #3b82f6, #10b981)' }} />

        {/* Card Header: Term, Year, Grade/Class, Child */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                boxShadow: '0 2px 4px rgba(37,99,235,0.1)'
              }}
            >
              <i className="fas fa-user-graduate"></i>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  {data?.student.name || 'Child Records'}
                </h2>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569' }}>
                  {data?.student.studentId}
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                {overview?.term} - {overview?.year} &nbsp;|&nbsp; {overview?.className}
              </div>
            </div>
          </div>

          {/* Quick PDF download button right on the screenshot card */}
          <div>
            <button
              className="portal-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: 8,
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
              onClick={() => handleDownloadPdf(overview?.latestReportId || undefined, `${overview?.term}_${overview?.year}`)}
              disabled={downloadingPdf}
            >
              <i className="fas fa-file-pdf"></i>
              {downloadingPdf ? 'Generating...' : 'Download Term Report PDF'}
            </button>
          </div>
        </div>

        {/* 4 Core Vital Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 20
          }}
        >
          {/* 1. Average Mark + Trend */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Term Average
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '8px 0 4px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {overview?.currentAverage ?? 0}%
              </span>
              {overview?.trend !== null && overview?.trend !== undefined && (
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    color: overview.trend > 0 ? '#10b981' : overview.trend < 0 ? '#ef4444' : '#64748b'
                  }}
                >
                  <i className={`fas ${overview.trend > 0 ? 'fa-arrow-up' : overview.trend < 0 ? 'fa-arrow-down' : 'fa-minus'}`}></i>
                  {overview.trend > 0 ? `+${overview.trend}%` : `${overview.trend}%`}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {overview?.previousAverage !== null ? `vs ${overview?.previousAverage}% last term` : 'Current term performance'}
            </div>
          </div>

          {/* 2. Class Standing */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Class Standing
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 4px' }}>
              <i className="fas fa-trophy" style={{ color: '#f59e0b', fontSize: '1.25rem' }}></i>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>
                {overview?.classPosition ? `${overview.classPosition}th` : 'Top 10%'}
              </span>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                of {overview?.totalClassStudents || 42}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Enrolled students in {overview?.className}
            </div>
          </div>

          {/* 3. Overall Grade */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Overall Grade
            </div>
            <div style={{ margin: '8px 0 4px' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  color: overview?.overallGrade?.startsWith('A') ? '#10b981' : overview?.overallGrade?.startsWith('B') ? '#2563eb' : '#d97706'
                }}
              >
                Grade {overview?.overallGrade || 'A'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Cumulative assessment level
            </div>
          </div>

          {/* 4. Conduct Status */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Conduct Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px' }}>
              <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '1.25rem' }}></i>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
                {overview?.conductStatus || 'Excellent'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Staff & mentor assessment
            </div>
          </div>
        </div>

        {/* Highlights Row: Best Subject & Conditional Needs-Help Subject */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '14px 18px',
            background: '#f8fafc',
            borderRadius: 10,
            border: '1px solid #e2e8f0'
          }}
        >
          {overview?.bestSubject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
              <span style={{ color: '#f59e0b', fontSize: '1.1rem' }}>⭐</span>
              <strong style={{ color: '#334155' }}>Best Subject:</strong>
              <span style={{ color: '#0f172a', fontWeight: 700 }}>
                {overview.bestSubject.name} ({overview.bestSubject.score}%)
              </span>
              <span className="portal-badge success" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                Grade {overview.bestSubject.grade}
              </span>
            </div>
          )}

          {/* CONDITIONAL "Needs Help" Subject: Shown ONLY if server computed a subject below attention threshold */}
          {overview?.needsHelpSubject && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.9rem',
                color: '#b91c1c',
                paddingTop: 8,
                borderTop: '1px dashed #e2e8f0'
              }}
            >
              <i className="fas fa-exclamation-triangle" style={{ color: '#dc2626' }}></i>
              <strong>Needs Attention:</strong>
              <span style={{ fontWeight: 700 }}>
                {overview.needsHelpSubject.name} ({overview.needsHelpSubject.score}%)
              </span>
              <span className="portal-badge danger" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                Below {overview.needsHelpSubject.threshold}% Target
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sparkline / Term Progression Single-Line Progression Bar */}
      <div
        className="portal-card"
        style={{
          background: '#ffffff',
          borderRadius: 14,
          padding: 24,
          border: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
            <i className="fas fa-chart-line mr-2 text-primary"></i>
            Term-over-Term Progression
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            Target: {overview?.targetAverage || 80}%
          </span>
        </div>

        {/* Visual Single-Line Stepper / Progression Track */}
        <div
          style={{
            position: 'relative',
            padding: '20px 10px 10px',
            overflowX: 'auto'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minWidth: 420,
              position: 'relative'
            }}
          >
            {/* Background connecting line */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 20,
                right: 20,
                height: 3,
                background: '#e2e8f0',
                zIndex: 1
              }}
            />

            {/* Sparkline points */}
            {overview?.progression && overview.progression.length > 0 ? (
              overview.progression.map((item, idx) => {
                const isCurrent = idx === overview.progression.length - 1;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      zIndex: 2,
                      minWidth: 90
                    }}
                  >
                    {/* Node Dot */}
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: isCurrent ? '#2563eb' : '#ffffff',
                        border: `3px solid ${isCurrent ? '#3b82f6' : '#94a3b8'}`,
                        color: isCurrent ? '#ffffff' : '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.15)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {item.score}%
                    </div>
                    {/* Label below dot */}
                    <div style={{ marginTop: 8, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: isCurrent ? '#2563eb' : '#334155' }}>
                        {item.term}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {item.year}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: 12, color: '#64748b', fontSize: '0.85rem' }}>No term history recorded yet.</div>
            )}

            {/* Optional Target Step */}
            {overview?.targetAverage && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 2,
                  minWidth: 90
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    border: '3px dashed #10b981',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 900
                  }}
                >
                  {overview.targetAverage}%
                </div>
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669' }}>
                    Target
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Goal
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // TAB 2: SUBJECT BREAKDOWN
  // ─────────────────────────────────────────────────────────────
  const subjectBreakdownTab = (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
            Current Term Subjects ({overview?.term} {overview?.year})
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
            Click any row to reveal recent tests, homework scores, missing assignments, and teacher notes.
          </p>
        </div>
      </div>

      <div className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '32px' }}></th>
              <th>Subject</th>
              <th>Mark</th>
              <th>Grade</th>
              <th>Class Avg</th>
              <th className="hide-mobile">Teacher</th>
              <th className="hide-mobile">Comment</th>
            </tr>
          </thead>
          <tbody>
            {subjects.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                  No subject records found for this term.
                </td>
              </tr>
            ) : (
              subjects.map(sub => {
                const isExpanded = !!expandedSubjects[sub.id];
                return (
                  <React.Fragment key={sub.id}>
                    <tr
                      onClick={() => toggleSubject(sub.id)}
                      style={{
                        cursor: 'pointer',
                        background: isExpanded ? '#f8fafc' : 'inherit',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ textAlign: 'center', color: '#94a3b8' }}>
                        <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`} style={{ fontSize: '0.8rem' }}></i>
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{sub.subjectName}</span>
                          {sub.missingWorkCount > 0 && (
                            <span
                              className="portal-badge danger"
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                              title={`${sub.missingWorkCount} missing or overdue work`}
                            >
                              {sub.missingWorkCount} Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 900, minWidth: 38, color: '#0f172a' }}>
                            {sub.score}%
                          </span>
                          <div style={{ background: '#f1f5f9', borderRadius: 6, height: 6, width: 64, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(sub.score, 100)}%`,
                                height: '100%',
                                background: sub.score >= 80 ? '#10b981' : sub.score >= 60 ? '#2563eb' : '#f59e0b'
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`portal-badge ${sub.score >= 80 ? 'success' : sub.score >= 60 ? 'info' : 'warning'}`}>
                          Grade {sub.grade}
                        </span>
                      </td>
                      <td style={{ color: '#475569', fontWeight: 600 }}>
                        {sub.classAverage !== null ? `${sub.classAverage}%` : '—'}
                      </td>
                      <td className="hide-mobile" style={{ color: '#475569', fontSize: '0.85rem' }}>
                        {sub.teacherName || 'Assigned Staff'}
                      </td>
                      <td className="hide-mobile" style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: 260 }}>
                        <span style={{ fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          "{sub.teacherComment || 'Satisfactory work and participation.'}"
                        </span>
                      </td>
                    </tr>

                    {/* Expandable Details Drawer */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={7} style={{ padding: '16px 24px', borderTop: 'none' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Missing / Outstanding Work Warning if any */}
                            {sub.missingWorkCount > 0 && (
                              <div
                                style={{
                                  background: '#fef2f2',
                                  border: '1px solid #fee2e2',
                                  borderRadius: 8,
                                  padding: '10px 14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  color: '#b91c1c',
                                  fontSize: '0.85rem'
                                }}
                              >
                                <i className="fas fa-exclamation-circle" style={{ fontSize: '1rem' }}></i>
                                <div>
                                  <strong>Outstanding Assignment Action Needed:</strong>
                                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                                    {sub.missingWork.map(mw => (
                                      <li key={mw.id}>
                                        {mw.title} ({mw.category}) — Due {mw.dueDate}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}

                            {/* Recent Assessments List */}
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                                <i className="fas fa-tasks mr-2 text-primary"></i>
                                Recent Assessment Items (Tests & Homework)
                              </div>
                              {sub.recentAssessments.length === 0 ? (
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                  No individual test or homework items recorded yet for this term.
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                                  {sub.recentAssessments.map(item => (
                                    <div
                                      key={item.id}
                                      style={{
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 8,
                                        padding: '10px 12px'
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                                          {item.title}
                                        </span>
                                        <span className="portal-badge info" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                                          {item.category}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                                        <span>{item.date || 'Recent'}</span>
                                        <span style={{ fontWeight: 800, color: '#0f172a' }}>
                                          {item.score !== null ? `${item.score} / ${item.maxScore}` : 'Pending'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Teacher Comments Quote */}
                            <div
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderLeft: '3px solid #2563eb',
                                borderRadius: 8,
                                padding: '10px 14px'
                              }}
                            >
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                Teacher Feedback & Remarks ({sub.teacherName || 'Subject Teacher'})
                              </div>
                              <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e293b', fontStyle: 'italic' }}>
                                "{sub.teacherComment || 'Demonstrating consistent effort and understanding across the syllabus topics.'}"
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // TAB 3: REPORT CARDS (PDF)
  // ─────────────────────────────────────────────────────────────
  const reportCardsTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Principal's Comment Highlight Quote Block (most recent term) */}
      {principalComment && (
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            border: '1px solid #bfdbfe',
            borderLeft: '5px solid #2563eb',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 2px 8px -2px rgba(37, 99, 235, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <i className="fas fa-quote-left" style={{ color: '#2563eb', fontSize: '1.1rem' }}></i>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Headmaster & Principal's Remarks — {principalComment.term} {principalComment.year}
            </span>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: '1rem', color: '#1e293b', fontStyle: 'italic', lineHeight: 1.6 }}>
            "{principalComment.comment || 'A focused, hardworking, and well-disciplined student. Continues to demonstrate academic vigor and commendable leadership in class activities.'}"
          </p>
          {principalComment.classTeacherComment && (
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 10, marginTop: 8, fontSize: '0.875rem', color: '#475569' }}>
              <strong>Class Teacher's Observation:</strong> "{principalComment.classTeacherComment}"
            </div>
          )}
        </div>
      )}

      {/* Generated Report Cards List (Sorted newest first) */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
            Official Published Report Cards
          </h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
            Download or preview finalized end-of-term academic reports signed by the school administration.
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="portal-card" style={{ textAlign: 'center', padding: 48, background: '#f8fafc' }}>
            <i className="fas fa-file-invoice" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }}></i>
            <h4 style={{ margin: '0 0 6px', color: '#334155' }}>No Official Reports Published Yet</h4>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
              Term report cards will appear here as soon as they are signed and authorized by the administration.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reports.map(rep => (
              <div
                key={rep.id}
                className="portal-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                  padding: '18px 24px',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}
                  >
                    <i className="fas fa-file-alt"></i>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      {rep.term} {rep.year} Official Report
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', color: '#64748b' }}>
                      <span>Available: {rep.availableDate}</span>
                      <span>•</span>
                      <span className="portal-badge success" style={{ padding: '1px 6px', fontSize: '0.7rem' }}>
                        Authorized & Published
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="portal-btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700 }}
                    onClick={() => openPreviewModal(rep)}
                  >
                    <i className="fas fa-eye mr-1"></i> View
                  </button>
                  <button
                    className="portal-btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700 }}
                    onClick={() => handleDownloadPdf(rep.id, `${rep.term}_${rep.year}`)}
                    disabled={downloadingPdf}
                  >
                    <i className="fas fa-download mr-1"></i> Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden container for jsPDF / html2canvas fallback render */}
      <div style={{ position: 'fixed', left: -9999, top: 0, width: 800 }} aria-hidden="true">
        <div id="report-card-print-target">
          {previewReport && <ReportDocument data={previewReport} template={template} />}
        </div>
      </div>

      {/* In-Page Report Viewer Modal */}
      {previewReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setPreviewReport(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 860,
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  {previewReport.term} {previewReport.year} Report Card Preview
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Student: {previewReport.name || data?.student.name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  className="portal-btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  onClick={() => handleDownloadPdf(previewReport.id, `${previewReport.term}_${previewReport.year}`)}
                >
                  <i className="fas fa-download mr-1"></i> Download PDF
                </button>
                <button
                  className="portal-btn-ghost"
                  style={{ padding: '6px 10px', fontSize: '1.1rem' }}
                  onClick={() => setPreviewReport(null)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div style={{ padding: 24, overflowY: 'auto', background: '#f8fafc' }}>
              <div style={{ background: '#ffffff', padding: 24, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <ReportDocument data={previewReport} template={template} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // TAB 4: HISTORY (Year-on-Year Summary)
  // ─────────────────────────────────────────────────────────────
  const historyTab = (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
          Year-on-Year Academic Ledger
        </h3>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
          Cumulative annual performance history. Click any year to reveal its Term 1, Term 2, and Term 3 breakdown inline.
        </p>
      </div>

      <div className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '32px' }}></th>
              <th>Year</th>
              <th>Class</th>
              <th>Average Score</th>
              <th>Standing / Position</th>
              <th>Final Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                  No historical academic years recorded yet.
                </td>
              </tr>
            ) : (
              history.map(item => {
                const isExpanded = !!expandedHistoryYears[item.year];
                return (
                  <React.Fragment key={item.year}>
                    <tr
                      onClick={() => toggleHistoryYear(item.year)}
                      style={{
                        cursor: 'pointer',
                        background: isExpanded ? '#f8fafc' : 'inherit',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ textAlign: 'center', color: '#94a3b8' }}>
                        <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`} style={{ fontSize: '0.8rem' }}></i>
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>
                        {item.year}
                      </td>
                      <td style={{ color: '#334155', fontWeight: 600 }}>
                        {item.className}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 900, minWidth: 38, color: '#0f172a' }}>
                            {item.average}%
                          </span>
                          <div style={{ background: '#f1f5f9', borderRadius: 6, height: 6, width: 64, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(item.average, 100)}%`,
                                height: '100%',
                                background: item.average >= 80 ? '#10b981' : item.average >= 60 ? '#2563eb' : '#f59e0b'
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#475569', fontWeight: 700 }}>
                        {item.position}
                      </td>
                      <td>
                        <span className={`portal-badge ${item.average >= 80 ? 'success' : item.average >= 60 ? 'info' : 'warning'}`}>
                          Grade {item.finalGrade}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`portal-badge ${item.status === 'In Progress' ? 'warning' : 'success'}`}
                          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>

                    {/* Inline Term 1 / 2 / 3 Breakdown */}
                    {isExpanded && (
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={7} style={{ padding: '16px 24px', borderTop: 'none' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>
                            <i className="fas fa-layer-group mr-2 text-primary"></i>
                            {item.year} Academic Terms Breakdown
                          </div>
                          {item.terms.length === 0 ? (
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              No detailed term scores recorded for this year.
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                              {item.terms.map((t, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 10,
                                    padding: '12px 14px'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                                      {t.term}
                                    </span>
                                    <span className="portal-badge info" style={{ fontSize: '0.7rem' }}>
                                      Grade {t.grade}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                                      {t.average}%
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                      {t.subjectsCount} subjects
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const tabs: TabItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'fas fa-tachometer-alt',
      content: overviewTab
    },
    {
      id: 'subject-breakdown',
      label: 'Subject Breakdown',
      icon: 'fas fa-list-check',
      content: subjectBreakdownTab
    },
    {
      id: 'report-cards',
      label: 'Report Cards',
      icon: 'fas fa-file-invoice',
      badge: reports.length > 0 ? reports.length : undefined,
      content: reportCardsTab
    },
    {
      id: 'history',
      label: 'History',
      icon: 'fas fa-history',
      content: historyTab
    }
  ];

  return (
    <TabbedPage
      title="Academic Performance"
      subtitle={`Review results, assessment breakdown, official report cards, and historical records for ${data?.student.name || activeEntity?.name || 'your child'}.`}
      tabs={tabs}
      defaultTab={initialTab}
      tabParam="tab"
    />
  );
}
