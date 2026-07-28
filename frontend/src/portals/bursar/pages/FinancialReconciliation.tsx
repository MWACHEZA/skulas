import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { formatCurrency } from '../../../utils/formatters';
import toast from 'react-hot-toast';

interface MonthRow {
  period: string;
  inflow: number;
  outflow: number;
  feesCollected: number;
  variance: number;
  status: 'Balanced' | 'Surplus' | 'Deficit';
}

interface Summary {
  totalFeesCollected: number;
  totalIncome: number;
  totalExpenses: number;
  totalLiabilities: number;
}

function groupByMonth(records: any[], amountField = 'amount', dateField = 'date'): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of records) {
    const d = new Date(r[dateField] || r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = (map[key] || 0) + (r[amountField] || 0);
  }
  return map;
}

function groupFeesByMonth(fees: any[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const f of fees) {
    const d = new Date(f.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = (map[key] || 0) + (f.paid || 0);
  }
  return map;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function BursarFinancialReconciliation() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalFeesCollected: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalLiabilities: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [incomeRes, expenseRes, feesRes, liabRes] = await Promise.all([
        api.get('/api/accounts/income'),
        api.get('/api/accounts/expenses'),
        api.get('/api/fees/invoices'),
        api.get('/api/accounts/liabilities'),
      ]);

      const incomes   = Array.isArray(incomeRes.data)   ? incomeRes.data   : [];
      const expenses  = Array.isArray(expenseRes.data)  ? expenseRes.data  : [];
      const fees      = Array.isArray(feesRes.data)     ? feesRes.data     : [];
      const liabs     = Array.isArray(liabRes.data)     ? liabRes.data     : [];

      const totalIncome      = incomes.reduce((s: number, r: any)  => s + (r.amount || 0), 0);
      const totalExpenses    = expenses.reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const totalFeesPaid    = fees.reduce((s: number, f: any)     => s + (f.paid   || 0), 0);
      const totalLiabilities = liabs.reduce((s: number, l: any)    => s + (l.amount || 0), 0);

      setSummary({
        totalFeesCollected: totalFeesPaid,
        totalIncome,
        totalExpenses,
        totalLiabilities,
      });

      // Build per-month breakdown
      const incomeByMonth   = groupByMonth(incomes, 'amount', 'date');
      const expenseByMonth  = groupByMonth(expenses, 'amount', 'date');
      const feesByMonth     = groupFeesByMonth(fees);

      const allKeys = Array.from(new Set([
        ...Object.keys(incomeByMonth),
        ...Object.keys(expenseByMonth),
        ...Object.keys(feesByMonth),
      ])).sort().reverse().slice(0, 12); // last 12 months

      const built: MonthRow[] = allKeys.map(key => {
        const inflow  = (incomeByMonth[key] || 0) + (feesByMonth[key] || 0);
        const outflow = expenseByMonth[key] || 0;
        const variance = inflow - outflow;
        return {
          period:         monthLabel(key),
          inflow,
          outflow,
          feesCollected:  feesByMonth[key] || 0,
          variance,
          status:
            Math.abs(variance) < 0.01
              ? 'Balanced'
              : variance > 0
              ? 'Surplus'
              : 'Deficit',
        };
      });

      setRows(built);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: MonthRow['status']) =>
    s === 'Balanced' ? '#059669' : s === 'Surplus' ? '#2563eb' : '#dc2626';
  const statusBg = (s: MonthRow['status']) =>
    s === 'Balanced' ? '#ecfdf5' : s === 'Surplus' ? '#eff6ff' : '#fef2f2';

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Financial Reconciliation</h1>
          <p>Monthly cross-reference of fee collections, secondary income, and operational expenditures.</p>
        </div>
        <button className="portal-btn-primary" style={{ padding: '12px 28px', fontWeight: 900 }} onClick={loadData}>
          <i className="fas fa-sync-alt mr-2"></i>Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {[
          { label: 'Fees Collected',     value: summary.totalFeesCollected,  icon: 'fa-hand-holding-usd', color: '#059669', bg: '#ecfdf5' },
          { label: 'Other Income',       value: summary.totalIncome,          icon: 'fa-arrow-trend-up',   color: '#2563eb', bg: '#eff6ff' },
          { label: 'Total Expenditure',  value: summary.totalExpenses,        icon: 'fa-arrow-trend-down', color: '#dc2626', bg: '#fef2f2' },
          { label: 'Outstanding Debts',  value: summary.totalLiabilities,     icon: 'fa-exclamation-circle', color: '#b45309', bg: '#fffbeb' },
        ].map(kpi => (
          <div key={kpi.label} className="portal-card animate-in fade-in duration-500" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '14px', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`fas ${kpi.icon}`} style={{ color: kpi.color, fontSize: '1.25rem' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</div>
              {loading
                ? <div style={{ height: 24, width: 100, background: '#f1f5f9', borderRadius: 4, marginTop: 4 }}></div>
                : <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', marginTop: '4px' }}>{formatCurrency(kpi.value)}</div>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Monthly breakdown table */}
      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><i className="fas fa-balance-scale mr-2"></i>Monthly Reconciliations</h2>
          <span className="status-badge" style={{ fontWeight: 900, background: '#f8fafc', color: '#64748b', border: '1px solid #f1f5f9' }}>
            LAST 12 MONTHS
          </span>
        </div>
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Fees Collected</th>
                <th>Other Income</th>
                <th>Total Inflow</th>
                <th>Expenditure</th>
                <th>Variance</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '80px' }}>
                    <div className="portal-spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p style={{ fontWeight: 800, color: '#64748b' }}>Loading reconciliation data...</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
                    <i className="fas fa-balance-scale" style={{ fontSize: '3rem', display: 'block', marginBottom: '16px', opacity: 0.1 }}></i>
                    <p style={{ fontWeight: 700 }}>No financial data available yet. Record income, expenses, or accept fee payments to see monthly reconciliations.</p>
                  </td>
                </tr>
              ) : rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 800, color: '#1e293b' }}>{r.period}</td>
                  <td style={{ color: '#059669', fontWeight: 700 }}>{formatCurrency(r.feesCollected)}</td>
                  <td style={{ color: '#2563eb', fontWeight: 700 }}>{formatCurrency(r.inflow - r.feesCollected)}</td>
                  <td style={{ fontWeight: 900 }}>{formatCurrency(r.inflow)}</td>
                  <td style={{ color: '#dc2626', fontWeight: 700 }}>{formatCurrency(r.outflow)}</td>
                  <td style={{ fontWeight: 900, color: r.variance >= 0 ? '#059669' : '#dc2626' }}>
                    {r.variance >= 0 ? '+' : ''}{formatCurrency(r.variance)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="status-badge" style={{
                      background: statusBg(r.status),
                      color: statusColor(r.status),
                      fontWeight: 900,
                      fontSize: '0.7rem',
                      border: `1px solid ${statusBg(r.status)}`
                    }}>
                      {r.status.toUpperCase()}
                    </span>
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
