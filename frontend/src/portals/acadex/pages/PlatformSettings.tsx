import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isLocked: boolean;
  createdAt: string;
  passwordLastChanged?: string;
}

export default function PlatformSettings() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'config' | 'smtp' | 'superadmins'>('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    platformName: 'Acadex Platform',
    supportEmail: 'support@acadex.com',
    supportPhone: '+263 77 000 0000',
    billingCurrency: 'USD',
    studentMonthlyRate: 2.00,
    trialDays: 30,
    maintenanceMode: false,
    allowSelfRegistration: true,
    backupFrequency: 'DAILY',
    maxUploadSizeMb: 50,
    smtpHost: '',
    smtpPort: 587,
    smtpEmail: '',
    smtpPassword: '',
    smtpSsl: true,
    securityAlertEmails: ['security@acadex.com']
  });

  // Superadmins State
  const [superadmins, setSuperadmins] = useState<SuperAdminUser[]>([]);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [settingsRes, adminsRes] = await Promise.all([
        api.get('/api/acadex/settings'),
        api.get('/api/acadex/superadmins')
      ]);

      if (settingsRes.data) {
        setSettings(prev => ({
          ...prev,
          ...settingsRes.data,
          studentMonthlyRate: Number(settingsRes.data.studentMonthlyRate ?? 2.00)
        }));
      }

      if (Array.isArray(adminsRes.data)) {
        setSuperadmins(adminsRes.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch platform configuration:', err);
      showToast('Failed to load platform settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/api/acadex/settings', settings);
      showToast('Platform settings saved successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSuperadmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminForm.name || !newAdminForm.email) {
      showToast('Name and email are required', 'warning');
      return;
    }

    setSubmittingAdmin(true);
    try {
      await api.post('/api/acadex/superadmins', newAdminForm);
      showToast('Superadmin account created successfully', 'success');
      setIsAddAdminOpen(false);
      setNewAdminForm({ name: '', email: '', phone: '', password: '' });
      // Refresh superadmins list
      const res = await api.get('/api/acadex/superadmins');
      setSuperadmins(res.data);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create superadmin', 'error');
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleDeleteSuperadmin = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove Superadmin ${name}?`)) return;

    try {
      await api.delete(`/api/acadex/superadmins/${id}`);
      showToast('Superadmin removed successfully', 'success');
      setSuperadmins(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete superadmin', 'error');
    }
  };

  return (
    <div className="platform-settings-page">
      <div className="portal-page-header">
        <h1>Acadex Platform Settings</h1>
        <p>Operational controls, SaaS global billing parameters, email infrastructure, and superadmin access management.</p>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 25 }}>
        <button
          className={`portal-btn-tab ${activeTab === 'config' ? 'active' : ''}`}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'config' ? '3px solid var(--portal-primary)' : '3px solid transparent',
            color: activeTab === 'config' ? 'var(--portal-primary)' : '#64748b'
          }}
          onClick={() => setActiveTab('config')}
        >
          <i className="fas fa-sliders-h" style={{ marginRight: 8 }}></i> Operational Parameters
        </button>

        <button
          className={`portal-btn-tab ${activeTab === 'smtp' ? 'active' : ''}`}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'smtp' ? '3px solid var(--portal-primary)' : '3px solid transparent',
            color: activeTab === 'smtp' ? 'var(--portal-primary)' : '#64748b'
          }}
          onClick={() => setActiveTab('smtp')}
        >
          <i className="fas fa-envelope" style={{ marginRight: 8 }}></i> Email & Alerts
        </button>

        <button
          className={`portal-btn-tab ${activeTab === 'superadmins' ? 'active' : ''}`}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'superadmins' ? '3px solid var(--portal-primary)' : '3px solid transparent',
            color: activeTab === 'superadmins' ? 'var(--portal-primary)' : '#64748b'
          }}
          onClick={() => setActiveTab('superadmins')}
        >
          <i className="fas fa-user-shield" style={{ marginRight: 8 }}></i> Superadmin Management ({superadmins.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--portal-primary)' }}></i>
          <p style={{ marginTop: 12, color: '#64748b' }}>Loading platform configuration...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OPERATIONAL CONFIGURATION */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveSettings}>
              <div className="portal-card" style={{ marginBottom: 25 }}>
                <div className="portal-card-header">
                  <h2><i className="fas fa-server" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>General SaaS Parameters</h2>
                </div>
                <div className="portal-card-body">
                  <div className="portal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="portal-form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Platform Name</label>
                      <input
                        type="text"
                        className="portal-input"
                        value={settings.platformName}
                        onChange={e => setSettings({ ...settings, platformName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="portal-form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Billing Currency</label>
                      <input
                        type="text"
                        className="portal-input"
                        value={settings.billingCurrency}
                        onChange={e => setSettings({ ...settings, billingCurrency: e.target.value })}
                        required
                      />
                    </div>

                    <div className="portal-form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Support Email</label>
                      <input
                        type="email"
                        className="portal-input"
                        value={settings.supportEmail}
                        onChange={e => setSettings({ ...settings, supportEmail: e.target.value })}
                        required
                      />
                    </div>

                    <div className="portal-form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Support Phone</label>
                      <input
                        type="text"
                        className="portal-input"
                        value={settings.supportPhone || ''}
                        onChange={e => setSettings({ ...settings, supportPhone: e.target.value })}
                      />
                    </div>

                    <div className="portal-form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Monthly Rate Per Student (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="portal-input"
                        value={settings.studentMonthlyRate}
                        onChange={e => setSettings({ ...settings, studentMonthlyRate: parseFloat(e.target.value) || 0 })}
                        required
                      />
                      <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>Standard rate billed to tenant schools based on active students.</small>
                    </div>

                    <div className="portal-form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Trial Duration (Days)</label>
                      <input
                        type="number"
                        min="0"
                        className="portal-input"
                        value={settings.trialDays}
                        onChange={e => setSettings({ ...settings, trialDays: parseInt(e.target.value) || 0 })}
                        required
                      />
                    </div>

                    <div className="portal-form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Max File Upload Size (MB)</label>
                      <input
                        type="number"
                        min="5"
                        max="500"
                        className="portal-input"
                        value={settings.maxUploadSizeMb}
                        onChange={e => setSettings({ ...settings, maxUploadSizeMb: parseInt(e.target.value) || 50 })}
                        required
                      />
                    </div>

                    <div className="portal-form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Backup Frequency</label>
                      <select
                        className="portal-input"
                        value={settings.backupFrequency}
                        onChange={e => setSettings({ ...settings, backupFrequency: e.target.value })}
                      >
                        <option value="HOURLY">Hourly Snapshots</option>
                        <option value="DAILY">Daily Snapshots (Recommended)</option>
                        <option value="WEEKLY">Weekly Snapshots</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 25, paddingTop: 20, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 15 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.allowSelfRegistration}
                        onChange={e => setSettings({ ...settings, allowSelfRegistration: e.target.checked })}
                        style={{ width: 18, height: 18 }}
                      />
                      <div>
                        <strong style={{ display: 'block', color: '#1e293b' }}>Allow Public School Registration</strong>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>If disabled, only Superadmins can provision new schools via the platform portal.</span>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={settings.maintenanceMode}
                        onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                        style={{ width: 18, height: 18 }}
                      />
                      <div>
                        <strong style={{ display: 'block', color: '#dc2626' }}>Platform Maintenance Mode</strong>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Displays a maintenance barrier to all school tenant users except Superadmins.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="portal-card-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                  <button type="submit" className="portal-btn-primary" disabled={saving}>
                    {saving ? <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i> : <i className="fas fa-save" style={{ marginRight: 6 }}></i>}
                    Save Operational Settings
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: SMTP & ALERTS */}
          {activeTab === 'smtp' && (
            <form onSubmit={handleSaveSettings}>
              <div className="portal-card" style={{ marginBottom: 25 }}>
                <div className="portal-card-header">
                  <h2><i className="fas fa-mail-bulk" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Global SMTP & Alert Dispatcher</h2>
                </div>
                <div className="portal-card-body">
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
                    These credentials are used by the platform to send tenant welcome emails, password reset links, billing notices, and critical security alerts.
                  </p>

                  <div className="portal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="portal-form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>SMTP Host</label>
                      <input
                        type="text"
                        placeholder="smtp.mailgun.org or smtp.office365.com"
                        className="portal-input"
                        value={settings.smtpHost || ''}
                        onChange={e => setSettings({ ...settings, smtpHost: e.target.value })}
                      />
                    </div>

                    <div className="portal-form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>SMTP Port</label>
                      <input
                        type="number"
                        placeholder="587"
                        className="portal-input"
                        value={settings.smtpPort || 587}
                        onChange={e => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 587 })}
                      />
                    </div>

                    <div className="portal-form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>SMTP Username / Email</label>
                      <input
                        type="text"
                        placeholder="noreply@acadex.com"
                        className="portal-input"
                        value={settings.smtpEmail || ''}
                        onChange={e => setSettings({ ...settings, smtpEmail: e.target.value })}
                      />
                    </div>

                    <div className="portal-form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>SMTP Password</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        className="portal-input"
                        value={settings.smtpPassword || ''}
                        onChange={e => setSettings({ ...settings, smtpPassword: e.target.value })}
                      />
                    </div>

                    <div className="portal-form-group" style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Security Alert Email Recipients</label>
                      <input
                        type="text"
                        placeholder="security@acadex.com, ops@acadex.com"
                        className="portal-input"
                        value={Array.isArray(settings.securityAlertEmails) ? settings.securityAlertEmails.join(', ') : settings.securityAlertEmails}
                        onChange={e => setSettings({
                          ...settings,
                          securityAlertEmails: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                      />
                      <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>Comma-separated emails that receive critical infrastructure notifications.</small>
                    </div>

                    <div className="portal-form-group" style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={settings.smtpSsl}
                          onChange={e => setSettings({ ...settings, smtpSsl: e.target.checked })}
                          style={{ width: 18, height: 18 }}
                        />
                        <span style={{ fontWeight: 600 }}>Enable SSL / STARTTLS Encryption</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="portal-card-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                  <button type="submit" className="portal-btn-primary" disabled={saving}>
                    {saving ? <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i> : <i className="fas fa-save" style={{ marginRight: 6 }}></i>}
                    Save Email Configuration
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: SUPERADMIN ACCOUNTS */}
          {activeTab === 'superadmins' && (
            <div className="portal-card" style={{ overflow: 'visible' }}>
              <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
                <div>
                  <h2><i className="fas fa-users-cog" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Superadministrator Accounts</h2>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>These accounts have root-level access across all school tenants and platform settings.</p>
                </div>
                <button className="portal-btn-primary" onClick={() => setIsAddAdminOpen(true)}>
                  <i className="fas fa-user-plus" style={{ marginRight: 6 }}></i> Add Superadmin
                </button>
              </div>

              <div className="portal-card-body" style={{ padding: 0 }}>
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email Address</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Account Status</th>
                      <th>Registered</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {superadmins.map(admin => (
                      <tr key={admin.id}>
                        <td style={{ fontWeight: 600 }}>{admin.name}</td>
                        <td style={{ color: 'var(--portal-primary)' }}>{admin.email}</td>
                        <td>{admin.phone || '—'}</td>
                        <td>
                          <span className="portal-badge info" style={{ fontWeight: 700 }}>SUPER_ADMIN</span>
                        </td>
                        <td>
                          <span className={`portal-badge ${admin.isLocked ? 'danger' : 'success'}`}>
                            {admin.isLocked ? 'LOCKED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            className="portal-btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#dc2626' }}
                            onClick={() => handleDeleteSuperadmin(admin.id, admin.name)}
                            disabled={superadmins.length <= 1}
                            title={superadmins.length <= 1 ? 'Cannot delete the sole superadmin' : 'Delete superadmin'}
                          >
                            <i className="fas fa-trash-alt"></i> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Superadmin Modal */}
      {isAddAdminOpen && (
        <div className="portal-modal-overlay">
          <div className="portal-modal" style={{ maxWidth: 500 }}>
            <div className="portal-modal-header">
              <h2>Add Platform Superadmin</h2>
              <button className="portal-modal-close" onClick={() => setIsAddAdminOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateSuperadmin}>
              <div className="portal-modal-body">
                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Full Name</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. Tendai Moyo"
                    value={newAdminForm.name}
                    onChange={e => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Email Address</label>
                  <input
                    type="email"
                    className="portal-input"
                    placeholder="tendai@acadex.com"
                    value={newAdminForm.email}
                    onChange={e => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Phone Number (Optional)</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="+263 77..."
                    value={newAdminForm.phone}
                    onChange={e => setNewAdminForm({ ...newAdminForm, phone: e.target.value })}
                  />
                </div>

                <div className="portal-form-group" style={{ marginBottom: 15 }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Initial Password</label>
                  <input
                    type="password"
                    className="portal-input"
                    placeholder="Defaults to SuperAdmin@1234"
                    value={newAdminForm.password}
                    onChange={e => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                  />
                  <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>Leave blank to automatically assign <code>SuperAdmin@1234</code>.</small>
                </div>
              </div>

              <div className="portal-modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="portal-btn-secondary" onClick={() => setIsAddAdminOpen(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" disabled={submittingAdmin}>
                  {submittingAdmin ? <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i> : null}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
