import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';

export default function AcadexSchoolDetails() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [code]);

  const fetchDetails = async () => {
    try {
      // Actually fetch by code from the school public endpoint or a new admin endpoint
      // For now we'll use the schools endpoint which we know exists
      const { data } = await api.get(`/api/schools/${code}`);
      setSchool(data);
    } catch (err) {
      console.error('Failed to fetch school details:', err);
    
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await api.patch(`/api/schools/${code}`, { status: newStatus });
      fetchDetails();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`PERMANENTLY DELETE ${school.name}? This cannot be undone.`)) return;
    setUpdating(true);
    try {
      await api.delete(`/api/schools/${code}`);
      navigate('/acadex/schools');
    } catch (err) {
      alert('Failed to delete school');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <button className="portal-btn-secondary" onClick={() => navigate('/acadex/schools')} style={{ padding: '8px 12px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1>{school.name}</h1>
            <p>License ID: <strong style={{ color: 'var(--portal-primary)' }}>{school.code}</strong> • {school.type.toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="portal-grid-3">
        {/* Plan Info */}
        <div className="portal-card" style={{ gridColumn: 'span 2' }}>
          <div className="portal-card-header">
             <h2><i className="fas fa-file-invoice-dollar" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Subscription & Plan</h2>
          </div>
          <div className="portal-card-body">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--portal-bg)', padding: 20, borderRadius: 12 }}>
                <div>
                   <h3 style={{ margin: 0 }}>{school.plan?.name || 'Professional'} Plan</h3>
                   <p style={{ color: '#718096', margin: '4px 0 0' }}>Annual billing • Active until Dec 2024</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--portal-primary)' }}>$149<small>/mo</small></div>
                   <button className="portal-btn-primary" style={{ marginTop: 10, fontSize: '0.8rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Change Plan</button>
                </div>
             </div>
             
             <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#718096', marginBottom: 12 }}>Enabled Features</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                   {(school.plan?.features || ['LMS Core', 'Student Registry', 'Fee Management', 'AI Santa Chatbot']).map((f: string) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                         <i className="fas fa-check-circle" style={{ color: 'var(--portal-success)' }}></i> {f}
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="portal-card">
          <div className="portal-card-header">
             <h2><i className="fas fa-shield-alt" style={{ marginRight: 8, color: '#f59e0b' }}></i>Admin Actions</h2>
          </div>
          <div className="portal-card-body">
             <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button 
                  className="portal-btn-secondary" 
                  style={{ justifyContent: 'flex-start', color: school.status === 'active' ? '#f59e0b' : 'var(--portal-success)' }}
                  onClick={() => handleStatusChange(school.status === 'active' ? 'suspended' : 'active')}
                  disabled={updating}
                >
                  <i className={school.status === 'active' ? 'fas fa-pause-circle' : 'fas fa-play-circle'}></i> 
                  {school.status === 'active' ? 'Suspend Access' : 'Activate Access'}
                </button>
                <button 
                  className="portal-btn-secondary" 
                  style={{ justifyContent: 'flex-start', color: 'var(--portal-danger)' }}
                  onClick={handleDelete}
                  disabled={updating}
                >
                  <i className="fas fa-trash-alt"></i> Terminate Tenant
                </button>
                <hr style={{ border: 'none', borderTop: '1px solid #edf2f7', margin: '10px 0' }} />
                <button className="portal-btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                  <i className="fas fa-envelope"></i> Contact Admin
                </button>
                <button className="portal-btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                  <i className="fas fa-database"></i> Database Logs
                </button>
             </div>
          </div>
        </div>
      </div>

      <div className="portal-card" style={{ marginTop: 24 }}>
         <div className="portal-card-header">
            <h2><i className="fas fa-info-circle" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Entity Information</h2>
         </div>
         <div className="portal-card-body">
            <div className="portal-grid-3">
               <div>
                  <label style={{ fontSize: '0.75rem', color: '#718096', display: 'block', marginBottom: 4 }}>Contact Email</label>
                  <strong>{school.email}</strong>
               </div>
               <div>
                  <label style={{ fontSize: '0.75rem', color: '#718096', display: 'block', marginBottom: 4 }}>Phone Number</label>
                  <strong>{school.phone || 'Not Provided'}</strong>
               </div>
               <div>
                  <label style={{ fontSize: '0.75rem', color: '#718096', display: 'block', marginBottom: 4 }}>Physical Address</label>
                  <strong>{school.address || 'Not Provided'}</strong>
               </div>
            </div>
         </div>
      </div>
    </>
  );
}
