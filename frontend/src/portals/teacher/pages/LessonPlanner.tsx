import { useState } from 'react';

export default function TeacherLessonPlanner() {
  const [plans] = useState([
    { id: 1, subject: 'Mathematics', class: 'Form 3A', topic: 'Algebraic Equations', week: 4, status: 'Approved' },
    { id: 2, subject: 'Mathematics', class: 'Form 3A', topic: 'Quadratic Functions', week: 5, status: 'Draft' },
  ]);

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
              {plans.map((plan) => (
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
                    <button className="portal-btn-secondary" style={{ padding: '6px 12px' }} onClick={() => alert('This feature is currently under development or disabled.')}>Edit</button>
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
