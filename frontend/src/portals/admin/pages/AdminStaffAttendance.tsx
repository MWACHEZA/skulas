import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

type StaffTab = 'daily-summary' | 'late-comers' | 'raw-logs' | 'leave-cross-check';

export default function AdminStaffAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const currentTab = (searchParams.get('tab') as StaffTab) || 'daily-summary';

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Daily Summary State
  const [dailyData, setDailyData] = useState<{ records: any[]; stats: any } | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [processingPunches, setProcessingPunches] = useState(false);

  // Late Comers State
  const [lateComersData, setLateComersData] = useState<{ lateComers: any[]; totalLate: number; flaggedOver30Mins: number } | null>(null);
  const [loadingLate, setLoadingLate] = useState(false);

  // Raw Device Logs State
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [loadingRaw, setLoadingRaw] = useState(false);
  const [filterDeviceId, setFilterDeviceId] = useState<string>('');

  // Punch Simulator Form
  const [simStaffId, setSimStaffId] = useState<string>('');
  const [simDeviceId, setSimDeviceId] = useState<string>('BIO-GATE-MAIN');
  const [simPunchType, setSimPunchType] = useState<string>('CHECK_IN');
  const [simPunchTime, setSimPunchTime] = useState<string>('07:50');
  const [submittingPunch, setSubmittingPunch] = useState(false);

  // Leave Cross-Check State
  const [leaveData, setLeaveData] = useState<{ absentStaff: any[]; totalAbsent: number; approvedLeaveCount: number; unauthorizedAbsenceCount: number } | null>(null);
  const [loadingLeave, setLoadingLeave] = useState(false);

  // Staff list for simulator dropdown
  const [staffUsers, setStaffUsers] = useState<any[]>([]);

  const handleTabChange = (tab: StaffTab) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  useEffect(() => {
    if (currentTab === 'daily-summary') {
      fetchDailySummary();
    } else if (currentTab === 'late-comers') {
      fetchLateComers();
    } else if (currentTab === 'raw-logs') {
      fetchRawLogs();
    } else if (currentTab === 'leave-cross-check') {
      fetchLeaveCrossCheck();
    }
  }, [currentTab, selectedDate, filterDeviceId]);

  const fetchStaffList = async () => {
    try {
      const res = await api.get('/api/staff-attendance/all');
      const list = res.data || [];
      const users = list.map((l: any) => l.staff).filter(Boolean);
      setStaffUsers(users);
      if (users.length > 0 && !simStaffId) {
        setSimStaffId(users[0].id);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  };

  const fetchDailySummary = async () => {
    setLoadingDaily(true);
    try {
      const res = await api.get(`/api/staff-attendance/daily-summary?date=${selectedDate}`);
      setDailyData(res.data);
    } catch (err) {
      console.error('Failed to load daily summary:', err);
    } finally {
      setLoadingDaily(false);
    }
  };

  const fetchLateComers = async () => {
    setLoadingLate(true);
    try {
      const res = await api.get(`/api/staff-attendance/late-comers?date=${selectedDate}`);
      setLateComersData(res.data);
    } catch (err) {
      console.error('Failed to load late comers:', err);
    } finally {
      setLoadingLate(false);
    }
  };

  const fetchRawLogs = async () => {
    setLoadingRaw(true);
    try {
      const res = await api.get(`/api/staff-attendance/raw-logs?date=${selectedDate}${filterDeviceId ? `&deviceId=${filterDeviceId}` : ''}`);
      setRawLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load raw logs:', err);
    } finally {
      setLoadingRaw(false);
    }
  };

  const fetchLeaveCrossCheck = async () => {
    setLoadingLeave(true);
    try {
      const res = await api.get(`/api/staff-attendance/leave-cross-check?date=${selectedDate}`);
      setLeaveData(res.data);
    } catch (err) {
      console.error('Failed to load leave cross-check:', err);
    } finally {
      setLoadingLeave(false);
    }
  };

  // Run Punch Processing Job on demand
  const handleProcessPunches = async () => {
    setProcessingPunches(true);
    try {
      const res = await api.post('/api/staff-attendance/process-punches', { date: selectedDate });
      showToast(`Punch conversion complete! Processed: ${res.data.processedCount || 0}, Flagged Tardiness: ${res.data.flaggedTardinessCount || 0}, Unauthorized Absences: ${res.data.unauthorizedAbsencesCount || 0}`, 'success');
      fetchDailySummary();
    } catch (err) {
      console.error('Failed to process punches:', err);
      showToast('Failed to process biometric punches', 'error');
    } finally {
      setProcessingPunches(false);
    }
  };

  // Submit Simulator Punch
  const handleSimulatePunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simStaffId) {
      showToast('Please select a staff member', 'error');
      return;
    }
    setSubmittingPunch(true);
    try {
      const [hours, minutes] = simPunchTime.split(':');
      const punchDate = new Date(selectedDate);
      punchDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      await api.post('/api/staff-attendance/raw-punches', {
        deviceId: simDeviceId,
        staffId: simStaffId,
        punchTime: punchDate.toISOString(),
        punchType: simPunchType
      });

      showToast(`Biometric punch ingested & daily ledger updated for ${simPunchTime}!`, 'success');
      fetchRawLogs();
      fetchDailySummary();
    } catch (err) {
      console.error('Failed to ingest punch:', err);
      showToast('Failed to record biometric punch', 'error');
    } finally {
      setSubmittingPunch(false);
    }
  };

  // Filtering records by search term
  const filteredDaily = (dailyData?.records || []).filter(r => {
    const name = r.staff?.name || '';
    const email = r.staff?.email || '';
    const staffId = r.staff?.staffId || '';
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            <i className="fas fa-id-badge" style={{ marginRight: 12, color: '#6366f1' }}></i>
            Staff Attendance & Biometric Operations
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Automated biometric punch processing (15-min background job), tardiness monitoring, and approved leave cross-checks.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <a
            href="/admin/attendance"
            className="portal-btn-ghost"
            style={{ padding: '8px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className="fas fa-user-check" style={{ color: '#2563eb' }}></i>
            Student Attendance Desk
          </a>
          <button
            type="button"
            onClick={handleProcessPunches}
            disabled={processingPunches}
            className="portal-btn-primary"
            style={{ padding: '8px 18px', fontWeight: 800, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {processingPunches ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Processing...
              </>
            ) : (
              <>
                <i className="fas fa-bolt"></i> Process Punches Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Canonical Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => handleTabChange('daily-summary')}
          className={currentTab === 'daily-summary' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-calendar-day"></i>
          Daily Summary
        </button>

        <button
          onClick={() => handleTabChange('late-comers')}
          className={currentTab === 'late-comers' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-user-clock"></i>
          Late Comers
        </button>

        <button
          onClick={() => handleTabChange('raw-logs')}
          className={currentTab === 'raw-logs' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-microchip"></i>
          Raw Device Logs
        </button>

        <button
          onClick={() => handleTabChange('leave-cross-check')}
          className={currentTab === 'leave-cross-check' ? 'portal-btn-primary' : 'portal-btn-ghost'}
          style={{ padding: '10px 20px', borderRadius: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-clipboard-check"></i>
          Leave Cross-Check
        </button>
      </div>

      {/* Global Date & Search Filter Bar */}
      <div className="portal-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Attendance Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 600 }}
              />
            </div>
            {currentTab === 'daily-summary' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Search staff name or staff ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', minWidth: 260 }}
                />
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Benchmark Shift: <strong>08:00 AM - 16:00 PM</strong> | Late Grace: <strong>30 mins</strong>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 1: Daily Summary
         ────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'daily-summary' && (
        <div>
          {/* Summary KPIs */}
          {dailyData?.stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
              <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #6366f1' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Active Staff</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{dailyData.stats.totalStaff}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Institutional workforce</div>
              </div>
              <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Present / Clocked-In</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669', margin: '4px 0' }}>{dailyData.stats.presentCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rate: {dailyData.stats.presenceRate}%</div>
              </div>
              <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Absent</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#dc2626', margin: '4px 0' }}>{dailyData.stats.absentCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Not clocked in today</div>
              </div>
              <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Late Arrivals</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d97706', margin: '4px 0' }}>{dailyData.stats.lateCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Clocked in after 08:00 AM</div>
              </div>
            </div>
          )}

          {/* Daily Table */}
          <div className="portal-card" style={{ padding: 24 }}>
            {loadingDaily ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin fa-2x"></i>
                <div style={{ marginTop: 12 }}>Loading staff daily attendance...</div>
              </div>
            ) : filteredDaily.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-user-slash fa-3x" style={{ marginBottom: 12 }}></i>
                <div>No staff attendance records for this date.</div>
              </div>
            ) : (
              <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Staff Member</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Role</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>First In</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Last Out</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Total Hours</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Leave Cross-Check</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDaily.map(record => (
                    <tr key={record.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{record.staff?.name || 'Staff Member'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{record.staff?.email || record.staff?.staffId}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>
                        {record.staff?.role || 'STAFF'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                        {record.firstIn ? new Date(record.firstIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                        {record.lastOut ? new Date(record.lastOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                        {record.totalHours ? `${record.totalHours} hrs` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {record.status === 'present' ? (
                          <span style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                            PRESENT
                          </span>
                        ) : record.status === 'late' ? (
                          <span style={{ backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                            LATE ({record.lateMinutes}m)
                          </span>
                        ) : record.status === 'half_day' ? (
                          <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                            HALF DAY
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                            ABSENT
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {record.leaveCrossCheck === 'APPROVED_LEAVE' ? (
                          <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                            Approved Leave
                          </span>
                        ) : record.leaveCrossCheck === 'UNAUTHORIZED_ABSENCE' ? (
                          <span style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                            Unauthorized
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Present</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 2: Late Comers & Tardiness
         ────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'late-comers' && (
        <div className="portal-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-user-clock" style={{ marginRight: 8, color: '#f59e0b' }}></i>
                Morning Late Comers & HR Tardiness Log
              </h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                Clock-ins after standard start time (08:00 AM). Late arrivals over 30 minutes are automatically flagged to HR.
              </p>
            </div>
            {lateComersData && (
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem' }}>
                  Total Late: {lateComersData.totalLate}
                </span>
                <span style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '6px 14px', borderRadius: 8, fontWeight: 800, fontSize: '0.85rem' }}>
                  Exceeding 30m: {lateComersData.flaggedOver30Mins}
                </span>
              </div>
            )}
          </div>

          {loadingLate ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin fa-2x"></i>
              <div style={{ marginTop: 12 }}>Loading tardiness records...</div>
            </div>
          ) : !lateComersData || lateComersData.lateComers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#10b981' }}>
              <i className="fas fa-check-circle fa-3x" style={{ marginBottom: 12 }}></i>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>No Late Arrivals Recorded!</div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>All staff clocked in on or before 08:00 AM on {selectedDate}.</div>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Staff Member</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Role</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Actual Clock-In</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Minutes Late</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>HR Action Status</th>
                </tr>
              </thead>
              <tbody>
                {lateComersData.lateComers.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700 }}>{r.staff?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.staff?.staffId}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{r.staff?.role}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#b45309' }}>
                      {r.firstIn ? new Date(r.firstIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: r.lateMinutes > 30 ? '#dc2626' : '#d97706' }}>
                      +{r.lateMinutes} mins
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {r.flaggedTardiness ? (
                        <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                          <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }}></i>
                          HR FLAGGED (&gt;30m)
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                          WITHIN GRACE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 3: Raw Device Logs & Punch Simulator
         ────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'raw-logs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: 24, alignItems: 'start' }}>
          {/* Punch Simulator Panel */}
          <div className="portal-card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-fingerprint" style={{ color: '#6366f1' }}></i>
              Biometric Punch Simulator
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#64748b' }}>
              Simulate or manually ingest hardware punches from gate turnstiles or biometric timeclocks.
            </p>

            <form onSubmit={handleSimulatePunch} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>Staff Member:</label>
                <select
                  value={simStaffId}
                  onChange={e => setSimStaffId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  required
                >
                  {staffUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>Biometric Terminal ID:</label>
                <input
                  type="text"
                  value={simDeviceId}
                  onChange={e => setSimDeviceId(e.target.value)}
                  placeholder="e.g. BIO-GATE-MAIN"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>Punch Type:</label>
                <select
                  value={simPunchType}
                  onChange={e => setSimPunchType(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="CHECK_IN">CHECK_IN (Morning Entry)</option>
                  <option value="CHECK_OUT">CHECK_OUT (Afternoon Exit)</option>
                  <option value="RAW">RAW PUNCH</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>Punch Time:</label>
                <input
                  type="time"
                  value={simPunchTime}
                  onChange={e => setSimPunchTime(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingPunch}
                className="portal-btn-primary"
                style={{ padding: '10px 16px', fontWeight: 800, borderRadius: 8, marginTop: 8 }}
              >
                {submittingPunch ? 'Ingesting...' : 'Record Hardware Punch'}
              </button>
            </form>
          </div>

          {/* Raw Logs Stream Table */}
          <div className="portal-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                  <i className="fas fa-list-alt" style={{ marginRight: 8, color: '#6366f1' }}></i>
                  Raw Biometric Device Stream
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Logs for {selectedDate}</div>
              </div>
              <button
                onClick={fetchRawLogs}
                className="portal-btn-ghost"
                style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 700 }}
              >
                <i className="fas fa-sync" style={{ marginRight: 6 }}></i>
                Refresh
              </button>
            </div>

            {loadingRaw ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin fa-2x"></i>
                <div style={{ marginTop: 12 }}>Loading device logs...</div>
              </div>
            ) : rawLogs.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-terminal fa-3x" style={{ marginBottom: 12 }}></i>
                <div>No raw punches received for {selectedDate}.</div>
              </div>
            ) : (
              <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800 }}>Punch Time</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800 }}>Terminal</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800 }}>Staff Name</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800 }}>Type</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rawLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 14px', fontSize: '0.85rem', fontWeight: 600 }}>
                        {new Date(log.punchTime).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#64748b' }}>
                        <code>{log.deviceId}</code>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                        {log.staff?.name || 'Staff User'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                          {log.punchType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {log.processed ? (
                          <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 700 }}>
                            <i className="fas fa-check" style={{ marginRight: 4 }}></i> Processed
                          </span>
                        ) : (
                          <span style={{ color: '#d97706', fontSize: '0.8rem', fontWeight: 700 }}>
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 4: Leave Cross-Check
         ────────────────────────────────────────────────────────────────────────── */}
      {currentTab === 'leave-cross-check' && (
        <div>
          {leaveData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
              <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #64748b' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Absent On Date</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{leaveData.totalAbsent}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>No punches recorded</div>
              </div>
              <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Approved Leave (Excused)</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669', margin: '4px 0' }}>{leaveData.approvedLeaveCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Verified via /admin/leave</div>
              </div>
              <div className="portal-card" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Unauthorized Absences</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#dc2626', margin: '4px 0' }}>{leaveData.unauthorizedAbsenceCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>No leave application on file</div>
              </div>
            </div>
          )}

          <div className="portal-card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-clipboard-check" style={{ marginRight: 8, color: '#10b981' }}></i>
              Workforce Leave Cross-Examination Log
            </h3>

            {loadingLeave ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin fa-2x"></i>
                <div style={{ marginTop: 12 }}>Cross-checking leave applications...</div>
              </div>
            ) : !leaveData || leaveData.absentStaff.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#10b981' }}>
                <i className="fas fa-smile fa-3x" style={{ marginBottom: 12 }}></i>
                <div style={{ fontWeight: 700 }}>Zero Absences Reported</div>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Full workforce attendance accounted for on {selectedDate}.</div>
              </div>
            ) : (
              <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Staff Member</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Role</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800 }}>Cross-Check Result</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>Approved Leave Details</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveData.absentStaff.map((item: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700 }}>{item.staff?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.staff?.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{item.staff?.role}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {item.leaveCrossCheck === 'APPROVED_LEAVE' ? (
                          <span style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                            <i className="fas fa-check-circle" style={{ marginRight: 4 }}></i>
                            APPROVED LEAVE
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                            <i className="fas fa-times-circle" style={{ marginRight: 4 }}></i>
                            UNAUTHORIZED ABSENCE
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                        {item.approvedLeave ? (
                          <div>
                            <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{item.approvedLeave.leaveType} Leave</span>
                            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                              Reason: {item.approvedLeave.reason || 'Not specified'} | Approved by: {item.approvedLeave.approvedBy || 'Admin'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>
                            No leave request found on file in /admin/leave.
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
