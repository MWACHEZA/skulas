import React, { useState, useEffect } from 'react';
import { PaginatedTable } from '../../../components/shared/Pagination';
import ReportGeneratorWizard, { ACADEMIC_REPORT_CATEGORIES } from '../../../components/portals/shared/ReportGeneratorWizard';
import { useTerminology } from '../../../hooks/useTerminology';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const TEACHER_ALLOWED_REPORTS = ['TERMLY_REPORTS', 'BROADSHEET', 'SUBJECT_ANALYSIS', 'MERIT_FAILURE', 'CA_SUMMARY'];

interface ClassSummary {
  id: string;
  name: string;
  subject?: { id: string; name: string };
  studentCount?: number;
}

interface GradingScaleBand {
  id?: string;
  grade: string;
  minScore: number;
  maxScore: number;
  status: string;
}

export default function TeacherReports() {
  const { t, isMedical } = useTerminology();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'generation' | 'analytics'>('generation');
  const [selectedReportType, setSelectedReportType] = useState('TERMLY_REPORTS');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [gradingScales, setGradingScales] = useState<GradingScaleBand[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Real analytics state
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{
    studentCount: number;
    classCount: number;
    averageScore: number;
    passRate: number;
    gradeDistribution: Array<{ grade: string; count: number; percentage: number; color: string }>;
    genderStats: { male: number; female: number; malePct: number; femalePct: number };
    topStudents: Array<{ id: string; name: string; studentId: string; avgScore: number; rank: number }>;
    supportStudents: Array<{ id: string; name: string; studentId: string; avgScore: number }>;
  }>({
    studentCount: 0,
    classCount: 0,
    averageScore: 0,
    passRate: 0,
    gradeDistribution: [],
    genderStats: { male: 0, female: 0, malePct: 50, femalePct: 50 },
    topStudents: [],
    supportStudents: []
  });

  const [exportingType, setExportingType] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsData();
    }
  }, [activeTab, selectedClassId, selectedTerm, selectedYear]);

  const fetchInitialData = async () => {
    try {
      const [classesRes, scalesRes] = await Promise.all([
        api.get('/api/teachers/my-classes'),
        api.get('/api/grading').catch(() => ({ data: [] }))
      ]);
      const classList = Array.isArray(classesRes.data) ? classesRes.data : [];
      setClasses(classList);
      if (classList.length > 0) {
        setSelectedClassId(classList[0].id);
      }
      if (Array.isArray(scalesRes.data) && scalesRes.data.length > 0) {
        setGradingScales(scalesRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch initial reports metadata', err);
    }
  };

  const fetchAnalyticsData = async () => {
    setLoadingAnalytics(true);
    try {
      const [classesRes, studentsRes, previewRes] = await Promise.all([
        api.get('/api/teachers/my-classes').catch(() => ({ data: [] })),
        api.get(selectedClassId ? `/api/teachers/my-students?classId=${selectedClassId}` : '/api/teachers/my-students').catch(() => ({ data: [] })),
        api.get(`/api/reports/preview?type=TERMLY_REPORTS&term=${selectedTerm}&year=${selectedYear}${selectedClassId ? `&classId=${selectedClassId}` : ''}`).catch(() => ({ data: [] }))
      ]);

      const classList = Array.isArray(classesRes.data) ? classesRes.data : [];
      const studentList = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      const reportList = Array.isArray(previewRes.data) ? previewRes.data : [];

      // Calculate gender stats from real students
      let maleCount = 0;
      let femaleCount = 0;
      studentList.forEach((s: any) => {
        const g = (s.gender || s.user?.gender || '').toLowerCase();
        if (g === 'male' || g === 'm') maleCount++;
        else if (g === 'female' || g === 'f') femaleCount++;
        else {
          // Fallback distribution
          if (maleCount <= femaleCount) maleCount++;
          else femaleCount++;
        }
      });
      const totalGender = (maleCount + femaleCount) || 1;
      const malePct = Math.round((maleCount / totalGender) * 100);
      const femalePct = 100 - malePct;

      // Calculate real scores from reportList
      const gradedStudents = reportList.filter((item: any) => typeof item.averageScore === 'number' && item.complete);
      const totalStudents = studentList.length || reportList.length || 0;

      let avgSum = 0;
      let passCount = 0;
      const passThreshold = 50; // Standard pass mark

      // Grade distribution buckets
      const gradeCounts: Record<string, number> = {};
      const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#64748b'];

      // Use loaded school grading scale or Cambridge/ZIMSEC fallback
      const activeScales = gradingScales.length > 0 ? gradingScales : [
        { grade: 'A', minScore: 75, maxScore: 100, status: 'Distinction' },
        { grade: 'B', minScore: 65, maxScore: 74, status: 'Merit' },
        { grade: 'C', minScore: 50, maxScore: 64, status: 'Credit' },
        { grade: 'D', minScore: 40, maxScore: 49, status: 'Pass' },
        { grade: 'U', minScore: 0, maxScore: 39, status: 'Fail' }
      ];

      activeScales.forEach(s => {
        gradeCounts[s.grade] = 0;
      });

      gradedStudents.forEach((st: any) => {
        const score = st.averageScore || 0;
        avgSum += score;
        if (score >= passThreshold) passCount++;

        // Find scale band
        const matched = activeScales.find(s => score >= s.minScore && score <= s.maxScore);
        const gradeKey = matched ? matched.grade : (score >= 50 ? 'Pass' : 'Fail');
        gradeCounts[gradeKey] = (gradeCounts[gradeKey] || 0) + 1;
      });

      const averageScore = gradedStudents.length > 0 ? Math.round((avgSum / gradedStudents.length) * 10) / 10 : 0;
      const passRate = gradedStudents.length > 0 ? Math.round((passCount / gradedStudents.length) * 100) : 0;

      const gradeDistribution = Object.entries(gradeCounts).map(([grade, count], index) => {
        const pct = gradedStudents.length > 0 ? Math.round((count / gradedStudents.length) * 100) : 0;
        return {
          grade,
          count,
          percentage: pct,
          color: colors[index % colors.length]
        };
      });

      // Sorted leaderboard
      const sortedByRank = [...gradedStudents].sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
      const topStudents = sortedByRank.slice(0, 5).map((s, idx) => ({
        id: s.id,
        name: s.name,
        studentId: s.studentId || 'N/A',
        avgScore: s.averageScore || 0,
        rank: idx + 1
      }));

      const supportStudents = sortedByRank
        .filter(s => (s.averageScore || 0) < passThreshold)
        .slice(-5)
        .map(s => ({
          id: s.id,
          name: s.name,
          studentId: s.studentId || 'N/A',
          avgScore: s.averageScore || 0
        }));

      setAnalyticsData({
        studentCount: totalStudents,
        classCount: classList.length,
        averageScore,
        passRate,
        gradeDistribution,
        genderStats: { male: maleCount, female: femaleCount, malePct, femalePct },
        topStudents,
        supportStudents
      });
    } catch (err) {
      console.error('Failed to compute analytics data', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Direct CSV Exporters for Teacher Reports
  const handleExportCSV = async (reportType: string, reportName: string) => {
    setExportingType(reportType);
    try {
      showToast(`Preparing ${reportName} export...`, 'info');
      const res = await api.get(`/api/reports/preview?type=${reportType}&term=${selectedTerm}&year=${selectedYear}${selectedClassId ? `&classId=${selectedClassId}` : ''}`);
      const data: any[] = Array.isArray(res.data) ? res.data : [];

      if (data.length === 0) {
        showToast(`No student assessment records found for ${reportName} under current filters.`, 'warning');
        return;
      }

      let csvContent = '';
      const filename = `${reportName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${selectedTerm.replace(/\s+/g, '')}_${selectedYear}.csv`;

      if (reportType === 'BROADSHEET') {
        // Collect all distinct subject names across students
        const allSubjects = new Set<string>();
        data.forEach(item => {
          (item.grades || []).forEach((g: any) => {
            if (g.subject) allSubjects.add(g.subject);
            else if (g.subjectName) allSubjects.add(g.subjectName);
          });
        });
        const subjectList = Array.from(allSubjects);

        const headers = ['Student ID', 'Student Name', ...subjectList, 'Overall Average (%)', 'Status'];
        csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

        data.forEach(item => {
          const row: any[] = [item.studentId || item.id, item.name];
          subjectList.forEach(sub => {
            const gradeItem = (item.grades || []).find((g: any) => g.subject === sub || g.subjectName === sub);
            if (gradeItem) {
              row.push(`${gradeItem.score || 0}% (${gradeItem.grade || '-'})`);
            } else {
              row.push('-');
            }
          });
          row.push(`${item.averageScore || 0}%`);
          row.push(item.statusText || 'Enrolled');
          csvContent += row.map(v => `"${v}"`).join(',') + '\n';
        });
      } else if (reportType === 'MERIT_FAILURE') {
        const sorted = [...data].sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
        const headers = ['Rank', 'Student ID', 'Student Name', 'Average Score (%)', 'Standing / Recommendation'];
        csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

        sorted.forEach((item, idx) => {
          const avg = item.averageScore || 0;
          const standing = avg >= 75 ? 'Honor Roll (Distinction)' : avg >= 65 ? 'Merit' : avg >= 50 ? 'Satisfactory Pass' : 'Academic Intervention Required';
          csvContent += [`"${idx + 1}"`, `"${item.studentId || item.id}"`, `"${item.name}"`, `"${avg}%"`, `"${standing}"`].join(',') + '\n';
        });
      } else if (reportType === 'SUBJECT_ANALYSIS') {
        const headers = ['Student ID', 'Student Name', 'Total Assessed Subjects', 'Average Performance', 'Status'];
        csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

        data.forEach(item => {
          csvContent += [
            `"${item.studentId || item.id}"`,
            `"${item.name}"`,
            `"${(item.grades || []).length}"`,
            `"${item.averageScore || 0}%"`,
            `"${item.statusText || '-'}"`
          ].join(',') + '\n';
        });
      } else {
        // Generic fallback for CA_SUMMARY and others
        const headers = ['Student ID', 'Student Name', 'Status', 'Average Score'];
        csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
        data.forEach(item => {
          csvContent += [`"${item.studentId || item.id}"`, `"${item.name}"`, `"${item.statusText || 'Ready'}"`, `"${item.averageScore || 0}%"`].join(',') + '\n';
        });
      }

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`${reportName} CSV exported successfully!`, 'success');
    } catch (err) {
      console.error(err);
      showToast(`Failed to export ${reportName}`, 'error');
    } finally {
      setExportingType(null);
    }
  };

  const reportCards = [
    {
      id: 'TERMLY_REPORTS',
      name: 'Termly Report Cards',
      desc: `Individual student academic progress report cards with subject grades, remarks, and GPA summaries`,
      icon: 'fa-graduation-cap',
      color: '#2563eb',
      canExportCSV: false
    },
    {
      id: 'BROADSHEET',
      name: 'Class Broadsheet / Marksheet',
      desc: `Master marksheet across all subjects, totals, class averages, and student position rankings`,
      icon: 'fa-table',
      color: '#7c3aed',
      canExportCSV: true
    },
    {
      id: 'SUBJECT_ANALYSIS',
      name: 'Subject Analysis',
      desc: `Subject pass rates, grade distribution charts, and student achievement breakdowns`,
      icon: 'fa-chart-pie',
      color: '#0891b2',
      canExportCSV: true
    },
    {
      id: 'MERIT_FAILURE',
      name: 'Failure / Merit List',
      desc: `Honor roll standings, merit recognition, and academic intervention tracking`,
      icon: 'fa-award',
      color: '#d97706',
      canExportCSV: true
    },
    {
      id: 'CA_SUMMARY',
      name: 'Continuous Assessment Summary',
      desc: `Aggregated CAT scores, assignment marks, coursework, and practical test records`,
      icon: 'fa-tasks',
      color: '#059669',
      canExportCSV: true
    }
  ];

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '28px 32px',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              <i className="fas fa-file-invoice"></i>
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                {t('reports')} & Academic Analytics
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.92rem' }}>
                Generate official terminal report cards, export broadsheets, and monitor class academic performance.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Toggle & Quick Marks Shortcut */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/teacher/grades?tab=marks-entry')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.2s'
            }}
          >
            <i className="fas fa-pen-alt" />
            Enter Marks
          </button>

          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px', borderRadius: '12px', display: 'flex', gap: 4 }}>
            <button
              onClick={() => setActiveTab('generation')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'generation' ? '#ffffff' : 'transparent',
                color: activeTab === 'generation' ? '#0f172a' : '#cbd5e1',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-magic" />
              Report Generator
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'analytics' ? '#ffffff' : 'transparent',
                color: activeTab === 'analytics' ? '#0f172a' : '#cbd5e1',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-chart-pie" />
              Performance Analytics
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'generation' ? (
        <>
          {/* Quick Selection & Category Cards */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  Select Academic Report Category
                </h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Click a category to configure parameters, compile student marks, and download official PDF or CSV files.
                </p>
              </div>

              {classes.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Class Stream:</label>
                  <select
                    className="portal-input"
                    style={{ minWidth: 180, padding: '6px 12px', fontSize: '0.88rem' }}
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                  >
                    <option value="">All My Classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {reportCards.map(r => {
                const isSelected = selectedReportType === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReportType(r.id)}
                    style={{
                      background: '#ffffff',
                      borderRadius: 14,
                      padding: '20px',
                      border: `2px solid ${isSelected ? r.color : '#e2e8f0'}`,
                      boxShadow: isSelected ? `0 8px 24px -4px ${r.color}33` : '0 1px 3px rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                  >
                    {isSelected && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          background: r.color,
                          color: '#fff',
                          borderRadius: '50%',
                          width: 22,
                          height: 22,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem'
                        }}
                      >
                        <i className="fas fa-check" />
                      </div>
                    )}

                    <div>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: `${r.color}15`,
                          color: r.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.35rem',
                          marginBottom: 14
                        }}
                      >
                        <i className={`fas ${r.icon}`} />
                      </div>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
                        {r.name}
                      </h3>
                      <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45 }}>
                        {r.desc}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReportType(r.id);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: 'none',
                          background: isSelected ? r.color : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#334155',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <i className="fas fa-cog" />
                        Configure
                      </button>

                      {r.canExportCSV && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportCSV(r.id, r.name);
                          }}
                          disabled={exportingType === r.id}
                          title="Export directly to CSV spreadsheet"
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#475569',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          {exportingType === r.id ? (
                            <i className="fas fa-spinner fa-spin" />
                          ) : (
                            <>
                              <i className="fas fa-file-csv" style={{ color: '#059669' }} />
                              CSV
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Embedded Wizard */}
          <ReportGeneratorWizard
            role="TEACHER"
            allowedTypes={TEACHER_ALLOWED_REPORTS}
            initialReportType={selectedReportType}
            initialClassId={selectedClassId}
          />
        </>
      ) : (
        /* Real Performance Analytics Tab */
        <div>
          {/* Controls Bar */}
          <div 
            style={{
              background: '#ffffff',
              padding: '16px 20px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              marginBottom: 20,
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Class / Stream:</label>
              <select
                className="portal-input"
                style={{ minWidth: 180, padding: '6px 12px', fontSize: '0.88rem' }}
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
              >
                <option value="">All My Classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Academic Term:</label>
              <select
                className="portal-input"
                style={{ minWidth: 130, padding: '6px 12px', fontSize: '0.88rem' }}
                value={selectedTerm}
                onChange={e => setSelectedTerm(e.target.value)}
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Year:</label>
              <select
                className="portal-input"
                style={{ minWidth: 100, padding: '6px 12px', fontSize: '0.88rem' }}
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
              >
                {[0, -1, -2, 1].map(offset => {
                  const y = new Date().getFullYear() + offset;
                  return <option key={y} value={y.toString()}>{y}</option>;
                })}
              </select>
            </div>

            <button
              onClick={fetchAnalyticsData}
              disabled={loadingAnalytics}
              style={{
                marginLeft: 'auto',
                padding: '8px 16px',
                borderRadius: 8,
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <i className={`fas fa-sync-alt ${loadingAnalytics ? 'fa-spin' : ''}`} />
              Refresh Analytics
            </button>
          </div>

          {/* KPI Stat Cards */}
          <div className="portal-stats-grid" style={{ marginBottom: 24 }}>
            <div className="portal-stat-card">
              <div className="portal-stat-icon blue">
                <i className={`fas ${isMedical ? 'fa-user-nurse' : 'fa-user-graduate'}`}></i>
              </div>
              <div className="portal-stat-info">
                <h3>{analyticsData.studentCount}</h3>
                <p>Assessed {t('students')}</p>
              </div>
            </div>

            <div className="portal-stat-card">
              <div className="portal-stat-icon green">
                <i className="fas fa-door-open"></i>
              </div>
              <div className="portal-stat-info">
                <h3>{analyticsData.classCount}</h3>
                <p>My {t('classes')}</p>
              </div>
            </div>

            <div className="portal-stat-card">
              <div className="portal-stat-icon purple">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="portal-stat-info">
                <h3>{analyticsData.averageScore > 0 ? `${analyticsData.averageScore}%` : '—'}</h3>
                <p>Cohort Average Score</p>
              </div>
            </div>

            <div className="portal-stat-card">
              <div className="portal-stat-icon orange">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="portal-stat-info">
                <h3>{analyticsData.passRate > 0 ? `${analyticsData.passRate}%` : '—'}</h3>
                <p>Class Pass Rate (≥50%)</p>
              </div>
            </div>
          </div>

          {/* Charts & Distributions */}
          <div className="portal-grid-2" style={{ marginBottom: 24 }}>
            {/* Grade Distribution */}
            <div className="portal-card" style={{ marginBottom: 0 }}>
              <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-chart-bar" style={{ color: '#0284c7' }} />
                  Grade Distribution ({selectedTerm} {selectedYear})
                </h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Based on School Grading Scale
                </span>
              </div>
              <div className="portal-card-body" style={{ padding: '24px' }}>
                {analyticsData.gradeDistribution.length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>No student grades recorded yet for this term.</p>
                ) : (
                  analyticsData.gradeDistribution.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>
                          Grade {item.grade}
                        </span>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>
                          {item.count} student{item.count !== 1 ? 's' : ''} ({item.percentage}%)
                        </span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${Math.max(item.percentage, item.count > 0 ? 5 : 0)}%`, 
                            height: '100%', 
                            borderRadius: 6, 
                            background: item.color,
                            transition: 'width 0.4s ease'
                          }} 
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Gender Demographics */}
            <div className="portal-card" style={{ marginBottom: 0 }}>
              <div className="portal-card-header">
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-venus-mars" style={{ color: '#ec4899' }} />
                  {t('student')} Cohort Demographics
                </h2>
              </div>
              <div className="portal-card-body" style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div style={{ background: '#eff6ff', borderRadius: 12, padding: '16px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '1.5rem', color: '#2563eb', marginBottom: 4 }}><i className="fas fa-mars" /></div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a' }}>{analyticsData.genderStats.male}</div>
                    <div style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 600 }}>Male Students ({analyticsData.genderStats.malePct}%)</div>
                  </div>

                  <div style={{ background: '#fdf2f8', borderRadius: 12, padding: '16px', textAlign: 'center', border: '1px solid #fbcfe8' }}>
                    <div style={{ fontSize: '1.5rem', color: '#db2777', marginBottom: 4 }}><i className="fas fa-venus" /></div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#831843' }}>{analyticsData.genderStats.female}</div>
                    <div style={{ fontSize: '0.8rem', color: '#f472b6', fontWeight: 600 }}>Female Students ({analyticsData.genderStats.femalePct}%)</div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Gender Ratio Split</div>
                  <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${analyticsData.genderStats.malePct}%`, background: '#3b82f6' }} title={`Male: ${analyticsData.genderStats.malePct}%`} />
                    <div style={{ width: `${analyticsData.genderStats.femalePct}%`, background: '#ec4899' }} title={`Female: ${analyticsData.genderStats.femalePct}%`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers and Academic Support Tables */}
          <div className="portal-grid-2">
            {/* Top 5 Leaderboard */}
            <div className="portal-card" style={{ marginBottom: 0 }}>
              <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-trophy" style={{ color: '#eab308' }} />
                  Class Top Achievers
                </h2>
                <span className="portal-badge success" style={{ fontSize: '0.75rem' }}>Honor Roll</span>
              </div>
              <div className="portal-card-body" style={{ padding: 0 }}>
                {analyticsData.topStudents.length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>No student rankings available yet.</p>
                ) : (
                  <PaginatedTable className="portal-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>Rank</th>
                        <th>Student Name</th>
                        <th>Student ID</th>
                        <th style={{ textAlign: 'right' }}>Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.topStudents.map(st => (
                        <tr key={st.id}>
                          <td>
                            <span 
                              style={{ 
                                width: 24, 
                                height: 24, 
                                borderRadius: '50%', 
                                background: st.rank === 1 ? '#fef08a' : st.rank === 2 ? '#e2e8f0' : '#ffedd5',
                                color: st.rank === 1 ? '#854d0e' : '#475569',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 800
                              }}
                            >
                              {st.rank}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{st.name}</td>
                          <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{st.studentId}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                            {st.avgScore}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </PaginatedTable>
                )}
              </div>
            </div>

            {/* Academic Support Required */}
            <div className="portal-card" style={{ marginBottom: 0 }}>
              <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444' }} />
                  Academic Support & Remedial
                </h2>
                <span className="portal-badge danger" style={{ fontSize: '0.75rem' }}>&lt; 50% Avg</span>
              </div>
              <div className="portal-card-body" style={{ padding: 0 }}>
                {analyticsData.supportStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px', color: '#047857' }}>
                    <i className="fas fa-check-circle" style={{ fontSize: '1.8rem', marginBottom: 8, display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>All assessed students are currently meeting the pass threshold!</p>
                  </div>
                ) : (
                  <PaginatedTable className="portal-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Student ID</th>
                        <th style={{ textAlign: 'right' }}>Score</th>
                        <th style={{ textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.supportStudents.map(st => (
                        <tr key={st.id}>
                          <td style={{ fontWeight: 600 }}>{st.name}</td>
                          <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{st.studentId}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
                            {st.avgScore}%
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => navigate(`/teacher/grades?tab=marks-entry&classId=${selectedClassId}`)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                border: '1px solid #fecaca',
                                background: '#fff5f5',
                                color: '#b91c1c',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Review Marks
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </PaginatedTable>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
