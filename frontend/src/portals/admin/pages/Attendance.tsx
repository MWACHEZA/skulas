import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';
import { ExportButton } from '../../../components/shared';
import '../../../styles/portal.css';

type AttendanceTab = 'daily-roll-call' | 'period' | 'boarding' | 'absentee-report' | 'sms-log';

interface StudentRosterItem {
  studentId: string;
  student?: {
    id: string;
    studentId: string;
    name: string;
    gender: string;
    status: string;
  };
  status: string;
  notes?: string;
}

export default function AdminAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useTerminology();
  const { showToast } = useToast();

  // Modular Tenancy: Boarding toggle check
  const schoolModules = (user as any)?.school?.subscription?.modules || {};
  const isBoardingEnabled = schoolModules.boarding !== false;

  const currentTab = (searchParams.get('tab') as AttendanceTab) || 'daily-roll-call';

  // State
  const [classes, setClasses] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedHostel, setSelectedHostel] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Homeroom');
  const [boardingTimeSlot, setBoardingTimeSlot] = useState<string>('18:00');
  
  // Daily & Period roster
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionSubmitted, setSessionSubmitted] = useState(false);
  const [lastSaveSummary, setLastSaveSummary] = useState<any | null>(null);

  // Absentee Report State
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [threshold, setThreshold] = useState<number>(80);
  const [absenteeReport, setAbsenteeReport] = useState<any | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // SMS Log State
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [loadingSms, setLoadingSms] = useState(false);

  // Stats State
  const [overviewStats, setOverviewStats] = useState<any | null>(null);

  // Handle Tab Switch
  const handleTabChange = (tab: AttendanceTab) => {
    if (tab === 'boarding' && !isBoardingEnabled) return;
    setSearchParams({ tab });
  };

  // Initial Fetch of Classes & Hostels
  useEffect(() => {
    fetchClasses();
    if (isBoardingEnabled) {
      fetchHostels();
    }
    fetchOverviewStats();
  }, [isBoardingEnabled]);

  // Load Tab-specific data
  useEffect(() => {
    if (currentTab === 'daily-roll-call') {
      fetchSession('daily', selectedClass, selectedDate, 'Homeroom');
    } else if (currentTab === 'period') {
      fetchSession('period', selectedClass, selectedDate, selectedPeriod);
    } else if (currentTab === 'boarding' && isBoardingEnabled) {
      fetchBoardingSession();
    } else if (currentTab === 'absentee-report') {
      fetchAbsenteeReport();
    } else if (currentTab === 'sms-log') {
      fetchSmsLogs();
    }
  }, [currentTab, selectedClass, selectedDate, selectedPeriod, boardingTimeSlot, selectedHostel]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      const list = res.data?.data || res.data || [];
      setClasses(list);
      if (list.length > 0 && !selectedClass) {
        setSelectedClass(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const fetchHostels = async () => {
    try {
      const res = await api.get('/api/hostels');
      const list = res.data || [];
      setHostels(list);
      if (list.length > 0 && !selectedHostel) {
        setSelectedHostel(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load hostels:', err);
    }
  };

  const fetchOverviewStats = async () => {
    try {
      const res = await api.get(`/api/attendance/stats?date=${selectedDate}`);
      setOverviewStats(res.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchSession = async (type: string, classId: string, date: string, period: string) => {
    if (!classId) return;
    setLoadingRoster(true);
    try {
      const res = await api.get(`/api/attendance/sessions?type=${type}&classId=${classId}&date=${date}&period=${period}`);
      const sessionData = res.data?.session;
      if (sessionData) {
        setSessionSubmitted(sessionData.submitted || false);
        setRoster(sessionData.records || []);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      showToast('Failed to load attendance session', 'error');
    } finally {
      setLoadingRoster(false);
    }
  };

  const fetchBoardingSession = async () => {
    setLoadingRoster(true);
    try {
      const res = await api.get(`/api/attendance/sessions?type=boarding&date=${selectedDate}&period=Boarding_${boardingTimeSlot.replace(':', '_')}`);
      const sessionData = res.data?.session;
      if (sessionData) {
        setSessionSubmitted(sessionData.submitted || false);
        setRoster(sessionData.records || []);
      }
    } catch (err) {
      console.error('Failed to load boarding session:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  const fetchAbsenteeReport = async () => {
    setLoadingReport(true);
    try {
      const res = await api.get(`/api/attendance/absentee-report?startDate=${startDate}&endDate=${endDate}&threshold=${threshold}${selectedClass ? `&classId=${selectedClass}` : ''}`);
      setAbsenteeReport(res.data);
    } catch (err) {
      console.error('Failed to load absentee report:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const fetchSmsLogs = async () => {
    setLoadingSms(true);
    try {
      const res = await api.get('/api/attendance/sms-log');
      setSmsLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load SMS logs:', err);
    } finally {
      setLoadingSms(false);
    }
  };

  // Status Change for a Student
  const handleStatusChange = (studentId: string, status: string) => {
    setRoster(prev =>
      prev.map(item => (item.studentId === studentId ? { ...item, status } : item))
    );
  };

  // Notes Change for a Student
  const handleNotesChange = (studentId: string, notes: string) => {
    setRoster(prev =>
      prev.map(item => (item.studentId === studentId ? { ...item, notes } : item))
    );
  };

  // Quick Action: Mark All Present
  const handleMarkAllPresent = () => {
    setRoster(prev => prev.map(item => ({ ...item, status: 'present' })));
    showToast('All students marked as Present', 'info');
  };

  // Save Session
  const handleSaveSession = async () => {
    if (roster.length === 0) return;
    setSavingSession(true);
    try {
      const type = currentTab === 'boarding' ? 'boarding' : currentTab === 'period' ? 'period' : 'daily';
      const period =
        type === 'boarding'
          ? `Boarding_${boardingTimeSlot.replace(':', '_')}`
          : type === 'period'
          ? selectedPeriod
          : 'Homeroom';

      const payload = {
        date: selectedDate,
        classId: type === 'boarding' ? null : selectedClass,
        period,
        type,
        records: roster.map(r => ({
          studentId: r.studentId,
          status: r.status,
          notes: r.notes || ''
        }))
      };

      const res = await api.post('/api/attendance/sessions/save', payload);
      setLastSaveSummary(res.data);
      setSessionSubmitted(true);
      showToast('Attendance session successfully recorded and posted!', 'success');
      fetchOverviewStats();
    } catch (err: any) {
      console.error('Failed to save attendance session:', err);
      showToast(err.response?.data?.error || 'Failed to save attendance session', 'error');
    } finally {
      setSavingSession(false);
    }
  };

  // Derived counts for current session
  const totalStudents = roster.length;
  const presentCount = roster.filter(r => (r.status || '').toLowerCase() === 'present').length;
  const absentCount = roster.filter(r => (r.status || '').toLowerCase() === 'absent').length;
  const lateCount = roster.filter(r => (r.status || '').toLowerCase() === 'late').length;
  const presenceRate = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : '100.0';

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            <i className="fas fa-user-check" style={{ marginRight: 12, color: '#2563eb' }}></i>
            Student Attendance Management
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Unified attendance desk with automatic parent SMS notifications, welfare chronic-absence tracking, and period roll call.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a
            href="/admin/attendance/staff"
            className="portal-btn-ghost"
            style={{ padding: '8px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className="fas fa-id-badge" style={{ color: '#6366f1' }}></i>
            Staff Attendance & Biometrics
          </a>
        </div>
      </div>

      {/* Overview Metric Bar */}
      {overviewStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Enrollment</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{overviewStats.totalStudents}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Students on institutional register</div>
          </div>
          <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Today's Present Rate</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669', margin: '4px 0' }}>{overviewStats.attendanceRate}%</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{overviewStats.presentCount} marked present today</div>
          </div>
          <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Unexcused Absences</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#dc2626', margin: '4px 0' }}>{overviewStats.absentCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Alerts queued for parent SMS</div>
          </div>
          <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Late Arrivals</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d97706', margin: '4px 0' }}>{overviewStats.lateCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Logged via morning gate / homeroom</div>
          </div>
        </div>
      )}

      {/* Canonical Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => handleTabChange('daily-roll-call')}
          className={currentTab === 'daily-roll-call' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-clipboard-check"></i>
          Daily Roll Call
        </button>

        <button
          onClick={() => handleTabChange('period')}
          className={currentTab === 'period' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-clock"></i>
          Period Attendance
        </button>

        {/* Boarding Roll Call: Conditionally rendered based on Modular Tenancy */}
        {isBoardingEnabled && (
          <button
            onClick={() => handleTabChange('boarding')}
            className={currentTab === 'boarding' ? 'portal-btn-primary' : 'portal-btn-ghost'}
            style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className="fas fa-bed"></i>
            Boarding Roll Call
          </button>
        )}

        <button
          onClick={() => handleTabChange('absentee-report')}
          className={currentTab === 'absentee-report' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-chart-line"></i>
          Absentee Report
        </button>

        <button
          onClick={() => handleTabChange('sms-log')}
          className={currentTab === 'sms-log' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-sms"></i>
          SMS Notification Log
        </button>
      </div>

      {/* Auto-Notification & Welfare Alerts Banner */}
      {lastSaveSummary && (
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-paper-plane"></i>
              Attendance Sync & Automatic Parent Dispatch Complete
            </div>
            <div style={{ color: '#3b82f6', fontSize: '0.85rem', marginTop: 4 }}>
              Dispatched <strong>{lastSaveSummary.smsDispatchedCount || 0}</strong> parent SMS notifications. Flagged <strong>{lastSaveSummary.disciplineCasesCreated || 0}</strong> welfare truancy cases (3+ consecutive absences).
            </div>
          </div>
          <button onClick={() => setLastSaveSummary(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.2rem' }}>
            &times;
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 1 & 2: Daily Roll Call & Period Attendance
         ────────────────────────────────────────────────────────────────────────── */}
      {(currentTab === 'daily-roll-call' || currentTab === 'period') && (
        <div className="portal-card" style={{ padding: 24 }}>
          {/* Controls Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Class / Form:</label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600, minWidth: 160 }}
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Roll Call Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600 }}
                />
              </div>

              {currentTab === 'period' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Timetable Period:</label>
                  <select
                    value={selectedPeriod}
                    onChange={e => setSelectedPeriod(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600 }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                      <option key={p} value={`Period_${p}`}>Period {p}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="portal-btn-ghost"
                style={{ padding: '8px 16px', fontWeight: 700, borderRadius: 8, border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className="fas fa-check-double" style={{ color: '#10b981' }}></i>
                Mark All Present
              </button>

              <button
                type="button"
                onClick={handleSaveSession}
                disabled={savingSession || roster.length === 0}
                className="portal-btn-primary"
                style={{ padding: '10px 24px', fontWeight: 800, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {savingSession ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i> Save Roll Call
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar for this Session */}
          <div style={{ display: 'flex', gap: 20, padding: '12px 18px', backgroundColor: '#f8fafc', borderRadius: 10, marginBottom: 20, alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#475569' }}>
              Roster: <strong>{totalStudents}</strong>
            </span>
            <span style={{ fontSize: '0.85rem', color: '#059669' }}>
              Present: <strong>{presentCount}</strong>
            </span>
            <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>
              Absent: <strong>{absentCount}</strong>
            </span>
            <span style={{ fontSize: '0.85rem', color: '#d97706' }}>
              Late: <strong>{lateCount}</strong>
            </span>
            <span style={{ fontSize: '0.85rem', color: '#2563eb', marginLeft: 'auto', fontWeight: 700 }}>
              Presence Rate: {presenceRate}%
            </span>
          </div>

          {/* Roster Table */}
          {loadingRoster ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <div style={{ marginTop: 12 }}>Loading class roster...</div>
            </div>
          ) : roster.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <i className="fas fa-users-slash fa-3x" style={{ marginBottom: 12 }}></i>
              <div>No students found in the selected class.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>Student Details</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>Status Fast-Toggle</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>Notes / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map(item => {
                    const status = (item.status || 'present').toLowerCase();
                    return (
                      <tr key={item.studentId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.student?.name || 'Student'}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ID: {item.student?.studentId || item.studentId}</div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {[
                              { id: 'present', label: 'Present', color: '#10b981', bg: '#ecfdf5' },
                              { id: 'absent', label: 'Absent', color: '#ef4444', bg: '#fef2f2' },
                              { id: 'late', label: 'Late', color: '#f59e0b', bg: '#fffbeb' },
                              { id: 'sick_bay', label: 'Sick Bay', color: '#8b5cf6', bg: '#f5f3ff' },
                              { id: 'on_exeat', label: 'On Exeat', color: '#0284c7', bg: '#f0f9ff' },
                              { id: 'suspended', label: 'Suspended', color: '#475569', bg: '#f1f5f9' }
                            ].map(btn => {
                              const active = status === btn.id;
                              return (
                                <button
                                  key={btn.id}
                                  type="button"
                                  onClick={() => handleStatusChange(item.studentId, btn.id)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    fontSize: '0.8rem',
                                    fontWeight: active ? 800 : 600,
                                    border: active ? `2px solid ${btn.color}` : '1px solid #e2e8f0',
                                    backgroundColor: active ? btn.bg : '#ffffff',
                                    color: active ? btn.color : '#64748b',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {btn.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <input
                            type="text"
                            placeholder="Optional note..."
                            value={item.notes || ''}
                            onChange={e => handleNotesChange(item.studentId, e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 3: Boarding Roll Call
         ────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'boarding' && isBoardingEnabled && (
        <div className="portal-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Hostel Dormitory:</label>
                <select
                  value={selectedHostel}
                  onChange={e => setSelectedHostel(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600, minWidth: 160 }}
                >
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Roll Call Time:</label>
                <select
                  value={boardingTimeSlot}
                  onChange={e => setBoardingTimeSlot(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600 }}
                >
                  <option value="18:00">18:00 (Dinner / Evening Roll Call)</option>
                  <option value="21:00">21:00 (Bedtime / Night Lights-Out)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="portal-btn-ghost"
                style={{ padding: '8px 16px', fontWeight: 700, borderRadius: 8, border: '1px solid #cbd5e1' }}
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={handleSaveSession}
                disabled={savingSession || roster.length === 0}
                className="portal-btn-primary"
                style={{ padding: '10px 24px', fontWeight: 800, borderRadius: 8 }}
              >
                {savingSession ? 'Saving...' : 'Save Boarding Roll Call'}
              </button>
            </div>
          </div>

          {/* Roster */}
          {loadingRoster ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <div style={{ marginTop: 12 }}>Loading boarding roster...</div>
            </div>
          ) : roster.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <i className="fas fa-bed fa-3x" style={{ marginBottom: 12 }}></i>
              <div>No boarders allocated to this hostel.</div>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Boarder Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Attendance Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Housemaster Notes</th>
                </tr>
              </thead>
              <tbody>
                {roster.map(item => {
                  const status = (item.status || 'present').toLowerCase();
                  return (
                    <tr key={item.studentId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700 }}>{item.student?.name || 'Boarder'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ID: {item.student?.studentId || item.studentId}</div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'center' }}>
                          {[
                            { id: 'present', label: 'Present', color: '#10b981' },
                            { id: 'absent', label: 'Absent', color: '#ef4444' },
                            { id: 'on_exeat', label: 'On Exeat', color: '#0284c7' },
                            { id: 'sick_bay', label: 'Sick Bay', color: '#8b5cf6' }
                          ].map(b => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => handleStatusChange(item.studentId, b.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                fontSize: '0.8rem',
                                fontWeight: status === b.id ? 800 : 600,
                                border: status === b.id ? `2px solid ${b.color}` : '1px solid #e2e8f0',
                                backgroundColor: status === b.id ? '#f8fafc' : '#ffffff',
                                color: status === b.id ? b.color : '#64748b',
                                cursor: 'pointer'
                              }}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <input
                          type="text"
                          placeholder="Hostel notes..."
                          value={item.notes || ''}
                          onChange={e => handleNotesChange(item.studentId, e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 4: Absentee Report & Chronic Truancy
         ────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'absentee-report' && (
        <div>
          <div className="portal-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>From Date:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>To Date:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Class Filter:</label>
                  <select
                    value={selectedClass}
                    onChange={e => setSelectedClass(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    <option value="">All Classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Report Card Threshold (%):</label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={e => setThreshold(parseFloat(e.target.value) || 80)}
                    style={{ width: 80, padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={fetchAbsenteeReport}
                  className="portal-btn-primary"
                  style={{ padding: '8px 18px', fontWeight: 700, borderRadius: 6 }}
                >
                  <i className="fas fa-filter" style={{ marginRight: 6 }}></i>
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          {loadingReport ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <div style={{ marginTop: 12 }}>Generating Absentee Report...</div>
            </div>
          ) : absenteeReport ? (
            <>
              {/* Summary Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Evaluated Students</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{absenteeReport.summary?.totalEvaluated || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Students evaluated in range</div>
                </div>
                <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Chronic Absentees</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#dc2626', margin: '4px 0' }}>{absenteeReport.summary?.chronicAbsentees || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Below {threshold}% attendance rate</div>
                </div>
                <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Group Average Rate</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669', margin: '4px 0' }}>{absenteeReport.summary?.averageRate || 0}%</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Benchmark presence target: 90%+</div>
                </div>
              </div>

              {/* Absentee Records Table */}
              <div className="portal-card" style={{ padding: 24 }}>
                <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Student</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Class</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Sessions</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Absent</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Attendance %</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Chronic Flag</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Welfare Cases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(absenteeReport.students || []).map((s: any) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700 }}>{s.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.studentId}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{s.className}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{s.totalSessions}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: s.absentCount > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>{s.absentCount}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: s.rate < threshold ? '#dc2626' : '#059669' }}>
                          {s.rate}%
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {s.isChronic ? (
                            <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                              <i className="fas fa-exclamation-triangle" style={{ marginRight: 4 }}></i>
                              CHRONIC
                            </span>
                          ) : (
                            <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                              SATISFACTORY
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {s.welfareCases > 0 ? (
                            <span style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                              {s.welfareCases} Case(s)
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 5: SMS Notification Log
         ────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'sms-log' && (
        <div className="portal-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-sms" style={{ marginRight: 8, color: '#2563eb' }}></i>
              Automated Absence SMS History
            </h3>
            <button
              onClick={fetchSmsLogs}
              className="portal-btn-ghost"
              style={{ padding: '6px 14px', borderRadius: 6, fontWeight: 700, border: '1px solid #cbd5e1' }}
            >
              <i className="fas fa-sync" style={{ marginRight: 6 }}></i>
              Refresh
            </button>
          </div>

          {loadingSms ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <div style={{ marginTop: 12 }}>Loading SMS dispatch logs...</div>
            </div>
          ) : smsLogs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              <i className="fas fa-inbox fa-3x" style={{ marginBottom: 12 }}></i>
              <div>No attendance absence SMS messages dispatched yet.</div>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Date & Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Channel</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {smsLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {log.description}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                        SMS
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                        {log.status || 'SENT'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
