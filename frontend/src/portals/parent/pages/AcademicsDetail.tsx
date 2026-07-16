import { useState } from 'react';

export default function ParentAcademicsDetail() {
  const [children] = useState([
    { id: 'STU-01', name: 'Tendai Mutasa', grade: 'Form 3A', rank: '4/42', average: '82%', subjects: [
      { name: 'Mathematics', score: 88, grade: 'A', comment: 'Excellent progress' },
      { name: 'English', score: 75, grade: 'B', comment: 'Improving steadily' },
      { name: 'Physics', score: 82, grade: 'A', comment: 'Very strong analytical skills' },
    ]},
  ]);

  return (
    <>
      <div className="portal-page-header">
        <h1>Detailed Academic Progress</h1>
        <p>Monitor your child's performance across all subjects, view teacher comments, and track grade trends.</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <select className="portal-select" style={{ minWidth: '250px' }}>
          <option>Tendai Mutasa (Form 3A)</option>
          <option>Sarah Mutasa (Form 1B)</option>
        </select>
      </div>

      {children.map((c) => (
        <div key={c.id}>
          <div className="portal-stats-grid">
            <div className="portal-stat-card">
              <div className="portal-stat-icon blue"><i className="fas fa-trophy"></i></div>
              <div className="portal-stat-info">
                <h3>{c.rank}</h3>
                <p>Class Rank</p>
              </div>
            </div>
            <div className="portal-stat-card">
              <div className="portal-stat-icon green"><i className="fas fa-chart-line"></i></div>
              <div className="portal-stat-info">
                <h3>{c.average}</h3>
                <p>Term Average</p>
              </div>
            </div>
          </div>

          <div className="portal-card">
            <div className="portal-card-header">
              <h2><i className="fas fa-file-alt" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Term 3 Assessment Results</h2>
              <button className="portal-btn-secondary" onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-download" style={{ marginRight: 6 }}></i>Download Report</button>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Score (%)</th>
                    <th>Grade</th>
                    <th>Teacher's Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {c.subjects.map((s, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td style={{ fontWeight: 700, color: s.score >= 80 ? '#2f855a' : '#2d3748' }}>{s.score}%</td>
                      <td><span className={`portal-badge ${s.grade === 'A' ? 'success' : 'info'}`}>{s.grade}</span></td>
                      <td style={{ color: '#718096', fontSize: '0.9rem', fontStyle: 'italic' }}>"{s.comment}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
