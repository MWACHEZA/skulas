import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { useTerminology } from '../../../hooks/useTerminology';
import '../../../styles/portal.css';

interface FeeGroup {
  id: string;
  name: string;
}

interface AllocationItem {
  label: string;
  percentage: number;
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
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    schoolYear: new Date().getFullYear(),
    period: 'Term 1',
    breakdown: [{ label: '', percentage: 0 }],
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
      const [allocRes, groupRes] = await Promise.all([
        api.get('/api/finance/revenue-allocations'),
        api.get('/api/fees/groups')
      ]);
      setAllocations(Array.isArray(allocRes.data) ? allocRes.data : []);
      setFeeGroups(Array.isArray(groupRes.data) ? groupRes.data : []);
    } catch (error) {
      toast.error('Failed to synchronize financial allocation data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      breakdown: [...formData.breakdown, { label: '', percentage: 0 }]
    });
  };

  const handleUpdateItem = (index: number, field: keyof AllocationItem, value: string | number) => {
    const newBreakdown = [...formData.breakdown];
    newBreakdown[index] = { ...newBreakdown[index], [field]: value };
    setFormData({ ...formData, breakdown: newBreakdown });
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
        breakdown: [{ label: '', percentage: 0 }],
        feeGroupIds: []
      });
      toast.success('Strategic revenue allocation rule archived');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to archive allocation strategy');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/api/finance/revenue-allocations/${id}/toggle`, { isActive: !currentStatus });
      setAllocations(allocations.map(a => a.id === id ? { ...a, isActive: !currentStatus } : a));
      toast.success(`Strategy ${!currentStatus ? 'activated' : 'deactivated'} for current fiscal cycle`);
    } catch (error) {
      toast.error('Failed to update strategy status');
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Revenue Allocation Strategy</h1>
          <p>Configure strategic disbursement rules to automatically distribute institutional income across departments and specific fee groups.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="status-badge" style={{ padding: '8px 20px', background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5', fontWeight: 900 }}>
             <i className="fas fa-chart-pie mr-2"></i>FISCAL STRATEGY
          </div>
          <button 
            className="portal-btn-primary"
            onClick={() => setShowAdd(true)}
            style={{ padding: '12px 28px', fontWeight: 900 }}
          >
            <i className="fas fa-plus mr-2"></i> New Allocation Rule
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="portal-modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '40px', paddingBottom: '40px', overflowY: 'auto' }}>
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '860px', width: '100%', padding: 0, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="portal-modal-header" style={{ padding: '28px 40px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <i className="fas fa-sliders-h" style={{ color: '#2563eb' }}></i>
                  Strategic Rule Configuration
                </h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Define a new revenue disbursement allocation strategy for a fiscal budget period.</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="portal-btn-ghost" style={{ padding: '12px', flexShrink: 0 }}><i className="fas fa-times"></i></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <form onSubmit={handleSubmit}>
                <div className="portal-modal-body" style={{ padding: '40px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                    <div className="form-group">
                      <label className="portal-label">Canonical Strategy Identity</label>
                      <input
                        type="text"
                        className="portal-input"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Master Disbursement Strategy 2025"
                        style={{ fontWeight: 700 }}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="portal-label">Target School Year</label>
                      <input
                        type="number"
                        className="portal-input"
                        value={formData.schoolYear}
                        onChange={(e) => setFormData({ ...formData, schoolYear: parseInt(e.target.value) })}
                        style={{ fontWeight: 800 }}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="portal-label">Fiscal Budget Period ({t('term')})</label>
                      <select
                        className="portal-input"
                        value={formData.period}
                        onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                        style={{ fontWeight: 800 }}
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

                  <div style={{ marginBottom: '40px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <i className="fas fa-percent" style={{ color: '#059669' }}></i> Revenue Disbursement Breakdown
                    </h4>
                    <div style={{ display: 'grid', gap: '16px', marginBottom: '24px', background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                      {formData.breakdown.map((item, index) => (
                        <div key={index} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              className="portal-input"
                              placeholder="Department / Item (e.g. Operational Wages)"
                              value={item.label}
                              onChange={(e) => handleUpdateItem(index, 'label', e.target.value)}
                              required
                              style={{ fontWeight: 700 }}
                            />
                          </div>
                          <div style={{ position: 'relative', width: '160px' }}>
                            <input
                              type="number"
                              step="0.01"
                              className="portal-input"
                              placeholder="0.00"
                              value={item.percentage}
                              onChange={(e) => handleUpdateItem(index, 'percentage', parseFloat(e.target.value))}
                              required
                              style={{ paddingRight: '40px', textAlign: 'right', fontWeight: 900, color: '#2563eb' }}
                            />
                            <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1rem', fontWeight: 900 }}>%</span>
                          </div>
                          <button 
                            type="button" 
                            className="portal-btn-ghost"
                            style={{ color: '#dc2626', padding: '12px', borderRadius: '10px' }}
                            onClick={() => handleRemoveItem(index)}
                            disabled={formData.breakdown.length === 1}
                          >
                            <i className="fas fa-minus-circle"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="portal-btn-ghost" onClick={handleAddItem} style={{ fontSize: '0.9rem', padding: '10px 24px', fontWeight: 900, borderRadius: '12px' }}>
                      <i className="fas fa-plus-circle mr-2"></i> Append Allocation Item
                    </button>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <i className="fas fa-link" style={{ color: '#4338ca' }}></i> Associate with Fee Categories
                    </h4>
                    {(Array.isArray(feeGroups) ? feeGroups : []).length === 0 ? (
                      <div style={{ padding: '40px', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>
                        <i className="fas fa-exclamation-triangle mb-3" style={{ fontSize: '2rem', opacity: 0.2 }}></i>
                        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>No fee groups defined. Please catalog fee groups prior to strategy configuration.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                        {(Array.isArray(feeGroups) ? feeGroups : []).map(group => (
                          <label key={group.id} style={{ 
                            display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px',
                            background: formData.feeGroupIds.includes(group.id) ? '#eff6ff' : '#f8fafc',
                            borderRadius: '14px', cursor: 'pointer',
                            border: `2px solid ${formData.feeGroupIds.includes(group.id) ? '#2563eb' : '#f1f5f9'}`,
                            transition: 'all 0.2s',
                            boxShadow: formData.feeGroupIds.includes(group.id) ? '0 4px 12px rgba(37, 99, 235, 0.1)' : 'none'
                          }}>
                            <input
                              type="checkbox"
                              checked={formData.feeGroupIds.includes(group.id)}
                              onChange={() => handleToggleGroup(group.id)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                            />
                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: formData.feeGroupIds.includes(group.id) ? '#1e40af' : '#475569' }}>{group.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="portal-modal-footer" style={{ padding: '28px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <button type="button" onClick={() => setShowAdd(false)} className="portal-btn-ghost" style={{ padding: '14px 32px', fontWeight: 800 }}>Cancel Configuration</button>
                  <button type="submit" className="portal-btn-primary" style={{ minWidth: '220px', padding: '14px 40px', fontSize: '1rem', fontWeight: 900, background: '#059669' }}>
                    <i className="fas fa-check mr-2"></i> Authorize Strategy Rule
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Authorized Disbursement Profiles</h3>
          <span className="status-badge" style={{ fontWeight: 900, background: '#f8fafc', color: '#64748b', border: '1px solid #f1f5f9' }}>
            {(Array.isArray(allocations) ? allocations : []).length} ACTIVE SCHEMES
          </span>
        </div>
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Scheme Identity</th>
                <th style={{ width: '12%' }}>Budget Cycle</th>
                <th style={{ width: '25%' }}>Target Fee Categories</th>
                <th style={{ width: '20%' }}>Disbursement Matrix</th>
                <th style={{ textAlign: 'center', width: '10%' }}>Status</th>
                <th style={{ textAlign: 'right', width: '11%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="portal-spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p style={{ fontWeight: 800, color: '#64748b' }}>Synchronizing strategic schemes...</p>
                  </td>
                </tr>
              ) : (Array.isArray(allocations) ? allocations : []).length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '120px 24px', color: '#94a3b8' }}>
                    <i className="fas fa-layer-group" style={{ fontSize: '4rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                    <h3 style={{ fontWeight: 800, color: '#64748b', fontSize: '1.25rem' }}>No Strategies Cataloged</h3>
                    <p style={{ margin: 0, fontWeight: 600 }}>Archived revenue allocation rules will be rendered here.</p>
                  </td>
                </tr>
              ) : (Array.isArray(allocations) ? allocations : []).map(alloc => (
                <tr key={alloc.id}>
                  <td>
                    <div style={{ fontWeight: 900, color: '#1e293b' }}>{alloc.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>Academic Cycle: {alloc.schoolYear}</div>
                  </td>
                  <td>
                    <span className="status-badge" style={{ background: '#f0f9ff', color: '#0369a1', fontWeight: 900, border: '1px solid #e0f2fe' }}>
                      {alloc.period?.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(Array.isArray(alloc.feeGroups) ? alloc.feeGroups : []).map(g => (
                        <span key={g.id} className="status-badge" style={{ background: '#f8fafc', color: '#475569', fontSize: '0.65rem', fontWeight: 900, border: '1px solid #f1f5f9' }}>
                          {g.name}
                        </span>
                      ))}
                      {(Array.isArray(alloc.feeGroups) ? alloc.feeGroups : []).length === 0 && <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', fontWeight: 700 }}>Unassociated</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {(Array.isArray(alloc.breakdown) ? alloc.breakdown : []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800 }}>
                            <span style={{ color: '#64748b' }}>{item.label}</span>
                            <span style={{ color: '#2563eb' }}>{item.percentage}%</span>
                          </div>
                          <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                             <div style={{ height: '100%', width: `${item.percentage}%`, background: '#2563eb', borderRadius: '2px' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`status-badge ${alloc.isActive ? 'status-active' : 'status-inactive'}`} style={{ fontWeight: 900, fontSize: '0.7rem' }}>
                      {alloc.isActive ? 'ACTIVE' : 'DORMANT'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className={`portal-btn-${alloc.isActive ? 'ghost' : 'primary'}`}
                      style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 900, borderRadius: '10px' }}
                      onClick={() => handleToggleActive(alloc.id, alloc.isActive)}
                    >
                      {alloc.isActive ? 'Deactivate' : 'Authorize'}
                    </button>
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
