import React, { useState } from 'react';
import api from '../../../lib/api';
import { useAccountingQuery } from '../../../hooks/useAccountingQuery';
import { FileText, RefreshCw, AlertCircle, CheckCircle2, TrendingUp, DollarSign, Calendar } from 'lucide-react';

export default function FinancialReportsPage() {
  const [activeReport, setActiveReport] = useState<'TRIAL_BALANCE' | 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'AR_AGING' | 'GENERAL_LEDGER'>('TRIAL_BALANCE');

  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [fromDate, setFromDate] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

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

  // 5. CoA Accounts list for GL dropdown
  const coaQuery = useAccountingQuery<any[]>({
    key: 'accounting:coa',
    enabled: activeReport === 'GENERAL_LEDGER',
    fetcher: async () => {
      const res = await api.get('/api/accounts/coa');
      return res.data;
    }
  });

  // 6. General Ledger Query
  const glQuery = useAccountingQuery<any>({
    key: `accounting:reports:general-ledger:${selectedAccountId}:${fromDate}:${toDate}`,
    enabled: activeReport === 'GENERAL_LEDGER' && !!selectedAccountId,
    fetcher: async () => {
      const res = await api.get(`/api/accounts/reports/general-ledger?accountId=${selectedAccountId}&from=${fromDate}&to=${toDate}`);
      return res.data;
    }
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
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
          { id: 'AR_AGING', label: 'AR Aging Summary' },
          { id: 'GENERAL_LEDGER', label: 'General Ledger Drill-Down' }
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
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No posted entries in period {period}.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Code</th>
                    <th style={{ padding: '12px 16px' }}>Account Name</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Debit (DR)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Credit (CR)</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalanceQuery.data.lines.map((l: any) => (
                    <tr key={l.accountCode} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{l.accountCode}</td>
                      <td style={{ padding: '12px 16px', color: '#1e293b' }}>{l.accountName}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                          {l.accountType}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {l.totalDebit > 0 ? l.totalDebit.toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {l.totalCredit > 0 ? l.totalCredit.toFixed(2) : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #e2e8f0' }}>
                    <td colSpan={3} style={{ padding: '14px 16px' }}>TOTAL</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#1e293b' }}>
                      ${trialBalanceQuery.data.totalDebit.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#1e293b' }}>
                      ${trialBalanceQuery.data.totalCredit.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. INCOME STATEMENT VIEW (P&L) */}
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
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Generating Income Statement...</div>
          ) : incomeStatementQuery.data && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Income Side */}
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#166534', margin: '0 0 16px', borderBottom: '2px solid #dcfce7', paddingBottom: '8px' }}>
                  REVENUE & INCOME
                </h3>
                {incomeStatementQuery.data.income.map((inc: any) => (
                  <div key={inc.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                    <span><strong style={{ fontFamily: 'monospace' }}>{inc.code}</strong> {inc.name}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${inc.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '2px solid #e2e8f0', fontWeight: 'bold', fontSize: '16px', color: '#15803d' }}>
                  <span>Total Income</span>
                  <span>${incomeStatementQuery.data.totalIncome.toFixed(2)}</span>
                </div>
              </div>

              {/* Expense Side */}
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#991b1b', margin: '0 0 16px', borderBottom: '2px solid #fee2e2', paddingBottom: '8px' }}>
                  OPERATING EXPENSES & COGS
                </h3>
                {incomeStatementQuery.data.expenses.map((exp: any) => (
                  <div key={exp.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                    <span><strong style={{ fontFamily: 'monospace' }}>{exp.code}</strong> {exp.name}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${exp.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '2px solid #e2e8f0', fontWeight: 'bold', fontSize: '16px', color: '#b91c1c' }}>
                  <span>Total Expenses</span>
                  <span>${incomeStatementQuery.data.totalExpenses.toFixed(2)}</span>
                </div>
              </div>

              {/* Net Profit / Loss Banner */}
              <div style={{
                gridColumn: '1 / -1',
                backgroundColor: incomeStatementQuery.data.netProfit >= 0 ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${incomeStatementQuery.data.netProfit >= 0 ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: incomeStatementQuery.data.netProfit >= 0 ? '#166534' : '#991b1b' }}>
                    {incomeStatementQuery.data.netProfit >= 0 ? 'NET SURPLUS / PROFIT' : 'NET DEFICIT / LOSS'}
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>For period {fromDate} to {toDate}</p>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'monospace', color: incomeStatementQuery.data.netProfit >= 0 ? '#15803d' : '#dc2626' }}>
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
          </div>

          {balanceSheetQuery.isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Generating Balance Sheet...</div>
          ) : balanceSheetQuery.data && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Assets */}
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', margin: '0 0 16px', borderBottom: '2px solid #dbeafe', paddingBottom: '8px' }}>ASSETS</h3>
                {balanceSheetQuery.data.assets.map((a: any) => (
                  <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                    <span><strong style={{ fontFamily: 'monospace' }}>{a.code}</strong> {a.name}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${a.balance.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '2px solid #e2e8f0', fontWeight: 'bold', fontSize: '16px', color: '#1d4ed8' }}>
                  <span>Total Assets</span>
                  <span>${balanceSheetQuery.data.totalAssets.toFixed(2)}</span>
                </div>
              </div>

              {/* Liabilities & Equity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#92400e', margin: '0 0 16px', borderBottom: '2px solid #fef3c7', paddingBottom: '8px' }}>LIABILITIES</h3>
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
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {arAgingQuery.isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Generating Accounts Receivable Aging...</div>
            ) : !arAgingQuery.data?.rows?.length ? (
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
                  {arAgingQuery.data.rows.map((r: any) => (
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
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #e2e8f0' }}>
                    <td colSpan={2} style={{ padding: '14px 16px' }}>TOTAL AR OUTSTANDING</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace' }}>${arAgingQuery.data.totals.current.toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace' }}>${arAgingQuery.data.totals.days31_60.toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace' }}>${arAgingQuery.data.totals.days61_90.toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>${arAgingQuery.data.totals.over90.toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#1e293b', fontSize: '16px' }}>${arAgingQuery.data.totals.total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. GENERAL LEDGER DRILL-DOWN VIEW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeReport === 'GENERAL_LEDGER' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Select Account:</label>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', minWidth: '280px' }}
            >
              <option value="">-- Choose Account --</option>
              {coaQuery.data?.map((a: any) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name} ({a.type})</option>
              ))}
            </select>

            <label style={{ fontSize: '14px', fontWeight: 600 }}>From:</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <label style={{ fontSize: '14px', fontWeight: 600 }}>To:</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            <button onClick={() => glQuery.refetch()} disabled={!selectedAccountId} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}>
              <RefreshCw size={14} className={glQuery.isFetching ? 'spin' : ''} /> Fetch Ledger
            </button>
          </div>

          {!selectedAccountId ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              Please select an account from the dropdown to inspect its running general ledger history.
            </div>
          ) : glQuery.isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Fetching General Ledger...</div>
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
