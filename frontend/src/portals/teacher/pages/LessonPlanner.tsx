import { useState } from 'react';

export default function TeacherLessonPlanner() {
  const [plans] = useState([
    { id: 1, subject: 'Mathematics', class: 'Form 3A', topic: 'Algebraic Equations', week: 4, status: 'Approved' },
    { id: 2, subject: 'Mathematics', class: 'Form 3A', topic: 'Quadratic Functions', week: 5, status: 'Draft' },
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  return (
    <>
      <div className="portal-page-header">
        <h1>Lesson Planner</h1>
        <p>Design, organize, and submit your weekly teaching objectives and procedural plans.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-calendar-alt" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Teaching Schedule</h2>
          <button className="portal-btn-primary" onClick={() => alert('This feature is currently under development or disabled.')}>+ Create New Plan</button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Subject</th>
                <th>Target Class</th>
                <th>Topic / Objective</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const indexOfLastItem = currentPage * itemsPerPage;
                const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                const currentItems = plans.slice(indexOfFirstItem, indexOfLastItem);
                if (currentItems.length === 0 && plans.length > 0) setCurrentPage(1);
                return currentItems.map((plan) => (
                <tr key={plan.id}>
                  <td style={{ fontWeight: 600 }}>Week {plan.week}</td>
                  <td>{plan.subject}</td>
                  <td><span className="portal-badge neutral">{plan.class}</span></td>
                  <td>{plan.topic}</td>
                  <td>
                    <span className={`portal-badge ${plan.status === 'Approved' ? 'success' : 'neutral'}`}>
                      {plan.status}
                    </span>
                  </td>
                  <td>
                    <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit Plan" onClick={() => alert('This feature is currently under development or disabled.')}>
                      <i className="fas fa-edit"></i>
                    </button>
                  </td>
                </tr>
              ));
                })()}
              </tbody>
          </table>
          
          {plans.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, plans.length)} of {plans.length} entries
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(plans.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(plans.length / itemsPerPage) || plans.length === 0}
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
