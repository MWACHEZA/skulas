import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function Holiday() {
  const { showToast } = useToast();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', 
    content: '', 
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await api.get('/api/schools/holidays');
      setHolidays(res.data);
    } catch (err) {
      showToast('Failed to load holidays', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    setSaving(true);
    try {
      await api.post('/api/schools/holidays', formData);
      showToast('Holiday period saved', 'success');
      setFormData({ 
        title: '', 
        content: '', 
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
      fetchHolidays();
    } catch (err) {
      showToast('Failed to save holiday', 'error');
    
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this holiday record?')) return;
    try {
      await api.delete(`/api/schools/holidays/${id}`);
      showToast('Holiday removed', 'success');
      fetchHolidays();
    } catch (err) {
      showToast('Failed to delete holiday', 'error');
    
    }
  };

  return (
    <div className="portal-content">
      <div className="portal-header">
        <div className="header-title">
          <h1><i className="fas fa-umbrella-beach mr-2"></i> Holiday Management</h1>
          <p>Schedule and track institutional breaks and public holidays.</p>
        </div>
      </div>

      <div className="portal-grid" style={{ marginTop: '2rem', gridTemplateColumns: '1fr 2fr' }}>
        <div className="portal-card animate-in">
          <div className="card-header">
            <h3><i className="fas fa-plus-circle mr-2"></i> Add Holiday</h3>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            <div className="form-group">
              <label className="portal-label">Holiday Title *</label>
              <input 
                type="text" className="portal-input" placeholder="e.g. Easter Break, Independence Day"
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label className="portal-label">Description / Content</label>
              <textarea 
                className="portal-input" style={{ minHeight: '80px' }}
                placeholder="Details about the holiday..."
                value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
              ></textarea>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="portal-label">Start Date *</label>
                <input 
                  type="date" className="portal-input"
                  value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="portal-label">End Date *</label>
                <input 
                  type="date" className="portal-input"
                  value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})}
                  required
                />
              </div>
            </div>
            <button type="submit" className="portal-btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={saving}>
              {saving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
              Save Holiday
            </button>
          </form>
        </div>

        <div className="portal-card animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-header">
            <h3><i className="fas fa-calendar-alt mr-2"></i> Holiday List</h3>
          </div>
          <div style={{ padding: '20px' }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Details</th>
                  <th>Period</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>Loading holidays...</td></tr>
                ) : holidays.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>No holidays scheduled.</td></tr>
                ) : holidays.map(h => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 800, color: 'var(--portal-primary)' }}>{h.title}</td>
                    <td style={{ color: '#64748b' }}>{h.content || 'N/A'}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{new Date(h.startDate).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>to {new Date(h.endDate).toLocaleDateString()}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleDelete(h.id)} className="portal-btn-action delete">
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
