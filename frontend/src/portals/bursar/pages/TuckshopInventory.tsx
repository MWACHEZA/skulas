import { useState, useEffect } from 'react';
import api from '../../../lib/api';

interface TuckshopItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export default function TuckshopInventory() {
  const [items, setItems] = useState<TuckshopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TuckshopItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({ name: '', category: 'Snack', price: '', stock: '' });
  const [restockAmount, setRestockAmount] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/api/tuckshop/items');
      setItems(res.data);
    } catch (e) {
      console.error('Failed to fetch items', e);
    
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await api.put(`/api/tuckshop/items/${selectedItem.id}`, formData);
      } else {
        await api.post('/api/tuckshop/items', formData);
      }
      setShowItemModal(false);
      fetchItems();
    } catch (e) {
      console.error('Failed to save item', e);
      alert('Failed to save item');
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await api.put(`/api/tuckshop/items/${selectedItem.id}`, { addStock: restockAmount });
      setShowRestockModal(false);
      setRestockAmount('');
      fetchItems();
    } catch (e) {
      console.error('Failed to restock item', e);
      alert('Failed to restock item');
    }
  };

  const openNewItemModal = () => {
    setSelectedItem(null);
    setFormData({ name: '', category: 'Snack', price: '', stock: '0' });
    setShowItemModal(true);
  };

  const openEditModal = (item: TuckshopItem) => {
    setSelectedItem(item);
    setFormData({ name: item.name, category: item.category, price: item.price.toString(), stock: item.stock.toString() });
    setShowItemModal(true);
  };

  const openRestockModal = (item: TuckshopItem) => {
    setSelectedItem(item);
    setRestockAmount('');
    setShowRestockModal(true);
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Tuckshop & Uniform Inventory</h1>
        <p>Manage stock levels, pricing, and categories for school supplies and uniforms.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-boxes"></i></div>
          <div className="portal-stat-info">
            <h3>{items.length} Total</h3>
            <p>Product Lines</p>
          </div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon yellow"><i className="fas fa-exclamation-triangle"></i></div>
          <div className="portal-stat-info">
            <h3 style={{ color: 'var(--portal-warning)' }}>{items.filter(i => i.stock < 10).length} Low</h3>
            <p>Stock Alerts</p>
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-list" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Product List</h2>
          <button className="portal-btn-primary" onClick={openNewItemModal}>+ Add New Item</button>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <p style={{ padding: 20 }}>Loading items...</p>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Price (USD)</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>No items found.</td>
                  </tr>
                ) : items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td><span className="portal-badge neutral">{item.category}</span></td>
                    <td>${item.price.toFixed(2)}</td>
                    <td>{item.stock}</td>
                    <td>
                      <span className={`portal-badge ${item.stock < 10 ? 'warning' : 'success'}`}>
                        {item.stock < 10 ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td>
                      <button className="portal-btn-secondary" style={{ padding: '6px 12px', marginRight: 8 }} onClick={() => openEditModal(item)}>Edit</button>
                      <button className="portal-btn-primary" style={{ padding: '6px 12px' }} onClick={() => openRestockModal(item)}>Restock</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="portal-card" style={{ width: '90%', maxWidth: 500, margin: 0 }}>
            <div className="portal-card-header">
              <h2>{selectedItem ? 'Edit Item' : 'Add New Item'}</h2>
              <button style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setShowItemModal(false)}>&times;</button>
            </div>
            <div className="portal-card-body">
              <form onSubmit={handleSaveItem}>
                <div style={{ marginBottom: 15 }}>
                  <label className="portal-label">Item Name</label>
                  <input type="text" className="portal-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div style={{ marginBottom: 15 }}>
                  <label className="portal-label">Category</label>
                  <select className="portal-input" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="Snack">Snack</option>
                    <option value="Drink">Drink</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Uniform">Uniform</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                  <div style={{ flex: 1 }}>
                    <label className="portal-label">Price (USD)</label>
                    <input type="number" step="0.01" className="portal-input" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </div>
                  {!selectedItem && (
                    <div style={{ flex: 1 }}>
                      <label className="portal-label">Initial Stock</label>
                      <input type="number" className="portal-input" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                    </div>
                  )}
                </div>
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
              <p style={{ marginBottom: 15, color: '#718096' }}>Current Stock: {selectedItem.stock}</p>
              <form onSubmit={handleRestock}>
                <div style={{ marginBottom: 20 }}>
                  <label className="portal-label">Units to Add</label>
                  <input type="number" min="1" className="portal-input" required value={restockAmount} onChange={e => setRestockAmount(e.target.value)} />
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
    </>
  );
}
