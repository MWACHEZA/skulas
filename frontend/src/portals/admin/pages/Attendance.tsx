import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';
import { SearchInput, ExportButton } from '../../../components/shared';
import '../../../styles/portal.css';

type AudienceType = 'students' | 'staff';

export default function AdminAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTerminology();
  const { showToast } = useToast();

  const audience = ((searchParams.get('tab') || searchParams.get('audience')) as AudienceType) || 'students';
  const initialStatus = searchParams.get('status') || 'ALL';
  const initialSearch = searchParams.get('studentId') || searchParams.get('search') || '';

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const [studentLogs, setStudentLogs] = useState<any[]>([]);
  const [staffLogs, setStaffLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, [audience, selectedDate]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      if (audience === 'students') {
        const { data } = await api.get(`/api/attendance/student-clock-ins?date=${selectedDate}`);
        setStudentLogs(Array.isArray(data) ? data : data.records || []);
      } else {
        const { data } = await api.get(`/api/staff-attendance/all?date=${selectedDate}`);
        setStaffLogs(Array.isArray(data) ? data : data.records || []);
      }
    } catch (err: any) {
      console.error('Failed to load attendance:', err);
      if (audience === 'students') setStudentLogs([]);
      else setStaffLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAudienceChange = (aud: AudienceType) => {
    setSearchParams({ tab: aud });
  };

  // Filter lists
  const filteredStudents = studentLogs.filter(s => {
    const sName = s.student?.name || s.name || '';
    const sId = s.student?.studentId || s.studentId || '';
    const matchesSearch = sName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (s.status || 'PRESENT').toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  const filteredStaff = staffLogs.filter(st => {
    const stName = st.staff?.name || st.name || '';
    const stEmail = st.staff?.email || st.email || '';
    const matchesSearch = stName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          stEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (st.status || 'FULL DAY').toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  const exportData: Record<string, any>[] =
    audience === 'students'
      ? filteredStudents.map(s => ({
          studentId: s.student?.studentId || s.studentId || '—',
          name: s.student?.name || s.name || 'Student',
          class: s.student?.class || s.class || 'N/A',
          direction: s.direction || 'IN (Gate)',
          time: s.time || s.timeIn || '07:45 AM',
          status: s.status || 'Present',
          date: selectedDate
        }))
      : filteredStaff.map(st => ({
          name: st.staff?.name || st.name || 'Staff Member',
          email: st.staff?.email || st.email || '—',
          role: st.staff?.role || 'Staff',
          timeIn: st.timeIn ? new Date(st.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
          timeOut: st.timeOut ? new Date(st.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
          hours: st.hoursPresent || '—',
          status: st.status || 'FULL DAY',
          date: selectedDate
        }));

  const totalCount = audience === 'students' ? studentLogs.length : staffLogs.length;
  const absentCount = audience === 'students' 
    ? studentLogs.filter(s => (s.status || '').toUpperCase() === 'ABSENT').length 
    : staffLogs.filter(s => (s.status || '').toUpperCase() === 'ABSENT').length;
  const presentCount = totalCount - absentCount;
  const attendanceRate = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : '100.0';

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Attendance & Clock-In Tracking</h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            Unified institutional presence desk for {t('students')} and staff members.
          </p>
        </div>
      </div>

      {/* Top-Level Audience Switcher */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => handleAudienceChange('students')}
          className={audience === 'students' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '10px 24px', fontWeight: 800, fontSize: '0.95rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-user-graduate"></i>
          {t('students')} Attendance
        </button>
        <button
          onClick={() => handleAudienceChange('staff')}
          className={audience === 'staff' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '10px 24px', fontWeight: 800, fontSize: '0.95rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-chalkboard-teacher"></i>
          Staff Clock-In Logs
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Present on Date</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#2563eb', margin: '4px 0' }}>{presentCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Verified attendance entries</div>
        </div>
        <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Absent Count</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: absentCount > 0 ? '#ef4444' : '#10b981', margin: '4px 0' }}>{absentCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Flagged as not present</div>
        </div>
        <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Overall Presence Rate</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669', margin: '4px 0' }}>{attendanceRate}%</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Target: 95.0%+</div>
        </div>
      </div>

      {/* Date & Filter Toolbar */}
      <div className="portal-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Date:</label>
              <input
                type="date"
                className="portal-input"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ width: 170 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Status:</label>
              <select
                className="portal-input"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ width: 140 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ minWidth: 260 }}>
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={`Search ${audience === 'students' ? t('students') : 'staff'}...`}
              />
            </div>
            <ExportButton
              data={exportData}
              columns={audience === 'students' ? [
                { header: 'Student ID', key: 'studentId', width: 18 },
                { header: 'Student Name', key: 'name', width: 25 },
                { header: 'Class / Form', key: 'class', width: 16 },
                { header: 'Direction', key: 'direction', width: 16 },
                { header: 'Time', key: 'time', width: 16 },
                { header: 'Status', key: 'status', width: 14 },
                { header: 'Date', key: 'date', width: 14 }
              ] : [
                { header: 'Staff Name', key: 'name', width: 25 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Role', key: 'role', width: 18 },
                { header: 'Time In', key: 'timeIn', width: 15 },
                { header: 'Time Out', key: 'timeOut', width: 15 },
                { header: 'Hours', key: 'hours', width: 12 },
                { header: 'Status', key: 'status', width: 14 },
                { header: 'Date', key: 'date', width: 14 }
              ]}
              filename={`${audience}-attendance-${selectedDate}`}
              title={`${audience === 'students' ? 'Student Attendance Register' : 'Staff Clock-In Log'} - ${selectedDate}`}
              subtitle={`Attendance Rate: ${attendanceRate}% | Total: ${totalCount} | Present: ${presentCount} | Absent: ${absentCount}`}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="portal-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#2563eb', marginBottom: 12 }}></i>
            <p>Loading attendance register...</p>
          </div>
        ) : (
          <div className="portal-card-body portal-card-body-flat">
            {audience === 'students' ? (
              filteredStudents.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  No student attendance records found for {selectedDate}.
                </div>
              ) : (
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Direction / Event</th>
                      <th>Check-in Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((log, idx) => (
                      <tr key={log.id || idx}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.student?.studentId || log.studentId || '—'}</td>
                        <td><strong>{log.student?.name || log.name || 'Student'}</strong></td>
                        <td>{log.student?.class || log.class || 'Form'}</td>
                        <td>
                          <span className={`portal-badge ${log.direction === 'OUT' ? 'warning' : 'info'}`}>
                            {log.direction || 'IN (Gate)'}
                          </span>
                        </td>
                        <td style={{ color: '#64748b' }}>{log.time || log.timeIn || '07:45 AM'}</td>
                        <td>
                          <span className={`portal-badge ${(log.status || 'PRESENT').toUpperCase() === 'ABSENT' ? 'danger' : 'success'}`}>
                            {log.status || 'Present'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              filteredStaff.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  No staff clock-in records found for {selectedDate}.
                </div>
              ) : (
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Role</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Hours Logged</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((log, idx) => (
                      <tr key={log.id || idx}>
                        <td>
                          <strong>{log.staff?.name || log.name || 'Staff Member'}</strong>
                          <br /><span style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.staff?.email}</span>
                        </td>
                        <td><span className="portal-badge neutral">{log.staff?.role || 'Teacher'}</span></td>
                        <td style={{ color: '#059669', fontWeight: 600 }}>{log.timeIn ? new Date(log.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td style={{ color: '#d97706', fontWeight: 600 }}>{log.timeOut ? new Date(log.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Still on duty'}</td>
                        <td>{log.hoursPresent || '—'}</td>
                        <td>
                          <span className={`portal-badge ${log.status === 'ABSENT' ? 'danger' : log.status === 'ON LEAVE' ? 'warning' : 'success'}`}>
                            {log.status || 'FULL DAY'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        )}
      </div>
    </>
  );
}
