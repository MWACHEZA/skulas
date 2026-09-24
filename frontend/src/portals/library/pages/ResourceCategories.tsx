import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

const ACCENT_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#db2777'];

export default function LibraryResourceCategories() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<{ id: string, category: string, count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const fetchCategories = () => {
    setLoading(true);
    api.get('/api/library/categories')
      .then(res => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.post('/api/library/categories', { name: newCatName.trim() });
      showToast('New category added successfully', 'success');
      setShowAddModal(false);
      setNewCatName('');
      fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to add category', 'error');
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.category?.trim()) return;
    try {
      await api.patch(`/api/library/categories/${editingCategory.id}`, { name: editingCategory.category.trim() });
      showToast('Category updated successfully', 'success');
      setEditingCategory(null);
      fetchCategories();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update category', 'error');
    }
  };

  return (
    <div className="library-portal-container" style={{ padding: '24px', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Header with "+ Add New Category" moved to top */}
      <div className="portal-page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: '#0f172a', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            <i className="fas fa-tags mr-3 text-primary" style={{ color: '#2563eb' }}></i>
            Resource Categories
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Classify and organize print books, audiobooks, and digital materials across the library.
          </p>
        </div>

        <button 
          className="portal-btn-primary" 
          onClick={() => setShowAddModal(true)}
          style={{ padding: '10px 20px', fontSize: '0.9rem', background: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <i className="fas fa-plus"></i> Add New Category
        </button>
      </div>

      {/* Reduced-Size Compact Category Tiles */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin mr-2"></i> Loading category classifications...
        </div>
      ) : categories.length === 0 ? (
        <div className="portal-card" style={{ padding: '60px', textAlign: 'center', color: '#64748b', borderRadius: 16 }}>
          <i className="fas fa-folder-open" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: 12 }}></i>
          <p style={{ fontWeight: 600, margin: 0 }}>No categories created yet.</p>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>Click "+ Add New Category" above to create your first classification.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {categories.map((cat, idx) => {
            const color = ACCENT_COLORS[idx % ACCENT_COLORS.length];
            return (
              <div 
                key={cat.id} 
                className="portal-card" 
                style={{ 
                  borderRadius: 12, 
                  border: '1px solid #e2e8f0', 
                  borderTop: `4px solid ${color}`,
                  background: '#ffffff', 
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 110,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', wordBreak: 'break-word' }}>
                    {cat.category}
                  </h3>
                  <button 
                    onClick={() => setEditingCategory(cat)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2, fontSize: '0.85rem' }}
                    title="Edit Category Name"
                    className="hover:text-blue-600"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Items</span>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                      {cat.count.toLocaleString()}
                    </div>
                  </div>
                  <span 
                    className="portal-badge" 
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569' }}
                  >
                    Active
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="portal-modal-card" style={{ maxWidth: 420 }}>
            <div className="portal-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                  Add Resource Category
                </h3>
              </div>
              <button className="close-btn" style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer' }} onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleAddCategory} style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="portal-form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>Category Name *</label>
                <input 
                  type="text" 
                  className="portal-input" 
                  placeholder="e.g. Science, Literature, Law, History..."
                  required
                  autoFocus
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                />
              </div>

              <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" style={{ background: '#2563eb' }}>
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="portal-modal-card" style={{ maxWidth: 420 }}>
            <div className="portal-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                  Edit Category
                </h3>
              </div>
              <button className="close-btn" style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer' }} onClick={() => setEditingCategory(null)}>&times;</button>
            </div>

            <form onSubmit={handleEditCategory} style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="portal-form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>Category Name *</label>
                <input 
                  type="text" 
                  className="portal-input" 
                  value={editingCategory.category} 
                  onChange={e => setEditingCategory({ ...editingCategory, category: e.target.value })}
                  required
                />
              </div>

              <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setEditingCategory(null)}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn-primary" style={{ background: '#2563eb' }}>
                  Update Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
