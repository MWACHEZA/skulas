import { useState } from 'react';

export default function TeacherSyllabusManager() {
  const [topics] = useState([
    { id: 1, name: 'Number Theory', progress: 100, status: 'Completed', deadline: 'Sep 15, 2024' },
    { id: 2, name: 'Algebraic Expressions', progress: 85, status: 'Ongoing', deadline: 'Oct 20, 2024' },
    { id: 3, name: 'Trigonometry Fundamentals', progress: 0, status: 'Planned', deadline: 'Nov 10, 2024' },
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
              {(() => {
                const indexOfLastItem = currentPage * itemsPerPage;
                const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                const currentItems = topics.slice(indexOfFirstItem, indexOfLastItem);
                if (currentItems.length === 0 && topics.length > 0) setCurrentPage(1);
                return currentItems.map((t) => (
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
                    <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Update Progress" onClick={() => alert('This feature is currently under development or disabled.')}>
                      <i className="fas fa-edit"></i>
                    </button>
                  </td>
                </tr>
              ));
                })()}
              </tbody>
          </table>
          
          {topics.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, topics.length)} of {topics.length} entries
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="portal-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(topics.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(topics.length / itemsPerPage) || topics.length === 0}
                  className="portal-btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
