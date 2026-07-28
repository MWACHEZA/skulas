import { useState } from 'react';
import { useToast } from '../../../context/ToastContext';

export default function TeacherLessonPlanner() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState([
    { id: 1, subject: 'Mathematics', class: 'Form 3A', topic: 'Algebraic Equations', week: 4, status: 'Approved' },
    { id: 2, subject: 'Mathematics', class: 'Form 3A', topic: 'Quadratic Functions', week: 5, status: 'Draft' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    subject: '',
    class: '',
    topic: '',
    week: ''
  });

  const openModal = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({ subject: plan.subject, class: plan.class, topic: plan.topic, week: plan.week.toString() });
    } else {
      setEditingPlan(null);
      setFormData({ subject: '', class: '', topic: '', week: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      if (editingPlan) {
        setPlans(plans.map(p => p.id === editingPlan.id ? { ...p, ...formData, week: Number(formData.week) } : p));
        showToast('Plan updated successfully!', 'success');
      } else {
        const newPlan = {
          id: plans.length + 1,
          subject: formData.subject,
          class: formData.class,
          topic: formData.topic,
          week: Number(formData.week),
          status: 'Draft'
        };
        setPlans([newPlan, ...plans]);
        showToast('Plan created successfully!', 'success');
      }
      setIsSubmitting(false);
      setIsModalOpen(false);
    }, 1000);
  };

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
          <button className="portal-btn-primary" onClick={() => openModal()}>+ Create New Plan</button>
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
                    <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit Plan" onClick={() => openModal(plan)}>
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

      {isModalOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-content" style={{ maxWidth: 500 }}>
            <div className="portal-modal-header" style={{ padding: 20, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}><i className="fas fa-book" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i> {editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2>
              <button className="portal-btn-ghost" onClick={() => setIsModalOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body" style={{ padding: 20 }}>
              <form onSubmit={handleSubmit}>
                <div className="portal-form-group">
                  <label>Subject</label>
                  <input type="text" className="portal-input" placeholder="e.g. Mathematics" required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
                </div>
                <div className="portal-form-group">
                  <label>Target Class</label>
                  <input type="text" className="portal-input" placeholder="e.g. Form 3A" required value={formData.class} onChange={e => setFormData({ ...formData, class: e.target.value })} />
                </div>
                <div className="portal-form-group">
                  <label>Topic / Objective</label>
                  <input type="text" className="portal-input" placeholder="e.g. Algebraic Equations" required value={formData.topic} onChange={e => setFormData({ ...formData, topic: e.target.value })} />
                </div>
                <div className="portal-form-group">
                  <label>Week Number</label>
                  <input type="number" min="1" max="52" className="portal-input" placeholder="e.g. 4" required value={formData.week} onChange={e => setFormData({ ...formData, week: e.target.value })} />
                </div>
                
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="button" className="portal-btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isSubmitting}>
                    {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : 'Save Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
