import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { format } from 'date-fns';
import { useTerminology } from '../../../hooks/useTerminology';
import EmptyState from '../../../components/shared/EmptyState';

interface Student {
  id: string;
  name: string;
  studentId: string;
  class?: { name: string };
}

interface PaymentPlan {
  id: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'OVERDUE';
  notes: string;
  createdAt: string;
  student: {
    name: string;
    studentId: string;
    class?: { name: string };
  };
}

const STATUS_COLORS: Record<string, { bg: string; color: string; icon: string }> = {
  PENDING:  { bg: '#fef3c7', color: '#d97706', icon: 'fa-clock' },
  APPROVED: { bg: '#d1fae5', color: '#059669', icon: 'fa-check-circle' },
  REJECTED: { bg: '#fee2e2', color: '#dc2626', icon: 'fa-times-circle' },
  PAID:     { bg: '#dbeafe', color: '#2563eb', icon: 'fa-check-double' },
  OVERDUE:  { bg: '#fce7f3', color: '#db2777', icon: 'fa-exclamation-triangle' },
};

export default function ParentPaymentPlans() {
  const { t } = useTerminology();
  const { showToast } = useToast();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [planType, setPlanType] = useState<'predefined' | 'custom'>('predefined');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const [form, setForm] = useState({
    studentId: '',
    amount: '',
    dueDate: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, studentsRes, templatesRes] = await Promise.all([
        api.get('/api/payment-plans/my'),
        api.get('/api/students/my-children'),
        api.get('/api/payment-plans/templates'),
      ]);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
      
      const tmplList = Array.isArray(templatesRes.data) ? templatesRes.data : [];
      setTemplates(tmplList);
      if (tmplList.length === 0) {
        setPlanType('custom');
      } else {
        setPlanType('predefined');
      }
    } catch {
      showToast("We couldn't load your payment plans right now. Please check your internet connection and try refreshing.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find((t: any) => t.id === id);
    if (tmpl) {
      setForm(f => ({
        ...f,
        amount: tmpl.amount?.toString() || '',
        dueDate: tmpl.dueDate ? new Date(tmpl.dueDate).toISOString().split('T')[0] : '',
        notes: tmpl.notes || '',
      }));
    } else {
      setForm(f => ({ ...f, amount: '', dueDate: '', notes: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.amount || !form.dueDate) {
      showToast('Please select a student, enter an amount, and choose a due date before submitting.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/payment-plans', {
        studentId: form.studentId,
        amount: parseFloat(form.amount),
        dueDate: form.dueDate,
        notes: form.notes,
        isPredefined: planType === 'predefined',
      });
      showToast(
        planType === 'predefined' 
          ? 'Payment plan activated successfully!' 
          : 'Payment plan submitted successfully! Awaiting admin approval.', 
        'success'
      );
      setShowForm(false);
      setForm({ studentId: '', amount: '', dueDate: '', notes: '' });
      setSelectedTemplateId('');
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit payment plan', 'error');
    
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1><i className="fas fa-calendar-check" style={{ marginRight: 12 }}></i>Payment Plans</h1>
          <p>Apply for a fee payment plan and track your existing applications.</p>
        </div>
        <button className="portal-btn-primary" onClick={() => setShowForm(!showForm)}>
          <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: 8 }}></i>
          {showForm ? 'Cancel' : 'Apply for Payment Plan'}
        </button>
      </div>

      {/* Application Form */}
      {showForm && (
        <div className="portal-card" style={{ marginBottom: 24, border: '2px solid #2563eb', borderRadius: 16, overflow: 'hidden' }}>
          <div className="portal-card-header" style={{ background: 'linear-gradient(135deg, #1e40af, #2563eb)', color: '#fff' }}>
            <h2 style={{ color: '#fff', margin: 0 }}>
              <i className="fas fa-file-alt" style={{ marginRight: 10 }}></i>
              New Payment Plan Application
            </h2>
          </div>
          <div className="portal-card-body">
            <div style={{ background: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '12px 16px', borderRadius: '0 8px 8px 0', marginBottom: 24 }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#1d4ed8', fontWeight: 600 }}>
                <i className="fas fa-info-circle" style={{ marginRight: 8 }}></i>
                Once submitted, your application will be reviewed by the school administration. 
                If approved, your child / {t('student').toLowerCase()} will be permitted entry under the payment plan terms.
                Failure to pay by the promised date will flag the system and may result in denial of entry.
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="portal-grid-2" style={{ gap: 20 }}>
                
                {/* Plan type selection */}
                <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 12 }}>
                  <label className="portal-label">Plan Option Type</label>
                  <div style={{ display: 'flex', gap: 24, marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: templates.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, color: templates.length === 0 ? '#94a3b8' : '#1e293b' }}>
                      <input
                        type="radio"
                        name="planType"
                        value="predefined"
                        checked={planType === 'predefined'}
                        onChange={() => {
                          setPlanType('predefined');
                          setSelectedTemplateId('');
                          setForm(f => ({ ...f, amount: '', dueDate: '', notes: '' }));
                        }}
                        disabled={templates.length === 0}
                        style={{ width: 18, height: 18 }}
                      />
                      Offered School Payment Plans {templates.length === 0 && '(None Available)'}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, color: '#1e293b' }}>
                      <input
                        type="radio"
                        name="planType"
                        value="custom"
                        checked={planType === 'custom'}
                        onChange={() => {
                          setPlanType('custom');
                          setSelectedTemplateId('');
                          setForm(f => ({ ...f, amount: '', dueDate: '', notes: '' }));
                        }}
                        style={{ width: 18, height: 18 }}
                      />
                      Custom Payment Plan Request
                    </label>
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="portal-label">Child / {t('student')} *</label>
                  <select
                    className="portal-input"
                    value={form.studentId}
                    onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                    required
                  >
                    <option value="">Select a {t('student').toLowerCase()}</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.studentId}) {s.class ? `- ${s.class.name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {planType === 'predefined' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="portal-label">Select Pre-configured Plan *</label>
                    <select
                      className="portal-input"
                      value={selectedTemplateId}
                      onChange={e => handleSelectTemplate(e.target.value)}
                      required={planType === 'predefined'}
                    >
                      <option value="">-- Select an offered plan --</option>
                      {templates.map(tmpl => (
                        <option key={tmpl.id} value={tmpl.id}>
                          {tmpl.name} - ${Number(tmpl.amount).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="portal-label">Amount to be Paid ($) *</label>
                  <input
                    type="text" inputMode="decimal" pattern="[0-9]*"
                    className="portal-input"
                    placeholder="e.g. 500"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    min={1}
                    step={0.01}
                    disabled={planType === 'predefined'}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="portal-label">Promised Payment Date *</label>
                  <input
                    type="date"
                    className="portal-input"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    disabled={planType === 'predefined' && !!templates.find(t => t.id === selectedTemplateId)?.dueDate}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="portal-label">Reason / Additional Notes</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="Briefly explain your situation..."
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    disabled={planType === 'predefined'}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" disabled={submitting}>
                  {submitting ? (
                    <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Submitting...</>
                  ) : (
                    <><i className="fas fa-paper-plane" style={{ marginRight: 8 }}></i>Submit Application</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plans List */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h2>My Payment Plan Applications</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{plans.length} application(s)</span>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: '#2563eb' }}></i>
              <p style={{ marginTop: 16, color: '#64748b' }}>Loading your payment plans...</p>
            </div>
          ) : plans.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState 
                icon="fas fa-file-invoice-dollar" 
                title="No Payment Plans Yet" 
                description="You haven't requested any payment plans. Click 'Apply for Payment Plan' to submit your first application if you need extra time to settle fees."
              />
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>{t('student')}</th>
                  <th>Amount</th>
                  <th>Promised Date</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => {
                  const statusStyle = STATUS_COLORS[plan.status] || STATUS_COLORS.PENDING;
                  return (
                    <tr key={plan.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{plan.student.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{plan.student.studentId}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#1e293b' }}>${Number(plan.amount).toFixed(2)}</td>
                      <td>{format(new Date(plan.dueDate), 'dd MMM yyyy')}</td>
                      <td>{format(new Date(plan.createdAt), 'dd MMM yyyy')}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem',
                          fontWeight: 700, background: statusStyle.bg, color: statusStyle.color
                        }}>
                          <i className={`fas ${statusStyle.icon}`}></i>
                          {plan.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.85rem' }}>
                        {plan.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      <div style={{
        marginTop: 20, padding: '16px 20px', borderRadius: 12,
        background: '#fff7ed', border: '1px solid #fed7aa',
        display: 'flex', alignItems: 'flex-start', gap: 12
      }}>
        <i className="fas fa-exclamation-triangle" style={{ color: '#d97706', marginTop: 2, flexShrink: 0 }}></i>
        <div>
          <strong style={{ color: '#92400e' }}>Important: Payment Plan Terms</strong>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#92400e' }}>
            If a payment plan is approved and payment is not made by the promised date, the system will automatically flag the account as overdue.
            Your child / {t('student').toLowerCase()} may be denied entry until the outstanding fees are settled or a new plan is approved.
          </p>
        </div>
      </div>
    </div>
  );
}
