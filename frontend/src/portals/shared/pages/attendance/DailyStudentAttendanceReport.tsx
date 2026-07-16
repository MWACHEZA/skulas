import React, { useState, useEffect } from 'react';
import { useTerminology } from '../../../../hooks/useTerminology';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';

export default function DailyStudentAttendanceReport() {
  const { t } = useTerminology();
  const { showToast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  
  const [reportData, setReportData] = useState<any[]>([]);
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
      // For now just simulate a report or fetch raw attendance and group it
      showToast('Report feature requires backend aggregation (coming soon)', 'info');
      setReportData([]);
    } catch (error) {
      showToast('Failed to fetch report', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Daily Student Attendance Report</h1>
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
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Total Present</th>
                <th>Total Absent</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#718096' }}>No report data available.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
