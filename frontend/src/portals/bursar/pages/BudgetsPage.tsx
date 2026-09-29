import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import {
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Sliders,
  RefreshCw,
  TrendingUp,
  Clock,
  Layers
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function BudgetsPage() {
  const [activeTab, setActiveTab] = useState<'BUDGETS' | 'APPROVALS' | 'SETTINGS'>('BUDGETS');

  // Budget state
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [term, setTerm] = useState<string>('Annual');
  const [budgets, setBudgets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);

  // New Budget Modal / Form
  const [selectedCoaCode, setSelectedCoaCode] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Approvals state
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Settings state
  const [settings, setSettings] = useState({
    financialApprovalThreshold: 50,
    tier1ApprovalRole: 'BURSAR',
    tier2ApprovalRole: 'SCHOOL_ADMIN'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    fetchAccounts();
    fetchBudgets();
    fetchApprovals();
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [year, term]);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/api/accounts/coa');
      setAccounts(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBudgets = async () => {
    try {
      setLoadingBudgets(true);
      const res = await api.get(`/api/accounts/budgets?year=${year}&term=${term}`);
      setBudgets(res.data || []);
    } catch (e) {
      toast.error('Failed to load budgets');
    } finally {
      setLoadingBudgets(false);
    }
  };

  const fetchApprovals = async () => {
    try {
      setLoadingApprovals(true);
      const res = await api.get('/api/accounts/approvals');
      setApprovals(res.data || []);
    } catch (e) {
      toast.error('Failed to load approvals');
    } finally {
      setLoadingApprovals(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/accounts/approvals/settings');
      if (res.data) setSettings(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoaCode || !budgetAmount) {
      toast.error('Please select an account and enter a budget amount');
      return;
    }

    try {
      setIsSavingBudget(true);
      await api.post('/api/accounts/budgets', {
        year,
        term,
        coaCode: selectedCoaCode,
        amount: Number(budgetAmount),
        currency: 'USD'
      });
      toast.success('Budget target saved successfully!');
      setSelectedCoaCode('');
      setBudgetAmount('');
      fetchBudgets();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save budget target');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Are you sure you want to remove this budget target?')) return;
    try {
      await api.delete(`/api/accounts/budgets/${id}`);
      toast.success('Budget removed');
      fetchBudgets();
    } catch (err: any) {
      toast.error('Failed to delete budget');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/api/accounts/approvals/${id}/approve`);
      toast.success('Request approved successfully!');
      fetchApprovals();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Approval failed');
    }
  };

  const handleReject = async () => {
    if (!rejectModalId) return;
    try {
      await api.post(`/api/accounts/approvals/${rejectModalId}/reject`, { reason: rejectionReason });
      toast.success('Request rejected');
      setRejectModalId(null);
      setRejectionReason('');
      fetchApprovals();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Rejection failed');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      await api.patch('/api/accounts/approvals/settings', settings);
      toast.success('Approval policies and threshold updated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const totalBudget = budgets.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const pendingApprovalsCount = approvals.filter(a => a.status === 'PENDING').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>
            Budgets & Financial Governance
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Budgetary control allocations and multi-tier approval thresholds
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('BUDGETS')}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'BUDGETS' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'BUDGETS' ? '#fff' : '#475569',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Layers size={16} /> Budget Targets
        </button>

        <button
          onClick={() => setActiveTab('APPROVALS')}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'APPROVALS' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'APPROVALS' ? '#fff' : '#475569',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShieldCheck size={16} /> Multi-Tier Approvals
          {pendingApprovalsCount > 0 && (
            <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('SETTINGS')}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'SETTINGS' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'SETTINGS' ? '#fff' : '#475569',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Sliders size={16} /> Threshold Settings
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. BUDGET TARGETS VIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'BUDGETS' && (
        <div>
          {/* Top Controls & Add Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', marginBottom: '24px' }}>
            {/* Filter Bar & Summary */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Fiscal Year:</label>
                <input
                  type="number"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  style={{ width: '90px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Term Scope:</label>
                <select
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="Annual">Annual</option>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>

                <button
                  onClick={() => fetchBudgets()}
                  style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} className={loadingBudgets ? 'spin' : ''} /> Refresh
                </button>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>TOTAL BUDGET ALLOCATED</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    ${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {budgets.length} accounts budgeted for {year} ({term})
                </div>
              </div>
            </div>

            {/* Set Budget Form */}
            <form onSubmit={handleSaveBudget} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Set Budget Target
              </h3>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Target Account:
                </label>
                <select
                  value={selectedCoaCode}
                  onChange={e => setSelectedCoaCode(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="">— Choose Account —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.code}>
                      {a.code} — {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Allocated Amount ($ USD):
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000.00"
                  value={budgetAmount}
                  onChange={e => setBudgetAmount(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                disabled={isSavingBudget}
                style={{
                  marginTop: '8px',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: isSavingBudget ? 'not-allowed' : 'pointer'
                }}
              >
                {isSavingBudget ? 'Saving...' : 'Set Budget Target'}
              </button>
            </form>
          </div>

          {/* Budget List Table */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {loadingBudgets ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading budget targets...</div>
            ) : budgets.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No budget allocations created yet for this period.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Code</th>
                    <th style={{ padding: '12px 16px' }}>Account Name</th>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Target Amount</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Term</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{b.coaCode}</td>
                      <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 500 }}>{b.accountName}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                          {b.accountType}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                        ${Number(b.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#64748b' }}>{b.term}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteBudget(b.id)}
                          style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                          title="Delete budget target"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MULTI-TIER FINANCIAL APPROVALS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'APPROVALS' && (
        <div>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Pending & Historical Financial Authorizations
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Tier 1 (≤ ${settings.financialApprovalThreshold}): {settings.tier1ApprovalRole} | Tier 2 (&gt; ${settings.financialApprovalThreshold}): {settings.tier2ApprovalRole}
                </span>
              </div>
              <button
                onClick={() => fetchApprovals()}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px' }}
              >
                <RefreshCw size={13} className={loadingApprovals ? 'spin' : ''} /> Refresh
              </button>
            </div>

            {loadingApprovals ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading authorization queues...</div>
            ) : approvals.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No authorization requests found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Requested By</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px 16px' }}>Tier Required</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{a.entityType}</td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {a.requester?.name || a.requestedBy}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                        ${Number(a.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: a.tier === 2 ? '#fef3c7' : '#eff6ff', color: a.tier === 2 ? '#b45309' : '#1e40af' }}>
                          Tier {a.tier} ({a.approverRole})
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: a.status === 'APPROVED' ? '#dcfce7' : a.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                          color: a.status === 'APPROVED' ? '#15803d' : a.status === 'REJECTED' ? '#b91c1c' : '#854d0e'
                        }}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {a.canApprove ? (
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={() => handleApprove(a.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '4px', border: 'none', backgroundColor: '#16a34a', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              <CheckCircle2 size={13} /> Approve
                            </button>
                            <button
                              onClick={() => setRejectModalId(a.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '4px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        ) : a.status === 'PENDING' ? (
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                            Awaiting authorization / Segregation of duties
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Closed by {a.approver?.name || 'Authorized officer'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. APPROVAL SETTINGS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'SETTINGS' && (
        <div style={{ maxWidth: '600px', backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Multi-Tier Financial Approval Policies
          </h3>
          <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '13px' }}>
            Set monetary thresholds and configure which institutional roles are empowered to authorize transactions at each tier. Segregation of duties is strictly enforced.
          </p>

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Monetary Approval Threshold ($ USD):
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.financialApprovalThreshold}
                onChange={e => setSettings({ ...settings, financialApprovalThreshold: Number(e.target.value) })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                Transactions at or below this amount require Tier 1 approval; transactions exceeding this require Tier 2 approval.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Tier 1 Approver Role (≤ ${settings.financialApprovalThreshold}):
              </label>
              <select
                value={settings.tier1ApprovalRole}
                onChange={e => setSettings({ ...settings, tier1ApprovalRole: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              >
                <option value="BURSAR">Bursar (Finance Officer)</option>
                <option value="SCHOOL_ADMIN">School Admin / Principal</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Tier 2 Approver Role (&gt; ${settings.financialApprovalThreshold}):
              </label>
              <select
                value={settings.tier2ApprovalRole}
                onChange={e => setSettings({ ...settings, tier2ApprovalRole: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              >
                <option value="SCHOOL_ADMIN">School Admin / Principal (Recommended)</option>
                <option value="SUPER_ADMIN">Board of Governors / Super Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSavingSettings}
              style={{
                marginTop: '10px',
                padding: '10px 18px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#fff',
                fontWeight: 600,
                fontSize: '14px',
                cursor: isSavingSettings ? 'not-allowed' : 'pointer'
              }}
            >
              {isSavingSettings ? 'Updating Policies...' : 'Save Approval Policies'}
            </button>
          </form>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', width: '420px', maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '16px' }}>Reason for Rejection</h3>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Provide reason for declining this request..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setRejectModalId(null)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Decline Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
