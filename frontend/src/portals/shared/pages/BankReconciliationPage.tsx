import React, { useState } from 'react';
import api from '../../../lib/api';
import { useAccountingQuery, useOptimisticAccountingMutation } from '../../../hooks/useAccountingQuery';
import toast from 'react-hot-toast';
import { RefreshCw, CheckCircle2, Link, Unlink, FileSpreadsheet } from 'lucide-react';

export default function BankReconciliationPage() {
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7));

  // Fetch Bank Reconciliation statements and stats
  const { data: statements = [], isLoading, isFetching, refetch } = useAccountingQuery<any[]>({
    key: `accounting:bank-rec:${period}`,
    fetcher: async () => {
      const res = await api.get(`/api/accounts/bank-reconciliation?period=${period}`);
      return res.data;
    }
  });

  // Match Mutation
  const matchMutation = useOptimisticAccountingMutation({
    mutationFn: async ({ bankLineId, journalLineId }: { bankLineId: string; journalLineId: string }) => {
      const res = await api.post('/api/accounts/bank-reconciliation/match', { bankLineId, journalLineId });
      return res.data;
    },
    affectedKeys: [`accounting:bank-rec:${period}`, 'accounting:reports:trial-balance'],
    onSuccess: () => toast.success('Bank line matched to journal entry line')
  });

  // Unmatch Mutation
  const unmatchMutation = useOptimisticAccountingMutation({
    mutationFn: async ({ bankLineId }: { bankLineId: string }) => {
      const res = await api.post('/api/accounts/bank-reconciliation/unmatch', { bankLineId });
      return res.data;
    },
    affectedKeys: [`accounting:bank-rec:${period}`, 'accounting:reports:trial-balance'],
    onSuccess: () => toast.success('Reconciliation match removed')
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>Bank Reconciliation</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Reconcile uploaded bank statement lines against posted bank journal entries
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
          />
          <button
            onClick={() => refetch()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading bank statements...</div>
      ) : statements.length === 0 ? (
        <div style={{ backgroundColor: '#fff', padding: '40px', textAlign: 'center', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          <FileSpreadsheet size={40} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
          <h3>No bank statements uploaded for period {period}</h3>
          <p style={{ fontSize: '14px' }}>Upload bank statements in CSV / Excel format to perform automated line matching.</p>
        </div>
      ) : (
        statements.map(stmt => (
          <div key={stmt.id} style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', overflow: 'hidden' }}>
            {/* Statement Header */}
            <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                  {stmt.account?.code} — {stmt.account?.name || 'Bank Account'}
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Statement Period: {stmt.period} | Uploaded: {new Date(stmt.uploadedAt).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>Reconciled: {stmt.stats.reconciled} / {stmt.stats.total}</span>
                <span style={{ color: '#dc2626', fontWeight: 600 }}>Unreconciled: {stmt.stats.unreconciled}</span>
              </div>
            </div>

            {/* Statement Lines Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, backgroundColor: '#ffffff' }}>
                  <th style={{ padding: '12px 16px' }}>Date</th>
                  <th style={{ padding: '12px 16px' }}>Description / Reference</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Debit (Out)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Credit (In)</th>
                  <th style={{ padding: '12px 16px' }}>Reconciliation Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stmt.lines.map((line: any) => (
                  <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(line.date).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', color: '#1e293b', fontWeight: 500 }}>
                      {line.description}
                      {line.reference && <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>Ref: {line.reference}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{line.debit > 0 ? `$${line.debit.toFixed(2)}` : '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{line.credit > 0 ? `$${line.credit.toFixed(2)}` : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {line.isReconciled ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 600, fontSize: '13px' }}>
                          <CheckCircle2 size={14} /> Reconciled
                        </span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '13px' }}>Unreconciled</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {line.isReconciled ? (
                        <button
                          onClick={() => unmatchMutation.mutate({ bankLineId: line.id })}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #fca5a5', backgroundColor: '#fff', color: '#dc2626', fontSize: '12px', cursor: 'pointer' }}
                        >
                          <Unlink size={12} /> Unmatch
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const jId = prompt('Enter matching Journal Entry Line ID (or leave blank to auto-match):');
                            if (jId) matchMutation.mutate({ bankLineId: line.id, journalLineId: jId });
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '4px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                        >
                          <Link size={12} /> Match JE
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
