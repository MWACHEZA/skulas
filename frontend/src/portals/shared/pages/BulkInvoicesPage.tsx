import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import { SkeletonLoader, PaginatedTable } from '../../../components/shared';
import '../../../styles/portal.css';

const exportToCSV = (title: string, headers: string[], dataRows: string[][]) => {
  const content = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...dataRows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToWord = (title: string, headers: string[], dataRows: string[][]) => {
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; }
        h2 { color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }
        table { border-collapse: collapse; width: 100%; margin-top: 16px; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
        th { background-color: #f1f5f9; color: #334155; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <p>Institutional Bulk Invoicing Registry Report - Generated on ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface BulkInvoice {
  id: string;
  name: string;
  amount: number;
  totalValue?: number;
  date: string;
  category: string;
  description: string;
  recipientsCount: number;
}

interface ClassOption {
  id: string;
  name: string;
}

export default function BulkInvoicesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const schoolName = user?.school?.name || user?.schoolName || 'Your School';

  const [invoices, setInvoices] = useState<BulkInvoice[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAuditInvoice, setSelectedAuditInvoice] = useState<BulkInvoice | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    description: '',
    category: 'Tuition Fees',
    targetType: 'All Students',
    classId: ''
  });

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/fees/bulk-invoices');
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast('Failed to load mass billing history registry', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadClasses = useCallback(async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(Array.isArray(res.data) ? res.data : []);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    loadInvoices();
    loadClasses();
  }, [loadInvoices, loadClasses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please provide an invoice identifier or run name', 'error');
      return;
    }
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please specify a valid positive billing amount', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/api/fees/bulk-invoices', formData);
      const count = res.data?.recipientsCount ?? 0;
      showToast(`Mass billing authorized: ${count} student invoices generated and posted to GL`, 'success');
      setShowCreateModal(false);
      setFormData({
        name: '',
        amount: '',
        description: '',
        category: 'Tuition Fees',
        targetType: 'All Students',
        classId: ''
      });
      loadInvoices();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to authorize institutional mass billing operation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await api.delete(`/api/fees/bulk-invoices/${deleteTargetId}`);
      showToast('Bulk billing batch removed from institutional registry', 'success');
      setDeleteTargetId(null);
      loadInvoices();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to authorize registry purge', 'error');
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const list = Array.isArray(invoices) ? invoices : [];
    const totalBatches = list.length;
    const totalRecipients = list.reduce((sum, inv) => sum + (inv.recipientsCount || 0), 0);
    const totalBilledValue = list.reduce((sum, inv) => {
      const val = inv.totalValue !== undefined ? inv.totalValue : (inv.amount || 0) * (inv.recipientsCount || 0);
      return sum + val;
    }, 0);
    const avgPerBatch = totalBatches > 0 ? totalBilledValue / totalBatches : 0;

    return { totalBatches, totalRecipients, totalBilledValue, avgPerBatch };
  }, [invoices]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        !searchTerm.trim() ||
        inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.description && inv.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inv.category && inv.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = 
        categoryFilter === 'ALL' ||
        (inv.category && inv.category.toLowerCase() === categoryFilter.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [invoices, searchTerm, categoryFilter]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach(inv => {
      if (inv.category) set.add(inv.category);
    });
    return Array.from(set);
  }, [invoices]);

  return (
    <div className="portal-container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 32px' }}>
      {/* Page Header */}
      <div className="portal-page-header no-print" style={{ marginBottom: '24px' }}>
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 800, 
              letterSpacing: '0.08em', 
              color: '#0284c7', 
              background: '#e0f2fe', 
              padding: '4px 10px', 
              borderRadius: '6px', 
              textTransform: 'uppercase' 
            }}>
              Term Bulk Invoicing Engine
            </span>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>•</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
              Institutional Revenue Distribution
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Mass Invoicing & Billing Batches
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0, fontWeight: 500 }}>
            Authorize and execute cohort-wide billing cycles, synchronize student ledgers with General Ledger accounts, and inspect historical audit batches.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={loadInvoices}
            className="portal-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem' }}
            title="Refresh Registry"
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="portal-btn-primary"
            style={{
              padding: '12px 24px',
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              boxShadow: '0 8px 16px -4px rgba(2, 132, 199, 0.35)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-layer-group"></i>
            <span>+ INITIATE MASS BILLING</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px',
        marginBottom: '26px'
      }} className="no-print">
        {/* Card 1: Total Batches */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '22px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Billing Batches
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
              {loading ? '...' : metrics.totalBatches}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7', marginTop: '4px' }}>
              Authorized operations
            </div>
          </div>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            <i className="fas fa-cubes"></i>
          </div>
        </div>

        {/* Card 2: Students Invoiced */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '22px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cumulative Recipients
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
              {loading ? '...' : metrics.totalRecipients.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', marginTop: '4px' }}>
              Student fee allocations
            </div>
          </div>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            <i className="fas fa-user-graduate"></i>
          </div>
        </div>

        {/* Card 3: Total Gross Volume */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '22px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cumulative Billed Volume
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#059669', marginTop: '6px' }}>
              {loading ? '...' : formatCurrency(metrics.totalBilledValue)}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
              Gross receivables committed
            </div>
          </div>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            <i className="fas fa-file-invoice-dollar"></i>
          </div>
        </div>

        {/* Card 4: Ledger Audit Status */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '22px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ledger Audit Integrity
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1e293b', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.2)' }}></span>
              GL Synchronized
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>
              Double-entry active
            </div>
          </div>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            <i className="fas fa-shield-alt"></i>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
      }}>
        {/* Card Header & Filters */}
        <div style={{
          padding: '22px 28px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '420px' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}></i>
              <input
                type="text"
                placeholder="Search batches by run name or memo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '10px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Export & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="no-print">
            <button
              onClick={() => {
                const headers = ['Processing Date', 'Operation Identity', 'Category', 'Recipients Count', 'Unit Amount', 'Total Value', 'Strategic Context'];
                const rows = filteredInvoices.map(inv => [
                  new Date(inv.date).toLocaleDateString(),
                  inv.name,
                  inv.category || 'General',
                  inv.recipientsCount.toString(),
                  inv.amount.toString(),
                  ((inv.totalValue !== undefined ? inv.totalValue : inv.amount * inv.recipientsCount)).toString(),
                  inv.description || ''
                ]);
                exportToCSV('Mass_Billing_Registry', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '10px' }}
              title="Export as CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button
              onClick={() => {
                const headers = ['Processing Date', 'Operation Identity', 'Category', 'Recipients Count', 'Unit Amount', 'Total Value', 'Strategic Context'];
                const rows = filteredInvoices.map(inv => [
                  new Date(inv.date).toLocaleDateString(),
                  inv.name,
                  inv.category || 'General',
                  inv.recipientsCount.toString(),
                  formatCurrency(inv.amount),
                  formatCurrency(inv.totalValue !== undefined ? inv.totalValue : inv.amount * inv.recipientsCount),
                  inv.description || ''
                ]);
                exportToWord('Mass_Billing_Registry', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '10px' }}
              title="Export as Word"
            >
              <i className="fas fa-file-word mr-1"></i> Word
            </button>
            <button
              onClick={() => window.print()}
              className="portal-btn-secondary"
              style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '10px' }}
              title="Print Register"
            >
              <i className="fas fa-print mr-1"></i> Print
            </button>
            <span style={{
              fontSize: '12px',
              fontWeight: 800,
              padding: '8px 14px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#475569'
            }}>
              {filteredInvoices.length} BATCHES
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-responsive">
          <PaginatedTable className="management-table">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ width: '14%', padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Execution Date
                </th>
                <th style={{ width: '28%', padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Batch Identity & Category
                </th>
                <th style={{ width: '22%', padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Operational Memo
                </th>
                <th style={{ width: '12%', textAlign: 'center', padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Recipients
                </th>
                <th style={{ width: '14%', padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Assessment / Total
                </th>
                <th style={{ width: '10%', textAlign: 'right', padding: '16px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }} className="no-print">
                  Audit Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px' }}>
                    <SkeletonLoader type="table" rows={6} columns={6} />
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '90px 24px' }}>
                    <div style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      color: '#94a3b8',
                      fontSize: '30px'
                    }}>
                      <i className="fas fa-layer-group"></i>
                    </div>
                    <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.25rem', margin: '0 0 6px 0' }}>
                      {searchTerm || categoryFilter !== 'ALL' ? 'No matching bulk operations found' : 'No Bulk Invoices Executed Yet'}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 20px' }}>
                      {searchTerm || categoryFilter !== 'ALL'
                        ? 'Try clearing your search query or changing the category filter.'
                        : 'Deploy your first institutional billing batch across student cohorts using the button below.'}
                    </p>
                    {(!searchTerm && categoryFilter === 'ALL') && (
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="portal-btn-primary"
                        style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem' }}
                      >
                        <i className="fas fa-plus mr-2"></i> Initiate First Mass Billing Run
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const totalYield = inv.totalValue !== undefined ? inv.totalValue : (inv.amount || 0) * (inv.recipientsCount || 0);
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                          {new Date(inv.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                          {new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                          {inv.name}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase'
                          }}>
                            {inv.category || 'GENERAL LEVY'}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569'
                          }}>
                            BATCH #{inv.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div 
                          style={{
                            fontSize: '0.85rem',
                            color: '#475569',
                            fontWeight: 500,
                            maxWidth: '260px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={inv.description || 'No strategic memo provided'}
                        >
                          {inv.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No memo provided</span>}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '6px 14px',
                          borderRadius: '12px'
                        }}>
                          <i className="fas fa-users" style={{ color: '#0284c7', fontSize: '12px' }}></i>
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>
                            {inv.recipientsCount || 0}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 900, color: '#059669', fontSize: '1rem' }}>
                          {formatCurrency(inv.amount)} <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>/ student</span>
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                          Total: <strong style={{ color: '#0f172a' }}>{formatCurrency(totalYield)}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }} className="no-print">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedAuditInvoice(inv)}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#0284c7',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px'
                            }}
                            title="Audit Transactional Ledger Data"
                          >
                            <i className="fas fa-search-dollar"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(inv.id)}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              border: '1px solid #fecdd3',
                              backgroundColor: '#fff1f2',
                              color: '#e11d48',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '13px'
                            }}
                            title="Purge Operational Record"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </PaginatedTable>
        </div>
      </div>

      {/* CREATE MASS BILLING MODAL */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => !submitting && setShowCreateModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              animation: 'fadeIn 0.2s ease-in-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '22px 28px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  boxShadow: '0 4px 8px rgba(2, 132, 199, 0.3)'
                }}>
                  <i className="fas fa-layer-group"></i>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                    Authorize Mass Invoicing Run
                  </h2>
                  <p style={{ margin: '2px 0 0 0', color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>
                    Generate synchronized student fee invoices across targeted cohorts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setShowCreateModal(false)}
                disabled={submitting}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Batch Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Batch Identifier / Run Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026 Term 1 Tuition & Development Levy"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                {/* Amount & Category */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                      Unit Assessment Amount ($) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#059669', fontWeight: 800, fontSize: '16px' }}>$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 30px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          fontSize: '15px',
                          fontWeight: 800,
                          color: '#059669',
                          boxSizing: 'border-box'
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                      Revenue Classification <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="Tuition Fees">Tuition Fees</option>
                      <option value="Boarding & Accommodation">Boarding & Accommodation</option>
                      <option value="Development Levy">Development Levy</option>
                      <option value="Transport Services">Transport Services</option>
                      <option value="Uniforms & Apparel">Uniforms & Apparel</option>
                      <option value="Examination Fees">Examination Fees</option>
                      <option value="Sports & Societies">Sports & Societies</option>
                      <option value="General">General Assessment</option>
                    </select>
                  </div>
                </div>

                {/* Target Cohort */}
                <div style={{ display: 'grid', gridTemplateColumns: formData.targetType === 'Specific Class' ? '1fr 1fr' : '1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                      Target Recipient Cohort <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={formData.targetType}
                      onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0284c7',
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="All Students">Entire Enrolled Student Registry ({schoolName})</option>
                      <option value="Boarders Only">Residential Boarders Only ({schoolName})</option>
                      <option value="Day Students Only">Day Scholars Only ({schoolName})</option>
                      <option value="Specific Class">Specific Grade / Class Only</option>
                    </select>
                    <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>✓</span> Scoped exclusively to students registered & enrolled at {schoolName}.
                    </p>
                  </div>

                  {formData.targetType === 'Specific Class' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                        Select Target Class ({classes.length} registered classes) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        value={formData.classId}
                        onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box'
                        }}
                        required
                      >
                        <option value="">-- Choose Class --</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Memo */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Audit Memo / Institutional Justification
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide authoritative context for this mass billing cycle (e.g. Approved in AGM Minute 4.2)..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      resize: 'none'
                    }}
                  />
                </div>

                {/* Batch Distribution Preview Box */}
                <div style={{
                  backgroundColor: '#f0fdf4',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    flexShrink: 0
                  }}>
                    <i className="fas fa-check"></i>
                  </div>
                  <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.4 }}>
                    <strong>Automated GL Posting:</strong> Authorizing this run will immediately create individual student fee allocations, write to the centralized invoices table, and update financial statements in real time.
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '18px 28px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '12px 28px',
                    backgroundColor: submitting ? '#94a3b8' : '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>POSTING BATCH INVOICES...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>AUTHORIZE & POST MASS BILLING</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT DETAILS MODAL */}
      {selectedAuditInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedAuditInvoice(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px'
                }}>
                  <i className="fas fa-file-invoice"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Bulk Invoicing Batch Audit
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Audit identity: {selectedAuditInvoice.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditInvoice(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Batch Run Name</span>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{selectedAuditInvoice.name}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Classification</span>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>{selectedAuditInvoice.category || 'General'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Execution Timestamp</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                    {new Date(selectedAuditInvoice.date).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Distribution Count</span>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                    {selectedAuditInvoice.recipientsCount} Students Invoiced
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: '#ecfdf5',
                borderRadius: '14px',
                padding: '16px 20px',
                border: '1px solid #a7f3d0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>Unit Assessment</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#047857' }}>{formatCurrency(selectedAuditInvoice.amount)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>Gross Committed Batch Yield</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#047857' }}>
                    {formatCurrency(
                      selectedAuditInvoice.totalValue !== undefined
                        ? selectedAuditInvoice.totalValue
                        : selectedAuditInvoice.amount * selectedAuditInvoice.recipientsCount
                    )}
                  </div>
                </div>
              </div>

              {selectedAuditInvoice.description && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Operational Context</label>
                  <div style={{
                    marginTop: '4px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    color: '#334155',
                    lineHeight: 1.5
                  }}>
                    {selectedAuditInvoice.description}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedAuditInvoice(null)}
                className="portal-btn-secondary"
                style={{ padding: '8px 20px', borderRadius: '10px', fontWeight: 700 }}
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL (Clean replacement for broken toastConfirm) */}
      {deleteTargetId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              padding: '28px',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              margin: '0 auto 16px'
            }}>
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Purge Bulk Billing Batch?
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Are you sure you want to remove this batch record? This will purge uncollected invoice allocations associated with this run. Confirmed paid receipts will remain preserved in historical audit ledgers.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
              >
                Yes, Purge Batch
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print, .portal-page-header, .portal-card, .portal-sidebar, .portal-header {
            display: none !important;
          }
          .portal-container {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          table { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
