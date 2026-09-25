import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';

type InventoryCategory = 'uniforms' | 'bookstore' | 'library';

interface UniformItem {
  id: string;
  name: string;
  orderPrice: number;
  sellingPrice: number;
  stockLevel: number;
  sizes?: string[];
}

interface BookstoreItem {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  price: number;
  stock: number;
  isbn?: string;
}

interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  copies: number;
  available: number;
  category?: { name: string } | null;
  shelfLocation?: string;
}

export default function AdminUniformsInventory() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory: InventoryCategory = (searchParams.get('category') as InventoryCategory) || 'uniforms';

  const [loading, setLoading] = useState(true);
  const [uniforms, setUniforms] = useState<UniformItem[]>([]);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [restockAmount, setRestockAmount] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  // Add Item Form
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'uniforms',
    orderPrice: '',
    sellingPrice: '',
    stockLevel: 50,
    author: '',
    shelfLocation: ''
  });

  useEffect(() => {
    fetchInventory();
  }, [activeCategory]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      if (activeCategory === 'uniforms' || activeCategory === 'bookstore') {
        const res = await api.get('/api/uniforms/items');
        setUniforms(Array.isArray(res.data) ? res.data : []);
      }
      if (activeCategory === 'library') {
        const res = await api.get('/api/library/books');
        setBooks(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Failed to load inventory', err);
      showToast('Failed to load catalog inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: InventoryCategory) => {
    setSearchParams({ category });
  };

  // Restock action
  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      if (activeCategory === 'uniforms' || activeCategory === 'bookstore') {
        await api.post(`/api/uniforms/items/${selectedItem.id}/restock`, {
          quantity: Number(restockAmount)
        });
        showToast(`Added ${restockAmount} units to stock`, 'success');
        setUniforms(prev =>
          prev.map(i => (i.id === selectedItem.id ? { ...i, stockLevel: i.stockLevel + Number(restockAmount) } : i))
        );
      } else {
        // Library book copies update
        await api.patch(`/api/library/books/${selectedItem.id}`, {
          copies: selectedItem.copies + Number(restockAmount),
          available: selectedItem.available + Number(restockAmount)
        });
        showToast(`Added ${restockAmount} copies to library catalog`, 'success');
        setBooks(prev =>
          prev.map(b => (b.id === selectedItem.id ? { ...b, copies: b.copies + Number(restockAmount), available: b.available + Number(restockAmount) } : b))
        );
      }
      setShowRestockModal(false);
      setSelectedItem(null);
    } catch (err) {
      showToast('Failed to update stock quantity', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Create new item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (activeCategory === 'uniforms' || activeCategory === 'bookstore') {
        const res = await api.post('/api/uniforms/items', {
          name: itemForm.name,
          orderPrice: parseFloat(itemForm.orderPrice) || 0,
          sellingPrice: parseFloat(itemForm.sellingPrice) || 0,
          stockLevel: Number(itemForm.stockLevel)
        });
        showToast('Inventory item added', 'success');
        setUniforms(prev => [res.data, ...prev]);
      } else {
        const res = await api.post('/api/library/books', {
          title: itemForm.name,
          author: itemForm.author || 'Unknown',
          copies: Number(itemForm.stockLevel),
          available: Number(itemForm.stockLevel),
          shelfLocation: itemForm.shelfLocation
        });
        showToast('Book added to catalog', 'success');
        setBooks(prev => [res.data, ...prev]);
      }
      setShowAddModal(false);
      setItemForm({
        name: '',
        category: activeCategory,
        orderPrice: '',
        sellingPrice: '',
        stockLevel: 50,
        author: '',
        shelfLocation: ''
      });
    } catch (err) {
      showToast('Failed to save item', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Uniforms
  const filteredUniforms = uniforms.filter(item => {
    const isBookstore = activeCategory === 'bookstore';
    // If bookstore category is selected, filter items that mention books, notebooks, stationery, or show all
    const nameLower = item.name.toLowerCase();
    const matchesFilter = isBookstore
      ? nameLower.includes('book') || nameLower.includes('stationery') || nameLower.includes('pen') || nameLower.includes('set')
      : !nameLower.includes('book') && !nameLower.includes('stationery');
    const matchesSearch = nameLower.includes(searchTerm.toLowerCase());
    const matchesLowStock = !showLowStockOnly || item.stockLevel <= 10;
    return (matchesFilter || isBookstore) && matchesSearch && matchesLowStock;
  });

  // Filtered Books
  const filteredBooks = books.filter(b => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.category?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLowStock = !showLowStockOnly || b.available <= 2;
    return matchesSearch && matchesLowStock;
  });

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-boxes" style={{ color: '#0284c7' }}></i>
            School Supplies & Inventory Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
            Unified stock inventory across uniforms, bookstore stationery, and physical library catalog volumes.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            <i className="fas fa-plus"></i>
            {activeCategory === 'library' ? 'Add Book to Catalog' : 'Add Item'}
          </button>
        </div>
      </div>

      {/* Category Filter Chips / Tabs */}
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
          onClick={() => handleCategoryChange('uniforms')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeCategory === 'uniforms' ? 700 : 500,
            color: activeCategory === 'uniforms' ? '#0284c7' : '#64748b',
            borderBottom: activeCategory === 'uniforms' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-tshirt"></i>
          Uniforms Stock
        </button>

        <button
          type="button"
          onClick={() => handleCategoryChange('bookstore')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeCategory === 'bookstore' ? 700 : 500,
            color: activeCategory === 'bookstore' ? '#0284c7' : '#64748b',
            borderBottom: activeCategory === 'bookstore' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-store"></i>
          Bookstore & Stationery
        </button>

        <button
          type="button"
          onClick={() => handleCategoryChange('library')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeCategory === 'library' ? 700 : 500,
            color: activeCategory === 'library' ? '#0284c7' : '#64748b',
            borderBottom: activeCategory === 'library' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-book"></i>
          Library Catalog Stock
        </button>
      </div>

      {/* Search & Low Stock Toggle */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: '#fff',
          padding: '14px 18px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <i
            className="fas fa-search"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
          ></i>
          <input
            type="text"
            placeholder={
              activeCategory === 'library'
                ? 'Search title, author, category...'
                : 'Search inventory item name...'
            }
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem'
            }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showLowStockOnly}
            onChange={e => setShowLowStockOnly(e.target.checked)}
          />
          Show Low Stock Alerts Only
        </label>
      </div>

      {/* Content Table */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7' }}></i>
          <p style={{ marginTop: 12, color: '#64748b' }}>Loading inventory records...</p>
        </div>
      ) : activeCategory === 'library' ? (
        /* Library Catalog Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {filteredBooks.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-book fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No books found in catalog</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Add books using the button above.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Book Title</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Author</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Shelf Location</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Total Copies</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Available Stock</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      <i className="fas fa-book" style={{ color: '#0284c7', marginRight: 8 }}></i>
                      {b.title}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                      {b.author}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {b.category?.name || 'General Reading'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {b.shelfLocation || 'Section A'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {b.copies}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: b.available <= 2 ? '#b91c1c' : '#15803d',
                          background: b.available <= 2 ? '#fee2e2' : '#dcfce7',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.85rem'
                        }}
                      >
                        {b.available} Available
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(b);
                          setShowRestockModal(true);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#0284c7',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fas fa-plus" style={{ marginRight: 4 }}></i> Add Copies
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Uniforms / Bookstore Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {filteredUniforms.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-boxes fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No inventory items found</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Register catalog items above.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Item Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Cost Price</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Selling Price</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Current Stock</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Stock Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUniforms.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      <i className={activeCategory === 'bookstore' ? 'fas fa-book-open' : 'fas fa-tshirt'} style={{ color: '#0284c7', marginRight: 8 }}></i>
                      {item.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.9rem' }}>
                      {formatCurrency(item.orderPrice)}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#059669' }}>
                      {formatCurrency(item.sellingPrice)}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>
                      {item.stockLevel} units
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {item.stockLevel <= 10 ? (
                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                          <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }}></i> Low Stock
                        </span>
                      ) : (
                        <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                          In Stock
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowRestockModal(true);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#0284c7',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fas fa-plus" style={{ marginRight: 4 }}></i> Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
              Restock Item
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.9rem' }}>
              Add incoming units for <strong>{selectedItem.name || selectedItem.title}</strong>
            </p>
            <form onSubmit={handleRestock}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Quantity to Add *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockAmount}
                  onChange={e => setRestockAmount(Number(e.target.value))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Updating...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                {activeCategory === 'library' ? 'Add Book to Catalog' : 'Add Catalog Item'}
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✕</button>
            </div>
            <form onSubmit={handleCreateItem}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  {activeCategory === 'library' ? 'Book Title *' : 'Item Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={activeCategory === 'library' ? 'e.g. Things Fall Apart' : 'e.g. School Blazer (Navy)'}
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              {activeCategory === 'library' ? (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Author *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chinua Achebe"
                      value={itemForm.author}
                      onChange={e => setItemForm({ ...itemForm, author: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Shelf Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Section C, Row 4"
                      value={itemForm.shelfLocation}
                      onChange={e => setItemForm({ ...itemForm, shelfLocation: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Number of Copies *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={itemForm.stockLevel}
                      onChange={e => setItemForm({ ...itemForm, stockLevel: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Cost Price ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="10.00"
                        value={itemForm.orderPrice}
                        onChange={e => setItemForm({ ...itemForm, orderPrice: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Selling Price ($) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="15.00"
                        value={itemForm.sellingPrice}
                        onChange={e => setItemForm({ ...itemForm, sellingPrice: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Initial Stock Level *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={itemForm.stockLevel}
                      onChange={e => setItemForm({ ...itemForm, stockLevel: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
