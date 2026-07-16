import React, { useState, useEffect } from 'react';
import api, { BASE_URL } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useTerminology } from '../../../hooks/useTerminology';
import '../../../styles/portal.css';

interface StaffLog {
  id: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  status: string;
  clockInImage: string | null;
  clockOutImage: string | null;
  hoursPresent?: string | null;
  schoolHoursPresent?: string | null;
  staff: {
    id: string;
    name: string;
    email: string;
    role: string;
    staffId: string | null;
  };
}

interface StudentLog {
  id: string;
  student: {
    id: string;
    studentId: string;
    name: string;
    class: string;
    department: string;
  };
  direction: string;
  time: string;
  image: string;
}

export default function ClockInLogsPage() {
  const { t } = useTerminology();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const isAdmin = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR', 'HR'].includes(user?.role || '');
  const isTeacher = user?.role === 'TEACHER';
  const isLibrarian = user?.role === 'LIBRARIAN';
  const isStaffRole = isTeacher || isLibrarian;

  const [activeTab, setActiveTab] = useState<'my' | 'staff' | 'student'>('my');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState('');
  
  const [myLogs, setMyLogs] = useState<any[]>([]);
  const [staffLogs, setStaffLogs] = useState<StaffLog[]>([]);
  const [studentLogs, setStudentLogs] = useState<StudentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHod, setIsHod] = useState(false);
  const [checkingHod, setCheckingHod] = useState(isStaffRole);

  useEffect(() => {
    if (isStaffRole) {
      checkHodStatus();
    }
  }, [isStaffRole]);

  useEffect(() => {
    if (!checkingHod) {
      fetchLogs();
    }
  }, [activeTab, selectedDate, checkingHod]);

  const checkHodStatus = async () => {
    try {
      setCheckingHod(true);
      const { data } = await api.get('/api/departments');
      const headedDepts = data.filter((d: any) => d.head?.id === user?.id);
      const hasHeaded = headedDepts.length > 0;
      setIsHod(hasHeaded);
    } catch (error) {
      console.error('Failed to verify HOD status:', error);
    
    } finally {
      setCheckingHod(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      if (activeTab === 'my') {
        const { data } = await api.get('/api/staff-attendance/my');
        setMyLogs(Array.isArray(data) ? data : []);
      } else if (activeTab === 'staff') {
        const { data } = await api.get(`/api/staff-attendance/all?date=${selectedDate}`);
        setStaffLogs(Array.isArray(data) ? data : []);
      } else {
        const { data } = await api.get(`/api/attendance/student-clock-ins?date=${selectedDate}`);
        setStudentLogs(Array.isArray(data) ? data : []);
      }
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to load logs', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const filteredMyLogs = myLogs.filter(log => {
    try {
      const dateText = log?.date ? new Date(log.date).toLocaleDateString().toLowerCase() : '';
      const statusText = (log?.status || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      return dateText.includes(query) || statusText.includes(query);
    } catch (e) {
      return false;
    
    }
  });

  const filteredStaff = staffLogs.filter(log => {
    try {
      const name = log?.staff?.name?.toLowerCase() || '';
      const staffId = (log?.staff?.staffId || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      return name.includes(query) || staffId.includes(query);
    } catch (e) {
      return false;
    
    }
  });

  const filteredStudents = studentLogs.filter(log => {
    try {
      const name = log?.student?.name?.toLowerCase() || '';
      const studentId = (log?.student?.studentId || '').toLowerCase();
      const cls = (log?.student?.class || '').toLowerCase();
      const dept = (log?.student?.department || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      return name.includes(query) || studentId.includes(query) || cls.includes(query) || dept.includes(query);
    } catch (e) {
      return false;
    
    }
  });

  const formatTime = (isoString: any) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '--:--';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '--:--';
    
    }
  };

  const formatSelectedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString();
    } catch (e) {
      return dateStr;
    
    }
  };

  return (
    <div className="portal-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="portal-page-header">
        <h1>Attendance & Clock-in Logs</h1>
        <p>View personal clock registers, physical scans, verify check photos, and audit logs.</p>
        
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={activeTab === 'my' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              onClick={() => { setActiveTab('my'); setSearchTerm(''); }}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <i className="fas fa-user mr-2"></i>My Attendance
            </button>
            {(isAdmin || isHod) && (
              <button 
                className={activeTab === 'staff' ? 'portal-btn-primary' : 'portal-btn-secondary'}
                onClick={() => { setActiveTab('staff'); setSearchTerm(''); }}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <i className="fas fa-user-tie mr-2"></i>Staff Clock-ins
              </button>
            )}
            {(isAdmin || isHod) && (
              <button 
                className={activeTab === 'student' ? 'portal-btn-primary' : 'portal-btn-secondary'}
                onClick={() => { setActiveTab('student'); setSearchTerm(''); }}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <i className="fas fa-user-graduate mr-2"></i>Student Clock-ins
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {activeTab !== 'my' && (
              <input 
                type="date" 
                className="portal-input"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ width: '180px', height: '40px', fontSize: '0.9rem', fontWeight: 800 }}
              />
            )}
            <div style={{ position: 'relative', width: '240px' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
              <input 
                type="text" 
                placeholder="Search..."
                className="portal-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '36px', height: '40px', fontSize: '0.9rem' }}
              />
            </div>
          </div>
        </div>
      </div>

      {loading || checkingHod ? (
        <div className="portal-card" style={{ padding: '100px', textAlign: 'center' }}>
          <div className="portal-spinner" style={{ margin: '0 auto 20px' }}></div>
          <p style={{ fontWeight: 800, color: '#64748b' }}>Retrieving attendance registers...</p>
        </div>
      ) : activeTab === 'my' ? (
        <div className="management-table-card">
          <div className="portal-card-header">
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}><i className="fas fa-user mr-2 text-primary"></i>My Attendance History (Last 30 Days)</h2>
          </div>
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ padding: '16px 20px' }}>Date</th>
                  <th>Clock In Time</th>
                  <th>Clock In Photo</th>
                  <th>Clock Out Time</th>
                  <th>Clock Out Photo</th>
                  <th>Active Hours</th>
                  <th>School Overlap (08:00-16:00)</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b', fontWeight: 700 }}>
                      No personal attendance records found.
                    </td>
                  </tr>
                ) : (
                  filteredMyLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ padding: '16px 20px', fontWeight: 800, color: '#1e293b' }}>
                        {new Date(log.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </td>
                      <td style={{ fontWeight: 900, color: '#059669' }}>{formatTime(log.timeIn)}</td>
                      <td>
                        {log.clockInImage ? (
                          <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            <img src={log.clockInImage} alt="Clock In" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No Photo</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 900, color: '#ea580c' }}>{formatTime(log.timeOut)}</td>
                      <td>
                        {log.clockOutImage ? (
                          <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            <img src={log.clockOutImage} alt="Clock Out" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No Photo</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 800, color: '#475569' }}>{log.hoursPresent || '--'}</td>
                      <td style={{ fontWeight: 800, color: '#2563eb' }}>{log.schoolHoursPresent || '--'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="status-badge" style={{ 
                          background: log.status === 'FULL DAY' ? '#ecfdf5' : (log.status === 'NOT CLOCKED IN' ? '#fef2f2' : '#fef3c7'),
                          color: log.status === 'FULL DAY' ? '#059669' : (log.status === 'NOT CLOCKED IN' ? 'var(--portal-danger)' : '#d97706'),
                          borderColor: log.status === 'FULL DAY' ? '#d1fae5' : (log.status === 'NOT CLOCKED IN' ? '#fca5a5' : '#fef3c7'),
                          fontWeight: 900,
                          fontSize: '0.75rem'
                        }}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'staff' ? (
        <div className="management-table-card">
          <div className="portal-card-header">
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}><i className="fas fa-user-clock mr-2 text-primary"></i>Staff Clock Registry</h2>
          </div>
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ padding: '16px 20px' }}>Staff Member</th>
                  <th>Staff ID</th>
                  <th>Clock In Time</th>
                  <th>Clock In Photo</th>
                  <th>Clock Out Time</th>
                  <th>Clock Out Photo</th>
                  <th>Active Hours</th>
                  <th>School Overlap (08:00-16:00)</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b', fontWeight: 700 }}>
                      No staff clock-ins found for {formatSelectedDate(selectedDate)}.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map(log => (
                    <tr key={log.id}>
                      <td style={{ padding: '16px 20px' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#1e293b' }}>{log.staff?.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>{log.staff?.email}</div>
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 800, color: '#475569' }}>{log.staff?.staffId || 'N/A'}</span></td>
                      <td style={{ fontWeight: 900, color: '#059669' }}>{formatTime(log.timeIn)}</td>
                      <td>
                        {log.clockInImage ? (
                          <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            <img src={log.clockInImage} alt="Clock In" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No Photo</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 900, color: '#ea580c' }}>{formatTime(log.timeOut)}</td>
                      <td>
                        {log.clockOutImage ? (
                          <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            <img src={log.clockOutImage} alt="Clock Out" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No Photo</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 800, color: '#475569' }}>{log.hoursPresent || '--'}</td>
                      <td style={{ fontWeight: 800, color: '#2563eb' }}>{log.schoolHoursPresent || '--'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="status-badge" style={{ 
                          background: log.status === 'FULL DAY' ? '#ecfdf5' : (log.status === 'NOT CLOCKED IN' ? '#fef2f2' : '#fef3c7'),
                          color: log.status === 'FULL DAY' ? '#059669' : (log.status === 'NOT CLOCKED IN' ? 'var(--portal-danger)' : '#d97706'),
                          borderColor: log.status === 'FULL DAY' ? '#d1fae5' : (log.status === 'NOT CLOCKED IN' ? '#fca5a5' : '#fef3c7'),
                          fontWeight: 900,
                          fontSize: '0.75rem'
                        }}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="management-table-card">
          <div className="portal-card-header">
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}><i className="fas fa-qrcode mr-2 text-success"></i>{t('student')} QR Scan Registry</h2>
          </div>
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                <tr>
                  <th style={{ padding: '16px 20px' }}>{t('student')}</th>
                  <th>{t('student')} ID</th>
                  <th>{t('class')}</th>
                  <th>Department</th>
                  <th>Timestamp</th>
                  <th>Direction</th>
                  <th>Verification Image</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '60px 24px', color: '#64748b', fontWeight: 700 }}>
                      No {t('student').toLowerCase()} clock-ins found for {formatSelectedDate(selectedDate)}.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(log => (
                    <tr key={log.id}>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ fontWeight: 800, color: '#1e293b' }}>{log.student?.name}</span>
                      </td>
                      <td><span style={{ fontWeight: 800, color: '#475569' }}>{log.student?.studentId}</span></td>
                      <td><span className="status-badge" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#dbeafe', fontWeight: 800 }}>{log.student?.class}</span></td>
                      <td><span style={{ color: '#64748b', fontWeight: 700 }}>{log.student?.department}</span></td>
                      <td style={{ fontWeight: 900, color: '#3b82f6' }}>{formatTime(log.time)}</td>
                      <td>
                        <span className="status-badge" style={{ 
                          background: log.direction === 'Clock In' ? '#ecfdf5' : '#fff7ed',
                          color: log.direction === 'Clock In' ? '#059669' : '#ea580c',
                          borderColor: log.direction === 'Clock In' ? '#d1fae5' : '#ffedd5',
                          fontWeight: 900,
                          fontSize: '0.75rem'
                        }}>
                          {log.direction}
                        </span>
                      </td>
                      <td>
                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <img src={`${BASE_URL}${log.image}`} alt="Scan Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
