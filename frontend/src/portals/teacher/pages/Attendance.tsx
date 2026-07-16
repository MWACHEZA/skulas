import { useState } from 'react';

export default function TeacherAttendance() {
  const [selectedClass, setSelectedClass] = useState('Form 3A Mathematics');
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([
    { id: '1', name: 'Tendai Mutasa', status: 'present' },
    { id: '2', name: 'Nyasha Ndlovu', status: 'present' },
    { id: '3', name: 'Farai Moyo', status: 'absent' },
    { id: '4', name: 'Chipo Sibanda', status: 'late' },
    { id: '5', name: 'Rudo Macharia', status: 'present' },
  ]);

  const updateStatus = (id: string, status: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const statusBtn = (studentId: string, value: string, label: string, color: string) => {
    const isActive = students.find(s => s.id === studentId)?.status === value;
    return (
      <button onClick={() => updateStatus(studentId, value)} style={{
        padding: '6px 12px', border: `2px solid ${isActive ? color : '#e2e8f0'}`,
        background: isActive ? color : 'white', color: isActive ? 'white' : '#4a5568',
        borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', transition: 'all 0.15s',
      }}>{label}</button>
    );
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Mark Attendance</h1>
        <p>Record daily attendance for your assigned classes.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header" style={{ background: '#f8f9fa' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e0', minWidth: 200 }}>
              <option>Form 3A Mathematics</option>
              <option>Form 4B Physics</option>
              <option>Lower 6 Computer Science</option>
            </select>
            <input type="date" defaultValue={date} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e0' }} />
          </div>
          <button style={{ padding: '10px 20px', background: 'var(--portal-success)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }} onClick={() => alert('This feature is currently under development or disabled.')}>
            <i className="fas fa-save" style={{ marginRight: 8 }}></i>Submit Attendance
          </button>
        </div>

        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead><tr><th>#</th><th>Student Name</th><th>Status</th></tr></thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id}>
                  <td style={{ color: '#718096' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {statusBtn(s.id, 'present', 'Present', 'var(--portal-success)')}
                      {statusBtn(s.id, 'late', 'Late', 'var(--portal-warning)')}
                      {statusBtn(s.id, 'absent', 'Absent', 'var(--portal-danger)')}
                      {statusBtn(s.id, 'excused', 'Excused', 'var(--school-primary, #3182ce)')}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
