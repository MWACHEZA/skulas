import React, { useState, useEffect } from 'react';
import { PaginatedTable } from '../../../components/shared/Pagination';
import api from '../../../lib/api';
import { toast } from '../../../context/ToastContext';

export interface TuckshopItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  barcode?: string | null;
  sku?: string | null;
}

const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
  '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
};

export const BarcodeVisual: React.FC<{ code: string; height?: number; widthMultiplier?: number; showText?: boolean }> = ({
  code,
  height = 42,
  widthMultiplier = 1.4,
  showText = true
}) => {
  const cleanCode = (code || 'TCK-000000').toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, '');
  const fullSequence = `*${cleanCode}*`;
  
  const narrowW = widthMultiplier;
  const wideW = widthMultiplier * 2.5;
  const gapW = widthMultiplier;

  let currentX = 8;
  const rects: Array<{ x: number; w: number }> = [];

  for (let cIdx = 0; cIdx < fullSequence.length; cIdx++) {
    const char = fullSequence[cIdx];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];

    for (let i = 0; i < 9; i++) {
      const isBar = i % 2 === 0;
      const isWide = pattern[i] === '1';
      const w = isWide ? wideW : narrowW;

      if (isBar) {
        rects.push({ x: currentX, w });
      }
      currentX += w;
    }
    currentX += gapW;
  }

  const totalWidth = currentX + 8;
  const svgHeight = showText ? height + 16 : height;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        viewBox={`0 0 ${totalWidth} ${svgHeight}`}
        style={{ width: '100%', maxWidth: totalWidth, height: svgHeight, backgroundColor: '#ffffff', borderRadius: 4 }}
      >
        {rects.map((r, idx) => (
          <rect key={idx} x={r.x} y={0} width={r.w} height={height} fill="#0f172a" />
        ))}
        {showText && (
          <text
            x={totalWidth / 2}
            y={height + 13}
            textAnchor="middle"
            fill="#1e293b"
            style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, letterSpacing: '1.5px' }}
          >
            {cleanCode}
          </text>
        )}
      </svg>
    </div>
  );
};

