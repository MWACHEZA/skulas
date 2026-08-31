import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { useTerminology } from '../../../hooks/useTerminology';
import '../../../styles/portal.css';

interface FeeGroup {
  id: string;
  name: string;
}

interface CoaAccount {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface AllocationItem {
  accountId: string;
  percentage: number;
  label?: string;
  account?: CoaAccount;
}

interface RevenueAllocation {
  id: string;
  name: string;
  schoolYear: number;
  period: string;
  isActive: boolean;
  breakdown: AllocationItem[];
  feeGroups: { id: string; name: string }[];
}

export default function RevenueAllocationPage() {
  const { t, isUniversity, isPoly, isMedical, isSeminary } = useTerminology();
  const isSemester = isUniversity || isPoly || isMedical || isSeminary;
  const [allocations, setAllocations] = useState<RevenueAllocation[]>([]);
  const [feeGroups, setFeeGroups] = useState<FeeGroup[]>([]);
  const [coaAccounts, setCoaAccounts] = useState<CoaAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    schoolYear: new Date().getFullYear(),
    period: 'Term 1',
    breakdown: [{ accountId: '', percentage: 0 }],
    feeGroupIds: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      period: isSemester ? 'Semester 1' : 'Term 1'
    }));
  }, [isSemester]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allocRes, groupRes, coaRes] = await Promise.all([
        api.get('/api/finance/revenue-allocations'),
        api.get('/api/fees/groups'),
        api.get('/api/accounts/coa')
      ]);
      setAllocations(Array.isArray(allocRes.data) ? allocRes.data : []);
      setFeeGroups(Array.isArray(groupRes.data) ? groupRes.data : []);
      setCoaAccounts(Array.isArray(coaRes.data) ? coaRes.data : []);
    } catch (err) {
      console.error('fetchData error:', err);
      toast.error('Failed to synchronize financial allocation data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      breakdown: [...formData.breakdown, { accountId: '', percentage: 0 }]
    });
  };

  const handleUpdateItem = (index: number, field: keyof AllocationItem, value: string | number) => {
    const newBreakdown = [...formData.breakdown];
    newBreakdown[index] = { ...newBreakdown[index], [field]: value };
    setFormData({ ...formData, breakdown: newBreakdown });
  };

  const handleUpdateAccount = (index: number, accountId: string) => {
    handleUpdateItem(index, 'accountId', accountId);
  };

  const handleUpdatePercentage = (index: number, percentage: number) => {
    handleUpdateItem(index, 'percentage', percentage);
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      breakdown: formData.breakdown.filter((_, i) => i !== index)
    });
  };

  const handleToggleGroup = (groupId: string) => {
    const current = formData.feeGroupIds;
    if (current.includes(groupId)) {
      setFormData({ ...formData, feeGroupIds: current.filter(id => id !== groupId) });
    } else {
      setFormData({ ...formData, feeGroupIds: [...current, groupId] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const total = formData.breakdown.reduce((sum, item) => sum + Number(item.percentage), 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`Aggregate percentage must exactly equal 100% (Current Strategy: ${total}%)`);
      return;
    }

    try {
      const { data } = await api.post('/api/finance/revenue-allocations', formData);
      setAllocations([data, ...allocations]);
      setShowAdd(false);
      setFormData({
        name: '',
        schoolYear: new Date().getFullYear(),
        period: isSemester ? 'Semester 1' : 'Term 1',
        breakdown: [{ accountId: '', percentage: 0 }],
        feeGroupIds: []
      });
      toast.success('Strategic revenue allocation rule created');
    } catch (error: unknown) {
      const errRes = error as { response?: { data?: { error?: string } } };
      toast.error(errRes.response?.data?.error || 'Failed to create allocation strategy');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/finance/revenue-allocations/${id}/toggle`, { isActive: !currentStatus });
      setAllocations(allocations.map(a => a.id === id ? { ...a, isActive: !currentStatus } : a));
      toast.success(`Strategy ${!currentStatus ? 'activated' : 'deactivated'} for current fiscal cycle`);
    } catch (err) {
      console.error('handleToggleActive error:', err);
      toast.error('Failed to update strategy status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this revenue allocation strategy? This action cannot be undone.')) return;
    try {
      await api.delete(`/api/finance/revenue-allocations/${id}`);
      setAllocations(allocations.filter(a => a.id !== id));
      toast.success('Allocation strategy removed');
    } catch (err) {
      console.error('handleDelete error:', err);
      toast.error('Failed to delete allocation strategy');
    }
  };


  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Revenue Allocation Strategy</h1>
          <p>Configure strategic disbursement rules to automatically distribute institutional income across departments and specific fee groups.</p>
        </div>
        <div className="portal-flex-align-gap-12">
          <div className="status-badge portal-badge-green-bold">
             <i className="fas fa-chart-pie mr-2"></i>FISCAL STRATEGY
          </div>
          <button 
            type="button"
            className="portal-btn-primary portal-btn-padded-bold"
            title="New Allocation Rule"
            aria-label="New Allocation Rule"
            onClick={() => setShowAdd(true)}
          >
            <i className="fas fa-plus mr-2"></i> New Allocation Rule
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="portal-modal-overlay portal-modal-overlay-top">
          <div className="portal-modal-card portal-modal-card-lg animate-in zoom-in duration-200">
            <div className="portal-modal-header portal-modal-header-bordered">
              <div>
                <h3 className="portal-modal-title-blue">
                  <i className="fas fa-sliders-h portal-icon-blue"></i>
                  Strategic Rule Configuration
                </h3>
                <p className="portal-modal-subtitle-muted">Define a new revenue disbursement allocation strategy for a fiscal budget period.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAdd(false)} 
                className="portal-btn-ghost portal-btn-delete-item" 
                title="Close Configuration Modal"
                aria-label="Close Configuration Modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="portal-modal-body-scroll">
              <form onSubmit={handleSubmit}>
                <div className="portal-modal-body portal-modal-body-padded">
                  <div className="portal-form-grid-3col">
                    <div className="form-group">
                      <label className="portal-label" htmlFor="allocName">Canonical Strategy Identity</label>
                      <input
                        type="text"
                        id="allocName"
                        name="allocName"
                        title="Canonical Strategy Identity"
                        aria-label="Canonical Strategy Identity"
                        className="portal-input portal-td-bold"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Master Disbursement Strategy 2025"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="portal-label" htmlFor="allocSchoolYear">Target School Year</label>
                      <input
                        type="number"
                        id="allocSchoolYear"
                        name="allocSchoolYear"
                        title="Target School Year"
                        aria-label="Target School Year"
                        className="portal-input portal-btn-padded-bold"
                        value={formData.schoolYear}
                        onChange={(e) => setFormData({ ...formData, schoolYear: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="portal-label" htmlFor="allocPeriod">Fiscal Budget Period ({t('term')})</label>
                      <select
                        id="allocPeriod"
                        name="allocPeriod"
                        title="Fiscal Budget Period"
                        aria-label="Fiscal Budget Period"
                        className="portal-input portal-btn-padded-bold"
                        value={formData.period}
                        onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                      >
                        {isSemester ? (
                          <>
                            <option value="Semester 1">Semester 1</option>
                            <option value="Semester 2">Semester 2</option>
                          </>
                        ) : (
                          <>
                            <option value="Term 1">Term 1</option>
                            <option value="Term 2">Term 2</option>
                            <option value="Term 3">Term 3</option>
                          </>
                        )}
                        <option value="Annual">Annual</option>
                      </select>
                    </div>
                  </div>

                  <div className="portal-section-mb40">
                    <div className="portal-flex-space-between-mb">
                      <h4 className="portal-header-h4">
                        <i className="fas fa-percent portal-icon-green"></i> Revenue Disbursement Breakdown
                      </h4>
                      {(() => {
                        const totalPct = formData.breakdown.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
                        const isValid = Math.abs(totalPct - 100) < 0.01;
                        return (
                          <span className={`portal-breakdown-total-badge ${isValid ? 'portal-breakdown-total-valid' : 'portal-breakdown-total-invalid'}`}>
                            Total: {totalPct.toFixed(2)}% {isValid ? '✓' : '(Must be 100%)'}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="portal-breakdown-box">
                      {formData.breakdown.map((item, index) => (
                        <div key={index} className="portal-breakdown-row">
                          <div className="portal-flex-1">
                            <label className="sr-only" htmlFor={`accountTarget_${index}`}>Chart of Account Target</label>
                            <select
                              id={`accountTarget_${index}`}
                              name={`accountTarget_${index}`}
                              title="Select Chart of Account Target"
                              aria-label="Select Chart of Account Target"
                              className="portal-input portal-td-bold"
                              value={item.accountId || ''}
                              onChange={(e) => handleUpdateAccount(index, e.target.value)}
                              required
                            >
                              <option value="">-- Select Chart of Account Target --</option>
                              {coaAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.code} – {acc.name} ({acc.type})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="portal-pct-container">
                            <label className="sr-only" htmlFor={`percentageTarget_${index}`}>Disbursement Percentage</label>
                            <input
                              type="number"
                              step="0.01"
                              id={`percentageTarget_${index}`}
                              name={`percentageTarget_${index}`}
                              title="Disbursement Percentage"
                              aria-label="Disbursement Percentage"
                              className="portal-input portal-input-pct"
                              placeholder="0.00"
                              value={item.percentage || ''}
                              onChange={(e) => handleUpdatePercentage(index, parseFloat(e.target.value) || 0)}
                              required
                            />
                            <span className="portal-pct-symbol">%</span>
                          </div>
                          <button 
                            type="button" 
                            className="portal-btn-ghost portal-btn-delete-item"
                            title="Remove Allocation Item"
                            aria-label="Remove Allocation Item"
                            onClick={() => handleRemoveItem(index)}
                            disabled={formData.breakdown.length === 1}
                          >
                            <i className="fas fa-minus-circle"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      type="button" 
                      className="portal-btn-ghost portal-btn-append" 
                      title="Append Allocation Item"
                      aria-label="Append Allocation Item"
                      onClick={handleAddItem} 
                    >
                      <i className="fas fa-plus-circle mr-2"></i> Append Allocation Item
                    </button>
                  </div>

                  <div>
                    <h4 className="portal-header-h4-mb">
                      <i className="fas fa-link portal-icon-indigo"></i> Associate with Fee Categories
                    </h4>
                    {(Array.isArray(feeGroups) ? feeGroups : []).length === 0 ? (
                      <div className="portal-group-empty">
                        <i className="fas fa-exclamation-triangle mb-3 portal-icon-muted-lg"></i>
                        <p className="portal-empty-text">No fee groups defined. Please catalog fee groups prior to strategy configuration.</p>
                      </div>
                    ) : (
                      <div className="portal-group-grid">
                        {(Array.isArray(feeGroups) ? feeGroups : []).map(group => {
                          const isSelected = formData.feeGroupIds.includes(group.id);
                          return (
                            <label key={group.id} className={`portal-fee-group-card ${isSelected ? 'active' : ''}`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleGroup(group.id)}
                                className="portal-fee-group-checkbox"
                              />
                              <span className={`portal-fee-group-name ${isSelected ? 'active' : ''}`}>{group.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="portal-modal-footer portal-modal-footer-flex">
                  <button type="button" onClick={() => setShowAdd(false)} className="portal-btn-ghost portal-btn-cancel" title="Cancel Configuration" aria-label="Cancel Configuration">Cancel Configuration</button>
                  <button type="submit" className="portal-btn-primary portal-btn-authorize" title="Authorize Strategy Rule" aria-label="Authorize Strategy Rule">
                    <i className="fas fa-check mr-2"></i> Authorize Strategy Rule
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header portal-flex-space-between-mb24">
          <h3 className="portal-table-title">Authorized Disbursement Profiles</h3>
          <span className="status-badge portal-table-badge">
            {(Array.isArray(allocations) ? allocations : []).length} ACTIVE SCHEMES
          </span>
        </div>
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th className="portal-col-w22">Scheme Identity</th>
                <th className="portal-col-w12">Budget Cycle</th>
                <th className="portal-col-w25">Target Fee Categories</th>
                <th className="portal-col-w20">Disbursement Matrix</th>
                <th className="portal-text-center portal-col-w10">Status</th>
                <th className="portal-text-right portal-col-w11">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="portal-table-spinner">
                    <div className="portal-spinner portal-spinner-center"></div>
                    <p className="portal-text-bold-slate">Synchronizing strategic schemes...</p>
                  </td>
                </tr>
              ) : (Array.isArray(allocations) ? allocations : []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="portal-table-empty">
                    <i className="fas fa-layer-group portal-icon-empty-layer"></i>
                    <h3 className="portal-text-empty-title">No Strategies Cataloged</h3>
                    <p className="portal-text-empty-subtitle">Archived revenue allocation rules will be rendered here.</p>
                  </td>
                </tr>
              ) : (Array.isArray(allocations) ? allocations : []).map(alloc => (
                <tr key={alloc.id}>
                  <td>
                    <div className="portal-td-bold">{alloc.name}</div>
                    <div className="portal-text-subtext">Academic Cycle: {alloc.schoolYear}</div>
                  </td>
                  <td>
                    <span className="status-badge portal-badge-sky">
                      {alloc.period?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="portal-flex-wrap-gap-6">
                      {(Array.isArray(alloc.feeGroups) ? alloc.feeGroups : []).map(g => (
                        <span key={g.id} className="status-badge portal-badge-group">
                          {g.name}
                        </span>
                      ))}
                      {(Array.isArray(alloc.feeGroups) ? alloc.feeGroups : []).length === 0 && <span className="portal-text-unassociated">Unassociated</span>}
                    </div>
                  </td>
                  <td>
                    <div className="portal-grid-gap-8">
                      {(Array.isArray(alloc.breakdown) ? alloc.breakdown : []).map((item: AllocationItem, i: number) => {
                        const acc = coaAccounts.find(a => a.id === item.accountId) || item.account;
                        const labelText = acc ? `${acc.code} – ${acc.name}` : (item.label || item.accountId || 'Target Account');
                        return (
                          <div key={i} className="portal-flex-col-gap-2">
                            <div className="portal-flex-space-between-sm">
                              <span className="portal-text-slate">{labelText}</span>
                              <span className="portal-text-blue-pct">{item.percentage}%</span>
                            </div>
                            <progress 
                              value={item.percentage} 
                              max={100} 
                              className="portal-progress-bar"
                              title={`Allocation breakdown ${item.percentage}%`}
                              aria-label={`Allocation breakdown ${item.percentage}%`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="portal-text-center">
                    <span className={`status-badge ${alloc.isActive ? 'status-active' : 'status-inactive'} portal-badge-status-sm`}>
                      {alloc.isActive ? 'ACTIVE' : 'DORMANT'}
                    </span>
                  </td>
                  <td className="portal-text-right">
                    <div className="portal-table-actions-flex">
                      <button 
                        type="button"
                        className={`portal-btn-${alloc.isActive ? 'ghost' : 'primary'} portal-btn-toggle-action`}
                        title={alloc.isActive ? 'Deactivate Strategy' : 'Authorize Strategy'}
                        aria-label={alloc.isActive ? 'Deactivate Strategy' : 'Authorize Strategy'}
                        onClick={() => handleToggleActive(alloc.id, alloc.isActive)}
                      >
                        {alloc.isActive ? 'Deactivate' : 'Authorize'}
                      </button>
                      <button 
                        type="button"
                        className="portal-btn-ghost portal-btn-delete-action"
                        title="Delete Allocation Strategy"
                        aria-label="Delete Allocation Strategy"
                        onClick={() => handleDelete(alloc.id)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
