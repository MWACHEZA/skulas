import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';
import { format } from 'date-fns';
import { useTerminology } from '../../../../hooks/useTerminology';

const exportToCSV = (title: string, headers: string[], dataRows: string[][]) => {
  const content = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...dataRows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToWord = (title: string, headers: string[], dataRows: string[][]) => {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

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
  parentUser: {
    name: string;
    email: string;
  };
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:  { bg: '#fef3c7', color: '#d97706', label: 'Pending Review' },
  APPROVED: { bg: '#d1fae5', color: '#059669', label: 'Approved' },
  REJECTED: { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
  PAID:     { bg: '#dbeafe', color: '#2563eb', label: 'Paid' },
  OVERDUE:  { bg: '#fce7f3', color: '#db2777', label: 'Overdue' },
};

const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID', 'OVERDUE'];

export default function ManagePaymentPlans() {
  const { t } = useTerminology();
  const { showToast } = useToast();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Predefined templates state
  const [activeSubTab, setActiveSubTab] = useState<'applications' | 'templates'>('applications');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    amount: '',
    dueDate: '',
    notes: '',
  });

  useEffect(() => {
    fetchPlans();
    fetchTemplates();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/payment-plans/admin');
      setPlans(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast('Failed to load payment plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await api.get('/api/payment-plans/templates');
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast('Failed to load predefined plans', 'error');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.amount) {
      showToast('Name and amount are required', 'error');
      return;
    }
    try {
      const payload = {
        id: selectedTemplate?.id || undefined,
        name: templateForm.name,
        amount: parseFloat(templateForm.amount),
        dueDate: templateForm.dueDate || undefined,
        notes: templateForm.notes,
      };
      const res = await api.post('/api/payment-plans/templates', payload);
      showToast('Offered plan template saved successfully', 'success');
      if (res.data && Array.isArray(res.data.templates)) {
        setTemplates(res.data.templates);
      } else {
        fetchTemplates();
      }
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setTemplateForm({ name: '', amount: '', dueDate: '', notes: '' });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save template', 'error');
    
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!(await toastConfirm('Are you sure you want to delete this offered plan?'))) return;
    try {
      const res = await api.delete(`/api/payment-plans/templates/${id}`);
      showToast('Offered plan template deleted successfully', 'success');
      if (res.data && Array.isArray(res.data.templates)) {
        setTemplates(res.data.templates);
      } else {
        fetchTemplates();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete template', 'error');
    
    }
  };

  const openEditTemplate = (tmpl: any) => {
    setSelectedTemplate(tmpl);
    setTemplateForm({
      name: tmpl.name || '',
      amount: tmpl.amount?.toString() || '',
      dueDate: tmpl.dueDate ? new Date(tmpl.dueDate).toISOString().split('T')[0] : '',
      notes: tmpl.notes || '',
    });
    setShowTemplateModal(true);
  };

  const openCreateTemplate = () => {
    setSelectedTemplate(null);
    setTemplateForm({ name: '', amount: '', dueDate: '', notes: '' });
    setShowTemplateModal(true);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/api/payment-plans/${id}/status`, { status });
      showToast(`Payment plan ${status.toLowerCase()} successfully`, 'success');
      setPlans(prev => prev.map(p => p.id === id ? { ...p, status: status as any } : p));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update status', 'error');
    
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = plans.filter(p => {
    const matchStatus = filterStatus ? p.status === filterStatus : true;
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm
      || p.student.name.toLowerCase().includes(q)
      || p.student.studentId.toLowerCase().includes(q)
      || p.parentUser.name.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: plans.length,
    pending: plans.filter(p => p.status === 'PENDING').length,
    approved: plans.filter(p => p.status === 'APPROVED').length,
    overdue: plans.filter(p => p.status === 'OVERDUE').length,
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1><i className="fas fa-calendar-alt" style={{ marginRight: 12 }}></i>Manage Payment Plans</h1>
          <p>Review, approve, and track fee payment plan applications from {t('parents').toLowerCase()}.</p>
        </div>
        <button className="portal-btn-secondary no-print" onClick={activeSubTab === 'templates' ? fetchTemplates : fetchPlans}>
          <i className="fas fa-sync-alt" style={{ marginRight: 8 }}></i>Refresh
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="portal-tab-container no-print" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
        <button
          onClick={() => setActiveSubTab('applications')}
          style={{
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: 800,
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'applications' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeSubTab === 'applications' ? '#2563eb' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Parent Applications
        </button>
        <button
          onClick={() => setActiveSubTab('templates')}
          style={{
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: 800,
            border: 'none',
            background: 'none',
            borderBottom: activeSubTab === 'templates' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeSubTab === 'templates' ? '#2563eb' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Offered Plans
        </button>
      </div>

      {activeSubTab === 'templates' ? (
        <div className="portal-card animate-in fade-in duration-300">
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 24, borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Offered Payment Plan Templates</h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Predefined payment structures available for parents to choose.</span>
            </div>
            <button
              onClick={openCreateTemplate}
              className="portal-btn-primary"
              style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <i className="fas fa-plus"></i> Add Offered Plan
            </button>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {loadingTemplates ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: '#2563eb' }}></i>
              </div>
            ) : templates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <i className="fas fa-clipboard-list" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16, display: 'block' }}></i>
                <h3 style={{ color: '#64748b', margin: '0 0 8px', fontWeight: 800 }}>No Offered Plans Formulated</h3>
                <p style={{ color: '#94a3b8', margin: 0, fontWeight: 600 }}>Create templates that parents can immediately adopt for automated approval.</p>
              </div>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Plan Name</th>
                    <th>Standard Amount</th>
                    <th>Fixed Due Date</th>
                    <th>Notes & Description</th>
                    <th style={{ width: '150px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((tmpl: any) => (
                    <tr key={tmpl.id}>
                      <td style={{ fontWeight: 700, color: '#1e293b' }}>{tmpl.name}</td>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>${Number(tmpl.amount).toFixed(2)}</td>
                      <td>{tmpl.dueDate ? format(new Date(tmpl.dueDate), 'dd MMM yyyy') : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Flexible / Immediate</span>}</td>
                      <td style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tmpl.notes}>
                        {tmpl.notes || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="portal-btn-ghost"
                            style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Edit"
                            onClick={() => openEditTemplate(tmpl)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="portal-btn-ghost"
                            style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Delete"
                            onClick={() => handleDeleteTemplate(tmpl.id)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }} className="no-print animate-in fade-in duration-300">
            {[
              { label: 'Total Plans', value: stats.total, icon: 'fa-list', color: '#2563eb', bg: '#dbeafe' },
              { label: 'Pending Review', value: stats.pending, icon: 'fa-clock', color: '#d97706', bg: '#fef3c7' },
              { label: 'Approved', value: stats.approved, icon: 'fa-check-circle', color: '#059669', bg: '#d1fae5' },
              { label: 'Overdue', value: stats.overdue, icon: 'fa-exclamation-triangle', color: '#db2777', bg: '#fce7f3' },
            ].map(stat => (
              <div key={stat.label} className="portal-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fas ${stat.icon}`} style={{ color: stat.color, fontSize: 22 }}></i>
                </div>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginTop: 4 }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="portal-card no-print" style={{ marginBottom: 20 }}>
            <div className="portal-card-body" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', padding: '16px 20px' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <input
                  type="text"
                  className="portal-input"
                  placeholder={`Search by ${t('student').toLowerCase()} name, ID, or ${t('parent').toLowerCase()}...`}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ margin: 0 }}
                />
              </div>
              <select
                className="portal-input"
                style={{ width: 200, margin: 0 }}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                {VALID_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_COLORS[s]?.label || s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="portal-card animate-in fade-in duration-300">
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, paddingBottom: 24, borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>Payment Plan Applications</h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{filtered.length} result(s)</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }} className="no-print">
                <button 
                  onClick={() => {
                    const headers = [`${t('student')}`, `${t('parent')}`, 'Amount', 'Promised Date', 'Applied Date', 'Status'];
                    const rows = filtered.map(plan => [
                      `${plan.student.name} (${plan.student.studentId})`,
                      `${plan.parentUser.name} (${plan.parentUser.email})`,
                      `$${Number(plan.amount).toFixed(2)}`,
                      format(new Date(plan.dueDate), 'dd MMM yyyy'),
                      format(new Date(plan.createdAt), 'dd MMM yyyy'),
                      plan.status
                    ]);
                    exportToCSV('Payment_Plan_Applications', headers, rows);
                  }}
                  className="portal-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  title="Export to CSV"
                >
                  <i className="fas fa-file-csv mr-1"></i> CSV
                </button>
                <button 
                  onClick={() => {
                    const headers = [`${t('student')}`, `${t('parent')}`, 'Amount', 'Promised Date', 'Applied Date', 'Status'];
                    const rows = filtered.map(plan => [
                      `${plan.student.name} (${plan.student.studentId})`,
                      `${plan.parentUser.name} (${plan.parentUser.email})`,
                      `$${Number(plan.amount).toFixed(2)}`,
                      format(new Date(plan.dueDate), 'dd MMM yyyy'),
                      format(new Date(plan.createdAt), 'dd MMM yyyy'),
                      plan.status
                    ]);
                    exportToWord('Payment_Plan_Applications', headers, rows);
                  }}
                  className="portal-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  title="Export to Word"
                >
                  <i className="fas fa-file-word mr-1"></i> Word
                </button>
                <button 
                  onClick={() => window.print()}
                  className="portal-btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  title="Print / PDF"
                >
                  <i className="fas fa-print mr-1"></i> Print/PDF
                </button>
              </div>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: 32, color: '#2563eb' }}></i>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <i className="fas fa-inbox" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16, display: 'block' }}></i>
                  <h3 style={{ color: '#64748b', margin: '0 0 8px', fontWeight: 800 }}>No Payment Plans Found</h3>
                  <p style={{ color: '#94a3b8', margin: 0, fontWeight: 600 }}>
                    {filterStatus || searchTerm ? 'Try adjusting your filters.' : 'No applications have been submitted yet.'}
                  </p>
                </div>
              ) : (
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>{t('student')}</th>
                      <th>{t('parent')} / Guardian</th>
                      <th>Amount</th>
                      <th>Promised Date</th>
                      <th>Applied</th>
                      <th>Status</th>
                      <th className="no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(plan => {
                      const statusStyle = STATUS_COLORS[plan.status];
                      const isUpdating = updatingId === plan.id;
                      const isOverdue = plan.status === 'OVERDUE';
                      return (
                        <tr key={plan.id} style={{ background: isOverdue ? '#fff1f2' : undefined }}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{plan.student.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                              {plan.student.studentId}
                              {plan.student.class ? ` · ${plan.student.class.name}` : ''}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{plan.parentUser.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{plan.parentUser.email}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: '#1e293b' }}>${Number(plan.amount).toFixed(2)}</td>
                          <td>
                            <span style={{ color: isOverdue ? '#dc2626' : 'inherit', fontWeight: isOverdue ? 700 : 400 }}>
                              {format(new Date(plan.dueDate), 'dd MMM yyyy')}
                              {isOverdue && <><br /><small style={{ color: '#dc2626', fontWeight: 800 }}>(Overdue!)</small></>}
                            </span>
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{format(new Date(plan.createdAt), 'dd MMM yyyy')}</td>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem',
                              fontWeight: 700, background: statusStyle.bg, color: statusStyle.color
                            }}>
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="no-print">
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {plan.status === 'PENDING' && (
                                <>
                                  <button
                                    className="portal-btn-primary"
                                    style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 800 }}
                                    disabled={isUpdating}
                                    onClick={() => updateStatus(plan.id, 'APPROVED')}
                                  >
                                    {isUpdating ? <i className="fas fa-spinner fa-spin"></i> : 'Approve'}
                                  </button>
                                  <button
                                    className="portal-btn-danger"
                                    style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 800 }}
                                    disabled={isUpdating}
                                    onClick={() => updateStatus(plan.id, 'REJECTED')}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {plan.status === 'APPROVED' && (
                                <button
                                  className="portal-btn-primary"
                                  style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#059669', fontWeight: 800 }}
                                  disabled={isUpdating}
                                  onClick={() => updateStatus(plan.id, 'PAID')}
                                >
                                  {isUpdating ? <i className="fas fa-spinner fa-spin"></i> : 'Mark as Paid'}
                                </button>
                              )}
                              {plan.status === 'OVERDUE' && (
                                <button
                                  className="portal-btn-danger"
                                  style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 800 }}
                                  disabled
                                 onClick={() => alert('This feature is currently under development or disabled.')}>
                                  <i className="fas fa-flag" style={{ marginRight: 4 }}></i>Flagged
                                </button>
                              )}
                              {(plan.status === 'PAID' || plan.status === 'REJECTED') && (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic', fontWeight: 600 }}>No action needed</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Template Creator/Editor Modal */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="portal-card animate-in zoom-in duration-200" style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 24px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div className="portal-card-header" style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #1e40af, #2563eb)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#fff', margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>
                <i className="fas fa-file-invoice-dollar mr-2"></i>
                {selectedTemplate ? 'Edit Offered Plan' : 'Add Offered Plan'}
              </h2>
              <button onClick={() => setShowTemplateModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="portal-card-body" style={{ padding: '32px', overflowY: 'auto' }}>
              <form onSubmit={handleSaveTemplate}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="portal-label">Plan Name *</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. Term 1 Balanced Instalment"
                    value={templateForm.name}
                    onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                    style={{ margin: 0 }}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="portal-label">Amount ($) *</label>
                  <input
                    type="number"
                    className="portal-input"
                    placeholder="e.g. 600"
                    value={templateForm.amount}
                    onChange={e => setTemplateForm(f => ({ ...f, amount: e.target.value }))}
                    min={1}
                    step={0.01}
                    style={{ margin: 0 }}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="portal-label">Due Date (Optional)</label>
                  <input
                    type="date"
                    className="portal-input"
                    value={templateForm.dueDate}
                    onChange={e => setTemplateForm(f => ({ ...f, dueDate: e.target.value }))}
                    style={{ margin: 0 }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="portal-label">Description / Instructions</label>
                  <textarea
                    className="portal-input"
                    placeholder="Provide details about the schedule, instalments, or policies..."
                    value={templateForm.notes}
                    onChange={e => setTemplateForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ minHeight: '100px', resize: 'vertical', width: '100%', padding: '12px', margin: 0 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" className="portal-btn-secondary" onClick={() => setShowTemplateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="portal-btn-primary" style={{ background: '#2563eb', borderColor: '#2563eb' }}>
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
