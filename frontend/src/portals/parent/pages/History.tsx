import React from 'react';

export default function ParentHistory() {
  const history = [
    { term: 'Term 1, 2024', grade: 'A', avg: 82, comment: 'Exceptional performance in STEM subjects.', awards: ['Principal\'s Award', 'Sports Day Medal'] },
    { term: 'Term 3, 2023', grade: 'B+', avg: 76, comment: 'Consistent effort shown across all areas.', awards: ['Merit Badge'] },
    { term: 'Term 2, 2023', grade: 'B', avg: 72, comment: 'Improving in Language arts.', awards: [] },
  ];

  return (
    <>
      <div className="portal-page-header">
        <h1>Academic History</h1>
        <p>A comprehensive record of your child's past academic performance and achievements.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-history" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Historical Performance</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Term / Session</th>
                <th>Avg Score</th>
                <th>Final Grade</th>
                <th>Awards & Recognition</th>
                <th className="hide-mobile">Teacher's Summary</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{h.term}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700 }}>{h.avg}%</span>
                      <div style={{ background: '#edf2f7', borderRadius: 10, height: 6, width: 60, overflow: 'hidden' }}>
                        <div style={{ width: `${h.avg}%`, height: '100%', background: '#4299e1' }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="portal-badge info">Grade {h.grade}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {h.awards.length > 0 ? h.awards.map((a, j) => (
                        <span key={j} className="portal-badge success" style={{ fontSize: '0.65rem' }}>{a}</span>
                      )) : <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>None</span>}
                    </div>
                  </td>
                  <td className="hide-mobile">
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#4a5568', fontStyle: 'italic' }}>"{h.comment}"</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 30 }}>
        <button className="portal-btn-secondary" onClick={() => alert('This feature is currently under development or disabled.')}>
          <i className="fas fa-file-pdf"></i> Download Full Transcript (PDF)
        </button>
      </div>
    </>
  );
}
