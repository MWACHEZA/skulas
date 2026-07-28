import { useState } from 'react';
import { useToast } from '../../../context/ToastContext';

export default function TeacherSyllabusManager() {
  const { showToast } = useToast();
  const [topics, setTopics] = useState([
    { id: 1, name: 'Number Theory', progress: 100, status: 'Completed', deadline: 'Sep 15, 2024' },
    { id: 2, name: 'Algebraic Expressions', progress: 85, status: 'Ongoing', deadline: 'Oct 20, 2024' },
    { id: 3, name: 'Trigonometry Fundamentals', progress: 0, status: 'Planned', deadline: 'Nov 10, 2024' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [progressValue, setProgressValue] = useState(0);

  const openModal = (topic: any) => {
    setEditingTopic(topic);
    setProgressValue(topic.progress);
    setIsModalOpen(true);
  };

  const handleUpdateProgress = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTopics = topics.map(t => {
      if (t.id === editingTopic.id) {
        const p = Number(progressValue);
        const status = p === 100 ? 'Completed' : (p > 0 ? 'Ongoing' : 'Planned');
        return { ...t, progress: p, status };
      }
      return t;
    });
    setTopics(updatedTopics);
    setIsModalOpen(false);
    showToast('Progress updated successfully!', 'success');
  };

  const overallProgress = Math.round(topics.reduce((acc, t) => acc + t.progress, 0) / topics.length) || 0;

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
             <span style={{ fontSize: '0.9rem', color: '#718096' }}>Overall Progress: {overallProgress}%</span>
             <div style={{ width: 120, height: 10, background: '#edf2f7', borderRadius: 5 }}>
                <div style={{ width: `${overallProgress}%`, height: '100%', background: 'var(--portal-success)', borderRadius: 5, transition: 'width 0.3s ease' }}></div>
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
                    <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Update Progress" onClick={() => openModal(t)}>
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

      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 400 }}>
            <div className="portal-modal-header" style={{ padding: 20, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}><i className="fas fa-chart-line" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i> Update Progress</h2>
              <button className="portal-btn-ghost" onClick={() => setIsModalOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body" style={{ padding: 20 }}>
              <form onSubmit={handleUpdateProgress}>
                <div style={{ marginBottom: 20 }}>
                  <strong>{editingTopic?.name}</strong>
                </div>
                <div className="portal-form-group">
                  <label>Coverage Progress ({progressValue}%)</label>
                  <input type="range" min="0" max="100" className="portal-input" style={{ padding: 0 }} value={progressValue} onChange={e => setProgressValue(Number(e.target.value))} />
                </div>
                
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="button" className="portal-btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Save Update</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
