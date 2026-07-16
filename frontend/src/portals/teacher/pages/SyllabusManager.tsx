import { useState } from 'react';

export default function TeacherSyllabusManager() {
  const [topics] = useState([
    { id: 1, name: 'Number Theory', progress: 100, status: 'Completed', deadline: 'Sep 15, 2024' },
    { id: 2, name: 'Algebraic Expressions', progress: 85, status: 'Ongoing', deadline: 'Oct 20, 2024' },
    { id: 3, name: 'Trigonometry Fundamentals', progress: 0, status: 'Planned', deadline: 'Nov 10, 2024' },
  ]);

  return (
    <>
      <div className="portal-page-header">
        <h1>Syllabus Progress Manager</h1>
        <p>Track curriculum coverage against national standards and department goals.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-book-open" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Mathematics Form 3 Syllabus</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
             <span style={{ fontSize: '0.9rem', color: '#718096' }}>Overall Progress: 62%</span>
             <div style={{ width: 120, height: 10, background: '#edf2f7', borderRadius: 5 }}>
                <div style={{ width: '62%', height: '100%', background: 'var(--portal-success)', borderRadius: 5 }}></div>
             </div>
          </div>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Curriculum Topic</th>
                <th>Target Deadline</th>
                <th>Coverage Progress</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td>{t.deadline}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 6, background: '#edf2f7', borderRadius: 3 }}>
                        <div style={{ width: `${t.progress}%`, height: '100%', background: 'var(--school-primary, #3182ce)', borderRadius: 3 }}></div>
                      </div>
                      <span style={{ fontSize: '0.85rem', width: 40 }}>{t.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`portal-badge ${
                      t.status === 'Completed' ? 'success' : 
                      t.status === 'Ongoing' ? 'info' : 'neutral'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td>
                    <button className="portal-btn-secondary" style={{ padding: '6px 12px' }} onClick={() => alert('This feature is currently under development or disabled.')}>Update</button>
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
