import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';

export default function Icd10Manager() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<any>(null);
  const [formData, setFormData] = useState({ code: '', description: '', category: '' });

  const fetchCodes = async () => {
    setLoading(true);
    try {
      if (searchQuery.length >= 2) {
        const res = await api.get(`/api/icd10/search?q=${encodeURIComponent(searchQuery)}`);
        setCodes(res.data);
        setTotalPages(1);
      } else {
        const res = await api.get(`/api/icd10?page=${page}&limit=50`);
        setCodes(res.data.codes);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      toast.error('Failed to fetch ICD-10 codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [page, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCode) {
        await api.put(`/api/icd10/${editingCode.id}`, formData);
        toast.success('Code updated successfully');
      } else {
        await api.post('/api/icd10', formData);
        toast.success('Code added successfully');
      }
      setShowModal(false);
      fetchCodes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save code');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this code?')) return;
    try {
      await api.delete(`/api/icd10/${id}`);
      toast.success('Code deleted successfully');
      fetchCodes();
    } catch (err) {
      toast.error('Failed to delete code');
    }
  };

  const openModal = (code: any = null) => {
    setEditingCode(code);
    if (code) {
      setFormData({ code: code.code, description: code.description, category: code.category || '' });
    } else {
      setFormData({ code: '', description: '', category: '' });
    }
    setShowModal(true);
  };

  return (
    <div className="portal-page">
      <div className="portal-header">
        <h1>ICD-10 Diagnosis Codes</h1>
        <button className="portal-btn" onClick={() => openModal()}>
          <i className="fas fa-plus"></i> Add New Code
        </button>
      </div>

      <div className="portal-content">
        <div className="portal-card" style={{ marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}></i>
            <input 
              type="text" 
              placeholder="Search ICD-10 Codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
            />
          </div>
        </div>

        <div className="portal-card">
          {loading ? (
            <p>Loading codes...</p>
          ) : (
            <div className="table-responsive">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.code}</strong></td>
                      <td>{c.description}</td>
                      <td><span style={{ backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9em' }}>{c.category || 'N/A'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => openModal(c)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}><i className="fas fa-edit"></i></button>
                          <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><i className="fas fa-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {codes.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No ICD-10 codes found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!searchQuery && totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #d1d5db', background: page === 1 ? '#f3f4f6' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #d1d5db', background: page === totalPages ? '#f3f4f6' : 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginTop: 0 }}>{editingCode ? 'Edit ICD-10 Code' : 'Add ICD-10 Code'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Code *</label>
                <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db' }} placeholder="e.g. A00.0" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Description *</label>
                <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db' }} placeholder="e.g. Cholera due to Vibrio cholerae" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Category (Optional)</label>
                <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db' }} placeholder="e.g. Intestinal infectious diseases" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '4px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '4px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Save Code</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
