import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';
import { format } from 'date-fns';

const exportToCSV = (title: string, headers: string[], dataRows: string[][]) => {
  const content = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...dataRows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToWord = (title: string, headers: string[], dataRows: string[][]) => {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function DailyStaffAttendance() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/api/staff-attendance/my');
      setAttendances(res.data);
    } catch (error) {
      showToast('Failed to load attendance logs', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendances = attendances.filter(a => {
    const formattedDate = a.date ? format(new Date(a.date), 'do, MMMM yyyy') : '';
    const statusText = a.status || '';
    return formattedDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statusText.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <>
      <div className="portal-page-header">
        <h1>My Daily Attendance</h1>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '24px 30px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
            <i className="fas fa-calendar-check mr-2"></i>Attendance Log
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
            <button 
              onClick={() => {
                const headers = ['Date', 'Time In', 'Time Out', 'Status'];
                const rows = filteredAttendances.map(a => [
                  format(new Date(a.date), 'do, MMMM yyyy'),
                  a.timeIn ? format(new Date(a.timeIn), 'hh:mm:ssa') : '-',
                  a.timeOut ? format(new Date(a.timeOut), 'hh:mm:ssa') : '-',
                  a.status
                ]);
                exportToCSV('Staff_Attendance', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              onClick={() => {
                const headers = ['Date', 'Time In', 'Time Out', 'Status'];
                const rows = filteredAttendances.map(a => [
                  format(new Date(a.date), 'do, MMMM yyyy'),
                  a.timeIn ? format(new Date(a.timeIn), 'hh:mm:ssa') : '-',
                  a.timeOut ? format(new Date(a.timeOut), 'hh:mm:ssa') : '-',
                  a.status
                ]);
                exportToWord('Staff_Attendance', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to Word"
            >
              <i className="fas fa-file-word mr-1"></i> Word
            </button>
            <button 
              onClick={() => window.print()}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Print / PDF"
            >
              <i className="fas fa-print mr-1"></i> Print/PDF
            </button>
          </div>
        </div>

        <div className="portal-card-body" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 10 }}>Search:</span>
              <input 
                type="text" 
                className="portal-input" 
                style={{ width: 200, padding: '5px 10px' }} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <table className="portal-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>TIME IN</th>
                <th>TIME OUT</th>
                <th>STATUS</th>
                <th>STAFF IMAGE</th>
                <th>CLOCK IN IMAGE</th>
                <th>CLOCK OUT IMAGE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>Loading...</td></tr>
              ) : filteredAttendances.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>No attendance records found.</td></tr>
              ) : (
                filteredAttendances.map(a => (
                  <tr key={a.id}>
                    <td>{format(new Date(a.date), 'do, MMMM yyyy')}</td>
                    <td>{a.timeIn ? format(new Date(a.timeIn), 'hh:mm:ssa') : '-'}</td>
                    <td>{a.timeOut ? format(new Date(a.timeOut), 'hh:mm:ssa') : '-'}</td>
                    <td>
                      <span style={{ background: 'var(--portal-success)', color: 'white', padding: '2px 6px', fontSize: '0.75rem', borderRadius: 4, fontWeight: 'bold' }}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                       <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#a0aec0' }}>
                         {user?.name.charAt(0)}
                       </div>
                    </td>
                    <td>
                      {a.clockInImage ? (
                        <img src={a.clockInImage} alt="Clock In" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                      ) : '-'}
                    </td>
                    <td>
                      {a.clockOutImage ? (
                        <img src={a.clockOutImage} alt="Clock Out" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '0.9rem' }}>
             <span>Showing 1 to {filteredAttendances.length} of {filteredAttendances.length} entries</span>
             <div>
                <button style={{ border: 'none', background: 'transparent', color: '#718096', cursor: 'pointer', marginRight: 10 }} onClick={() => alert('This feature is currently under development or disabled.')}>Previous</button>
                <button style={{ border: 'none', background: 'var(--school-primary, #3182ce)', color: 'white', borderRadius: 50, width: 25, height: 25, cursor: 'pointer' }} onClick={() => alert('This feature is currently under development or disabled.')}>1</button>
                <button style={{ border: 'none', background: 'transparent', color: '#718096', cursor: 'pointer', marginLeft: 10 }} onClick={() => alert('This feature is currently under development or disabled.')}>Next</button>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
