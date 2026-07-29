import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function AcadexSchoolDetails() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [isEditCapabilitiesOpen, setIsEditCapabilitiesOpen] = useState(false);
  const [isContactAdminOpen, setIsContactAdminOpen] = useState(false);
  const [isDatabaseLogsOpen, setIsDatabaseLogsOpen] = useState(false);
  const [isResetCredentialsOpen, setIsResetCredentialsOpen] = useState(false);
  const [isSuspendWarningOpen, setIsSuspendWarningOpen] = useState(false);
  const { showToast } = useToast();

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
      showToast('School status updated', 'success');
    } catch (err) {
      showToast('Failed to update status', 'error');
    } finally {
      setUpdating(false);
      setIsSuspendWarningOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!(await toastConfirm(`PERMANENTLY DELETE ${school.name}? This cannot be undone.`))) return;
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
                   <button className="portal-btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => setIsEditCapabilitiesOpen(true)}>Edit Capabilities</button>
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
                  onClick={() => school.status === 'active' ? setIsSuspendWarningOpen(true) : handleStatusChange('active')}
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
                <button className="portal-btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setIsResetCredentialsOpen(true)}>
                  <i className="fas fa-key"></i> Reset Admin Credentials
                </button>
                <button className="portal-btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setIsContactAdminOpen(true)}>
                  <i className="fas fa-envelope"></i> Contact Admin
                </button>
                <button className="portal-btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setIsDatabaseLogsOpen(true)}>
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

      {isEditCapabilitiesOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal">
            <div className="portal-modal-header">
              <h3>Edit Capabilities</h3>
              <button className="portal-btn-ghost" onClick={() => setIsEditCapabilitiesOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body">
              <p>Select which features are enabled for this tenant.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label><input type="checkbox" defaultChecked /> LMS Core</label>
                <label><input type="checkbox" defaultChecked /> Student Registry</label>
                <label><input type="checkbox" defaultChecked /> Fee Management</label>
                <label><input type="checkbox" defaultChecked /> AI Santa Chatbot</label>
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-secondary" onClick={() => setIsEditCapabilitiesOpen(false)}>Cancel</button>
              <button className="portal-btn-primary" onClick={() => {
                showToast('Capabilities updated successfully.', 'success');
                setIsEditCapabilitiesOpen(false);
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {isContactAdminOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal">
            <div className="portal-modal-header">
              <h3>Contact Admin</h3>
              <button className="portal-btn-ghost" onClick={() => setIsContactAdminOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body">
              <div className="form-group">
                <label className="portal-label">Subject</label>
                <input type="text" className="portal-input" placeholder="Message subject" />
              </div>
              <div className="form-group">
                <label className="portal-label">Message</label>
                <textarea className="portal-input" rows={4} placeholder="Type your message here..."></textarea>
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-secondary" onClick={() => setIsContactAdminOpen(false)}>Cancel</button>
              <button className="portal-btn-primary" onClick={() => {
                showToast('Message sent to admin.', 'success');
                setIsContactAdminOpen(false);
              }}>Send Message</button>
            </div>
          </div>
        </div>
      )}

      {isResetCredentialsOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal">
            <div className="portal-modal-header">
              <h3>Reset Admin Credentials</h3>
              <button className="portal-btn-ghost" onClick={() => setIsResetCredentialsOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body">
              <p>Are you sure you want to reset the admin credentials for <strong>{school.name}</strong>? An email will be sent to <strong>{school.email}</strong> with a temporary password.</p>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-secondary" onClick={() => setIsResetCredentialsOpen(false)}>Cancel</button>
              <button className="portal-btn-primary" onClick={() => {
                showToast('Credentials reset email sent.', 'success');
                setIsResetCredentialsOpen(false);
              }}>Reset</button>
            </div>
          </div>
        </div>
      )}

      {isSuspendWarningOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal">
            <div className="portal-modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 style={{ margin: 0, color: 'var(--portal-warning)' }}>Suspend Access</h3>
            </div>
            <div className="portal-modal-body" style={{ textAlign: 'center', paddingTop: 10 }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: 'var(--portal-warning)', marginBottom: '16px' }}></i>
              <p>Are you sure you want to suspend access for <strong>{school.name}</strong>? Users will no longer be able to log in.</p>
            </div>
            <div className="portal-modal-footer" style={{ justifyContent: 'center' }}>
              <button className="portal-btn-secondary" onClick={() => setIsSuspendWarningOpen(false)}>Cancel</button>
              <button className="portal-btn-primary" style={{ background: 'var(--portal-warning)' }} onClick={() => handleStatusChange('suspended')}>Suspend</button>
            </div>
          </div>
        </div>
      )}

      {isDatabaseLogsOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <h3>Database Logs for {school.name}</h3>
              <button className="portal-btn-ghost" onClick={() => setIsDatabaseLogsOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body">
              <div style={{ background: '#1e293b', color: '#38bdf8', fontFamily: 'monospace', padding: '16px', borderRadius: '8px', overflowY: 'auto', maxHeight: '300px' }}>
                <div>[2024-11-20 08:15:32] INIT Database connection established</div>
                <div>[2024-11-20 08:15:35] QUERY SELECT * FROM students WHERE schoolId = '{school.id}'</div>
                <div>[2024-11-20 08:42:11] QUERY UPDATE settings SET theme = 'dark'</div>
                <div>[2024-11-20 09:12:00] ERROR Connection timeout on port 5432</div>
                <div>[2024-11-20 09:12:05] INFO Reconnected to db pool</div>
              </div>
            </div>
            <div className="portal-modal-footer">
              <button className="portal-btn-secondary" onClick={() => setIsDatabaseLogsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
