import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';
import { useTerminology } from '../../../hooks/useTerminology';
import { SearchInput, ExportButton } from '../../../components/shared';

interface FeeGroup {
  id: string;
  name: string;
  amount: number;
  year: number;
  billingType: string;
  isRecurring: boolean;
  remindersEnabled: boolean;
  incomeAccountId?: string;
  arAccountId?: string;
  _count?: { fees: number };
  classAmounts?: { classId: string; amount: number }[];
}

interface ClassItem {
  id: string;
  name: string;
}

export default function FeeGroupsPage() {
  const { t } = useTerminology();
  const { showToast } = useToast();

  const [groups, setGroups] = useState<FeeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [cycleFilter, setCycleFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    amount: '',
    year: new Date().getFullYear().toString(),
    billingType: 'Termly',
    isRecurring: false,
    remindersEnabled: true,
    incomeAccountId: '',
    arAccountId: ''
  });

  const [classAmounts, setClassAmounts] = useState<Record<string, string>>({});
  const [showClassOverrides, setShowClassOverrides] = useState(false);

  useEffect(() => {
    fetchGroups();
    fetchClasses();
    fetchAccounts();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/api/classes');
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load classes', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data } = await api.get('/api/accounts/coa');
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load accounts', error);
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/fees/groups');
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load fee groups', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.amount || !formData.billingType) {
      return showToast('Please enter a Fee Group Name, Standard Amount, and Billing Cycle', 'warning');
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        year: parseInt(formData.year, 10),
        classAmounts: Object.entries(classAmounts)
          .filter(([_, amount]) => amount && !isNaN(parseFloat(amount)))
          .map(([classId, amount]) => ({ classId, amount: parseFloat(amount as string) }))
      };

      const { data } = await api.post('/api/fees/groups', payload);

      if (formData.id) {
        setGroups(prev => prev.map(g => (g.id === data.id ? data : g)));
        showToast('Fee group updated successfully', 'success');
      } else {
        setGroups(prev => [data, ...prev]);
        showToast('New fee group created successfully', 'success');
      }

      handleReset();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to save fee group', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (group: FeeGroup) => {
    setFormData({
      id: group.id,
      name: group.name,
      amount: group.amount.toString(),
      year: group.year.toString(),
      billingType: group.billingType || 'Termly',
      isRecurring: Boolean(group.isRecurring),
      remindersEnabled: Boolean(group.remindersEnabled),
      incomeAccountId: group.incomeAccountId || '',
      arAccountId: group.arAccountId || ''
    });

    const amountsMap: Record<string, string> = {};
    if (group.classAmounts && group.classAmounts.length > 0) {
      group.classAmounts.forEach(ca => {
        amountsMap[ca.classId] = ca.amount.toString();
      });
      setShowClassOverrides(true);
    } else {
      setShowClassOverrides(false);
    }
    setClassAmounts(amountsMap);
    setIsModalOpen(true);
  };

  const handleDelete = async (group: FeeGroup) => {
    if (!window.confirm(`Are you sure you want to delete "${group.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/api/fees/groups/${group.id}`);
      setGroups(prev => prev.filter(g => g.id !== group.id));
      showToast(`Fee group "${group.name}" deleted`, 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to delete fee group', 'error');
    }
  };

  const handleDuplicate = (group: FeeGroup) => {
    setFormData({
      id: '',
      name: `${group.name} (Copy)`,
      amount: group.amount.toString(),
      year: activeYear.toString(),
      billingType: group.billingType || 'Termly',
      isRecurring: Boolean(group.isRecurring),
      remindersEnabled: Boolean(group.remindersEnabled),
      incomeAccountId: group.incomeAccountId || '',
      arAccountId: group.arAccountId || ''
    });

    const amountsMap: Record<string, string> = {};
    if (group.classAmounts && group.classAmounts.length > 0) {
      group.classAmounts.forEach(ca => {
        amountsMap[ca.classId] = ca.amount.toString();
      });
      setShowClassOverrides(true);
    } else {
      setShowClassOverrides(false);
    }
    setClassAmounts(amountsMap);
    setIsModalOpen(true);
  };

  const handleReset = () => {
    setFormData({
      id: '',
      name: '',
      amount: '',
      year: activeYear.toString(),
      billingType: 'Termly',
      isRecurring: false,
      remindersEnabled: true,
      incomeAccountId: '',
      arAccountId: ''
    });
    setClassAmounts({});
    setShowClassOverrides(false);
    setIsModalOpen(false);
  };

  const years = Array.from(new Set(groups.map(g => g.year))).sort((a, b) => b - a);
  if (years.length === 0) years.push(new Date().getFullYear());

  const yearGroups = groups.filter(g => g.year === activeYear);

  const filteredGroups = yearGroups.filter(g => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.billingType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCycle =
      cycleFilter === 'ALL' || g.billingType.toUpperCase() === cycleFilter.toUpperCase();
    return matchesSearch && matchesCycle;
  });

  // KPI Calculations
  const totalStandardValue = yearGroups.reduce((sum, g) => sum + (Number(g.amount) || 0), 0);
  const recurringCount = yearGroups.filter(g => g.isRecurring).length;
  const groupsWithOverrides = yearGroups.filter(g => (g.classAmounts?.length || 0) > 0).length;

  const cycleColors: Record<string, { bg: string; text: string; border: string }> = {
    TERMLY: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    ANNUAL: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
    MONTHLY: { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
    ONCE_OFF: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
    ONE_TIME: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' }
  };

  const getCycleStyle = (cycle: string) => {
    const key = (cycle || '').toUpperCase().replace(/[\s-]/g, '_');
    return cycleColors[key] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-layer-group" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                Fee Groups & Pricing Structure
              </h1>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                Define institutional fee templates, tuition brackets, and class-specific pricing schedules for {activeYear}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ExportButton
            data={filteredGroups.map(g => ({
              'Fee Group Name': g.name,
              'Standard Amount': `$${Number(g.amount).toFixed(2)}`,
              'Billing Cycle': g.billingType,
              'Academic Year': g.year,
              'Recurring': g.isRecurring ? 'Yes' : 'No',
              'Arrears Reminders': g.remindersEnabled ? 'Enabled' : 'Disabled',
              'Class Overrides': g.classAmounts?.length || 0
            }))}
            columns={[
              { header: 'Fee Group Name', key: 'Fee Group Name', width: 25 },
              { header: 'Standard Amount', key: 'Standard Amount', width: 16 },
              { header: 'Billing Cycle', key: 'Billing Cycle', width: 16 },
              { header: 'Academic Year', key: 'Academic Year', width: 14 },
              { header: 'Recurring', key: 'Recurring', width: 12 },
              { header: 'Arrears Reminders', key: 'Arrears Reminders', width: 16 },
              { header: 'Class Overrides', key: 'Class Overrides', width: 14 }
            ]}
            filename={`fee_groups_${activeYear}`}
            title="Institutional Fee Groups"
            subtitle={`Academic Year ${activeYear}`}
          />

          <button
            onClick={() => { handleReset(); setIsModalOpen(true); }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
            }}
          >
            <i className="fas fa-plus" />
            <span>Create Fee Group</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fee Groups ({activeYear})</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-layer-group" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{yearGroups.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>Total fee schedules registered</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Combined Standard Value</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-dollar-sign" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>{formatCurrency(totalStandardValue)}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>Standard rate across all categories</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recurring Auto-Bill</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-sync-alt" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7c3aed' }}>{recurringCount}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>Invoiced automatically per term/month</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Class-Specific Pricing</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-sliders-h" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706' }}>{groupsWithOverrides}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>Groups with customized class rates</div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div style={{ background: '#ffffff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        {/* Year Pills & Cycle Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Year Pills */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: 8 }}>
            {years.map(yr => (
              <button
                key={yr}
                onClick={() => setActiveYear(yr)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activeYear === yr ? '#0284c7' : 'transparent',
                  color: activeYear === yr ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                {yr}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: '#cbd5e1' }} />

          {/* Cycle Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['ALL', 'Termly', 'Annual', 'Monthly', 'Once-off'].map(cycle => (
              <button
                key={cycle}
                onClick={() => setCycleFilter(cycle)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: cycleFilter === cycle ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  backgroundColor: cycleFilter === cycle ? '#f0f9ff' : '#ffffff',
                  color: cycleFilter === cycle ? '#0284c7' : '#64748b'
                }}
              >
                {cycle}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ minWidth: 260 }}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search fee groups..."
          />
        </div>
      </div>

      {/* ── Fee Groups Data Table ── */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 20px', fontWeight: 700 }}>Fee Group Descriptor</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Standard Cost</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Billing Cycle</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Class Overrides</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Accounting / GL Mapping</th>
                <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'center' }}>Automations</th>
                <th style={{ padding: '14px 20px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: '#0284c7', marginBottom: 8, display: 'block' }} />
                    Loading fee groups...
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#94a3b8', fontSize: '1.5rem' }}>
                      <i className="fas fa-layer-group" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                      No Fee Groups Found for {activeYear}
                    </h3>
                    <p style={{ margin: '6px 0 16px', fontSize: '0.85rem', color: '#64748b' }}>
                      {searchTerm ? 'No results match your search query.' : 'Click below to create your first fee group.'}
                    </p>
                    <button
                      onClick={() => { handleReset(); setIsModalOpen(true); }}
                      style={{
                        padding: '8px 18px',
                        backgroundColor: '#0284c7',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      + Create Fee Group
                    </button>
                  </td>
                </tr>
              ) : (
                filteredGroups.map(group => {
                  const cycleStyle = getCycleStyle(group.billingType);
                  const overrideCount = group.classAmounts?.length || 0;
                  const incomeAcc = accounts.find(a => a.id === group.incomeAccountId);
                  const arAcc = accounts.find(a => a.id === group.arAccountId);

                  return (
                    <tr key={group.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                      {/* Name & Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', border: '1px solid #bfdbfe' }}>
                            {group.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                              {group.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                              ID: {group.id.slice(0, 10).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Standard Cost */}
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669' }}>
                          {formatCurrency(group.amount)}
                        </span>
                      </td>

                      {/* Billing Cycle */}
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: cycleStyle.bg,
                          color: cycleStyle.text,
                          border: `1px solid ${cycleStyle.border}`
                        }}>
                          {group.billingType || 'Termly'}
                        </span>
                      </td>

                      {/* Class Overrides */}
                      <td style={{ padding: '16px' }}>
                        {overrideCount > 0 ? (
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <i className="fas fa-sliders-h" style={{ fontSize: '0.65rem' }} />
                            {overrideCount} class{overrideCount !== 1 ? 'es' : ''} customized
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            Universal pricing
                          </span>
                        )}
                      </td>

                      {/* GL Accounts */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.78rem' }}>
                          <div style={{ color: '#475569' }}>
                            <span style={{ fontWeight: 700, color: '#16a34a' }}>CR:</span> {incomeAcc ? `${incomeAcc.code} - ${incomeAcc.name}` : 'Default Tuition Income'}
                          </div>
                          <div style={{ color: '#475569' }}>
                            <span style={{ fontWeight: 700, color: '#2563eb' }}>DR:</span> {arAcc ? `${arAcc.code} - ${arAcc.name}` : 'Default Debtors Control'}
                          </div>
                        </div>
                      </td>

                      {/* Automations */}
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {group.isRecurring && (
                            <span title="Automated termly recurring billing enabled" style={{ width: 28, height: 28, borderRadius: 6, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                              <i className="fas fa-sync-alt" />
                            </span>
                          )}
                          {group.remindersEnabled && (
                            <span title="Automated fee reminder SMS/WhatsApp enabled" style={{ width: 28, height: 28, borderRadius: 6, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                              <i className="fas fa-bell" />
                            </span>
                          )}
                          {!group.isRecurring && !group.remindersEnabled && (
                            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Manual</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => handleEdit(group)}
                            title="Edit Fee Group"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#0284c7',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem'
                            }}
                          >
                            <i className="fas fa-pencil-alt" />
                          </button>

                          <button
                            onClick={() => handleDuplicate(group)}
                            title="Duplicate as new template"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#64748b',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem'
                            }}
                          >
                            <i className="fas fa-copy" />
                          </button>

                          <button
                            onClick={() => handleDelete(group)}
                            title="Delete Fee Group"
                            disabled={(group._count?.fees || 0) > 0}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              border: '1px solid #fecaca',
                              background: '#ffffff',
                              color: (group._count?.fees || 0) > 0 ? '#cbd5e1' : '#dc2626',
                              cursor: (group._count?.fees || 0) > 0 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem'
                            }}
                          >
                            <i className="fas fa-trash-alt" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={handleReset}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              maxWidth: 750,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  <i className={`fas fa-${formData.id ? 'edit' : 'plus-circle'}`} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    {formData.id ? 'Edit Fee Group' : 'Create New Fee Group'}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    Configure standard rates, class overrides, and Chart of Accounts links
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer', padding: 4 }}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              {/* Core Information Section */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. Core Details & Standard Rate
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Fee Group Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Form 1 Tuition & General Levy"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Standard Amount ($) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b' }}>$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 28px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: '#059669',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Billing Cycle *
                    </label>
                    <select
                      value={formData.billingType}
                      onChange={e => setFormData({ ...formData, billingType: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="Termly">Termly (Once Per Term)</option>
                      <option value="Annual">Annual (Once Per Academic Year)</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Once-off">Once-Off / Admission Levy</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Fiscal Year *
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={e => setFormData({ ...formData, year: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* General Ledger Accounting Mapping */}
              <div style={{ marginBottom: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  2. General Ledger (GL) Integration
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Revenue Account (Credit)
                    </label>
                    <select
                      value={formData.incomeAccountId}
                      onChange={e => setFormData({ ...formData, incomeAccountId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="">-- Default Tuition & Fee Revenue (4000) --</option>
                      {accounts
                        .filter(a => a.type === 'REVENUE' || a.type === 'INCOME')
                        .map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Receivable Account (Debit)
                    </label>
                    <select
                      value={formData.arAccountId}
                      onChange={e => setFormData({ ...formData, arAccountId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="">-- Default Accounts Receivable / Debtors (1100) --</option>
                      {accounts
                        .filter(a => a.type === 'ASSET' && (a.name.toLowerCase().includes('receivable') || a.name.toLowerCase().includes('debtor')))
                        .map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Class-Specific Overrides Section */}
              <div style={{ marginBottom: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      3. Class-Specific Pricing Overrides (Optional)
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                      Specify custom rates for specific classes. Classes left blank will use the standard rate (${formData.amount || '0.00'}).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowClassOverrides(!showClassOverrides)}
                    style={{
                      background: 'none',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#0284c7',
                      cursor: 'pointer'
                    }}
                  >
                    {showClassOverrides ? 'Hide Overrides' : 'Configure Overrides →'}
                  </button>
                </div>

                {showClassOverrides && (
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', maxHeight: 220, overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                      {classes.map(cls => {
                        const hasOverride = Boolean(classAmounts[cls.id]);
                        return (
                          <div
                            key={cls.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              background: hasOverride ? '#eff6ff' : '#ffffff',
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: `1px solid ${hasOverride ? '#93c5fd' : '#e2e8f0'}`
                            }}
                          >
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cls.name}>
                              {cls.name}
                            </span>
                            <div style={{ position: 'relative', width: 75 }}>
                              <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#94a3b8' }}>$</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder={formData.amount || 'Std'}
                                value={classAmounts[cls.id] || ''}
                                onChange={e => setClassAmounts({ ...classAmounts, [cls.id]: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px 4px 16px',
                                  fontSize: '0.8rem',
                                  borderRadius: 4,
                                  border: '1px solid #cbd5e1',
                                  fontWeight: 700,
                                  color: hasOverride ? '#0284c7' : '#64748b',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Automation Toggles */}
              <div style={{ marginBottom: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  4. Billing Automations
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isRecurring}
                      onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#0284c7', cursor: 'pointer' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', display: 'block' }}>
                        Automated Recurring Invoicing
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Automatically post student invoices at the start of each academic billing cycle
                      </span>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.remindersEnabled}
                      onChange={e => setFormData({ ...formData, remindersEnabled: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#059669', cursor: 'pointer' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', display: 'block' }}>
                        Arrears Reminder Notifications
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Include outstanding balances from this fee group in automated parent SMS and statement reminders
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#64748b',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
                  }}
                >
                  {saving && <i className="fas fa-spinner fa-spin" />}
                  <span>{formData.id ? 'Save Changes' : 'Create Fee Group'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
