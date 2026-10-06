import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import api from '../../../../lib/api';
import { useTerminology } from '../../../../hooks/useTerminology';
import { useToast } from '../../../../context/ToastContext';

interface AwardEntry {
  id: string;
  awardName: string;
  title?: string;
  gift?: string;
  reason?: string;
  amount: number;
  date: string;
  awardType: string;
  rewardType: string;
  fundingSource: string;
  status?: string;
  complianceOverrideReason?: string | null;
  payrollAllowanceCreated?: boolean;
  user?: { name: string; email?: string };
  employee?: { name: string; email?: string };
}

interface FormValues {
  userId: string;
  awardType: string;
  title: string;
  rewardType: string;
  amount: number;
  giftDescription: string;
  fundingSource: string;
  reason: string;
  complianceOverrideReason: string;
  addToPayroll: boolean;
  date: string;
}

const AWARD_CATEGORIES = [
  'Best Teacher',
  'Long Service',
  'Attendance',
  'Innovation',
  'Employee of the Month',
  'Recognition'
];

const REWARD_TYPES = ['Certificate Only', 'Cash Bonus', 'Gift'];
const FUNDING_SOURCES = ['School Income', 'Donor', 'Governance Fund'];

export default function ManageAwards() {
  const { showToast } = useToast();
  const { t } = useTerminology();
  const [awards, setAwards] = useState<AwardEntry[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { register, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: {
      awardType: 'Recognition',
      rewardType: 'Certificate Only',
      fundingSource: 'School Income',
      amount: 0,
      addToPayroll: true,
      date: format(new Date(), 'yyyy-MM-dd')
    }
  });

  const selectedRewardType = watch('rewardType');
  const selectedFundingSource = watch('fundingSource');

  useEffect(() => {
    fetchOptions();
    fetchAwards();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await api.get('/api/payroll/employees');
      setEmployees(res.data);
    } catch (error) {
      console.error('Failed to fetch employees', error);
    }
  };

  const fetchAwards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/awards');
      setAwards(response.data);
    } catch (error) {
      console.error('Failed to fetch awards', error);
      showToast('Failed to load awards registry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    const isGovFundCashBonus = data.fundingSource === 'Governance Fund' && data.rewardType === 'Cash Bonus';
    if (isGovFundCashBonus && (!data.complianceOverrideReason || data.complianceOverrideReason.trim().length === 0)) {
      showToast('Compliance Warning: An explicit justification reason is required when granting cash bonuses from Governance Funds.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employeeId: data.userId,
        userId: data.userId,
        awardType: data.awardType,
        title: data.title,
        awardName: data.title,
        rewardType: data.rewardType,
        amount: data.rewardType === 'Cash Bonus' ? parseFloat(String(data.amount)) || 0 : 0,
        gift: data.giftDescription || '',
        reason: data.reason || data.giftDescription || '',
        fundingSource: data.fundingSource,
        complianceOverrideReason: data.complianceOverrideReason || null,
        addToPayroll: data.addToPayroll,
        date: data.date
      };

      if (editingId) {
        await api.put(`/api/awards/${editingId}`, payload);
        showToast('Award record updated successfully!', 'success');
      } else {
        await api.post('/api/awards', payload);
        showToast(
          data.rewardType === 'Cash Bonus' && data.addToPayroll
            ? 'Award saved and tagged for taxable inclusion in next payroll run!'
            : 'Award saved successfully!',
          'success'
        );
      }
      reset();
      fetchAwards();
      setShowAddModal(false);
      setEditingId(null);
    } catch (error: any) {
      console.error('Failed to save award', error);
      showToast(error.response?.data?.message || 'Failed to save award.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAward = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this award record?')) {
      try {
        await api.delete(`/api/awards/${id}`);
        showToast('Award deleted successfully', 'success');
        fetchAwards();
      } catch (error) {
        showToast('Failed to delete award', 'error');
      }
    }
  };

  const handleEdit = (award: AwardEntry) => {
    setEditingId(award.id);
    reset({
      userId: award.user?.name || '',
      awardType: award.awardType || 'Recognition',
      title: award.title || award.awardName,
      rewardType: award.rewardType || 'Certificate Only',
      amount: award.amount || 0,
      giftDescription: award.gift || '',
      fundingSource: award.fundingSource || 'School Income',
      reason: award.reason || '',
      complianceOverrideReason: award.complianceOverrideReason || '',
      addToPayroll: !award.payrollAllowanceCreated,
      date: award.date ? format(new Date(award.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    });
    setShowAddModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredAwards = awards.filter(a => {
    const matchesCategory = categoryFilter === 'ALL' || a.awardType === categoryFilter;
    const matchesSearch =
      !searchQuery ||
      (a.title || a.awardName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.user?.name || a.employee?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.fundingSource || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredAwards.length / itemsPerPage);
  const paginatedAwards = filteredAwards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportExcel = () => {
    const headers = ['Award Title', 'Category', 'Recipient Staff', 'Reward Type', 'Amount ($)', 'Funding Source', 'Payroll Linked', 'Date'];
    const rows = filteredAwards.map(a => [
      a.title || a.awardName || '',
      a.awardType || 'Recognition',
      a.user?.name || a.employee?.name || 'N/A',
      a.rewardType || 'Certificate Only',
      a.amount?.toString() || '0',
      a.fundingSource || 'School Income',
      a.rewardType === 'Cash Bonus' ? (a.payrollAllowanceCreated ? 'Processed' : 'Pending') : 'N/A',
      new Date(a.date).toLocaleDateString()
    ]);
    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `staff_awards_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportWord = () => {
    const rows = filteredAwards
      .map(
        a => `
      <tr>
        <td style="border: 1px solid #cccccc; padding: 8px;">${a.title || a.awardName || ''}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${a.awardType || 'Recognition'}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${a.user?.name || a.employee?.name || 'N/A'}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${a.rewardType || 'Certificate Only'}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">$${(a.amount || 0).toFixed(2)}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${a.fundingSource || 'School Income'}</td>
        <td style="border: 1px solid #cccccc; padding: 8px;">${new Date(a.date).toLocaleDateString()}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>Staff Awards Records</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cccccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Staff Awards Registry</h2>
          <table>
            <thead>
              <tr>
                <th>Award Title</th>
                <th>Category</th>
                <th>Recipient Staff</th>
                <th>Reward Type</th>
                <th>Amount</th>
                <th>Funding Source</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `staff_awards_registry_${new Date().toISOString().slice(0, 10)}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Action */}
      <div className="portal-card" style={{ width: '100%' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.5rem' }}>🏆</span>
              <h3 style={{ margin: 0 }}>STAFF AWARDS &amp; RECOGNITION REGISTRY</h3>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
              Track {t('staff').toLowerCase()} honours, monetary bonuses, and governance fund compliance
            </p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              reset({
                awardType: 'Recognition',
                rewardType: 'Certificate Only',
                fundingSource: 'School Income',
                amount: 0,
                addToPayroll: true,
                date: format(new Date(), 'yyyy-MM-dd')
              });
              setShowAddModal(true);
            }}
            className="portal-btn-primary"
            style={{ padding: '0 28px', fontWeight: 800, height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <i className="fas fa-plus-circle"></i> CONFER {t('staff').toUpperCase()} AWARD
          </button>
        </div>

        <div style={{ marginTop: '20px' }}>
          {/* Controls: Exports, Filters, Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleExportExcel} className="portal-btn-neutral" style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-file-excel" style={{ color: '#16a34a' }}></i> Excel
              </button>
              <button onClick={handleExportWord} className="portal-btn-neutral" style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-file-word" style={{ color: '#2563eb' }}></i> Word
              </button>
              <button onClick={handlePrint} className="portal-btn-neutral" style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-print"></i> Print
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <select
                value={categoryFilter}
                onChange={e => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="portal-input"
                style={{ padding: '8px 12px', fontSize: '0.85rem', minWidth: '150px' }}
              >
                <option value="ALL">All Categories</option>
                {AWARD_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Search staff or award..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="portal-input"
                  style={{ width: '200px', padding: '8px 12px', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="management-table">
              <thead>
                <tr>
                  <th>AWARD TITLE</th>
                  <th>CATEGORY</th>
                  <th>RECIPIENT {t('staff').toUpperCase()}</th>
                  <th>REWARD TYPE</th>
                  <th>FUNDING SOURCE</th>
                  <th>PAYROLL LINK</th>
                  <th>DATE</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Loading awards registry...
                    </td>
                  </tr>
                ) : paginatedAwards.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <i className="fas fa-award fa-3x" style={{ color: '#cbd5e1' }}></i>
                        <span>No awards records found matching criteria</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAwards.map(award => {
                    const staffName = award.user?.name || award.employee?.name || 'Unknown Staff';
                    const isCash = award.rewardType === 'Cash Bonus';
                    return (
                      <tr key={award.id}>
                        <td style={{ fontWeight: 600, color: '#1e293b' }}>
                          <div>{award.title || award.awardName}</div>
                          {award.reason && (
                            <small style={{ color: '#64748b', fontWeight: 400, display: 'block', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {award.reason}
                            </small>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#1d4ed8'
                            }}
                          >
                            {award.awardType || 'Recognition'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{staffName}</td>
                        <td>
                          {isCash ? (
                            <span style={{ fontWeight: 700, color: '#16a34a' }}>
                              💵 ${award.amount.toFixed(2)} Cash
                            </span>
                          ) : award.rewardType === 'Gift' ? (
                            <span style={{ color: '#d97706', fontWeight: 600 }}>
                              🎁 {award.gift || 'Gift'}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b' }}>📜 Certificate</span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background:
                                award.fundingSource === 'Governance Fund'
                                  ? '#fef3c7'
                                  : award.fundingSource === 'Donor'
                                  ? '#f3e8ff'
                                  : '#f1f5f9',
                              color:
                                award.fundingSource === 'Governance Fund'
                                  ? '#b45309'
                                  : award.fundingSource === 'Donor'
                                  ? '#7e22ce'
                                  : '#334155'
                            }}
                          >
                            {award.fundingSource}
                          </span>
                          {award.complianceOverrideReason && (
                            <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: '2px' }} title={award.complianceOverrideReason}>
                              <i className="fas fa-shield-alt"></i> Override Logged
                            </div>
                          )}
                        </td>
                        <td>
                          {isCash ? (
                            award.payrollAllowanceCreated ? (
                              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                                <i className="fas fa-check-circle"></i> In Payroll
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 600 }}>
                                <i className="fas fa-clock"></i> Queued for Next Run
                              </span>
                            )
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{award.date ? format(new Date(award.date), 'dd/MM/yyyy') : 'N/A'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                            <button
                              className="portal-btn-ghost"
                              style={{ padding: '6px', width: '32px', height: '32px', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => handleEdit(award)}
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="portal-btn-ghost"
                              style={{ padding: '6px', width: '32px', height: '32px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => deleteAward(award.id)}
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', color: '#64748b', fontSize: '0.9rem' }}>
              <span>
                Showing {filteredAwards.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAwards.length)} of {filteredAwards.length} entries
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  Previous
                </button>
                <button className="portal-btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} disabled={currentPage >= totalPages || filteredAwards.length === 0} onClick={() => setCurrentPage(p => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Award Modal */}
      {showAddModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '640px', width: '95%' }}>
            <div className="portal-modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  {editingId ? 'EDIT' : 'CONFER'} {t('staff').toUpperCase()} AWARD
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Acknowledge outstanding contribution, long service, or special achievement
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingId(null);
                }}
                className="portal-btn-ghost"
                style={{ padding: '6px', minWidth: 'auto' }}
              >
                <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
              </button>
            </div>

            <div className="portal-modal-body" style={{ maxHeight: '78vh', overflowY: 'auto', padding: '16px 4px' }}>
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Staff Member */}
                <div>
                  <label className="portal-label">Recipient {t('staff')} <span style={{ color: 'red' }}>*</span></label>
                  <select {...register('userId', { required: true })} className="portal-input">
                    <option value="">Select recipient member</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {/* Category */}
                  <div>
                    <label className="portal-label">Award Category <span style={{ color: 'red' }}>*</span></label>
                    <select {...register('awardType', { required: true })} className="portal-input">
                      {AWARD_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reward Type */}
                  <div>
                    <label className="portal-label">Reward Form <span style={{ color: 'red' }}>*</span></label>
                    <select {...register('rewardType', { required: true })} className="portal-input">
                      {REWARD_TYPES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Award Title */}
                <div>
                  <label className="portal-label">Award Title / Citation <span style={{ color: 'red' }}>*</span></label>
                  <input
                    {...register('title', { required: true })}
                    type="text"
                    placeholder="e.g. Teacher of the Year — Science Department"
                    className="portal-input"
                  />
                </div>

                {/* Conditional Fields based on Reward Type */}
                {selectedRewardType === 'Cash Bonus' && (
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="portal-label">Cash Bonus Amount ($ USD) <span style={{ color: 'red' }}>*</span></label>
                      <input
                        {...register('amount', { required: true, min: 1 })}
                        type="number"
                        step="0.01"
                        placeholder="e.g. 150.00"
                        className="portal-input"
                      />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#1e293b', cursor: 'pointer' }}>
                      <input type="checkbox" {...register('addToPayroll')} style={{ width: '18px', height: '18px' }} />
                      <span>Include as taxable bonus allowance in next payroll run (PAYE / NSSA applicable)</span>
                    </label>
                  </div>
                )}

                {selectedRewardType === 'Gift' && (
                  <div>
                    <label className="portal-label">Gift Description</label>
                    <input
                      {...register('giftDescription')}
                      type="text"
                      placeholder="e.g. Engraved Parker Pen & Shield Trophy"
                      className="portal-input"
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {/* Funding Source */}
                  <div>
                    <label className="portal-label">Funding Source <span style={{ color: 'red' }}>*</span></label>
                    <select {...register('fundingSource', { required: true })} className="portal-input">
                      {FUNDING_SOURCES.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="portal-label">Conferred Date</label>
                    <input {...register('date')} type="date" className="portal-input" />
                  </div>
                </div>

                {/* Governance Fund Compliance Warning if applicable */}
                {selectedFundingSource === 'Governance Fund' && selectedRewardType === 'Cash Bonus' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700, fontSize: '0.9rem' }}>
                      <i className="fas fa-exclamation-triangle"></i> Governance Fund Statutory Compliance Notice
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#78350f', lineHeight: 1.4 }}>
                      SDC / Governance Levies are earmarked for institutional governance. Funding discretionary staff cash bonuses from this levy requires an explicit audit justification that will be logged in the immutable security audit trail.
                    </p>
                    <div style={{ marginTop: '4px' }}>
                      <label className="portal-label" style={{ color: '#92400e' }}>
                        Compliance Justification Reason <span style={{ color: 'red' }}>*</span>
                      </label>
                      <textarea
                        {...register('complianceOverrideReason', { required: selectedFundingSource === 'Governance Fund' && selectedRewardType === 'Cash Bonus' })}
                        rows={2}
                        className="portal-input"
                        placeholder="State the AGM minute or governance resolution authorizing this staff bonus..."
                      />
                    </div>
                  </div>
                )}

                {/* Reason / Citation Notes */}
                <div>
                  <label className="portal-label">Citation / Justification Notes</label>
                  <textarea
                    {...register('reason')}
                    rows={2}
                    className="portal-input"
                    placeholder="Details of achievements, milestones reached, or committee commendation..."
                  />
                </div>

                {/* Submit Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingId(null);
                    }}
                    className="portal-btn-neutral"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={submitting}
                    type="submit"
                    className="portal-btn-primary"
                    style={{
                      height: '48px',
                      padding: '0 24px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {submitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                    {editingId ? 'UPDATE AWARD' : 'RECORD AWARD'}
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
