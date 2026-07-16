import React, { useState, useEffect } from 'react';
import { useTerminology } from '../../../../hooks/useTerminology';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';
import { format } from 'date-fns';

export default function DailyStudentAttendance() {
  const { t } = useTerminology();
  const { showToast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/classes').then(res => setClasses(res.data)).catch(console.error);
  }, []);

  const handleSearch = async () => {
    if (!selectedClass || !selectedDate) {
      showToast('Please select class and date', 'error');
      return;
    }
    setLoading(true);
    try {
      // Fetch students for the class
      const stRes = await api.get(`/api/students?classId=${selectedClass}`);
      setStudents(stRes.data);

      // Fetch attendance for the class and date
      const attRes = await api.get(`/api/attendance?classId=${selectedClass}&date=${selectedDate}`);
      setAttendanceData(attRes.data);
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (studentId: string) => {
    const record = attendanceData.find(a => a.studentId === studentId);
    return record?.status || '';
  };

  const markAttendance = async (studentId: string, status: string) => {
    try {
      await api.post('/api/attendance', {
        studentId,
        date: selectedDate,
        status
      });
      showToast('Attendance marked', 'success');
      // refresh attendance
      const attRes = await api.get(`/api/attendance?classId=${selectedClass}&date=${selectedDate}`);
      setAttendanceData(attRes.data);
    } catch (error) {
      showToast('Failed to mark attendance', 'error');
    
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Daily Student Attendance</h1>
      </div>

      <div className="portal-card" style={{ marginBottom: 20 }}>
        <div className="portal-card-header">
          <h2><i className="fas fa-filter"></i> Select Criteria</h2>
        </div>
        <div className="portal-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 15, alignItems: 'end' }}>
            <div className="portal-form-group">
              <label htmlFor="class-select">Select {t('class')} *</label>
              <select id="class-select" className="portal-input" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} required>
                <option value="">Select</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="portal-form-group">
              <label htmlFor="attendance-date">Attendance Date *</label>
              <input id="attendance-date" type="date" className="portal-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required />
            </div>
            <div className="portal-form-group">
              <button className="portal-btn-primary" onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {students.length > 0 && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h2>Attendance List</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Roll Number</th>
                  <th>Attendance</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr key={student.id}>
                    <td>{idx + 1}</td>
                    <td>{student.user?.name}</td>
                    <td>{student.enrollmentNumber}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 'bold', color: 'white',
                        background: getStatus(student.id) === 'present' ? 'var(--portal-success)' : getStatus(student.id) === 'absent' ? 'var(--portal-danger)' : '#a0aec0' 
                      }}>
                        {getStatus(student.id)?.toUpperCase() || 'NOT MARKED'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          onClick={() => markAttendance(student.id, 'present')}
                          aria-label={`Mark ${student.user?.name} present`}
                          className="portal-btn-primary" style={{ background: 'var(--portal-success)', borderColor: 'var(--portal-success)', padding: '4px 8px', fontSize: '0.8rem' }}>
                          Present
                        </button>
                        <button 
                          onClick={() => markAttendance(student.id, 'absent')}
                          aria-label={`Mark ${student.user?.name} absent`}
                          className="portal-btn-primary" style={{ background: 'var(--portal-danger)', borderColor: 'var(--portal-danger)', padding: '4px 8px', fontSize: '0.8rem' }}>
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
