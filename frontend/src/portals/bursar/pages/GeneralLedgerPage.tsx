import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  Download,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function GeneralLedgerPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Filters
  const [accountId, setAccountId] = useState('');
  const [coaCode, setCoaCode] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [search, setSearch] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [fromDate, setFromDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);

  // Reversal Modal
  const [reversingEntry, setReversingEntry] = useState<any | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [accountId, coaCode, sourceType, fromDate, toDate, page]);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/api/accounts/coa');
      setAccounts(res.data || []);
    } catch (e) {
      console.error('Failed to load accounts', e);
    }
  };

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (accountId) params.append('accountId', accountId);
      if (coaCode) params.append('coaCode', coaCode);
      if (sourceType) params.append('sourceType', sourceType);
      if (search) params.append('search', search);
      if (minAmount) params.append('minAmount', minAmount);
      if (maxAmount) params.append('maxAmount', maxAmount);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      params.append('page', String(page));
      params.append('limit', '50');

      const res = await api.get(`/api/accounts/gl?${params.toString()}`);
      setEntries(res.data.entries || []);
      setTotal(res.data.total || 0);
      setTotalDebit(res.data.totalDebit || 0);
      setTotalCredit(res.data.totalCredit || 0);
    } catch (error: any) {
      toast.error('Failed to fetch general ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLedger();
  };

  const handleReverse = async () => {
    if (!reversingEntry) return;
    if (!reversalReason.trim()) {
      toast.error('Please enter a reason for reversing this journal entry');
      return;
    }

    try {
      setIsReversing(true);
      // The entry line's parent journalEntryId or entry id
      const entryId = reversingEntry.journalEntryId || reversingEntry.id;
      await api.post(`/api/accounts/journal/${entryId}/reverse`, {
        reason: reversalReason
      });
      toast.success(`Entry ${reversingEntry.entryNumber} reversed successfully!`);
      setReversingEntry(null);
      setReversalReason('');
      fetchLedger();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reverse entry');
    } finally {
      setIsReversing(false);
    }
  };

  const exportCsv = () => {
    if (entries.length === 0) {
      toast.error('No ledger entries to export');
      return;
    }
    const headers = ['Date', 'Entry Number', 'Account Code', 'Account Name', 'Type', 'Description', 'Source', 'Debit', 'Credit', 'Currency'];
    const rows = entries.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.entryNumber,
      e.accountCode,
      `"${(e.accountName || '').replace(/"/g, '""')}"`,
      e.accountType,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.sourceType,
      e.debit || 0,
      e.credit || 0,
      e.currency || 'USD'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `general_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('General Ledger exported to CSV');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>
            General Ledger (GL)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Complete immutable transaction audit trail across all Chart of Accounts
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={exportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => fetchLedger()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #2563eb',
              backgroundColor: '#2563eb',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Ledger
          </button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>TOTAL POSTED DEBITS (DR)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            ${totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>TOTAL POSTED CREDITS (CR)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            ${totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>TRANSACTION INTEGRITY</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '15px', fontWeight: 700, color: Math.abs(totalDebit - totalCredit) < 0.05 ? '#16a34a' : '#dc2626' }}>
            {Math.abs(totalDebit - totalCredit) < 0.05 ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {Math.abs(totalDebit - totalCredit) < 0.05 ? 'Balanced (Zero-Sum)' : `Variance: $${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>TOTAL JOURNAL LINES</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            {total.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form onSubmit={handleSearchSubmit} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search entry # or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
        </div>

        {/* Account Filter */}
        <select
          value={accountId}
          onChange={e => { setAccountId(e.target.value); setPage(1); }}
          style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '180px' }}
        >
          <option value="">All Accounts</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.code} — {a.name}
            </option>
          ))}
        </select>

        {/* Source Type Filter */}
        <select
          value={sourceType}
          onChange={e => { setSourceType(e.target.value); setPage(1); }}
          style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
        >
          <option value="">All Source Modules</option>
          <option value="fees">Fees & Invoices</option>
          <option value="tuckshop">Tuckshop</option>
          <option value="payroll">Payroll</option>
          <option value="procurement">Procurement</option>
          <option value="income">Direct Income</option>
          <option value="expense">Direct Expense</option>
          <option value="manual_journal">Manual Journal</option>
          <option value="year_end_close">Year-End Close</option>
        </select>

        {/* Date Range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPage(1); }}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
          <span style={{ color: '#94a3b8' }}>to</span>
          <input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setPage(1); }}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: '7px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#0f172a',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Apply Filters
        </button>
      </form>

      {/* Ledger Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>Loading general ledger entries...</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>No transactions found matching criteria.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '12px 14px' }}>Date</th>
                <th style={{ padding: '12px 14px' }}>Entry #</th>
                <th style={{ padding: '12px 14px' }}>Account</th>
                <th style={{ padding: '12px 14px' }}>Description</th>
                <th style={{ padding: '12px 14px' }}>Module</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Debit (DR)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Credit (CR)</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, idx) => (
                <tr key={e.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(e.date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                    {e.entryNumber}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <strong style={{ fontFamily: 'monospace', color: '#1e40af' }}>{e.accountCode}</strong> — {e.accountName}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#334155' }}>{e.description}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                      {e.sourceType}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: e.debit > 0 ? 600 : 400 }}>
                    {e.debit > 0 ? `$${Number(e.debit).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: e.credit > 0 ? 600 : 400 }}>
                    {e.credit > 0 ? `$${Number(e.credit).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <button
                      onClick={() => setReversingEntry(e)}
                      title="Post Reversal Entry"
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        color: '#b91c1c',
                        fontSize: '11px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <RotateCcw size={12} /> Reverse
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px', color: '#64748b' }}>
          <div>
            Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total} transactions
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <button
              disabled={page * 50 >= total}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: page * 50 >= total ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Reversal Confirmation Modal */}
      {reversingEntry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '24px', width: '460px', maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '18px' }}>
              Reverse Journal Entry: {reversingEntry.entryNumber}
            </h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>
              Double-entry accounting principles prohibit modifying posted transactions. A reversing entry swapping Debits and Credits will be posted to the ledger with an audit trail.
            </p>

            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Reason for Reversal:
            </label>
            <textarea
              rows={3}
              value={reversalReason}
              onChange={e => setReversalReason(e.target.value)}
              placeholder="e.g. Correcting billing amount / Duplicate receipt entry..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setReversingEntry(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReverse}
                disabled={isReversing}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontWeight: 600, cursor: isReversing ? 'not-allowed' : 'pointer' }}
              >
                {isReversing ? 'Posting Reversal...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
