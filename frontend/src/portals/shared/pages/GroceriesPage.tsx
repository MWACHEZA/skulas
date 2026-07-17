import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';
import { useTerminology } from '../../../hooks/useTerminology';

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
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
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

interface Product {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
}

interface Consumption {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  requestedBy: string;
  date: string;
}

interface Class {
  id: string;
  name: string;
}

export default function GroceriesPage() {
  const { t, isMedical, isPoly, isUniversity, isSeminary } = useTerminology();
  const isSemester = isUniversity || isPoly || isMedical || isSeminary;

  const [activeTab, setActiveTab] = useState<'groceries' | 'billing' | 'consumption'>('groceries');
  const [products, setProducts] = useState<Product[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Billing State
  const [billingYear, setBillingYear] = useState(new Date().getFullYear());
  const [billingType, setBillingType] = useState(isSemester ? 'Semester 1' : 'Term 1');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [productAssignments, setProductAssignments] = useState<Record<string, number>>({});

  // Consumption State
  const [consumptionLogs, setConsumptionLogs] = useState<Consumption[]>([]);
  const [requestedBy, setRequestedBy] = useState('');
  const [consumptionDate, setConsumptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [consumptionQtys, setConsumptionQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    setBillingType(isSemester ? 'Semester 1' : 'Term 1');
  }, [isSemester]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, classesRes, logsRes] = await Promise.all([
        api.get('/api/inventory/products'),
        api.get('/api/classes'),
        activeTab === 'consumption' ? api.get('/api/inventory/consumption') : Promise.resolve({ data: [] })
      ]);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
      if (activeTab === 'consumption') setConsumptionLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
    } catch (error) {
      toast.error('Failed to synchronize institutional inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.unit) return;

    try {
      setProcessing(true);
      await api.post('/api/inventory/products', editingProduct);
      toast.success('Inventory item cataloged successfully');
      setEditingProduct(null);
      setShowAddModal(false);
      loadData();
    } catch (error) {
      toast.error('Failed to catalog inventory item');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!(await toastConfirm('Are you sure you want to purge this product from inventory? This action is irreversible.'))) return;
    try {
      await api.delete(`/api/inventory/products/${id}`);
      toast.success('Product purged from registry');
      loadData();
    } catch (error) {
      toast.error('Failed to purge product');
    }
  };

  const handleProcessBilling = async () => {
    if (selectedClassIds.length === 0) {
      toast.error(`Please select at least one institutional ${t('class').toLowerCase()}`);
      return;
    }

    const assignments = Object.entries(productAssignments)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, expectedQty]) => ({ productId, expectedQty }));

    if (assignments.length === 0) {
      toast.error('Please define quantity for at least one catalog item');
      return;
    }

    try {
      setProcessing(true);
      const res = await api.post('/api/inventory/bill', {
        productAssignments: assignments,
        classIds: selectedClassIds,
        year: billingYear,
        billingType
      });
      toast.success(res.data.message);
      setProductAssignments({});
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Billing process failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveConsumption = async () => {
    if (!requestedBy) {
      toast.error('Please specify the requesting authority');
      return;
    }

    const consumptions = Object.entries(consumptionQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (consumptions.length === 0) {
      toast.error('Please capture consumption metrics');
      return;
    }

    try {
      setProcessing(true);
      await api.post('/api/inventory/consumption', {
        consumptions,
        requestedBy,
        date: consumptionDate
      });
      toast.success('Consumption manifest logged successfully');
      setConsumptionQtys({});
      setRequestedBy('');
      setShowConsumptionModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to log consumption manifest');
    } finally {
      setProcessing(false);
    }
  };
  const openAddModal = () => {
    setEditingProduct({ name: '', unit: '', quantity: 0, price: 0 });
    setShowAddModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setShowAddModal(true);
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Institutional Inventory</h1>
          <p>Comprehensive oversight of institutional groceries, resource billing, and utilization metrics.</p>
        </div>
        {/* Record Inventory Asset button moved next to CSV button in Stock Registry card */}
      </div>

      <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '8px', borderRadius: '16px', border: '1px solid #f1f5f9', width: 'fit-content', marginBottom: '32px' }}>
        {[
          { id: 'groceries', label: 'Inventory Registry', icon: 'fa-boxes' },
          { id: 'billing', label: 'Billing & Assignments', icon: 'fa-file-invoice-dollar' },
          { id: 'consumption', label: 'Utilization Logs', icon: 'fa-hand-holding-box' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setCurrentPage(1); }}
            className={`portal-btn-${activeTab === tab.id ? 'primary' : 'ghost'}`}
            style={{
              padding: '10px 24px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 800
            }}
          >
            <i className={`fas ${tab.icon} mr-2`}></i>{tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="portal-card" style={{ padding: '120px 24px', textAlign: 'center' }}>
          <div className="portal-spinner" style={{ margin: '0 auto 24px' }}></div>
          <p style={{ color: '#64748b', fontWeight: 800, fontSize: '1.1rem' }}>Synchronizing inventory matrix...</p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'groceries' && (
            <div className="management-table-card">
              <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Institutional Stock Registry</h3>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Detailed audit of current resource levels and valuations.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
                    <button
                      onClick={openAddModal}
                      className="portal-btn-primary"
                      style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <i className="fas fa-plus-circle"></i> RECORD INVENTORY ASSET
                    </button>
                    <button
                      onClick={() => {
                        const headers = ['Asset Identifier', 'Current Reserve', 'Standard Unit', 'Asset Valuation'];
                        const rows = products.map(p => [
                          p.name,
                          p.quantity.toString(),
                          p.unit,
                          p.price.toString()
                        ]);
                        exportToCSV('Inventory_Registry', headers, rows);
                      }}
                      className="portal-btn-secondary"
                      style={{ padding: '0 16px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                      title="Export to CSV"
                    >
                      <i className="fas fa-file-csv"></i> CSV
                    </button>
                    <button
                      onClick={() => {
                        const headers = ['Asset Identifier', 'Current Reserve', 'Standard Unit', 'Asset Valuation'];
                        const rows = products.map(p => [
                          p.name,
                          p.quantity.toString(),
                          p.unit,
                          p.price.toString()
                        ]);
                        exportToWord('Inventory_Registry', headers, rows);
                      }}
                      className="portal-btn-secondary"
                      style={{ padding: '0 16px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                      title="Export to Word"
                    >
                      <i className="fas fa-file-word"></i> Word
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="portal-btn-secondary"
                      style={{ padding: '0 16px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                      title="Print / PDF"
                    >
                      <i className="fas fa-print"></i> Print/PDF
                    </button>
                  </div>
                  <span className="status-badge" style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 900, padding: '8px 16px', border: '1px solid #dbeafe' }}>
                    {(Array.isArray(products) ? products : []).length} CATALOGUED ASSETS
                  </span>
                </div>
              </div>
              <div className="table-responsive">
                <table className="management-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '32px' }}>Asset Identifier</th>
                      <th style={{ textAlign: 'center' }}>Current Reserve</th>
                      <th>Standard Unit</th>
                      <th>Asset Valuation</th>
                      <th style={{ textAlign: 'right', paddingRight: '32px' }}>Management</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const prods = Array.isArray(products) ? products : [];
                      const indexOfLastItem = currentPage * itemsPerPage;
                      const indexOfFirstItem = indexOfLastItem - itemsPerPage;
                      const currentItems = prods.slice(indexOfFirstItem, indexOfLastItem);
                      if (currentItems.length === 0 && prods.length > 0) setCurrentPage(1);
                      return prods.length > 0 ? currentItems.map(product => (
                        <tr key={product.id}>
                          <td style={{ paddingLeft: '32px' }}>
                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{product.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>SKU: {product.id.slice(0, 8).toUpperCase()}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="status-badge" style={{
                              fontWeight: 900,
                              padding: '6px 14px',
                              background: product.quantity < 10 ? '#fef2f2' : '#ecfdf5',
                              color: product.quantity < 10 ? '#dc2626' : '#059669',
                              border: `1px solid ${product.quantity < 10 ? '#fee2e2' : '#d1fae5'}`
                            }}>
                              {product.quantity}
                            </span>
                          </td>
                          <td><span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.85rem' }}>{product.unit}</span></td>
                          <td><span style={{ fontWeight: 900, color: '#2563eb' }}>{formatCurrency(product.price)}</span></td>
                          <td style={{ textAlign: 'right', paddingRight: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit Catalog" onClick={() => openEditModal(product)}>
                                <i className="fas fa-edit"></i>
                              </button>
                              <button className="portal-btn-ghost" style={{ padding: '8px', width: '36px', height: '36px', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Purge Record" onClick={() => handleDeleteProduct(product.id)}>
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '100px 24px', color: '#94a3b8' }}>
                            <i className="fas fa-box-open" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>Registry is currently vacant</p>
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {(Array.isArray(products) ? products : []).length > 0 && !loading && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, (Array.isArray(products) ? products : []).length)} of {(Array.isArray(products) ? products : []).length} assets
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="portal-btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil((Array.isArray(products) ? products : []).length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil((Array.isArray(products) ? products : []).length / itemsPerPage) || (Array.isArray(products) ? products : []).length === 0}
                      className="portal-btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {showAddModal && editingProduct && (
            <div className="portal-modal-overlay">
              <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '560px', padding: 0 }}>
                <div className="portal-modal-header" style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>
                      {editingProduct?.id ? 'Audit Inventory Item' : 'Catalog New Asset'}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>
                      {editingProduct?.id ? 'Modify existing institutional resource parameters.' : 'Register a new resource into the institutional registry.'}
                    </p>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="portal-btn-ghost" style={{ padding: '12px' }}><i className="fas fa-times"></i></button>
                </div>
                <form onSubmit={handleSaveProduct}>
                  <div className="portal-modal-body" style={{ padding: '40px' }}>
                    <div className="form-group" style={{ marginBottom: '32px' }}>
                      <label className="portal-label">Canonical Product Name</label>
                      <input
                        type="text"
                        className="portal-input"
                        placeholder="e.g. Refined Sugar (Grade A)"
                        value={editingProduct?.name || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        style={{ fontWeight: 700, height: '56px' }}
                        required
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                      <div className="form-group">
                        <label className="portal-label">Standard Unit</label>
                        <input
                          type="text"
                          className="portal-input"
                          placeholder="e.g. Kg, Liters"
                          value={editingProduct?.unit || ''}
                          onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                          style={{ fontWeight: 700, height: '56px' }}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="portal-label">Valuation ($)</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 900, fontSize: '1.1rem' }}>$</span>
                          <input
                            type="number"
                            step="0.01"
                            className="portal-input"
                            placeholder="0.00"
                            value={editingProduct?.price || ''}
                            onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                            style={{ paddingLeft: '40px', fontWeight: 900, color: '#2563eb', height: '56px', fontSize: '1.1rem' }}
                          />
                        </div>
                      </div>
                    </div>
                    {!editingProduct?.id && (
                      <div className="form-group">
                        <label className="portal-label">Opening Stock Reserve</label>
                        <input
                          type="number"
                          className="portal-input"
                          placeholder="0"
                          value={editingProduct?.quantity || ''}
                          onChange={e => setEditingProduct({ ...editingProduct, quantity: parseFloat(e.target.value) })}
                          style={{ fontWeight: 900, height: '56px' }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="portal-modal-footer" style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    <button type="button" onClick={() => setShowAddModal(false)} className="portal-btn-ghost" style={{ padding: '14px 32px', fontWeight: 800 }}>Abort Process</button>
                    <button type="submit" className="portal-btn-primary" style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }} disabled={processing}>
                      {processing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                      FINALIZE REGISTRY
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="portal-card">
              <div className="portal-card-header" style={{ marginBottom: '32px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Automated Resource Distribution & Billing</h3>
                <p style={{ margin: '8px 0 0 0', color: '#64748b', fontWeight: 600 }}>Execute batch asset assignments across institutional entities and generate respective fiscal invoices.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px', marginBottom: '40px' }}>
                <div className="form-group">
                  <label className="portal-label">Fiscal Cycle Year</label>
                  <input
                    type="number"
                    className="portal-input"
                    value={billingYear}
                    onChange={e => setBillingYear(parseInt(e.target.value))}
                    style={{ fontWeight: 700 }}
                  />
                </div>
                <div className="form-group">
                  <label className="portal-label">Operational Period</label>
                  <select
                    className="portal-input"
                    value={billingType}
                    onChange={e => setBillingType(e.target.value)}
                    style={{ fontWeight: 700 }}
                  >
                    {isSemester ? (
                      <>
                        <option value="Semester 1">Semester 1</option>
                        <option value="Semester 2">Semester 2</option>
                      </>
                    ) : (
                      <>
                        <option value="Term 1">Term 1 - First Quarter</option>
                        <option value="Term 2">Term 2 - Second Quarter</option>
                        <option value="Term 3">Term 3 - Third Quarter</option>
                      </>
                    )}
                    <option value="Monthly">Monthly Cycle</option>
                    <option value="Annual">Annual Fiscal Year</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '48px' }}>
                <div>
                  <label className="portal-label" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '28px', height: '28px', background: '#2563eb', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>1</span>
                    Define Resource Quotas
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto', paddingRight: '12px', border: '1px solid #f1f5f9', borderRadius: '20px', padding: '20px' }} className="custom-scrollbar">
                    {(Array.isArray(products) ? products : []).map(product => (
                      <div key={product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>{product.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="number"
                            className="portal-input"
                            style={{ width: '100px', height: '44px', textAlign: 'center', fontWeight: 900, background: '#fff' }}
                            placeholder="Qty"
                            value={productAssignments[product.id] || ''}
                            onChange={e => setProductAssignments({ ...productAssignments, [product.id]: parseFloat(e.target.value) || 0 })}
                          />
                          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#94a3b8', width: '50px', textTransform: 'uppercase' }}>{product.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="portal-label" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '28px', height: '28px', background: '#2563eb', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>2</span>
                    Target Institutional {t('classes')}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', border: '1px solid #f1f5f9', borderRadius: '20px', padding: '20px' }}>
                    {(Array.isArray(classes) ? classes : []).map(cls => (
                      <button
                        key={cls.id}
                        onClick={() => setSelectedClassIds(prev => prev.includes(cls.id) ? prev.filter(id => id !== cls.id) : [...prev, cls.id])}
                        className={selectedClassIds.includes(cls.id) ? 'portal-btn-primary' : 'portal-btn-ghost'}
                        style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 800, borderRadius: '12px' }}
                      >
                        {cls.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '56px', paddingTop: '40px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={handleProcessBilling}
                  disabled={processing}
                  className="portal-btn-primary"
                  style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}
                >
                  {processing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-rocket"></i>}
                  EXECUTE BATCH BILLING MANIFEST
                </button>
              </div>
            </div>
          )}

          {showConsumptionModal && (
            <div className="portal-modal-overlay">
              <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '560px', padding: 0 }}>
                <div className="portal-modal-header" style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>
                      <i className="fas fa-hand-holding mr-3" style={{ color: '#059669' }}></i>Capture Utilization
                    </h3>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>
                      Register resources consumed by institutional entities.
                    </p>
                  </div>
                  <button onClick={() => setShowConsumptionModal(false)} className="portal-btn-ghost" style={{ padding: '12px' }}><i className="fas fa-times"></i></button>
                </div>
                <div className="portal-modal-body" style={{ padding: '40px', maxHeight: '60vh', overflowY: 'auto' }}>
                  <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="portal-label">Requesting Authority / Agent</label>
                    <input
                      type="text"
                      className="portal-input"
                      placeholder="Full Identification"
                      value={requestedBy}
                      onChange={e => setRequestedBy(e.target.value)}
                      style={{ fontWeight: 700 }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '32px' }}>
                    <label className="portal-label">Manifest Execution Date</label>
                    <input
                      type="date"
                      className="portal-input"
                      value={consumptionDate}
                      onChange={e => setConsumptionDate(e.target.value)}
                      style={{ fontWeight: 700 }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label" style={{ marginBottom: '20px', display: 'block' }}>Utilization Metrics (Units)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #f1f5f9', borderRadius: '20px', padding: '16px' }}>
                      {(Array.isArray(products) ? products : []).map(product => (
                        <div key={product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{product.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="number"
                              className="portal-input"
                              style={{ width: '80px', height: '40px', textAlign: 'center', fontWeight: 900, fontSize: '0.95rem', background: '#fff' }}
                              placeholder="0"
                              value={consumptionQtys[product.id] || ''}
                              onChange={e => setConsumptionQtys({ ...consumptionQtys, [product.id]: parseFloat(e.target.value) || 0 })}
                            />
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', width: '40px', textTransform: 'uppercase' }}>{product.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="portal-modal-footer" style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowConsumptionModal(false)} className="portal-btn-ghost" style={{ flex: 1, padding: '14px', fontWeight: 800 }}>Cancel</button>
                  <button type="button" onClick={handleSaveConsumption} className="portal-btn-primary" style={{ flex: 2, padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#059669', border: '1px solid #047857' }} disabled={processing}>
                    {processing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                    AUTHORIZE CONSUMPTION
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'consumption' && (
            <div style={{ width: '100%' }}>
              <div className="management-table-card">
                <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px 40px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Institutional Utilization Matrix</h3>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Comprehensive log of resource consumptions.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
                    <button
                      onClick={() => setShowConsumptionModal(true)}
                      className="portal-btn-primary"
                      style={{ padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <i className="fas fa-hand-holding"></i> CAPTURE UTILIZATION
                    </button>
                    <button
                      onClick={() => {
                        const headers = ['Temporal Log', 'Resource Allocation', 'Utilization Rate', 'Authorized By'];
                        const rows = consumptionLogs.map(log => [
                          `${new Date(log.date).toLocaleDateString()} ${new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                          log.product?.name || 'Purged Asset',
                          `-${log.quantity}`,
                          log.requestedBy,
                        ]);
                        exportToCSV('Utilization_Logs', headers, rows);
                      }}
                      className="portal-btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem', height: '38px' }}
                      title="Export to CSV"
                    >
                      <i className="fas fa-file-csv mr-1"></i> CSV
                    </button>
                    <button
                      onClick={() => {
                        const headers = ['Temporal Log', 'Resource Allocation', 'Utilization Rate', 'Authorized By'];
                        const rows = consumptionLogs.map(log => [
                          `${new Date(log.date).toLocaleDateString()} ${new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                          log.product?.name || 'Purged Asset',
                          `-${log.quantity}`,
                          log.requestedBy
                        ]);
                        exportToWord('Utilization_Logs', headers, rows);
                      }}
                      className="portal-btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem', height: '38px' }}
                      title="Export to Word"
                    >
                      <i className="fas fa-file-word mr-1"></i> Word
                    </button>
                  <button
                    onClick={() => {
                      const headers = ['Asset Identifier', 'Current Reserve', 'Standard Unit', 'Asset Valuation'];
                      const rows = products.map(p => [
                        p.name,
                        p.quantity.toString(),
                        p.unit,
                        p.price.toString()
                      ]);
                      exportToWord('Institutional_Inventory_Matrix', headers, rows);
                    }}
                    className="portal-btn-secondary"
                    style={{ padding: '0 16px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                    title="Export Catalog"
                  >
                    <i className="fas fa-file-word"></i> Word
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="portal-btn-secondary"
                    style={{ padding: '0 16px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                    title="Print Matrix"
                  >
                    <i className="fas fa-print"></i> Print/PDF
                  </button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="management-table">
                  <thead>
                    <tr>
                      <th>Temporal Log</th>
                      <th>Resource Allocation</th>
                      <th style={{ textAlign: 'center' }}>Utilization Rate</th>
                      <th>Authorized By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(consumptionLogs) ? consumptionLogs : []).length > 0 ? (Array.isArray(consumptionLogs) ? consumptionLogs : []).map(log => (
                      <tr key={log.id}>
                        <td>
                          <div style={{ fontWeight: 800, color: '#1e293b' }}>{new Date(log.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#1e293b' }}>{log.product?.name || 'Purged Asset'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase' }}>{log.product?.unit || 'N/A'}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="status-badge" style={{ fontWeight: 900, color: '#dc2626', background: '#fef2f2', border: '1px solid #fee2e2', padding: '6px 14px' }}>
                            -{log.quantity}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#475569' }}>{log.requestedBy}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>AUTH: STAFF-ID-{log.id.slice(0, 6).toUpperCase()}</div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '100px 24px', color: '#94a3b8' }}>
                          <i className="fas fa-history" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>No utilization history synchronized</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
