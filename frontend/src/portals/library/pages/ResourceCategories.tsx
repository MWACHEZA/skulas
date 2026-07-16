import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

const COLORS = ['var(--school-primary, var(--school-primary, #3182ce))', 'var(--portal-danger)', 'var(--portal-warning)', '#805ad5', 'var(--portal-success)', '#dd6b20'];

export default function LibraryResourceCategories() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<{ id: string, category: string, count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const fetchCategories = () => {
    setLoading(true);
    api.get('/api/library/categories')
      .then(res => setCategories(res.data))
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
      await api.post('/api/library/categories', { name: newCatName });
      showToast('New category added successfully', 'success');
      setShowAddModal(false);
      setNewCatName('');
      fetchCategories();
    } catch (err) {
      showToast('Failed to add category', 'error');
    
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Catalog & Resource Categories</h1>
        <p>Organize the library's physical and digital collections into logical groups and subjects.</p>
      </div>

      <div className="portal-grid-2">
        {loading ? (
           <div style={{ padding: '40px', color: '#718096', fontWeight: 600 }}>Loading catalog structure...</div>
        ) : categories.length === 0 ? (
           <div style={{ padding: '40px', color: '#718096', fontWeight: 600 }}>No custom categories found. Create one to begin organizing.</div>
        ) : categories.map((cat, idx) => (
          <div key={cat.id} className="portal-card" style={{ borderLeft: `8px solid ${COLORS[idx % COLORS.length]}` }}>
            <div className="portal-card-header">
              <h3 style={{ margin: 0 }}>{cat.category}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                 <button className="portal-btn-secondary" style={{ padding: '4px 8px' }} title="Edit Category" onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-edit"></i></button>
              </div>
            </div>
            <div className="portal-card-body">
              <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#718096' }}>Total Items In Category</p>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2d3748' }}>{cat.count.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="portal-card" style={{ marginTop: 30 }}>
        <div className="portal-card-header">
          <h2><i className="fas fa-tags" style={{ marginRight: 8, color: 'var(--school-primary, var(--school-primary, #3182ce))' }}></i>Global Classification Tags</h2>
          <button className="portal-btn-primary" onClick={() => setShowAddModal(true)}>+ Add New Category</button>
        </div>
        <div className="portal-card-body">
           <p style={{ color: '#4a5568', fontSize: '0.9rem' }}>
             Categories help students and staff navigate the repository. Changes made here will reflect globally in search filters.
           </p>
        </div>
      </div>

      {showAddModal && (
        <div className="portal-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="portal-modal-card" style={{ maxWidth: '450px' }}>
             <div className="portal-modal-header">
               <div className="header-titles">
                 <h2>Create Category</h2>
                 <span>Add a new classification group for your library.</span>
               </div>
               <button className="close-panel" onClick={() => setShowAddModal(false)}>&times;</button>
             </div>
             <div className="portal-modal-body">
               <form onSubmit={handleAddCategory}>
                 <div className="form-group">
                   <label className="portal-label">Category Name</label>
                   <input 
                     type="text" 
                     className="portal-input" 
                     placeholder="e.g. Science, Fiction, Law..." 
                     required
                     value={newCatName}
                     onChange={e => setNewCatName(e.target.value)}
                   />
                 </div>
                 <div style={{ display: 'flex', gap: 15, marginTop: 25 }}>
                   <button type="button" onClick={() => setShowAddModal(false)} className="portal-btn-ghost" style={{ flex: 1 }}>Cancel</button>
                   <button type="submit" className="portal-btn-primary" style={{ flex: 1 }}>Save Category</button>
                 </div>
               </form>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
