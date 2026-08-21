import React, { useState } from 'react';
import api from '../../../lib/api';
import { useAccountingQuery, useOptimisticAccountingMutation } from '../../../hooks/useAccountingQuery';
import toast from 'react-hot-toast';
import { Plus, Shield, CheckCircle, XCircle, Search, RefreshCw, Layers } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentId?: string | null;
  description?: string | null;
  isSystemAccount: boolean;
  isActive: boolean;
}

export default function ChartOfAccountsPage() {
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'>('EXPENSE');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');

  // Fetch Chart of Accounts via reactive query engine
  const { data: accounts = [], isLoading, isFetching, refetch } = useAccountingQuery<Account[]>({
    key: 'accounting:coa',
    fetcher: async () => {
      const res = await api.get('/api/accounts/coa');
      return res.data;
    }
  });

  // Create Custom Account Mutation
  const createMutation = useOptimisticAccountingMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/accounts/coa', payload);
      return res.data;
    },
    affectedKeys: ['accounting:coa'],
    onSuccess: () => {
      toast.success('Account created successfully');
      setShowAddModal(false);
      resetForm();
    }
  });

  // Toggle Account Active Status Mutation
  const toggleMutation = useOptimisticAccountingMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await api.patch(`/api/accounts/coa/${id}`, { isActive });
      return res.data;
    },
    affectedKeys: ['accounting:coa'],
    onSuccess: () => {
      toast.success('Account status updated');
    }
  });

  const resetForm = () => {
    setCode('');
    setName('');
    setType('EXPENSE');
    setParentId('');
    setDescription('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error('Code and Name are required');
      return;
    }
    await createMutation.mutate({
      code: code.trim(),
      name: name.trim(),
      type,
      parentId: parentId || undefined,
      description: description.trim() || undefined
    });
  };

  const types: Array<'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'> = [
    'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'
  ];

  const filteredAccounts = accounts.filter(acc => {
    const matchesTab = activeTab === 'ALL' || acc.type === activeTab;
    const matchesSearch = acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          acc.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const parentOptions = accounts.filter(a => a.type === type && !a.parentId);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>Chart of Accounts</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Tenant General Ledger Foundation — 5-type accounting taxonomy with hierarchical controls
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => refetch()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              color: '#475569',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} className={isFetching ? 'spin' : ''} />
            Refetch
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Add Custom Account
          </button>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('ALL')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'ALL' ? '#1e293b' : '#f1f5f9',
            color: activeTab === 'ALL' ? '#fff' : '#475569',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          All Accounts ({accounts.length})
        </button>
        {types.map(t => {
          const count = accounts.filter(a => a.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === t ? '#2563eb' : '#f1f5f9',
                color: activeTab === t ? '#fff' : '#475569',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {t} ({count})
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '400px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          type="text"
          placeholder="Search by account code or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 40px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>

      {/* Accounts Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading Chart of Accounts...</div>
        ) : filteredAccounts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No accounts found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Code</th>
                <th style={{ padding: '12px 16px' }}>Account Name</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Parent Code</th>
                <th style={{ padding: '12px 16px' }}>System Protected</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map(acc => (
                <tr key={acc.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: acc.parentId ? '#fdfdfd' : '#fff' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'monospace', color: '#0f172a' }}>
                    {acc.code}
                  </td>
                  <td style={{ padding: '12px 16px', paddingLeft: acc.parentId ? '32px' : '16px', color: '#1e293b' }}>
                    {acc.parentId && <Layers size={14} style={{ display: 'inline', marginRight: '6px', color: '#94a3b8' }} />}
                    <span style={{ fontWeight: acc.parentId ? 400 : 600 }}>{acc.name}</span>
                    {acc.description && <div style={{ fontSize: '12px', color: '#64748b' }}>{acc.description}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: acc.type === 'ASSET' ? '#dbeafe' : acc.type === 'LIABILITY' ? '#fef3c7' : acc.type === 'INCOME' ? '#dcfce7' : acc.type === 'EXPENSE' ? '#fee2e2' : '#f3e8ff',
                      color: acc.type === 'ASSET' ? '#1e40af' : acc.type === 'LIABILITY' ? '#92400e' : acc.type === 'INCOME' ? '#166534' : acc.type === 'EXPENSE' ? '#991b1b' : '#6b21a8'
                    }}>
                      {acc.type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {accounts.find(a => a.id === acc.parentId)?.code ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {acc.isSystemAccount ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontSize: '13px', fontWeight: 500 }}>
                        <Shield size={14} /> System
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '13px' }}>Custom</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {acc.isActive ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '13px', fontWeight: 500 }}>
                        <CheckCircle size={14} /> Active
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '13px', fontWeight: 500 }}>
                        <XCircle size={14} /> Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {!acc.isSystemAccount && (
                      <button
                        onClick={() => toggleMutation.mutate({ id: acc.id, isActive: !acc.isActive })}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#fff',
                          color: acc.isActive ? '#dc2626' : '#16a34a',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {acc.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Custom Account Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', width: '480px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px', color: '#1e293b' }}>Add Custom Account</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Account Code</label>
                <input
                  type="text"
                  placeholder="e.g. 5170"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. Special Project Revenue"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Account Type</label>
                <select
                  value={type}
                  onChange={e => {
                    setType(e.target.value as any);
                    setParentId('');
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {types.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Parent Account (Optional)</label>
                <select
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">None (Top-Level Account)</option>
                  {parentOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Description</label>
                <textarea
                  placeholder="Optional description..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer' }}
                >
                  {createMutation.isPending ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
