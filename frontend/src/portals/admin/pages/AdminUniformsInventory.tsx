import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';

type UniformTab = 'stock' | 'kits' | 'issue' | 'alerts' | 'reports';

interface UniformProduct {
  id: string;
  name: string;
  categoryId?: string | null;
  category?: { name: string } | null;
  gender: string;
  size: string;
  ageRange?: string | null;
  costPrice: number;
  sellingPrice: number;
  stockQty: number;
  minStockAlert: number;
  barcode?: string | null;
}

interface UniformCategory {
  id: string;
  name: string;
  description?: string;
}

interface UniformKit {
  id: string;
  name: string;
  classLevel: string;
  gender: string;
  items: Array<{ productId: string; productName: string; qty: number; defaultSize?: string; unitPrice: number }>;
  totalPrice: number;
}

interface UniformIssuance {
  id: string;
  studentId: string;
  student?: { id: string; name: string; studentId: string };
  term: string;
  year: number;
  totalAmount: number;
  items: Array<{ productId: string; productName: string; size: string; qty: number; unitPrice: number; total: number }>;
  paymentStatus: string;
  collectionStatus: string;
  createdAt: string;
}

interface StockLedgerEntry {
  id: string;
  type: string;
  qtyChange: number;
  referenceId?: string;
  balanceAfter: number;
  unitCost: number;
  notes?: string;
  createdAt: string;
  product?: { name: string; size: string };
}

