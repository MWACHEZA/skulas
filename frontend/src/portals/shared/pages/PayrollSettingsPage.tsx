import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface AllowanceItem {
  id?: string;
  name: string;
  type: 'recurring_monthly' | 'one_time' | 'percent_of_basic' | 'per_hour';
  defaultValue: number;
  appliesTo?: string; // 'ALL' | 'SECONDARY' | 'PRIMARY' | 'POLYTECHNIC' | 'NURSING' | 'SEMINARY'
  isRecurring?: boolean;
  isPercentage?: boolean;
}

interface DeductionItem {
  id?: string;
  name: string;
  type: 'recurring_monthly' | 'one_time' | 'percent_of_basic' | 'per_hour';
  defaultValue: number;
  category?: 'accommodation' | 'staff_child' | 'loan_advance' | 'union_dues' | 'general';
  isRecurring?: boolean;
  isPercentage?: boolean;
}

interface TaxBandItem {
  minIncome: number;
  maxIncome: number | null;
  rate: number;
  fixedAmount: number;
}

interface TaxTableItem {
  id?: string;
  name: string;
  statutoryType: 'PAYE' | 'NSSA' | 'AIDS_LEVY' | 'NEC' | 'ZIMDEF';
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  bands: TaxBandItem[];
}

export default function PayrollSettingsPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { user } = useAuth();
  const { showToast, toastConfirm } = useToast();
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isBursar = user?.role === 'BURSAR';

  const [activeTab, setActiveTab] = useState<'allowances' | 'deductions' | 'statutory' | 'payouts'>('allowances');
  const [activeStatutorySubTab, setActiveStatutorySubTab] = useState<'PAYE' | 'NSSA' | 'AIDS_LEVY' | 'NEC' | 'ZIMDEF'>('PAYE');

  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);
  const [taxTables, setTaxTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPayouts, setSavingPayouts] = useState(false);

  // Allowance Form
  const [showAddAllowance, setShowAddAllowance] = useState(false);
  const [allowanceForm, setAllowanceForm] = useState<AllowanceItem>({
    name: '',
    type: 'recurring_monthly',
    defaultValue: 0,
    appliesTo: 'ALL'
  });

  // Deduction Form
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [deductionForm, setDeductionForm] = useState<DeductionItem>({
    name: '',
    type: 'recurring_monthly',
    defaultValue: 0,
    category: 'general'
  });

  // Statutory Tax Table Form
  const [showAddTaxTable, setShowAddTaxTable] = useState(false);
  const [statutoryForm, setStatutoryForm] = useState<TaxTableItem>({
    name: 'Zimbabwe PAYE Progressive Tax Bands (USD/ZiG)',
    statutoryType: 'PAYE',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    isActive: true,
    bands: [
      { minIncome: 0, maxIncome: 100, rate: 0, fixedAmount: 0 },
      { minIncome: 100.01, maxIncome: 300, rate: 20, fixedAmount: 0 },
      { minIncome: 300.01, maxIncome: 1000, rate: 25, fixedAmount: 40 },
      { minIncome: 1000.01, maxIncome: null, rate: 30, fixedAmount: 215 }
    ]
  });

  // NEC Minimum Wage State
  const [necMinWage, setNecMinWage] = useState({
    minSalary: 280,
    currency: 'USD',
    sector: 'Educational Services NEC'
  });

  // Tab 4: Payout Methods & Split Configuration
  const [payoutConfig, setPayoutConfig] = useState({
    usdNostroEnabled: true,
    zigTransferEnabled: true,
    ecocashUsdEnabled: true,
    ecocashZigEnabled: true,
    cashEnabled: true,
    defaultSplitUsd: 70,
    defaultSplitZig: 30,
    nostroBankName: 'Stanbic Bank Zimbabwe',
    zigBankName: 'CBZ Bank Limited'
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'allowances') {
        const res = await api.get('/api/payroll/allowances');
        let data = Array.isArray(res.data) ? res.data : [];
        if (data.length === 0) {
          // Pre-load sensible starter set with subtype allowances per Gate 1
          data = [
            { name: 'Transport Allowance', type: 'recurring_monthly', defaultValue: 80, appliesTo: 'ALL', isRecurring: true },
            { name: 'Housing Subsidy', type: 'recurring_monthly', defaultValue: 120, appliesTo: 'ALL', isRecurring: true },
            { name: 'Class Teacher Responsibility', type: 'recurring_monthly', defaultValue: 50, appliesTo: 'SECONDARY', isRecurring: true },
            { name: 'Head of Department (HOD)', type: 'recurring_monthly', defaultValue: 100, appliesTo: 'ALL', isRecurring: true },
            { name: 'Boarding House Duty', type: 'recurring_monthly', defaultValue: 75, appliesTo: 'SECONDARY', isRecurring: true },
            { name: 'Hot-Seat Session Overtime', type: 'per_hour', defaultValue: 15, appliesTo: 'PRIMARY', isRecurring: false },
            { name: 'Technical Workshop Practical Hazard', type: 'recurring_monthly', defaultValue: 60, appliesTo: 'POLYTECHNIC', isRecurring: true },
            { name: 'Clinical Ward Rounds Allowance', type: 'recurring_monthly', defaultValue: 90, appliesTo: 'NURSING', isRecurring: true },
            { name: 'Parish & Liturgical Supervision', type: 'recurring_monthly', defaultValue: 45, appliesTo: 'SEMINARY', isRecurring: true }
          ];
        }
        setAllowances(data);
      } else if (activeTab === 'deductions') {
        const res = await api.get('/api/payroll/deductions');
        let data = Array.isArray(res.data) ? res.data : [];
        if (data.length === 0) {
          data = [
            { name: 'Institutional Staff Accommodation', type: 'recurring_monthly', defaultValue: 100, category: 'accommodation', isRecurring: true },
            { name: 'Staff-Child School Fee Recovery', type: 'percent_of_basic', defaultValue: 15, category: 'staff_child', isPercentage: true, isRecurring: true },
            { name: 'Staff Advance / Loan Deduction', type: 'recurring_monthly', defaultValue: 50, category: 'loan_advance', isRecurring: true },
            { name: 'Staff Social Welfare & Union Dues', type: 'recurring_monthly', defaultValue: 10, category: 'union_dues', isRecurring: true }
          ];
        }
        setDeductions(data);
      } else if (activeTab === 'statutory') {
        const res = await api.get('/api/payroll/tax-tables');
        setTaxTables(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'payouts') {
        const schoolRes = await api.get('/api/schools/settings');
        const settings = schoolRes.data || {};
        if (settings.payoutConfig) {
          setPayoutConfig({ ...payoutConfig, ...settings.payoutConfig });
        }
      }
    } catch (err) {
      console.error(`Failed to load ${activeTab} data`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAllowance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowanceForm.name.trim()) return;

    try {
      const payload = {
        name: allowanceForm.name.trim(),
        defaultValue: allowanceForm.defaultValue,
        isRecurring: allowanceForm.type === 'recurring_monthly',
        isPercentage: allowanceForm.type === 'percent_of_basic',
        type: allowanceForm.type,
        appliesTo: allowanceForm.appliesTo
      };

      const res = await api.post('/api/payroll/allowances', payload);
      setAllowances([...allowances, res.data || payload]);
      setShowAddAllowance(false);
      setAllowanceForm({ name: '', type: 'recurring_monthly', defaultValue: 0, appliesTo: 'ALL' });
      showToast('Payroll allowance configured successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save allowance', 'error');
    }
  };

  const handleCreateDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductionForm.name.trim()) return;

    try {
      const payload = {
        name: deductionForm.name.trim(),
        defaultValue: deductionForm.defaultValue,
        isRecurring: deductionForm.type === 'recurring_monthly',
        isPercentage: deductionForm.type === 'percent_of_basic',
        type: deductionForm.type,
        category: deductionForm.category
      };

      const res = await api.post('/api/payroll/deductions', payload);
      setDeductions([...deductions, res.data || payload]);
      setShowAddDeduction(false);
      setDeductionForm({ name: '', type: 'recurring_monthly', defaultValue: 0, category: 'general' });
      showToast('Payroll deduction configured successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save deduction', 'error');
    }
  };

  const handleDeleteItem = async (type: 'allowances' | 'deductions' | 'tax-tables', id?: string, index?: number) => {
    if (!isAdmin) {
      showToast('Only School Administrators can delete payroll configurations', 'error');
      return;
    }
    if (!(await toastConfirm('Are you sure you want to remove this payroll parameter? This impacts future pay runs and will be audit-logged.'))) return;

    try {
      if (id) {
        await api.delete(`/api/payroll/${type}/${id}`);
      }
      if (type === 'allowances') {
        setAllowances(prev => prev.filter((_, i) => (id ? _.id !== id : i !== index)));
      } else if (type === 'deductions') {
        setDeductions(prev => prev.filter((_, i) => (id ? _.id !== id : i !== index)));
      } else {
        setTaxTables(prev => prev.filter((_, i) => (id ? _.id !== id : i !== index)));
      }
      showToast('Payroll parameter removed successfully', 'success');
    } catch (err) {
      showToast('Failed to remove parameter', 'error');
    }
  };

  const handleCreateTaxTable = async () => {
    if (!isAdmin) {
      showToast('Only School Administrators can authorize statutory tax tables', 'error');
      return;
    }

    if (!(await toastConfirm(`WARNING: You are about to authoritatively update the statutory rate table for ${activeStatutorySubTab}. This calculation affects all staff pay runs and is audit-logged with your user ID. Proceed?`))) {
      return;
    }

    try {
      const payload = {
        ...statutoryForm,
        name: `${statutoryForm.name} (${activeStatutorySubTab})`,
        region: 'ZW'
      };

      const res = await api.post('/api/payroll/tax-tables', payload);
      setTaxTables([res.data, ...taxTables]);
      setShowAddTaxTable(false);
      showToast(`Statutory table for ${activeStatutorySubTab} authorized and logged to audit trail`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to authorize statutory table', 'error');
    }
  };

  const updateTaxBand = (index: number, field: string, value: any) => {
    const updated = [...statutoryForm.bands];
    updated[index] = { ...updated[index], [field]: value };
    setStatutoryForm({ ...statutoryForm, bands: updated });
  };

  const addTaxBand = () => {
    const last = statutoryForm.bands[statutoryForm.bands.length - 1];
    setStatutoryForm({
      ...statutoryForm,
      bands: [
        ...statutoryForm.bands,
        { minIncome: (last?.maxIncome || 0) + 0.01, maxIncome: null, rate: 0, fixedAmount: 0 }
      ]
    });
  };

  const handleSavePayouts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only School Administrators can modify payout policies', 'error');
      return;
    }

    if (payoutConfig.defaultSplitUsd + payoutConfig.defaultSplitZig !== 100) {
      showToast('Currency split must total exactly 100% (e.g. 70% USD / 30% ZiG)', 'warning');
      return;
    }

    setSavingPayouts(true);
    try {
      await api.patch('/api/schools/settings', {
        payoutConfig
      });
      showToast('Payout methods and currency split policy saved successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save payout configuration', 'error');
    } finally {
      setSavingPayouts(false);
    }
  };

  return (
    <div className={isEmbedded ? '' : 'portal-container'} style={{ padding: isEmbedded ? 0 : 24, maxWidth: 1200, margin: '0 auto' }}>
      {!isEmbedded && (
        <div className="portal-page-header" style={{ marginBottom: 24 }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
            <i className="fas fa-file-invoice-dollar" style={{ color: 'var(--school-primary, #0284c7)' }} />
            Institutional Payroll & Statutory Configuration
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
            Configure institutional allowances, deduction frameworks, statutory tax tables (PAYE/NSSA/AIDS Levy/ZIMDEF), and approved payout disbursement channels.
          </p>
        </div>
      )}

      {/* 4 Main Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 24,
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0',
          flexWrap: 'wrap'
        }}
      >
        {[
          { id: 'allowances', label: '1. Allowances', icon: 'fas fa-hand-holding-usd' },
          { id: 'deductions', label: '2. Deductions', icon: 'fas fa-minus-circle' },
          { id: 'statutory', label: '3. Statutory Tables', icon: 'fas fa-balance-scale' },
          { id: 'payouts', label: '4. Payout Methods', icon: 'fas fa-money-check-alt' }
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? '#0284c7' : '#64748b',
              borderBottom: activeTab === t.id ? '3px solid #0284c7' : '3px solid transparent',
              marginBottom: -2,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7' }} />
          <p style={{ marginTop: 12 }}>Loading {activeTab} settings...</p>
        </div>
      ) : (
        <>
          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1: ALLOWANCES */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'allowances' && (
            <div className="portal-card" style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                    Institutional Allowance Matrix
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Pre-set additions applied to basic salaries. Fully configurable per institutional role and subtype duties.
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAddAllowance(!showAddAllowance)}
                    className="portal-btn portal-btn-primary"
                    style={{ padding: '9px 18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <i className={`fas fa-${showAddAllowance ? 'times' : 'plus'}`} />
                    {showAddAllowance ? 'Cancel' : 'Add Allowance'}
                  </button>
                )}
              </div>

              {showAddAllowance && (
                <form onSubmit={handleCreateAllowance} style={{ background: '#f8fafc', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Define New Allowance</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr', gap: 12, alignItems: 'end' }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Descriptor *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Science Lab Hazard Allowance"
                        className="portal-input"
                        value={allowanceForm.name}
                        onChange={e => setAllowanceForm({ ...allowanceForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Type *</label>
                      <select
                        className="portal-input"
                        value={allowanceForm.type}
                        onChange={e => setAllowanceForm({ ...allowanceForm, type: e.target.value as any })}
                      >
                        <option value="recurring_monthly">Recurring Monthly</option>
                        <option value="one_time">One-time Ad-hoc</option>
                        <option value="percent_of_basic">Percent of Basic (%)</option>
                        <option value="per_hour">Per Hour Rate</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Default Value</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="portal-input"
                        value={allowanceForm.defaultValue}
                        onChange={e => setAllowanceForm({ ...allowanceForm, defaultValue: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Applies To Subtype</label>
                      <select
                        className="portal-input"
                        value={allowanceForm.appliesTo}
                        onChange={e => setAllowanceForm({ ...allowanceForm, appliesTo: e.target.value })}
                      >
                        <option value="ALL">All Institutions</option>
                        <option value="SECONDARY">Secondary (Boarding/Matron)</option>
                        <option value="PRIMARY">Primary (Hot-Seat Session)</option>
                        <option value="POLYTECHNIC">Polytechnic (Workshop/Vocational)</option>
                        <option value="NURSING">Nursing (Clinical Wards)</option>
                        <option value="SEMINARY">Seminary (Parish Pastoral)</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                    <button type="submit" className="portal-btn portal-btn-primary" style={{ padding: '8px 20px', fontWeight: 600 }}>
                      Save Allowance
                    </button>
                  </div>
                </form>
              )}

              <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Descriptor</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Type</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Default Value</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Subtype Scope</th>
                    {isAdmin && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem', textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {allowances.map((a, idx) => (
                    <tr key={a.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>{a.name}</td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#475569', fontSize: '0.9rem' }}>
                        {a.type ? a.type.replace(/_/g, ' ') : a.isPercentage ? 'Percent of Basic' : a.isRecurring ? 'Recurring Monthly' : 'One-time'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0284c7' }}>
                        {a.type === 'percent_of_basic' || a.isPercentage ? `${a.defaultValue}%` : `$${a.defaultValue.toFixed(2)}`}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="portal-badge" style={{ background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.78rem' }}>
                          {a.appliesTo || 'ALL'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem('allowances', a.id, idx)}
                            className="portal-btn"
                            style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 2: DEDUCTIONS */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'deductions' && (
            <div className="portal-card" style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                    Institutional Deduction Framework
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Non-statutory deductions including campus accommodation, staff-child tuition recovery, and loan repayments.
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAddDeduction(!showAddDeduction)}
                    className="portal-btn portal-btn-primary"
                    style={{ padding: '9px 18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <i className={`fas fa-${showAddDeduction ? 'times' : 'plus'}`} />
                    {showAddDeduction ? 'Cancel' : 'Add Deduction'}
                  </button>
                )}
              </div>

              {showAddDeduction && (
                <form onSubmit={handleCreateDeduction} style={{ background: '#f8fafc', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Define New Deduction</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr', gap: 12, alignItems: 'end' }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Descriptor *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Social Club Contribution"
                        className="portal-input"
                        value={deductionForm.name}
                        onChange={e => setDeductionForm({ ...deductionForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Type *</label>
                      <select
                        className="portal-input"
                        value={deductionForm.type}
                        onChange={e => setDeductionForm({ ...deductionForm, type: e.target.value as any })}
                      >
                        <option value="recurring_monthly">Recurring Monthly</option>
                        <option value="one_time">One-time Schedule</option>
                        <option value="percent_of_basic">Percent of Basic (%)</option>
                        <option value="per_hour">Per Hour</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Default Value</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="portal-input"
                        value={deductionForm.defaultValue}
                        onChange={e => setDeductionForm({ ...deductionForm, defaultValue: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Linkage Category</label>
                      <select
                        className="portal-input"
                        value={deductionForm.category}
                        onChange={e => setDeductionForm({ ...deductionForm, category: e.target.value as any })}
                      >
                        <option value="accommodation">Campus Accommodation</option>
                        <option value="staff_child">Staff-Child Tuition Recovery</option>
                        <option value="loan_advance">Salary Advance / Loan Repayment</option>
                        <option value="union_dues">Union / Social Club Dues</option>
                        <option value="general">General Deduction</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                    <button type="submit" className="portal-btn portal-btn-primary" style={{ padding: '8px 20px', fontWeight: 600 }}>
                      Save Deduction
                    </button>
                  </div>
                </form>
              )}

              <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Descriptor</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Type</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Default Value</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Category Linkage</th>
                    {isAdmin && <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem', textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {deductions.map((d, idx) => (
                    <tr key={d.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>{d.name}</td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#475569', fontSize: '0.9rem' }}>
                        {d.type ? d.type.replace(/_/g, ' ') : d.isPercentage ? 'Percent of Basic' : d.isRecurring ? 'Recurring Monthly' : 'One-time'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626' }}>
                        {d.type === 'percent_of_basic' || d.isPercentage ? `${d.defaultValue}%` : `-$${d.defaultValue.toFixed(2)}`}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="portal-badge" style={{ background: '#fef2f2', color: '#991b1b', fontWeight: 600, fontSize: '0.78rem' }}>
                          {d.category || 'General'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem('deductions', d.id, idx)}
                            className="portal-btn"
                            style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 3: STATUTORY TABLES */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'statutory' && (
            <div className="portal-card" style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                    Government Statutory Tax Tables & Legal Minimums
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Admin-edit-only. Governs PAYE income tax brackets, NSSA pension ceilings, AIDS Levy, and NEC minimum-wage enforcement.
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAddTaxTable(!showAddTaxTable)}
                    className="portal-btn portal-btn-primary"
                    style={{ padding: '9px 18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <i className={`fas fa-${showAddTaxTable ? 'times' : 'plus'}`} />
                    {showAddTaxTable ? 'Cancel' : `Configure ${activeStatutorySubTab}`}
                  </button>
                )}
              </div>

              {/* Statutory Sub-tabs */}
              <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 20 }}>
                {[
                  { id: 'PAYE', label: 'PAYE Tax Tables', icon: 'fas fa-file-invoice' },
                  { id: 'NSSA', label: 'NSSA Pension (Ceilings)', icon: 'fas fa-shield-alt' },
                  { id: 'AIDS_LEVY', label: 'AIDS Levy (3%)', icon: 'fas fa-ribbon' },
                  { id: 'NEC', label: 'NEC Minimum Wage Check', icon: 'fas fa-check-double' },
                  { id: 'ZIMDEF', label: 'ZIMDEF Levy (Tertiary/Poly)', icon: 'fas fa-graduation-cap' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setActiveStatutorySubTab(sub.id as any);
                      setStatutoryForm({ ...statutoryForm, statutoryType: sub.id as any });
                    }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 6,
                      border: 'none',
                      background: activeStatutorySubTab === sub.id ? '#0284c7' : '#f1f5f9',
                      color: activeStatutorySubTab === sub.id ? '#fff' : '#475569',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <i className={sub.icon} />
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* NEC Tab Special Warning Card */}
              {activeStatutorySubTab === 'NEC' && (
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <i className="fas fa-exclamation-triangle" style={{ color: '#d97706', fontSize: '1.2rem' }} />
                    <h4 style={{ margin: 0, color: '#92400e', fontWeight: 700 }}>National Employment Council (NEC) Compliance Guard</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#b45309' }}>
                    The system automatically audits salary configurations during pay runs. If any employee's basic salary falls below this configured NEC statutory threshold, a compliance warning will block payroll approval until reconciled.
                  </p>
                  <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#78350f' }}>NEC Minimum Basic Salary ($)</label>
                      <input
                        type="number"
                        disabled={!isAdmin}
                        className="portal-input"
                        style={{ maxWidth: 160, marginTop: 4 }}
                        value={necMinWage.minSalary}
                        onChange={e => setNecMinWage({ ...necMinWage, minSalary: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#78350f' }}>Governing Industry Sector</label>
                      <input
                        type="text"
                        disabled={!isAdmin}
                        className="portal-input"
                        style={{ maxWidth: 280, marginTop: 4 }}
                        value={necMinWage.sector}
                        onChange={e => setNecMinWage({ ...necMinWage, sector: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ZIMDEF Special Card */}
              {activeStatutorySubTab === 'ZIMDEF' && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <i className="fas fa-university" style={{ color: '#2563eb' }} />
                    <h4 style={{ margin: 0, color: '#1e40af', fontWeight: 700 }}>Zimbabwe Manpower Development Fund (ZIMDEF)</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#1d4ed8' }}>
                    Applicable to Tertiary Institutions, Polytechnics, and Vocational Colleges. Standard 1% employer levy computed on total monthly wage bill.
                  </p>
                </div>
              )}

              {/* Configure Tax Table Form */}
              {showAddTaxTable && (
                <div style={{ background: '#f8fafc', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                      Update Progressive Bands: {activeStatutorySubTab}
                    </h4>
                    <button
                      type="button"
                      onClick={addTaxBand}
                      className="portal-btn"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}
                    >
                      <i className="fas fa-plus mr-1" /> Add Band
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Table Descriptor</label>
                      <input
                        type="text"
                        className="portal-input"
                        value={statutoryForm.name}
                        onChange={e => setStatutoryForm({ ...statutoryForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Effective From Date</label>
                      <input
                        type="date"
                        className="portal-input"
                        value={statutoryForm.effectiveFrom}
                        onChange={e => setStatutoryForm({ ...statutoryForm, effectiveFrom: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Clean Correct Labels for Bands */}
                  <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 6, overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', fontSize: '0.82rem', color: '#475569' }}>Lower Limit ($)</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.82rem', color: '#475569' }}>Upper Limit ($)</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.82rem', color: '#475569' }}>Marginal Rate %</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.82rem', color: '#475569' }}>Fixed Amount ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statutoryForm.bands.map((band, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="number"
                              step="0.01"
                              className="portal-input"
                              value={band.minIncome}
                              onChange={e => updateTaxBand(idx, 'minIncome', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="NO LIMIT"
                              className="portal-input"
                              value={band.maxIncome !== null ? band.maxIncome : ''}
                              onChange={e => updateTaxBand(idx, 'maxIncome', e.target.value === '' ? null : parseFloat(e.target.value))}
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="number"
                              step="0.1"
                              className="portal-input"
                              value={band.rate}
                              onChange={e => updateTaxBand(idx, 'rate', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="number"
                              step="0.01"
                              className="portal-input"
                              value={band.fixedAmount}
                              onChange={e => updateTaxBand(idx, 'fixedAmount', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => setShowAddTaxTable(false)}
                      className="portal-btn portal-btn-secondary"
                      style={{ padding: '8px 16px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateTaxTable}
                      className="portal-btn portal-btn-primary"
                      style={{ padding: '8px 20px', fontWeight: 600 }}
                    >
                      Authorize & Audit-Log Table
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Tax Tables List */}
              <div style={{ marginTop: 10 }}>
                {taxTables.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 8 }}>
                    No custom statutory tables authorized yet. System uses standard ZIMRA Statutory Statutory Instruments by default.
                  </div>
                ) : (
                  taxTables.map((tt: any) => (
                    <div key={tt.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{tt.name}</strong>
                          <span style={{ marginLeft: 12, fontSize: '0.8rem', color: '#64748b' }}>
                            Effective From: {new Date(tt.effectiveFrom).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`portal-badge ${tt.isActive ? 'success' : 'neutral'}`}>
                          {tt.isActive ? 'Active' : 'Archived'}
                        </span>
                      </div>
                      <table className="portal-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: 8 }}>Lower Limit</th>
                            <th style={{ padding: 8 }}>Upper Limit</th>
                            <th style={{ padding: 8 }}>Marginal Rate %</th>
                            <th style={{ padding: 8 }}>Fixed Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(tt.bands || []).map((b: any, bIdx: number) => (
                            <tr key={b.id || bIdx}>
                              <td style={{ padding: 8 }}>${b.minIncome.toFixed(2)}</td>
                              <td style={{ padding: 8 }}>{b.maxIncome !== null ? `$${b.maxIncome.toFixed(2)}` : 'Above'}</td>
                              <td style={{ padding: 8 }}>{b.rate}%</td>
                              <td style={{ padding: 8 }}>${b.fixedAmount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 4: PAYOUT METHODS (NO PAYPAL) */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeTab === 'payouts' && (
            <form onSubmit={handleSavePayouts}>
              <div className="portal-card" style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                    Staff Payout Channels & Default Currency Split
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Approved payment disbursement channels for monthly salary settlements. (PayPal is completely removed per Zimbabwean banking regulations).
                  </p>
                </div>

                {/* Currency Split Policy */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 18, marginBottom: 24 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-coins" /> Default Multi-Currency Split Ratio
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 16, alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>USD Portion (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={!isAdmin}
                        className="portal-input"
                        value={payoutConfig.defaultSplitUsd}
                        onChange={e => {
                          const usd = parseInt(e.target.value) || 0;
                          setPayoutConfig({ ...payoutConfig, defaultSplitUsd: usd, defaultSplitZig: 100 - usd });
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>ZiG Portion (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={!isAdmin}
                        className="portal-input"
                        value={payoutConfig.defaultSplitZig}
                        onChange={e => {
                          const zig = parseInt(e.target.value) || 0;
                          setPayoutConfig({ ...payoutConfig, defaultSplitZig: zig, defaultSplitUsd: 100 - zig });
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#15803d' }}>
                      Current Split: <strong>{payoutConfig.defaultSplitUsd}% USD / {payoutConfig.defaultSplitZig}% ZiG</strong>
                    </div>
                  </div>
                </div>

                {/* Approved Payout Methods */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* USD Nostro */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <div>
                      <strong style={{ color: '#1e293b' }}>USD Nostro Bank Transfer</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Disbursement to staff FCA Nostro accounts via RTGS / ZIPIT Nostro.</div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        disabled={!isAdmin}
                        checked={payoutConfig.usdNostroEnabled}
                        onChange={e => setPayoutConfig({ ...payoutConfig, usdNostroEnabled: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>

                  {/* ZiG Transfer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <div>
                      <strong style={{ color: '#1e293b' }}>ZiG Local Bank Transfer</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Disbursement to staff local currency accounts via ZimSwitch / RTGS.</div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        disabled={!isAdmin}
                        checked={payoutConfig.zigTransferEnabled}
                        onChange={e => setPayoutConfig({ ...payoutConfig, zigTransferEnabled: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>

                  {/* EcoCash USD */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <div>
                      <strong style={{ color: '#1e293b' }}>EcoCash Mobile Money (USD)</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Direct corporate bulk payroll disbursement to staff EcoCash USD wallets.</div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        disabled={!isAdmin}
                        checked={payoutConfig.ecocashUsdEnabled}
                        onChange={e => setPayoutConfig({ ...payoutConfig, ecocashUsdEnabled: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>

                  {/* EcoCash ZiG */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <div>
                      <strong style={{ color: '#1e293b' }}>EcoCash Mobile Money (ZiG)</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Bulk mobile payroll disbursement in ZiG.</div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        disabled={!isAdmin}
                        checked={payoutConfig.ecocashZigEnabled}
                        onChange={e => setPayoutConfig({ ...payoutConfig, ecocashZigEnabled: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>

                  {/* Cash */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <div>
                      <strong style={{ color: '#1e293b' }}>Cash Over-the-Counter Disbursement</strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Disbursed from institutional cash vault / Bursar till with signed voucher receipts.</div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        disabled={!isAdmin}
                        checked={payoutConfig.cashEnabled}
                        onChange={e => setPayoutConfig({ ...payoutConfig, cashEnabled: e.target.checked })}
                      /> Enabled
                    </label>
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                    <button
                      type="submit"
                      disabled={savingPayouts}
                      className="portal-btn portal-btn-primary"
                      style={{ padding: '10px 24px', fontWeight: 600 }}
                    >
                      {savingPayouts ? 'Saving Policies...' : 'Save Payout Policies'}
                    </button>
                  </div>
                )}
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