export default function TuckshopInventory() {
  const [items, setItems] = useState<TuckshopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingBarcodes, setGeneratingBarcodes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal states
  const [showItemModal, setShowItemModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TuckshopItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    category: 'Snack',
    price: '',
    stock: '',
    barcode: '',
    sku: ''
  });
  const [restockAmount, setRestockAmount] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/api/tuckshop/items');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to fetch items', e);
      toast.error('Failed to fetch tuckshop inventory');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomBarcode = () => {
    const code = `TCK-${Math.floor(100000 + Math.random() * 900000)}`;
    setFormData(prev => ({ ...prev, barcode: code, sku: prev.sku || code }));
  };

  const handleBatchGenerateBarcodes = async () => {
    setGeneratingBarcodes(true);
    try {
      const res = await api.post('/api/tuckshop/items/generate-barcodes');
      toast.success(res.data?.message || 'Barcodes successfully generated');
      fetchItems();
    } catch (e) {
      console.error('Failed to generate barcodes', e);
      toast.error('Failed to generate missing barcodes');
    } finally {
      setGeneratingBarcodes(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        barcode: formData.barcode.trim() || undefined,
        sku: formData.sku.trim() || formData.barcode.trim() || undefined
      };

      if (selectedItem) {
        await api.put(`/api/tuckshop/items/${selectedItem.id}`, payload);
        toast.success('Item updated successfully');
      } else {
        await api.post('/api/tuckshop/items', payload);
        toast.success('Item created with barcode');
      }
      setShowItemModal(false);
      fetchItems();
    } catch (e) {
      console.error('Failed to save item', e);
      toast.error('Failed to save item');
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await api.put(`/api/tuckshop/items/${selectedItem.id}`, { addStock: restockAmount });
      toast.success('Stock updated successfully');
      setShowRestockModal(false);
      setRestockAmount('');
      fetchItems();
    } catch (e) {
      console.error('Failed to restock item', e);
      toast.error('Failed to restock item');
    }
  };

  const openNewItemModal = () => {
    setSelectedItem(null);
    const newBarcode = `TCK-${Math.floor(100000 + Math.random() * 900000)}`;
    setFormData({
      name: '',
      category: 'Snack',
      price: '',
      stock: '0',
      barcode: newBarcode,
      sku: newBarcode
    });
    setShowItemModal(true);
  };

  const openEditModal = (item: TuckshopItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      stock: item.stock.toString(),
      barcode: item.barcode || '',
      sku: item.sku || ''
    });
    setShowItemModal(true);
  };

  const openRestockModal = (item: TuckshopItem) => {
    setSelectedItem(item);
    setRestockAmount('');
    setShowRestockModal(true);
  };

  const openLabelModal = (item: TuckshopItem) => {
    setSelectedItem(item);
    setShowLabelModal(true);
  };

  const categories = ['ALL', 'Snack', 'Drink', 'Bakery', 'Stationery', 'Uniform', 'Other'];

  const filteredItems = items.filter(item => {
    const matchesCat = selectedCategory === 'ALL' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      item.name.toLowerCase().includes(q) ||
      (item.barcode && item.barcode.toLowerCase().includes(q)) ||
      (item.sku && item.sku.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  const missingBarcodeCount = items.filter(i => !i.barcode).length;

  return (
    <>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Tuckshop & POS Inventory</h1>
          <p>Manage retail stock, configure automatic barcodes, and print adhesive merchandise labels.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {missingBarcodeCount > 0 && (
            <button
              className="portal-btn-secondary"
              onClick={handleBatchGenerateBarcodes}
              disabled={generatingBarcodes}
              style={{ display: 'flex', alignItems: 'center', gap: 8, borderColor: '#f59e0b', color: '#b45309' }}
              title="Generate unique barcodes for items that don't have one yet"
            >
              <i className={`fas ${generatingBarcodes ? 'fa-spinner fa-spin' : 'fa-barcode'}`} />
              Auto-Barcode Missing ({missingBarcodeCount})
            </button>
          )}
          <button className="portal-btn-primary" onClick={openNewItemModal} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-plus" /> Add New Item
          </button>
        </div>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-boxes" /></div>
          <div className="portal-stat-info">
            <h3>{items.length} Total</h3>
            <p>Product Lines</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-barcode" /></div>
          <div className="portal-stat-info">
            <h3>{items.filter(i => !!i.barcode).length} / {items.length}</h3>
            <p>Barcoded & Scannable</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon yellow"><i className="fas fa-exclamation-triangle" /></div>
          <div className="portal-stat-info">
            <h3 style={{ color: 'var(--portal-warning)' }}>{items.filter(i => i.stock < 10).length} Low</h3>
            <p>Stock Alerts</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="portal-card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', minWidth: 280, flex: 1 }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
            <input
              type="text"
              className="portal-input"
              style={{ width: '100%', paddingLeft: 38 }}
              placeholder="Search by product name, barcode (e.g. TCK-...), or SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`portal-badge ${selectedCategory === cat ? 'primary' : 'neutral'}`}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  padding: '6px 12px',
                  fontWeight: selectedCategory === cat ? 800 : 500,
                  background: selectedCategory === cat ? '#2563eb' : '#f1f5f9',
                  color: selectedCategory === cat ? '#ffffff' : '#475569'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2>
            <i className="fas fa-list" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }} />
            Product Catalog ({filteredItems.length})
          </h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <p style={{ padding: 20 }}>Loading inventory items...</p>
          ) : (
            <PaginatedTable className="portal-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Barcode / SKU</th>
                  <th>Category</th>
                  <th>Price (USD)</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                      {items.length === 0 ? 'No items in tuckshop inventory yet.' : 'No items match your filter criteria.'}
                    </td>
                  </tr>
                ) : filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>
                      {item.name}
                    </td>
                    <td>
                      {item.barcode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className="portal-badge"
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#1e3a8a',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <i className="fas fa-barcode" style={{ color: '#3b82f6' }} />
                            {item.barcode}
                          </span>
                          <button
                            onClick={() => openLabelModal(item)}
                            title="Print Barcode Sticker"
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
                          >
                            <i className="fas fa-print" />
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          No barcode
                        </span>
                      )}
                    </td>
                    <td><span className="portal-badge neutral">{item.category}</span></td>
                    <td style={{ fontWeight: 700, color: '#047857' }}>${item.price.toFixed(2)}</td>
                    <td style={{ fontWeight: 600 }}>{item.stock}</td>
                    <td>
                      <span className={`portal-badge ${item.stock <= 0 ? 'danger' : item.stock < 10 ? 'warning' : 'success'}`}>
                        {item.stock <= 0 ? 'Out of Stock' : item.stock < 10 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="portal-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => openEditModal(item)}>
                          <i className="fas fa-pencil-alt mr-1" /> Edit
                        </button>
                        <button className="portal-btn-primary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => openRestockModal(item)}>
                          <i className="fas fa-plus mr-1" /> Restock
                        </button>
                        {item.barcode && (
                          <button
                            className="portal-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#f8fafc' }}
                            onClick={() => openLabelModal(item)}
                            title="Print Adhesive Barcode Label"
                          >
                            <i className="fas fa-tag mr-1" /> Label
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PaginatedTable>
          )}
        </div>
      </div>

      {/* Item Create / Edit Modal */}
      {showItemModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="portal-card" style={{ width: '90%', maxWidth: 520, margin: 0 }}>
            <div className="portal-card-header">
              <h2>{selectedItem ? 'Edit Tuckshop Item' : 'Add New Tuckshop Item'}</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowItemModal(false)}>&times;</button>
            </div>
            <div className="portal-card-body">
              <form onSubmit={handleSaveItem}>
                <div style={{ marginBottom: 14 }}>
                  <label className="portal-label">Item Name</label>
                  <input
                    type="text"
                    className="portal-input"
                    required
                    placeholder="e.g. Fresh Meat Pie, Coca Cola 330ml, Sandwich"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="portal-label">Barcode / SKU Identifier</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <i className="fas fa-barcode" style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
                      <input
                        type="text"
                        readOnly
                        className="portal-input"
                        style={{ paddingLeft: 34, fontFamily: 'monospace', fontWeight: 600, backgroundColor: '#f8fafc', color: '#334155', cursor: 'not-allowed' }}
                        placeholder="Click Auto-Gen to generate barcode..."
                        value={formData.barcode}
                      />
                    </div>
                    <button
                      type="button"
                      className="portal-btn-secondary"
                      onClick={generateRandomBarcode}
                      style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <i className="fas fa-magic" /> Auto-Gen
                    </button>
                  </div>
                  <small style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                    Scan packaged retail goods (e.g. chips, drinks) or auto-generate for tuckshop-made foods (sandwiches, pies).
                  </small>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="portal-label">Category</label>
                  <select
                    className="portal-input"
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Snack">Snack</option>
                    <option value="Drink">Drink</option>
                    <option value="Bakery">Bakery & Fast Food</option>
                    <option value="Stationery">Stationery & Books</option>
                    <option value="Uniform">Uniforms & Apparel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                  <div style={{ flex: 1 }}>
                    <label className="portal-label">Selling Price (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="portal-input"
                      required
                      placeholder="0.00"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                  {!selectedItem && (
                    <div style={{ flex: 1 }}>
                      <label className="portal-label">Initial Stock Quantity</label>
                      <input
                        type="number"
                        min="0"
                        className="portal-input"
                        required
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {formData.barcode && (
                  <div style={{ marginBottom: 20, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      Barcode Preview
                    </span>
                    <BarcodeVisual code={formData.barcode} />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="portal-btn-secondary" onClick={() => setShowItemModal(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary">Save Item</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="portal-card" style={{ width: '90%', maxWidth: 400, margin: 0 }}>
            <div className="portal-card-header">
              <h2>Restock: {selectedItem.name}</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowRestockModal(false)}>&times;</button>
            </div>
            <div className="portal-card-body">
              <p style={{ marginBottom: 15, color: '#718096' }}>Current Stock: <strong>{selectedItem.stock}</strong> units</p>
              <form onSubmit={handleRestock}>
                <div style={{ marginBottom: 20 }}>
                  <label className="portal-label">Units to Add</label>
                  <input
                    type="number"
                    min="1"
                    className="portal-input"
                    required
                    value={restockAmount}
                    onChange={e => setRestockAmount(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="portal-btn-secondary" onClick={() => setShowRestockModal(false)}>Cancel</button>
                  <button type="submit" className="portal-btn-primary">Add Stock</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Print Barcode Label Modal */}
      {showLabelModal && selectedItem && selectedItem.barcode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="portal-card" style={{ width: '90%', maxWidth: 440, margin: 0, backgroundColor: '#ffffff' }}>
            <div className="portal-card-header no-print">
              <h2>Print Barcode Label</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowLabelModal(false)}>&times;</button>
            </div>
            <div className="portal-card-body">
              <div
                id="printable-barcode-label"
                style={{
                  border: '2px dashed #94a3b8',
                  borderRadius: 12,
                  padding: 20,
                  backgroundColor: '#ffffff',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                  School Tuckshop
                </div>
                <h3 style={{ margin: '4px 0', fontSize: '1.2rem', color: '#0f172a' }}>{selectedItem.name}</h3>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 12 }}>{selectedItem.category}</div>

                <div style={{ margin: '14px 0', display: 'flex', justifyContent: 'center' }}>
                  <BarcodeVisual code={selectedItem.barcode} height={52} widthMultiplier={1.6} />
                </div>

                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#047857' }}>
                  ${selectedItem.price.toFixed(2)}
                </div>
              </div>

              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowLabelModal(false)}>Close</button>
                <button
                  type="button"
                  className="portal-btn-primary"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <i className="fas fa-print" /> Print Sticker Label
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
