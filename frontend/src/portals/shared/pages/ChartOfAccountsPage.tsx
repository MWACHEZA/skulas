import React, { useState } from 'react';
import api from '../../../lib/api';
import { useAccountingQuery, useOptimisticAccountingMutation } from '../../../hooks/useAccountingQuery';
import toast from 'react-hot-toast';
import { Plus, Shield, CheckCircle, XCircle, Search, RefreshCw, Layers } from 'lucide-react';
import { EmptyState } from '../../../components/common/EmptyState';
import '../../../styles/portal.css';

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

interface CreateAccountPayload {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentId?: string;
  description?: string;
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
    mutationFn: async (payload: CreateAccountPayload) => {
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
    <div className="portal-coa-container">
      {/* Header */}
      <div className="portal-coa-header">
        <div>
          <h1 className="portal-coa-title">Chart of Accounts</h1>
          <p className="portal-coa-subtitle">
            Tenant General Ledger Foundation — 5-type accounting taxonomy with hierarchical controls
          </p>
        </div>
        <div className="portal-coa-header-actions">
          <button
            onClick={() => refetch()}
            className="portal-coa-btn-outline"
          >
            <RefreshCw size={16} className={isFetching ? 'spin' : ''} />
            Refetch
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="portal-coa-btn-primary"
          >
            <Plus size={16} /> Add Custom Account
          </button>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="portal-coa-tabs">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`portal-coa-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
        >
          All Accounts ({accounts.length})
        </button>
        {types.map(t => {
          const count = accounts.filter(a => a.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`portal-coa-tab-btn ${activeTab === t ? 'active' : ''}`}
            >
              {t} ({count})
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="portal-coa-search-wrapper">
        <Search size={18} className="portal-coa-search-icon" />
        <input
          id="search-accounts"
          type="text"
          placeholder="Search by account code or name..."
          title="Search Accounts"
          aria-label="Search by account code or name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="portal-coa-search-input"
        />
      </div>

      {/* Accounts Table */}
      <div className="portal-coa-table-wrapper">
        {isLoading ? (
          <div className="portal-coa-loading">Loading Chart of Accounts...</div>
        ) : filteredAccounts.length === 0 ? (
          <EmptyState
            icon="fas fa-book-journal-whills"
            title="No Chart of Accounts Seeded Yet"
            description="Your tenant ledger is currently empty. Seed our standard 35-account taxonomy or configure custom accounts."
            actionLabel="Add Custom Account"
            onAction={() => setShowAddModal(true)}
            setupStageLink={{ step: 3, label: 'Seed Standard COA in Setup Wizard' }}
          />
        ) : (
          <table className="portal-coa-table">
            <thead>
              <tr className="portal-coa-table-header-row">
                <th className="portal-coa-th">Code</th>
                <th className="portal-coa-th">Account Name</th>
                <th className="portal-coa-th">Type</th>
                <th className="portal-coa-th">Parent Code</th>
                <th className="portal-coa-th">System Protected</th>
                <th className="portal-coa-th">Status</th>
                <th className="portal-coa-th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map(acc => (
                <tr key={acc.id}>
                  <td className="portal-coa-td-code">
                    {acc.code}
                  </td>
                  <td className={`portal-coa-td-name ${acc.parentId ? 'portal-coa-td-name-indent' : ''}`}>
                    {acc.parentId && <Layers size={14} className="portal-coa-parent-icon" />}
                    <span>{acc.name}</span>
                    {acc.description && <div className="portal-coa-desc">{acc.description}</div>}
                  </td>
                  <td className="portal-coa-th">
                    <span className={`portal-coa-badge portal-coa-badge-${acc.type}`}>
                      {acc.type}
                    </span>
                  </td>
                  <td className="portal-coa-th">
                    {accounts.find(a => a.id === acc.parentId)?.code ?? '—'}
                  </td>
                  <td className="portal-coa-th">
                    {acc.isSystemAccount ? (
                      <span className="portal-coa-status-sys">
                        <Shield size={14} /> System
                      </span>
                    ) : (
                      <span className="portal-coa-status-custom">Custom</span>
                    )}
                  </td>
                  <td className="portal-coa-th">
                    {acc.isActive ? (
                      <span className="portal-coa-status-active">
                        <CheckCircle size={14} /> Active
                      </span>
                    ) : (
                      <span className="portal-coa-status-inactive">
                        <XCircle size={14} /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="portal-coa-th-right">
                    {!acc.isSystemAccount && (
                      <button
                        onClick={() => toggleMutation.mutate({ id: acc.id, isActive: !acc.isActive })}
                        className={`portal-coa-action-btn ${acc.isActive ? 'deactivate' : 'activate'}`}
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
        <div className="portal-coa-modal-backdrop">
          <div className="portal-coa-modal-card">
            <h2 className="portal-coa-modal-title">Add Custom Account</h2>
            <form onSubmit={handleCreate}>
              <div className="portal-coa-form-group">
                <label htmlFor="account-code" className="portal-coa-label">Account Code</label>
                <input
                  id="account-code"
                  type="text"
                  placeholder="e.g. 5170"
                  title="Account Code"
                  aria-label="Account Code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="portal-coa-input"
                  required
                />
              </div>

              <div className="portal-coa-form-group">
                <label htmlFor="account-name" className="portal-coa-label">Account Name</label>
                <input
                  id="account-name"
                  type="text"
                  placeholder="e.g. Special Project Revenue"
                  title="Account Name"
                  aria-label="Account Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="portal-coa-input"
                  required
                />
              </div>

              <div className="portal-coa-form-group">
                <label htmlFor="account-type" className="portal-coa-label">Account Type</label>
                <select
                  id="account-type"
                  title="Account Type"
                  aria-label="Account Type"
                  value={type}
                  onChange={e => {
                    setType(e.target.value as CreateAccountPayload['type']);
                    setParentId('');
                  }}
                  className="portal-coa-select"
                >
                  {types.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="portal-coa-form-group">
                <label htmlFor="parent-account" className="portal-coa-label">Parent Account (Optional)</label>
                <select
                  id="parent-account"
                  title="Parent Account"
                  aria-label="Parent Account"
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                  className="portal-coa-select"
                >
                  <option value="">None (Top-Level Account)</option>
                  {parentOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="portal-coa-form-group-lg">
                <label htmlFor="account-description" className="portal-coa-label">Description</label>
                <textarea
                  id="account-description"
                  title="Description"
                  aria-label="Description"
                  placeholder="Optional description..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="portal-coa-textarea"
                />
              </div>

              <div className="portal-coa-modal-actions">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="portal-coa-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="portal-coa-btn-primary"
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
