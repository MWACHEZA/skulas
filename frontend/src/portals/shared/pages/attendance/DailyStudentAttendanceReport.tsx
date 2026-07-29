import React, { useState, useEffect } from 'react';
import { useTerminology } from '../../../../hooks/useTerminology';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';

interface StudentReport {
  studentId: string;
  name: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: string;
}

export default function DailyStudentAttendanceReport() {
  const { t } = useTerminology();
  const { showToast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [reportData, setReportData] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/classes').then(res => setClasses(res.data)).catch(console.error);
  }, []);

  const handleSearch = async () => {
    if (!selectedClass || !selectedMonth) {
      showToast('Please select class and month', 'error');
      return;
    }
    setLoading(true);
    try {
      // Build date range for selected month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // last day of month

      // Fetch all attendance records for this class in the month range
      // We page through all results
      const allRecords: any[] = [];
      let page = 1;
      const limit = 200;
      while (true) {
        // Fetch day by day is too slow; fetch all in one shot using date range
        // The API takes a single date — we'll get aggregate data by fetching multiple days
        // For performance we fetch all attendance for the class in the month
        const res = await api.get('/api/attendance', {
          params: {
            classId: selectedClass,
            // Use startDate as date param — backend filters by single day
            // We need a range: we'll iterate over each day
            date: startDate.toISOString().split('T')[0],
            page,
            limit
          }
        });
        allRecords.push(...(res.data.data || []));
        if (allRecords.length >= res.data.total || res.data.data?.length < limit) break;
        page++;
      }

      // Since the API only supports single-date queries, fetch all dates in the month
      const days: string[] = [];
      const cur = new Date(startDate);
      while (cur <= endDate) {
        days.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }

      // Fetch attendance for all days in parallel (batched)
      const BATCH = 5;
      const dayRecords: any[] = [];
      for (let i = 0; i < days.length; i += BATCH) {
        const batch = days.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(d => api.get('/api/attendance', { params: { classId: selectedClass, date: d, limit: 200 } }).catch(() => ({ data: { data: [] } })))
        );
        results.forEach(r => dayRecords.push(...(r.data.data || [])));
      }

      // Aggregate by student
      const studentMap: Record<string, StudentReport> = {};
      dayRecords.forEach((rec: any) => {
        const sid = rec.studentId;
        const name = rec.student?.user?.name || rec.student?.name || 'Unknown';
        if (!studentMap[sid]) {
          studentMap[sid] = { studentId: sid, name, present: 0, absent: 0, late: 0, total: 0, percentage: '0%' };
        }
        studentMap[sid].total++;
        if (rec.status === 'Present') studentMap[sid].present++;
        else if (rec.status === 'Absent') studentMap[sid].absent++;
        else if (rec.status === 'Late') { studentMap[sid].late++; studentMap[sid].present++; }
      });

      const report = Object.values(studentMap).map(s => ({
        ...s,
        percentage: s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) + '%' : '0%'
      })).sort((a, b) => a.name.localeCompare(b.name));

      if (report.length === 0) {
        showToast('No attendance records found for selected period', 'info');
      }
      setReportData(report);
    } catch (error) {
      showToast('Failed to fetch attendance report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (reportData.length === 0) return showToast('No data to export', 'warning');
    const headers = ['Student Name', 'Present', 'Absent', 'Late', 'Total Days', 'Attendance %'];
    const rows = reportData.map(s => [s.name, String(s.present), String(s.absent), String(s.late), String(s.total), s.percentage]);
    const content = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Report exported successfully', 'success');
  };

  return (
    <>
      <div className="portal-page-header">
        <div>
          <h1>Daily Student Attendance Report</h1>
          <p>Monthly attendance summary by {t('class')} — showing total Present, Absent, Late and overall attendance percentage.</p>
        </div>
        {reportData.length > 0 && (
          <button className="portal-btn-secondary" onClick={exportCSV} style={{ whiteSpace: 'nowrap' }}>
            <i className="fas fa-download" style={{ marginRight: 8 }}></i>Export CSV
          </button>
        )}
      </div>

      <div className="portal-card" style={{ marginBottom: 20 }}>
        <div className="portal-card-header">
          <h2><i className="fas fa-filter"></i> Select Criteria</h2>
        </div>
        <div className="portal-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 15, alignItems: 'end' }}>
            <div className="portal-form-group">
              <label>Select {t('class')} *</label>
              <select className="portal-input" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                <option value="">Select</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="portal-form-group">
              <label>Select Month *</label>
              <input type="month" className="portal-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
            </div>
            <div className="portal-form-group">
              <button className="portal-btn-primary" onClick={handleSearch} disabled={loading}>
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-search'}`} style={{ marginRight: 8 }}></i>
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="portal-card" style={{ textAlign: 'center', padding: 40 }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--portal-primary)', marginBottom: 12 }}></i>
          <p style={{ color: '#718096' }}>Fetching attendance data for all days in the month...</p>
        </div>
      )}

      {!loading && reportData.length > 0 && (
        <>
          <div className="portal-stats-grid" style={{ marginBottom: 20 }}>
            <div className="portal-stat-card">
              <div className="portal-stat-icon blue"><i className="fas fa-users"></i></div>
              <div className="portal-stat-info"><h3>{reportData.length}</h3><p>Total {t('students')}</p></div>
            </div>
            <div className="portal-stat-card">
              <div className="portal-stat-icon green"><i className="fas fa-check-circle"></i></div>
              <div className="portal-stat-info">
                <h3>{reportData.filter(s => parseFloat(s.percentage) >= 90).length}</h3>
                <p>Above 90% Attendance</p>
              </div>
            </div>
            <div className="portal-stat-card">
              <div className="portal-stat-icon orange"><i className="fas fa-exclamation-triangle"></i></div>
              <div className="portal-stat-info">
                <h3>{reportData.filter(s => parseFloat(s.percentage) < 75).length}</h3>
                <p>Below 75% (At Risk)</p>
              </div>
            </div>
            <div className="portal-stat-card">
              <div className="portal-stat-icon purple"><i className="fas fa-chart-line"></i></div>
              <div className="portal-stat-info">
                <h3>{reportData.length > 0 ? (reportData.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / reportData.length).toFixed(1) + '%' : '0%'}</h3>
                <p>Class Average</p>
              </div>
            </div>
          </div>

          <div className="portal-card">
            <div className="portal-card-header">
              <h2><i className="fas fa-table" style={{ marginRight: 8 }}></i>Attendance Summary</h2>
              <span className="portal-badge info">{reportData.length} {t('students')}</span>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th style={{ textAlign: 'center' }}>Present</th>
                    <th style={{ textAlign: 'center' }}>Absent</th>
                    <th style={{ textAlign: 'center' }}>Late</th>
                    <th style={{ textAlign: 'center' }}>Total Days</th>
                    <th style={{ textAlign: 'center' }}>Attendance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((s, i) => {
                    const pct = parseFloat(s.percentage);
                    const status = pct >= 90 ? 'Excellent' : pct >= 75 ? 'Good' : pct >= 50 ? 'At Risk' : 'Critical';
                    const statusColor = pct >= 90 ? 'success' : pct >= 75 ? 'info' : pct >= 50 ? 'warning' : 'danger';
                    return (
                      <tr key={s.studentId}>
                        <td style={{ color: '#a0aec0' }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ textAlign: 'center', color: '#059669', fontWeight: 700 }}>{s.present}</td>
                        <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>{s.absent}</td>
                        <td style={{ textAlign: 'center', color: '#d97706', fontWeight: 700 }}>{s.late}</td>
                        <td style={{ textAlign: 'center' }}>{s.total}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 8, minWidth: 60 }}>
                              <div style={{ width: s.percentage, height: '100%', borderRadius: 4, background: pct >= 90 ? '#059669' : pct >= 75 ? '#2563eb' : pct >= 50 ? '#d97706' : '#dc2626' }} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{s.percentage}</span>
                          </div>
                        </td>
                        <td><span className={`portal-badge ${statusColor}`}>{status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && reportData.length === 0 && selectedClass && selectedMonth && (
        <div className="portal-card" style={{ textAlign: 'center', padding: 60 }}>
          <i className="fas fa-chart-bar fa-3x" style={{ color: '#e2e8f0', marginBottom: 16 }}></i>
          <h3>No attendance records found</h3>
          <p style={{ color: '#718096' }}>No attendance data was recorded for this class in {selectedMonth}.</p>
        </div>
      )}
    </>
  );
}
