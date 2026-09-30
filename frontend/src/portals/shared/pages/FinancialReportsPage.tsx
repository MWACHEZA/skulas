import React, { useState } from 'react';
import api from '../../../lib/api';
import { useAccountingQuery } from '../../../hooks/useAccountingQuery';
import {
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Calendar,
  Send,
  Download,
  Percent,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { toast } from '../../../context/ToastContext';

export default function FinancialReportsPage() {
  const [activeReport, setActiveReport] = useState<
    'TRIAL_BALANCE' | 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'AR_AGING' | 'VAT_REPORT' | 'CASH_FLOW' | 'BUDGET_VS_ACTUAL' | 'GENERAL_LEDGER'
  >('TRIAL_BALANCE');

  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [fromDate, setFromDate] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [budgetYear, setBudgetYear] = useState<number>(new Date().getFullYear());
  const [budgetTerm, setBudgetTerm] = useState<string>('Annual');
  const [sendingSms, setSendingSms] = useState(false);

  // 1. Trial Balance Query
  const trialBalanceQuery = useAccountingQuery<any>({
    key: `accounting:reports:trial-balance:${period}`,
    enabled: activeReport === 'TRIAL_BALANCE',
    fetcher: async () => {
      const res = await api.get(`/api/accounts/reports/trial-balance?period=${period}`);
      return res.data;
    }
  });

  // 2. Income Statement Query
  const incomeStatementQuery = useAccountingQuery<any>({
    key: `accounting:reports:income-statement:${fromDate}:${toDate}`,
    enabled: activeReport === 'INCOME_STATEMENT',
    fetcher: async () => {
      const res = await api.get(`/api/accounts/reports/income-statement?from=${fromDate}&to=${toDate}`);
      return res.data;
    }
  });

  // 3. Balance Sheet Query
  const balanceSheetQuery = useAccountingQuery<any>({
    key: `accounting:reports:balance-sheet:${toDate}`,
    enabled: activeReport === 'BALANCE_SHEET',
    fetcher: async () => {
      const res = await api.get(`/api/accounts/reports/balance-sheet?asOf=${toDate}`);
      return res.data;
    }
  });

  // 4. AR Aging Query
  const arAgingQuery = useAccountingQuery<any>({
    key: `accounting:reports:ar-aging:${toDate}`,
    enabled: activeReport === 'AR_AGING',
    fetcher: async () => {
      const res = await api.get(`/api/accounts/reports/ar-aging?asOf=${toDate}`);
      return res.data;
    }
  });

  // 5. ZIMRA VAT Report Query
  const vatQuery = useAccountingQuery<any>({
    key: `accounting:reports:vat:${fromDate}:${toDate}`,
    enabled: activeReport === 'VAT_REPORT',
    fetcher: async () => {
      const res = await api.get(`/api/accounts/reports/vat?from=${fromDate}&to=${toDate}`);
      return res.data;
    }
  });

  // 6. Cash Flow Statement Query
  const cashFlowQuery = useAccountingQuery<any>({
    key: `accounting:reports:cash-flow:${fromDate}:${toDate}`,
    enabled: activeReport === 'CASH_FLOW',
    fetcher: async () => {
      const res = await api.get(`/api/accounts/reports/cash-flow?from=${fromDate}&to=${toDate}`);
      return res.data;
    }
  });

  // 7. Budget vs Actual Query
  const budgetVsActualQuery = useAccountingQuery<any>({
    key: `accounting:reports:budget-vs-actual:${budgetYear}:${budgetTerm}`,
    enabled: activeReport === 'BUDGET_VS_ACTUAL',
    fetcher: async () => {
      const res = await api.get(`/api/accounts/reports/budget-vs-actual?year=${budgetYear}&term=${budgetTerm}`);
      return res.data;
    }
  });

  // 8. CoA Accounts list for GL dropdown
  const coaQuery = useAccountingQuery<any[]>({
    key: 'accounting:coa',
    enabled: activeReport === 'GENERAL_LEDGER',
    fetcher: async () => {
      const res = await api.get('/api/accounts/coa');
      return res.data;
    }
  });

  // 9. General Ledger Query
  const glQuery = useAccountingQuery<any>({
    key: `accounting:reports:general-ledger:${selectedAccountId}:${fromDate}:${toDate}`,
    enabled: activeReport === 'GENERAL_LEDGER' && !!selectedAccountId,
    fetcher: async () => {
      const res = await api.get(`/api/accounts/reports/general-ledger?accountId=${selectedAccountId}&from=${fromDate}&to=${toDate}`);
      return res.data;
    }
  });

  const handleSendSmsReminders = async () => {
    try {
      setSendingSms(true);
      await api.post('/api/fees/remind-defaulters', { asOfDate: toDate });
      toast.success('SMS payment reminders dispatched to all overdue accounts!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to dispatch reminders');
    } finally {
      setSendingSms(false);
    }
  };

  const arRows = Array.isArray(arAgingQuery.data)
    ? arAgingQuery.data
    : arAgingQuery.data?.rows || [];

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>Financial Reports Suite</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Authoritative general ledger financial statements powered by double-entry integrity engine
          </p>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'TRIAL_BALANCE', label: 'Trial Balance' },
          { id: 'INCOME_STATEMENT', label: 'Profit & Loss (P&L)' },
          { id: 'BALANCE_SHEET', label: 'Balance Sheet' },
          { id: 'AR_AGING', label: 'Debtors Aging (AR)' },
          { id: 'VAT_REPORT', label: 'ZIMRA VAT (15%)' },
          { id: 'CASH_FLOW', label: 'Cash Flow Statement' },
          { id: 'BUDGET_VS_ACTUAL', label: 'Budget vs Actual' },
          { id: 'GENERAL_LEDGER', label: 'GL Drill-Down' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as any)}
            style={{
              padding: '10px 18px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeReport === tab.id ? '#2563eb' : '#f1f5f9',
              color: activeReport === tab.id ? '#fff' : '#475569',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TRIAL BALANCE VIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeReport === 'TRIAL_BALANCE' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Accounting Period:</label>
            <input
              type="month"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
            <button
              onClick={() => trialBalanceQuery.refetch()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
            >
              <RefreshCw size={14} className={trialBalanceQuery.isFetching ? 'spin' : ''} /> Refresh
            </button>

            {trialBalanceQuery.data && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: trialBalanceQuery.data.isBalanced ? '#16a34a' : '#dc2626' }}>
                {trialBalanceQuery.data.isBalanced ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {trialBalanceQuery.data.isBalanced ? 'Trial Balance is Balanced (DR === CR)' : 'IMBALANCED TRIAL BALANCE'}
              </div>
            )}
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {trialBalanceQuery.isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Generating Trial Balance...</div>
            ) : !trialBalanceQuery.data?.lines?.length ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No journal lines recorded for this period.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Code</th>
                    <th style={{ padding: '12px 16px' }}>Account Name</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Debit (DR)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Credit (CR)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Net Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalanceQuery.data.lines.map((l: any) => (
                    <tr key={l.accountCode} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{l.accountCode}</td>
                      <td style={{ padding: '12px 16px', color: '#1e293b' }}>{l.accountName}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                          {l.accountType}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {l.totalDebit > 0 ? `$${l.totalDebit.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {l.totalCredit > 0 ? `$${l.totalCredit.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: l.balance < 0 ? '#dc2626' : '#16a34a' }}>
                        ${Math.abs(l.balance).toFixed(2)} {l.balance < 0 ? 'CR' : 'DR'}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #e2e8f0' }}>
                    <td colSpan={3} style={{ padding: '14px 16px' }}>TOTALS</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                      ${trialBalanceQuery.data.totalDebit.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                      ${trialBalanceQuery.data.totalCredit.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', color: trialBalanceQuery.data.isBalanced ? '#16a34a' : '#dc2626' }}>
                      Diff: ${trialBalanceQuery.data.difference.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PROFIT & LOSS (INCOME STATEMENT) VIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeReport === 'INCOME_STATEMENT' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>From:</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <label style={{ fontSize: '14px', fontWeight: 600 }}>To:</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <button onClick={() => incomeStatementQuery.refetch()} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}>
              <RefreshCw size={14} className={incomeStatementQuery.isFetching ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {incomeStatementQuery.isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Generating Statement of Comprehensive Income...</div>
          ) : incomeStatementQuery.data && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Income Section */}
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a', margin: '0 0 16px', borderBottom: '2px solid #dcfce7', paddingBottom: '8px' }}>OPERATING REVENUE</h3>
                {incomeStatementQuery.data.income.map((i: any) => (
                  <div key={i.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                    <span><strong style={{ fontFamily: 'monospace' }}>{i.code}</strong> {i.name}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${i.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '2px solid #e2e8f0', fontWeight: 'bold', fontSize: '15px' }}>
                  <span>Total Revenue</span>
                  <span style={{ color: '#16a34a' }}>${incomeStatementQuery.data.totalIncome.toFixed(2)}</span>
                </div>
              </div>

              {/* Expenses Section */}
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626', margin: '0 0 16px', borderBottom: '2px solid #fee2e2', paddingBottom: '8px' }}>OPERATING EXPENSES</h3>
                {incomeStatementQuery.data.expenses.map((e: any) => (
                  <div key={e.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                    <span><strong style={{ fontFamily: 'monospace' }}>{e.code}</strong> {e.name}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${e.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '2px solid #e2e8f0', fontWeight: 'bold', fontSize: '15px' }}>
                  <span>Total Expenses</span>
                  <span style={{ color: '#dc2626' }}>${incomeStatementQuery.data.totalExpenses.toFixed(2)}</span>
                </div>
              </div>

              {/* Net Surplus Banner */}
              <div style={{ gridColumn: 'span 2', backgroundColor: incomeStatementQuery.data.netProfit >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${incomeStatementQuery.data.netProfit >= 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '18px', color: incomeStatementQuery.data.netProfit >= 0 ? '#166534' : '#991b1b' }}>
                    {incomeStatementQuery.data.netProfit >= 0 ? 'Net Operating Surplus' : 'Net Operating Deficit'}
                  </h4>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>For period {fromDate} to {toDate}</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'monospace', color: incomeStatementQuery.data.netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
                  ${incomeStatementQuery.data.netProfit.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. BALANCE SHEET VIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeReport === 'BALANCE_SHEET' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>As of Date:</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <button onClick={() => balanceSheetQuery.refetch()} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}>
              <RefreshCw size={14} className={balanceSheetQuery.isFetching ? 'spin' : ''} /> Refresh
            </button>
            {balanceSheetQuery.data && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: balanceSheetQuery.data.isValid ? '#16a34a' : '#dc2626' }}>
                {balanceSheetQuery.data.isValid ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {balanceSheetQuery.data.isValid ? 'Balance Sheet Equation Valid (Assets = Liabilities + Equity)' : 'EQUATION DISCREPANCY'}
              </div>
            )}
          </div>

          {balanceSheetQuery.isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Generating Statement of Financial Position...</div>
          ) : balanceSheetQuery.data && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', margin: '0 0 16px', borderBottom: '2px solid #dbeafe', paddingBottom: '8px' }}>ASSETS</h3>
                {balanceSheetQuery.data.assets.map((a: any) => (
                  <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                    <span><strong style={{ fontFamily: 'monospace' }}>{a.code}</strong> {a.name}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${a.balance.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '2px solid #e2e8f0', fontWeight: 'bold', fontSize: '15px', color: '#1e40af' }}>
                  <span>Total Assets</span>
                  <span>${balanceSheetQuery.data.totalAssets.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#b45309', margin: '0 0 16px', borderBottom: '2px solid #fef3c7', paddingBottom: '8px' }}>LIABILITIES</h3>
                  {balanceSheetQuery.data.liabilities.map((l: any) => (
                    <div key={l.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                      <span><strong style={{ fontFamily: 'monospace' }}>{l.code}</strong> {l.name}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${l.balance.toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '2px solid #e2e8f0', fontWeight: 'bold', fontSize: '15px', color: '#b45309' }}>
                    <span>Total Liabilities</span>
                    <span>${balanceSheetQuery.data.totalLiabilities.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#6b21a8', margin: '0 0 16px', borderBottom: '2px solid #f3e8ff', paddingBottom: '8px' }}>EQUITY</h3>
                  {balanceSheetQuery.data.equity.map((e: any) => (
                    <div key={e.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                      <span><strong style={{ fontFamily: 'monospace' }}>{e.code}</strong> {e.name}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${e.balance.toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '2px solid #e2e8f0', fontWeight: 'bold', fontSize: '15px', color: '#7e22ce' }}>
                    <span>Total Equity</span>
                    <span>${balanceSheetQuery.data.totalEquity.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. AR AGING SUMMARY VIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeReport === 'AR_AGING' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>As of Date:</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <button onClick={() => arAgingQuery.refetch()} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}>
              <RefreshCw size={14} className={arAgingQuery.isFetching ? 'spin' : ''} /> Refresh
            </button>

            <button
              onClick={handleSendSmsReminders}
              disabled={sendingSms || arRows.length === 0}
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: sendingSms ? 'not-allowed' : 'pointer'
              }}
            >
              <Send size={15} /> {sendingSms ? 'Dispatching SMS...' : 'Send SMS Reminders to Defaulters'}
            </button>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {arAgingQuery.isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Generating Accounts Receivable Aging...</div>
            ) : arRows.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No outstanding student fee balances.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Student Name</th>
                    <th style={{ padding: '12px 16px' }}>Class</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Current (0-30d)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>31-60 Days</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>61-90 Days</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>90+ Days</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {arRows.map((r: any) => (
                    <tr key={r.studentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{r.studentName}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.className || '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>${r.current.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: r.days31_60 > 0 ? '#b45309' : undefined }}>${r.days31_60.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: r.days61_90 > 0 ? '#c2410c' : undefined }}>${r.days61_90.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: r.over90 > 0 ? '#dc2626' : undefined, fontWeight: r.over90 > 0 ? 700 : 400 }}>${r.over90.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>${r.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. ZIMRA VAT REPORT VIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeReport === 'VAT_REPORT' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>From:</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <label style={{ fontSize: '14px', fontWeight: 600 }}>To:</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <button onClick={() => vatQuery.refetch()} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}>
              <RefreshCw size={14} className={vatQuery.isFetching ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {vatQuery.isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Calculating ZIMRA VAT Position...</div>
          ) : vatQuery.data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '18px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>STANDARD-RATED SALES (15%)</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    ${vatQuery.data.standardRatedSales.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Uniforms, Tuckshop, Transport</span>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '18px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>VAT OUTPUT COLLECTED (CODE 2021)</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
                    ${vatQuery.data.vatOutputCollected.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Payable to ZIMRA</span>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '18px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>EXEMPT EDUCATION SUPPLIES</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                    ${vatQuery.data.exemptTuitionSales.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Tuition & Exam Fees</span>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '18px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>STATUTORY COMPLIANCE RATE</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
                    15.0%
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>ZIMRA Standard Rate</span>
                </div>
              </div>

              {/* Transactions Table */}
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: 600 }}>
                  Recent VAT Journal Allocations
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                      <th style={{ padding: '12px 16px' }}>JE #</th>
                      <th style={{ padding: '12px 16px' }}>Account</th>
                      <th style={{ padding: '12px 16px' }}>Tax Code</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Tax Base</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>VAT Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vatQuery.data.details?.map((d: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(d.journalEntry.date).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{d.journalEntry.entryNumber}</td>
                        <td style={{ padding: '12px 16px' }}>{d.account.code} - {d.account.name}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                            {d.taxCode || '2021-VAT'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>${(d.baseAmount || 0).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>${(d.credit || d.debit || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. CASH FLOW STATEMENT VIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeReport === 'CASH_FLOW' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>From:</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <label style={{ fontSize: '14px', fontWeight: 600 }}>To:</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <button onClick={() => cashFlowQuery.refetch()} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}>
              <RefreshCw size={14} className={cashFlowQuery.isFetching ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {cashFlowQuery.isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Generating Cash Flow Statement...</div>
          ) : cashFlowQuery.data && (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '2px solid #e2e8f0', fontWeight: 'bold', fontSize: '16px' }}>
                <span>Opening Cash & Bank Equivalents</span>
                <span style={{ fontFamily: 'monospace' }}>${cashFlowQuery.data.openingCash.toFixed(2)}</span>
              </div>

              {/* Operating Inflows */}
              <div style={{ padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowUpRight size={16} /> Cash Inflows from Operations
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingLeft: '24px' }}>
                  <span style={{ color: '#64748b' }}>Fee collections, tuckshop takings, auxiliary receipts</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>+${cashFlowQuery.data.operatingInflows.toFixed(2)}</span>
                </div>
              </div>

              {/* Operating Outflows */}
              <div style={{ padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowDownRight size={16} /> Cash Outflows for Operations
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingLeft: '24px' }}>
                  <span style={{ color: '#64748b' }}>Salaries, boarding groceries, utilities, supplies</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#dc2626' }}>-${cashFlowQuery.data.operatingOutflows.toFixed(2)}</span>
                </div>
              </div>

              {/* Capital Expenditure */}
              <div style={{ padding: '16px 0', borderBottom: '2px solid #e2e8f0' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#7c3aed', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ArrowDownRight size={16} /> Capital Expenditure & Fixed Assets
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingLeft: '24px' }}>
                  <span style={{ color: '#64748b' }}>Equipment, vehicle repairs, facility expansion</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#7c3aed' }}>-${cashFlowQuery.data.capitalExpenditure.toFixed(2)}</span>
                </div>
              </div>

              {/* Net Change */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', fontSize: '16px', fontWeight: 'bold' }}>
                <span>Net Change in Cash</span>
                <span style={{ fontFamily: 'monospace', color: cashFlowQuery.data.netChange >= 0 ? '#16a34a' : '#dc2626' }}>
                  {cashFlowQuery.data.netChange >= 0 ? '+' : ''}${cashFlowQuery.data.netChange.toFixed(2)}
                </span>
              </div>

              {/* Closing Cash */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 24px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '18px', fontWeight: 800 }}>
                <span>Closing Cash & Bank Equivalents</span>
                <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>${cashFlowQuery.data.closingCash.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. BUDGET VS ACTUAL VIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeReport === 'BUDGET_VS_ACTUAL' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Fiscal Year:</label>
            <input
              type="number"
              value={budgetYear}
              onChange={e => setBudgetYear(Number(e.target.value))}
              style={{ width: '90px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Term:</label>
            <select
              value={budgetTerm}
              onChange={e => setBudgetTerm(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="Annual">Annual</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
            <button onClick={() => budgetVsActualQuery.refetch()} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}>
              <RefreshCw size={14} className={budgetVsActualQuery.isFetching ? 'spin' : ''} /> Refresh
            </button>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {budgetVsActualQuery.isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Comparing Budgets vs Actual Expenditure...</div>
            ) : !budgetVsActualQuery.data?.rows?.length ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                No budget targets configured for {budgetYear} ({budgetTerm}). Configure budgets in Bursar Budgets section.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Code</th>
                    <th style={{ padding: '12px 16px' }}>Account Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Budget Target</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actual Spent</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Variance</th>
                    <th style={{ padding: '12px 16px', width: '200px' }}>% Utilized</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetVsActualQuery.data.rows.map((row: any) => {
                    const isOver = row.percentUtilized > 100;
                    const isNear = row.percentUtilized >= 80 && row.percentUtilized <= 100;
                    const barColor = isOver ? '#ef4444' : isNear ? '#f59e0b' : '#10b981';

                    return (
                      <tr key={row.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{row.code}</td>
                        <td style={{ padding: '12px 16px', color: '#1e293b' }}>{row.name}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>${row.budget.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>${row.actual.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: row.variance < 0 ? '#dc2626' : '#16a34a' }}>
                          ${row.variance.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, row.percentUtilized)}%`, height: '100%', backgroundColor: barColor, borderRadius: '4px' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: barColor, minWidth: '45px', textAlign: 'right' }}>
                              {row.percentUtilized}%
                            </span>
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
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 8. GENERAL LEDGER DRILL-DOWN VIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeReport === 'GENERAL_LEDGER' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Select Account:</label>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '280px', fontSize: '14px' }}
            >
              <option value="">— Select an Account to Inspect —</option>
              {coaQuery.data?.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name} ({a.type})
                </option>
              ))}
            </select>

            <label style={{ fontSize: '14px', fontWeight: 600 }}>From:</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <label style={{ fontSize: '14px', fontWeight: 600 }}>To:</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <button onClick={() => glQuery.refetch()} disabled={!selectedAccountId} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: selectedAccountId ? 'pointer' : 'not-allowed' }}>
              <RefreshCw size={14} className={glQuery.isFetching ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {!selectedAccountId ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
              <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h3 style={{ margin: '0 0 6px', color: '#334155' }}>Select an Account</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Choose any account from the Chart of Accounts to view its audit log and running balance history.</p>
            </div>
          ) : glQuery.isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading General Ledger Lines...</div>
          ) : glQuery.data && (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                    {glQuery.data.account.code} — {glQuery.data.account.name}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Type: {glQuery.data.account.type}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Current Account Balance</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace', color: '#2563eb' }}>
                    ${glQuery.data.currentBalance.toFixed(2)}
                  </div>
                </div>
              </div>

              {glQuery.data.entries.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No transactions recorded for this account in the selected date range.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                      <th style={{ padding: '12px 16px' }}>Entry #</th>
                      <th style={{ padding: '12px 16px' }}>Description</th>
                      <th style={{ padding: '12px 16px' }}>Source</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Debit (DR)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Credit (CR)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {glQuery.data.entries.map((e: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(e.date).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{e.entryNumber}</td>
                        <td style={{ padding: '12px 16px', color: '#1e293b' }}>{e.description}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                            {e.sourceType}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{e.debit > 0 ? `$${e.debit.toFixed(2)}` : '—'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{e.credit > 0 ? `$${e.credit.toFixed(2)}` : '—'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>${e.runningBalance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