export default function AdminUniformsInventory() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: UniformTab = (searchParams.get('tab') as UniformTab) || 'stock';

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<UniformProduct[]>([]);
  const [categories, setCategories] = useState<UniformCategory[]>([]);
  const [kits, setKits] = useState<UniformKit[]>([]);
  const [issuances, setIssuances] = useState<UniformIssuance[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<StockLedgerEntry[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<UniformProduct[]>([]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('ALL');

  // Modals & Forms
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddKitModal, setShowAddKitModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Add Product Form State
  const [productForm, setProductForm] = useState({
    name: '',
    categoryId: '',
    gender: 'UNISEX',
    size: 'M',
    ageRange: 'Secondary',
    costPrice: '',
    sellingPrice: '',
    stockQty: 50,
    minStockAlert: 10,
    barcode: ''
  });

  // Kits Builder Form State
  const [kitForm, setKitForm] = useState({
    name: '',
    classLevel: 'Form 1',
    gender: 'UNISEX',
    selectedProductIds: [] as string[]
  });

  // Issuance Form State
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedKitId, setSelectedKitId] = useState('');
  const [issueCart, setIssueCart] = useState<Array<{ productId: string; productName: string; size: string; qty: number; unitPrice: number }>>([]);

  // Restock / GRN Form State
  const [grnForm, setGrnForm] = useState({
    grnNumber: '',
    supplierId: '',
    items: [] as Array<{ productId: string; qty: number; unitCost: number }>
  });

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [prodsRes, catsRes, kitsRes, alertsRes] = await Promise.all([
        api.get('/api/uniforms/products'),
        api.get('/api/uniforms/categories'),
        api.get('/api/uniforms/kits'),
        api.get('/api/uniforms/low-stock-alerts')
      ]);

      setProducts(Array.isArray(prodsRes.data) ? prodsRes.data : []);
      setCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
      setKits(Array.isArray(kitsRes.data) ? kitsRes.data : []);
      setLowStockAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);

      if (activeTab === 'reports') {
        const ledgerRes = await api.get('/api/uniforms/stock-ledger');
        setLedgerEntries(Array.isArray(ledgerRes.data) ? ledgerRes.data : []);
      }
    } catch (err: any) {
      console.error('Error fetching uniform data:', err);
      showToast('Failed to load uniform store data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: UniformTab) => {
    setSearchParams({ tab });
  };

  // 1. Create Product Handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/uniforms/products', {
        name: productForm.name,
        categoryId: productForm.categoryId || undefined,
        gender: productForm.gender,
        size: productForm.size,
        ageRange: productForm.ageRange,
        costPrice: parseFloat(productForm.costPrice) || 0,
        sellingPrice: parseFloat(productForm.sellingPrice) || 0,
        stockQty: Number(productForm.stockQty) || 0,
        minStockAlert: Number(productForm.minStockAlert) || 5,
        barcode: productForm.barcode || undefined
      });
      showToast('Product added with initial stock ledger entry', 'success');
      setProducts(prev => [res.data, ...prev]);
      setShowAddProductModal(false);
      setProductForm({
        name: '',
        categoryId: '',
        gender: 'UNISEX',
        size: 'M',
        ageRange: 'Secondary',
        costPrice: '',
        sellingPrice: '',
        stockQty: 50,
        minStockAlert: 10,
        barcode: ''
      });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Create Kit Handler
  const handleCreateKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kitForm.selectedProductIds.length === 0) {
      showToast('Please select at least one item for this bundle', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const kitItems = kitForm.selectedProductIds.map(id => {
        const p = products.find(prod => prod.id === id);
        return {
          productId: id,
          productName: p ? p.name : 'Uniform Item',
          qty: 1,
          defaultSize: p ? p.size : 'Standard',
          unitPrice: p ? p.sellingPrice : 0
        };
      });

      const res = await api.post('/api/uniforms/kits', {
        name: kitForm.name,
        classLevel: kitForm.classLevel,
        gender: kitForm.gender,
        items: kitItems
      });

      showToast('Uniform kit bundle created', 'success');
      setKits(prev => [res.data, ...prev]);
      setShowAddKitModal(false);
      setKitForm({ name: '', classLevel: 'Form 1', gender: 'UNISEX', selectedProductIds: [] });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create kit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Issue Kit / Uniform to Student
  const handleIssueSubmit = async () => {
    if (!selectedStudent) {
      showToast('Please search and select a student first', 'warning');
      return;
    }
    if (issueCart.length === 0) {
      showToast('Add at least one product to issue', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/api/uniforms/issue-kit', {
        studentId: selectedStudent.id,
        items: issueCart,
        termId: 'term_1',
        term: 'Term 1',
        year: 2026,
        autoInvoice: true
      });

      showToast(`Uniform kit issued and invoiced! Invoice #${res.data?.invoice?.invoiceNumber || ''}`, 'success');
      setIssueCart([]);
      setSelectedStudent(null);
      setSelectedKitId('');
      fetchInitialData();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to issue uniform', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Requisition creation from Low Stock alerts
  const handleCreateRequisition = async () => {
    if (lowStockAlerts.length === 0) {
      showToast('No low stock items currently require reordering', 'info');
      return;
    }

    setSubmitting(true);
    try {
      const items = lowStockAlerts.map(p => ({
        productId: p.id,
        name: p.name,
        size: p.size,
        reorderQty: Math.max(10, p.minStockAlert * 2),
        costPrice: p.costPrice
      }));

      const res = await api.post('/api/uniforms/reorder-requisition', {
        items,
        notes: `Bulk replenishment for ${lowStockAlerts.length} depleted uniform sizes`
      });

      showToast(`Purchase requisition ${res.data.refNumber} submitted to Bursar!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create requisition', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGender = genderFilter === 'ALL' || p.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-tshirt" style={{ color: '#0284c7' }}></i>
            Uniforms Store, Kits & Stock Ledger
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
            Grade-based uniform bundle kit creation, barcode sizing, Bursar automatic invoicing, and double-entry stock ledger.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => window.open('/pos', '_blank')}
            style={{ padding: '10px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}
          >
            <i className="fas fa-cash-register" style={{ marginRight: '6px', color: '#0284c7' }}></i>
            Open POS Terminal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (activeTab === 'kits') setShowAddKitModal(true);
              else setShowAddProductModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            <i className="fas fa-plus"></i>
            {activeTab === 'kits' ? 'New Uniform Kit' : 'Add Uniform Product'}
          </button>
        </div>
      </div>

      {/* 5 Canonical Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('stock')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'stock' ? 700 : 500,
            color: activeTab === 'stock' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'stock' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem'
          }}
        >
          <i className="fas fa-boxes" style={{ marginRight: 6 }}></i> Stock Dashboard
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('kits')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'kits' ? 700 : 500,
            color: activeTab === 'kits' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'kits' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem'
          }}
        >
          <i className="fas fa-layer-group" style={{ marginRight: 6 }}></i> Kits Builder
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('issue')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'issue' ? 700 : 500,
            color: activeTab === 'issue' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'issue' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem'
          }}
        >
          <i className="fas fa-user-check" style={{ marginRight: 6 }}></i> Issue Uniform
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('alerts')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'alerts' ? 700 : 500,
            color: activeTab === 'alerts' ? '#dc2626' : '#64748b',
            borderBottom: activeTab === 'alerts' ? '3px solid #dc2626' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem'
          }}
        >
          <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }}></i> Low Stock Alerts ({lowStockAlerts.length})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('reports')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'reports' ? 700 : 500,
            color: activeTab === 'reports' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'reports' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem'
          }}
        >
          <i className="fas fa-book" style={{ marginRight: 6 }}></i> Stock Ledger & Sales
        </button>
      </div>

      {/* TAB 1: Stock Dashboard */}
      {activeTab === 'stock' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', background: '#fff', padding: '14px', borderRadius: '8px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }}></i>
              <input
                type="text"
                placeholder="Search uniform product name or barcode..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <select
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
            >
              <option value="ALL">All Genders</option>
              <option value="BOYS">Boys</option>
              <option value="GIRLS">Girls</option>
              <option value="UNISEX">Unisex</option>
            </select>
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px 16px' }}>Item Name</th>
                  <th style={{ padding: '12px 16px' }}>Gender / Age</th>
                  <th style={{ padding: '12px 16px' }}>Size</th>
                  <th style={{ padding: '12px 16px' }}>Barcode</th>
                  <th style={{ padding: '12px 16px' }}>Cost Price</th>
                  <th style={{ padding: '12px 16px' }}>Selling Price</th>
                  <th style={{ padding: '12px 16px' }}>Stock Qty</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{p.name}</td>
                    <td style={{ padding: '12px 16px' }}>{p.gender} {p.ageRange ? `(${p.ageRange})` : ''}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>{p.size}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.barcode || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>${p.costPrice.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>${p.sellingPrice.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: p.stockQty <= p.minStockAlert ? '#dc2626' : '#1e293b' }}>
                      {p.stockQty}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {p.stockQty <= p.minStockAlert ? (
                        <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                          Low Stock
                        </span>
                      ) : (
                        <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Kits Builder */}
      {activeTab === 'kits' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {kits.map(kit => (
              <div key={kit.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{kit.name}</h3>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                    {kit.classLevel}
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Gender: <strong>{kit.gender}</strong></p>

                <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>Included Items:</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem', color: '#334155' }}>
                    {Array.isArray(kit.items) && kit.items.map((it, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>
                        {it.productName} (x{it.qty || 1}) - ${((it.unitPrice || 0) * (it.qty || 1)).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Bundle Price:</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0284c7' }}>${kit.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Issue Uniform */}
      {activeTab === 'issue' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left: Student & Kit Selection */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '14px' }}>
              1. Select Student & Uniform Bundle
            </h3>

            {/* Student Search */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Search Student (Name or ID)
              </label>
              <input
                type="text"
                placeholder="Type name e.g. Tanaka..."
                value={studentSearch}
                onChange={async e => {
                  setStudentSearch(e.target.value);
                  if (e.target.value.length > 2) {
                    try {
                      const res = await api.get(`/api/students?search=${encodeURIComponent(e.target.value)}`);
                      const list = Array.isArray(res.data) ? res.data : res.data?.students || [];
                      if (list.length > 0) setSelectedStudent(list[0]);
                    } catch {}
                  }
                }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              {selectedStudent && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.85rem', color: '#166534' }}>
                  ✓ Selected: <strong>{selectedStudent.name}</strong> ({selectedStudent.studentId || selectedStudent.id.slice(-6)})
                </div>
              )}
            </div>

            {/* Kit Fast-Load */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Load from Kit Template (Optional)
              </label>
              <select
                value={selectedKitId}
                onChange={e => {
                  setSelectedKitId(e.target.value);
                  const kit = kits.find(k => k.id === e.target.value);
                  if (kit && Array.isArray(kit.items)) {
                    setIssueCart(kit.items.map(it => ({
                      productId: it.productId,
                      productName: it.productName,
                      size: it.defaultSize || 'M',
                      qty: it.qty || 1,
                      unitPrice: it.unitPrice || 0
                    })));
                  }
                }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="">-- Choose Pre-built Kit --</option>
                {kits.map(k => (
                  <option key={k.id} value={k.id}>{k.name} ({k.classLevel}) - ${k.totalPrice.toFixed(2)}</option>
                ))}
              </select>
            </div>

            {/* Individual Product Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Or Add Individual Product
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  id="individualProdSelect"
                  style={{ flex: 1, padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.size}) - ${p.sellingPrice.toFixed(2)} [Stock: {p.stockQty}]</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('individualProdSelect') as HTMLSelectElement;
                    if (el && el.value) {
                      const prod = products.find(p => p.id === el.value);
                      if (prod) {
                        setIssueCart(prev => [
                          ...prev,
                          { productId: prod.id, productName: prod.name, size: prod.size, qty: 1, unitPrice: prod.sellingPrice }
                        ]);
                      }
                    }
                  }}
                  style={{ padding: '9px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Right: Issuance Summary & Confirm */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '14px' }}>
              2. Review & Auto-Invoice to Bursar
            </h3>

            {issueCart.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                No items added to issuance manifest.
              </div>
            ) : (
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ textAlign: 'left', padding: '8px 0' }}>Item</th>
                      <th style={{ textAlign: 'center', padding: '8px 0' }}>Size</th>
                      <th style={{ textAlign: 'center', padding: '8px 0' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '8px 0' }}>Total</th>
                      <th style={{ textAlign: 'center', padding: '8px 0' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {issueCart.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600 }}>{it.productName}</td>
                        <td style={{ textAlign: 'center', padding: '8px 0' }}>{it.size}</td>
                        <td style={{ textAlign: 'center', padding: '8px 0' }}>{it.qty}</td>
                        <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600 }}>${(it.unitPrice * it.qty).toFixed(2)}</td>
                        <td style={{ textAlign: 'center', padding: '8px 0' }}>
                          <button
                            onClick={() => setIssueCart(issueCart.filter((_, i) => i !== idx))}
                            style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer' }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #e2e8f0', paddingTop: '12px' }}>
                  <span style={{ fontWeight: 600, color: '#475569' }}>Total Invoiced Amount:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7' }}>
                    ${issueCart.reduce((sum, it) => sum + (it.unitPrice * it.qty), 0).toFixed(2)}
                  </span>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleIssueSubmit}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#0284c7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.95rem'
                    }}
                  >
                    {submitting ? 'Generating Invoice...' : 'Confirm Issuance & Post Invoice ✓'}
                  </button>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '6px' }}>
                    Posts double entry: DR Student Debtors (1100) / CR Uniform Store Sales (4041) + DR COGS (5041) / CR Inventory (1210).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Low Stock Alerts */}
      {activeTab === 'alerts' && (
        <div>
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.05rem', fontWeight: 700 }}>
                Low Stock Threshold Alerts
              </h3>
              <p style={{ margin: '4px 0 0 0', color: '#b91c1c', fontSize: '0.85rem' }}>
                {lowStockAlerts.length} uniform items have fallen below their safety reorder buffer.
              </p>
            </div>
            <button
              onClick={handleCreateRequisition}
              disabled={submitting || lowStockAlerts.length === 0}
              style={{ padding: '9px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              Generate Bulk Requisition to Bursar
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px 16px' }}>Item Name</th>
                  <th style={{ padding: '12px 16px' }}>Size</th>
                  <th style={{ padding: '12px 16px' }}>Current Stock</th>
                  <th style={{ padding: '12px 16px' }}>Min Alert Level</th>
                  <th style={{ padding: '12px 16px' }}>Unit Cost</th>
                  <th style={{ padding: '12px 16px' }}>Suggested Reorder</th>
                </tr>
              </thead>
              <tbody>
                {lowStockAlerts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{p.name}</td>
                    <td style={{ padding: '12px 16px' }}>{p.size}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626' }}>{p.stockQty}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.minStockAlert}</td>
                    <td style={{ padding: '12px 16px' }}>${p.costPrice.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{Math.max(10, p.minStockAlert * 2)} units</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Sales & Stock Ledger */}
      {activeTab === 'reports' && (
        <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
              Uniform Stock Movement & Reversals Ledger
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Double-entry stock intake, issuance deductions, and credit note restock transactions.
            </p>
          </div>

          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px' }}>Product</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Qty Change</th>
                <th style={{ padding: '12px 16px' }}>Balance After</th>
                <th style={{ padding: '12px 16px' }}>Reference</th>
                <th style={{ padding: '12px 16px' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map(entry => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    {entry.product ? `${entry.product.name} (${entry.product.size})` : 'Product'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: entry.type === 'purchase' ? '#f0fdf4' : entry.type === 'return' ? '#eff6ff' : '#fef2f2',
                      color: entry.type === 'purchase' ? '#166534' : entry.type === 'return' ? '#1e40af' : '#991b1b',
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {entry.type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: entry.qtyChange > 0 ? '#16a34a' : '#dc2626' }}>
                    {entry.qtyChange > 0 ? `+${entry.qtyChange}` : entry.qtyChange}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{entry.balanceAfter}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{entry.referenceId || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{entry.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Product */}
      {showAddProductModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '500px', maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 700 }}>Add Uniform Product</h3>
            <form onSubmit={handleCreateProduct}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Winter Woollen Blazer"
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Gender</label>
                  <select
                    value={productForm.gender}
                    onChange={e => setProductForm({ ...productForm, gender: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    <option value="UNISEX">Unisex</option>
                    <option value="BOYS">Boys</option>
                    <option value="GIRLS">Girls</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Size *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 32, M, 14"
                    value={productForm.size}
                    onChange={e => setProductForm({ ...productForm, size: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="25.00"
                    value={productForm.costPrice}
                    onChange={e => setProductForm({ ...productForm, costPrice: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Selling Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="40.00"
                    value={productForm.sellingPrice}
                    onChange={e => setProductForm({ ...productForm, sellingPrice: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stockQty}
                    onChange={e => setProductForm({ ...productForm, stockQty: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. UNI-BLZ-32"
                    value={productForm.barcode}
                    onChange={e => setProductForm({ ...productForm, barcode: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#0284c7', color: '#fff', fontWeight: 600 }}
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Kit */}
      {showAddKitModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '560px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 700 }}>Build New Uniform Kit</h3>
            <form onSubmit={handleCreateKit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Kit Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Form 1 Boys Full Winter Bundle"
                  value={kitForm.name}
                  onChange={e => setKitForm({ ...kitForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Target Class Level</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Form 1"
                    value={kitForm.classLevel}
                    onChange={e => setKitForm({ ...kitForm, classLevel: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Gender</label>
                  <select
                    value={kitForm.gender}
                    onChange={e => setKitForm({ ...kitForm, gender: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    <option value="UNISEX">Unisex</option>
                    <option value="BOYS">Boys</option>
                    <option value="GIRLS">Girls</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Select Bundle Items *</label>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: 6, padding: 8 }}>
                  {products.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={kitForm.selectedProductIds.includes(p.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setKitForm({ ...kitForm, selectedProductIds: [...kitForm.selectedProductIds, p.id] });
                          } else {
                            setKitForm({ ...kitForm, selectedProductIds: kitForm.selectedProductIds.filter(id => id !== p.id) });
                          }
                        }}
                      />
                      <span>{p.name} ({p.size}) — ${p.sellingPrice.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setShowAddKitModal(false)}
                  style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#0284c7', color: '#fff', fontWeight: 600 }}
                >
                  Save Kit Bundle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
