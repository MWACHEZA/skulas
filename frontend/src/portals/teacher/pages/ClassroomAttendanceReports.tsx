import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import SkeletonLoader from '../../../components/shared/SkeletonLoader';

interface ClassItem {
  id: string;
  name: string;
  subject?: { name: string };
}

interface StudentSummary {
  id: string;
  name: string;
  studentId: string;
  gender?: string;
  parentPhone?: string;
  totalDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
  status: 'Regular' | 'Punctual' | 'At Risk';
}

export default function ClassroomAttendanceReports() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    totalRecordedDays: number;
    classRate: number;
    studentsCount: number;
    students: StudentSummary[];
  }>({
    totalRecordedDays: 0,
    classRate: 0,
    studentsCount: 0,
    students: []
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRiskOnly, setFilterRiskOnly] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchSummary();
    }
  }, [selectedClassId, selectedMonth, selectedYear]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/teachers/my-classes');
      const list = Array.isArray(res.data) ? res.data : [];
      setClasses(list);
      if (list.length > 0) {
        setSelectedClassId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load classes', err);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/attendance/class-summary', {
        params: {
          classId: selectedClassId,
          month: selectedMonth,
          year: selectedYear
        }
      });
      setSummaryData({
        totalRecordedDays: res.data?.totalRecordedDays || 0,
        classRate: res.data?.classRate || 0,
        studentsCount: res.data?.studentsCount || 0,
        students: res.data?.students || []
      });
    } catch (err) {
      console.error('Failed to load attendance summary', err);
      showToast('Could not load attendance summary for this class period.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (summaryData.students.length === 0) {
      showToast('No student attendance records to export', 'warning');
      return;
    }

    const currentClass = classes.find(c => c.id === selectedClassId)?.name || 'Class';
    const monthName = MONTH_NAMES[parseInt(selectedMonth) - 1] || 'Month';
    const filename = `attendance_report_${currentClass.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${monthName}_${selectedYear}.csv`;

    const headers = ['Student ID', 'Student Name', 'Total Sessions', 'Days Present', 'Days Absent', 'Days Late', 'Attendance Rate (%)', 'Attendance Standing', 'Guardian Phone'];
    let csv = headers.map(h => `"${h}"`).join(',') + '\n';

    summaryData.students.forEach(st => {
      const row = [
        st.studentId,
        st.name,
        st.totalDays,
        st.presentCount,
        st.absentCount,
        st.lateCount,
        `${st.attendanceRate}%`,
        st.status,
        st.parentPhone || '-'
      ];
      csv += row.map(v => `"${v}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Attendance report exported to CSV successfully!', 'success');
  };

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Filtering students
  const filteredStudents = summaryData.students.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          st.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterRiskOnly) {
      return matchesSearch && st.attendanceRate < 75;
    }
    return matchesSearch;
  });

  const regularCount = summaryData.students.filter(s => s.attendanceRate >= 90).length;
  const atRiskCount = summaryData.students.filter(s => s.attendanceRate < 75).length;
  const currentClassName = classes.find(c => c.id === selectedClassId)?.name || 'Class';

  return (
    <div style={{ maxWidth: '1380px', margin: '0 auto' }}>
      {/* Controls & Filter Bar */}
      <div 
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '18px 24px',
          border: '1px solid #e2e8f0',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Class Stream:
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="portal-input"
              style={{ minWidth: 200, padding: '8px 12px', fontWeight: 600 }}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.subject?.name ? `(${c.subject.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Calendar Month:
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="portal-input"
              style={{ minWidth: 140, padding: '8px 12px', fontWeight: 600 }}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={(idx + 1).toString()}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Year:
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="portal-input"
              style={{ minWidth: 100, padding: '8px 12px', fontWeight: 600 }}
            >
              {[0, -1, -2, 1].map(offset => {
                const y = new Date().getFullYear() + offset;
                return <option key={y} value={y.toString()}>{y}</option>;
              })}
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              Search:
            </label>
            <input
              type="text"
              placeholder="Filter by name/ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="portal-input"
              style={{ padding: '8px 12px', minWidth: 170 }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setFilterRiskOnly(!filterRiskOnly)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${filterRiskOnly ? '#ef4444' : '#cbd5e1'}`,
              background: filterRiskOnly ? '#fee2e2' : '#ffffff',
              color: filterRiskOnly ? '#b91c1c' : '#475569',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <i className="fas fa-exclamation-triangle" style={{ color: filterRiskOnly ? '#dc2626' : '#94a3b8' }} />
            {filterRiskOnly ? 'Showing At Risk Only' : 'Filter At Risk (<75%)'}
          </button>

          <button
            onClick={exportCSV}
            className="portal-btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-file-csv" style={{ color: '#059669', marginRight: 6 }} />
            Export CSV
          </button>

          <button
            onClick={() => navigate(`/teacher/attendance?tab=roll-call&classId=${selectedClassId}`)}
            className="portal-btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <i className="fas fa-user-check mr-1" />
            Take Roll Call
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="portal-stats-grid" style={{ marginBottom: 20 }}>
        <div className="portal-stat-card">
          <div className="portal-stat-icon purple">
            <i className="fas fa-percentage" />
          </div>
          <div className="portal-stat-info">
            <h3>{summaryData.classRate > 0 ? `${summaryData.classRate}%` : '—'}</h3>
            <p>Class Attendance Rate</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon blue">
            <i className="fas fa-calendar-day" />
          </div>
          <div className="portal-stat-info">
            <h3>{summaryData.totalRecordedDays}</h3>
            <p>School Days Logged</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon green">
            <i className="fas fa-check-circle" />
          </div>
          <div className="portal-stat-info">
            <h3>{regularCount}</h3>
            <p>Regular Attendees (≥90%)</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon orange">
            <i className="fas fa-user-clock" />
          </div>
          <div className="portal-stat-info">
            <h3>{atRiskCount}</h3>
            <p>Students At Risk (&lt;75%)</p>
          </div>
        </div>
      </div>

      {/* Detailed Student Attendance Table */}
      <div className="portal-card" style={{ marginBottom: 0 }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Monthly Register for {currentClassName} &bull; {MONTH_NAMES[parseInt(selectedMonth) - 1]} {selectedYear}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
              Aggregated directly from the school's official Attendance database.
            </p>
          </div>

          <span className="portal-badge info">
            {summaryData.students.length} Enrolled Students
          </span>
        </div>

        <div className="portal-card-body" style={{ padding: 0, overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '16px' }}>
              <SkeletonLoader type="table" rows={8} columns={6} />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
              <i className="fas fa-calendar-times" style={{ fontSize: '2.5rem', marginBottom: 12 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No attendance records found for this period.</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>Ensure roll call has been recorded for this class stream.</p>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Student Name</th>
                  <th style={{ width: 120 }}>Student ID</th>
                  <th style={{ width: 100, textAlign: 'center' }}>Present</th>
                  <th style={{ width: 100, textAlign: 'center' }}>Absent</th>
                  <th style={{ width: 100, textAlign: 'center' }}>Late</th>
                  <th style={{ minWidth: 160 }}>Attendance Rate</th>
                  <th style={{ width: 130, textAlign: 'center' }}>Standing</th>
                  <th style={{ width: 140, textAlign: 'center' }}>Guardian Contact</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(st => {
                  const rateColor = st.attendanceRate >= 90 ? '#10b981' : st.attendanceRate >= 75 ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={st.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ color: '#0f172a' }}>{st.name}</div>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{st.studentId}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#047857' }}>
                        {st.presentCount}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: st.absentCount > 0 ? '#b91c1c' : '#64748b' }}>
                        {st.absentCount}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: st.lateCount > 0 ? '#d97706' : '#64748b' }}>
                        {st.lateCount}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, background: '#f1f5f9', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(100, st.attendanceRate)}%`,
                                height: '100%',
                                background: rateColor,
                                borderRadius: 4
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: rateColor, minWidth: 42 }}>
                            {st.attendanceRate}%
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span 
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: st.attendanceRate >= 90 ? '#ecfdf5' : st.attendanceRate >= 75 ? '#fef3c7' : '#fef2f2',
                            color: st.attendanceRate >= 90 ? '#047857' : st.attendanceRate >= 75 ? '#b45309' : '#b91c1c',
                            border: `1px solid ${st.attendanceRate >= 90 ? '#a7f3d0' : st.attendanceRate >= 75 ? '#fde68a' : '#fecaca'}`
                          }}
                        >
                          {st.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {st.parentPhone ? (
                          <a
                            href={`tel:${st.parentPhone}`}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              background: '#f0f9ff',
                              color: '#0369a1',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <i className="fas fa-phone-alt" style={{ fontSize: '0.7rem' }} />
                            {st.parentPhone}
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
